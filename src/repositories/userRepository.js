'use strict';

const db = require('../database/db');

function getUser(discordId) {
  return db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId) || null;
}

function ensureUser(discordId, username) {
  const existing = getUser(discordId);
  if (existing) {
    if (username && existing.username !== username) {
      db.prepare('UPDATE users SET username = ? WHERE discord_id = ?').run(username, discordId);
      return getUser(discordId);
    }
    return existing;
  }
  db.prepare('INSERT INTO users (discord_id, username, balance_cents) VALUES (?, ?, 0)')
    .run(discordId, username || discordId);
  return getUser(discordId);
}

function updateBalance(discordId, deltaCents) {
  db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE discord_id = ?')
    .run(deltaCents, discordId);
  return getUser(discordId);
}

function listUsers({ limit = 50, offset = 0 } = {}) {
  return db.prepare('SELECT * FROM users ORDER BY balance_cents DESC LIMIT ? OFFSET ?').all(limit, offset);
}

function searchUsers(term, { limit = 50 } = {}) {
  return db.prepare('SELECT * FROM users WHERE discord_id LIKE ? OR username LIKE ? ORDER BY balance_cents DESC LIMIT ?')
    .all(`%${term}%`, `%${term}%`, limit);
}

function countUsers() {
  return db.prepare('SELECT COUNT(*) as count FROM users').get().count;
}

function sumBalances() {
  return db.prepare('SELECT COALESCE(SUM(balance_cents), 0) as total FROM users').get().total;
}

module.exports = {
  getUser,
  ensureUser,
  updateBalance,
  listUsers,
  searchUsers,
  countUsers,
  sumBalances,
};
