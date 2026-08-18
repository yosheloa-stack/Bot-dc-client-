'use strict';

const crypto = require('node:crypto');
const db = require('../database/db');
const { DEFAULT_SETTINGS } = require('../moderation/defaults');

/** Merge recursivo simples (objetos puros). Arrays são substituídos. */
function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    const val = source[key];
    if (val && typeof val === 'object' && !Array.isArray(val) && typeof out[key] === 'object' && out[key] !== null) {
      out[key] = deepMerge(out[key], val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

function getSettings(guildId) {
  const row = db.prepare('SELECT settings_json FROM guild_settings WHERE guild_id = ?').get(guildId);
  if (row) return JSON.parse(row.settings_json);

  const fresh = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  db.prepare('INSERT INTO guild_settings (guild_id, settings_json) VALUES (?, ?)').run(guildId, JSON.stringify(fresh));
  return fresh;
}

function updateSettings(guildId, patch) {
  const current = getSettings(guildId);
  const merged = deepMerge(current, patch);
  db.prepare(
    `INSERT INTO guild_settings (guild_id, settings_json, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(guild_id) DO UPDATE SET settings_json = excluded.settings_json, updated_at = excluded.updated_at`
  ).run(guildId, JSON.stringify(merged));
  return merged;
}

function addWarning(guildId, userId, reason, moderatorId) {
  db.prepare('INSERT INTO warnings (id, guild_id, user_id, reason, moderator_id) VALUES (?, ?, ?, ?, ?)').run(
    crypto.randomUUID(),
    guildId,
    userId,
    reason,
    moderatorId || null
  );
  return db.prepare('SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?').get(guildId, userId).count;
}

function getWarnings(guildId, userId) {
  return db
    .prepare('SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at ASC')
    .all(guildId, userId);
}

function clearWarnings(guildId, userId) {
  db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
}

module.exports = { getSettings, updateSettings, addWarning, getWarnings, clearWarnings };
