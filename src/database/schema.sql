-- Esquema do banco de dados do Ceifador (SQLite via node:sqlite)

CREATE TABLE IF NOT EXISTS users (
  discord_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT,
  provider_txid TEXT,
  pix_copy_paste TEXT,
  pix_qrcode_base64 TEXT,
  description TEXT,
  actor TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (discord_id) REFERENCES users(discord_id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_discord_id ON transactions(discord_id);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_txid ON transactions(provider, provider_txid);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
