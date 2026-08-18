'use strict';

const session = require('express-session');
const db = require('../database/db');

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 8;
const SWEEP_INTERVAL_MS = 1000 * 60 * 60;

/**
 * Session store persistido no mesmo SQLite do resto do bot. Evita o
 * MemoryStore padrão do express-session, que vaza memória com o tempo e
 * derruba as sessões de admin toda vez que o processo reinicia (ex: em
 * hosts com auto-restart, como a Square Cloud).
 */
class SqliteSessionStore extends session.Store {
  constructor({ ttlMs = DEFAULT_TTL_MS } = {}) {
    super();
    this.ttlMs = ttlMs;
    this._sweepTimer = setInterval(() => this._sweep(), SWEEP_INTERVAL_MS);
    this._sweepTimer.unref?.();
  }

  _sweep() {
    try {
      db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    } catch {
      // limpeza é best-effort; uma falha aqui não deve derrubar o processo
    }
  }

  get(sid, callback) {
    try {
      const row = db.prepare('SELECT data, expires_at FROM sessions WHERE sid = ?').get(sid);
      if (!row) return callback(null, null);
      if (row.expires_at < Date.now()) {
        db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
        return callback(null, null);
      }
      callback(null, JSON.parse(row.data));
    } catch (err) {
      callback(err);
    }
  }

  set(sid, sessionData, callback) {
    try {
      const expiresAt = sessionData.cookie?.expires ? new Date(sessionData.cookie.expires).getTime() : Date.now() + this.ttlMs;
      db.prepare(
        `INSERT INTO sessions (sid, data, expires_at) VALUES (?, ?, ?)
         ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at`
      ).run(sid, JSON.stringify(sessionData), expiresAt);
      callback?.(null);
    } catch (err) {
      callback?.(err);
    }
  }

  destroy(sid, callback) {
    try {
      db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      callback?.(null);
    } catch (err) {
      callback?.(err);
    }
  }

  touch(sid, sessionData, callback) {
    this.set(sid, sessionData, callback);
  }
}

module.exports = { SqliteSessionStore };
