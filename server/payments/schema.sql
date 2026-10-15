-- Local demonstration only. No table accepts a real "paid" status.
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  account_id TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL CHECK (currency = 'CRC'),
  items_json TEXT NOT NULL,
  delivery_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_payment', 'manual_review', 'simulated_paid')),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  demo_only INTEGER NOT NULL DEFAULT 1 CHECK (demo_only = 1)
);

CREATE INDEX IF NOT EXISTS due_orders ON orders (status, next_attempt_at);

CREATE TABLE IF NOT EXISTS mock_movements (
  account_id TEXT NOT NULL,
  id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  conflict INTEGER NOT NULL DEFAULT 0 CHECK (conflict IN (0, 1)),
  PRIMARY KEY (account_id, id)
);

CREATE TABLE IF NOT EXISTS allocations (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  account_id TEXT NOT NULL,
  movement_id TEXT NOT NULL,
  allocated_at TEXT NOT NULL,
  UNIQUE (account_id, movement_id),
  FOREIGN KEY (account_id, movement_id) REFERENCES mock_movements(account_id, id)
);

CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id),
  event TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  event TEXT NOT NULL CHECK (event = 'payment.simulated'),
  created_at TEXT NOT NULL,
  UNIQUE (order_id, event)
);
