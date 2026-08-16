'use strict';

const crypto = require('node:crypto');
const db = require('../database/db');

function createTransaction({
  id = null,
  discordId,
  type,
  amountCents,
  status = 'pending',
  provider = null,
  providerTxid = null,
  pixCopyPaste = null,
  pixQrcodeBase64 = null,
  description = null,
  actor = null,
}) {
  const txId = id || crypto.randomUUID();
  db.prepare(`INSERT INTO transactions
      (id, discord_id, type, amount_cents, status, provider, provider_txid, pix_copy_paste, pix_qrcode_base64, description, actor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(txId, discordId, type, amountCents, status, provider, providerTxid, pixCopyPaste, pixQrcodeBase64, description, actor);
  return getTransaction(txId);
}

function getTransaction(id) {
  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) || null;
}

function getTransactionByProviderTxid(provider, providerTxid) {
  return db.prepare('SELECT * FROM transactions WHERE provider = ? AND provider_txid = ?').get(provider, providerTxid) || null;
}

function updateStatus(id, status, actor = null) {
  if (actor) {
    db.prepare(`UPDATE transactions SET status = ?, actor = ?, updated_at = datetime('now') WHERE id = ?`).run(status, actor, id);
  } else {
    db.prepare(`UPDATE transactions SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);
  }
  return getTransaction(id);
}

function listByUser(discordId, limit = 10) {
  return db.prepare('SELECT * FROM transactions WHERE discord_id = ? ORDER BY created_at DESC LIMIT ?').all(discordId, limit);
}

function listAll({ limit = 50, offset = 0, status = null, type = null } = {}) {
  let query = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  return db.prepare(query).all(...params);
}

function countAll({ status = null, type = null } = {}) {
  let query = 'SELECT COUNT(*) as count FROM transactions WHERE 1=1';
  const params = [];
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  return db.prepare(query).get(...params).count;
}

function sumCompletedByType(type) {
  return db.prepare("SELECT COALESCE(SUM(amount_cents),0) as total FROM transactions WHERE type = ? AND status = 'completed'")
    .get(type).total;
}

module.exports = {
  createTransaction,
  getTransaction,
  getTransactionByProviderTxid,
  updateStatus,
  listByUser,
  listAll,
  countAll,
  sumCompletedByType,
};
