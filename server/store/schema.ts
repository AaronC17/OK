export const schema = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY CHECK (id = 1), username TEXT NOT NULL, password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, role TEXT NOT NULL CHECK (role IN ('customer', 'admin')),
  csrf TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS shop_orders (
  id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, owner_hash TEXT NOT NULL,
  idempotency_key TEXT NOT NULL, request_hash TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('pending_details', 'awaiting_payment', 'pending_review', 'ready', 'rejected')),
  demo INTEGER NOT NULL CHECK (demo IN (0,1)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  lines_json TEXT NOT NULL, customer_json TEXT NOT NULL, delivery_json TEXT NOT NULL,
  destination_json TEXT, subtotal_minor INTEGER NOT NULL CHECK (subtotal_minor > 0),
  shipping_minor INTEGER CHECK (shipping_minor >= 0), total_minor INTEGER CHECK (total_minor > 0),
  current_receipt_id TEXT, customer_message TEXT, payment_confirmed_at TEXT,
  privacy_version TEXT NOT NULL, privacy_accepted_at TEXT NOT NULL,
  UNIQUE (owner_hash, idempotency_key)
);
CREATE INDEX IF NOT EXISTS shop_orders_queue ON shop_orders(status, created_at);
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES shop_orders(id), upload_key TEXT NOT NULL,
  raw_hash TEXT NOT NULL, content_type TEXT NOT NULL CHECK (content_type IN ('image/webp', 'application/pdf')),
  size INTEGER NOT NULL CHECK (size > 0), data BLOB NOT NULL,
  submitted_at TEXT NOT NULL, bank_reference TEXT NOT NULL,
  UNIQUE(order_id, upload_key)
);
CREATE INDEX IF NOT EXISTS receipt_hash ON receipts(raw_hash);
CREATE TABLE IF NOT EXISTS manual_payments (
  order_id TEXT PRIMARY KEY REFERENCES shop_orders(id), bank_reference TEXT NOT NULL UNIQUE,
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0), receipt_id TEXT NOT NULL REFERENCES receipts(id),
  confirmed_by TEXT NOT NULL, confirmed_at TEXT NOT NULL, note TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS shop_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT REFERENCES shop_orders(id),
  event TEXT NOT NULL, actor TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS shop_events (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES shop_orders(id),
  version INTEGER NOT NULL, event TEXT NOT NULL, created_at TEXT NOT NULL,
  UNIQUE(order_id, version, event)
);
`
