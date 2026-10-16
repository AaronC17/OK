// server/store/runtime.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// src/config/store.ts
var store = {
  name: "Onky\u2019s",
  demo: true,
  categories: { dessertsEnabled: false },
  // Reactivar cuando haya catálogo y fotografías reales.
  currency: { code: "CRC", locale: "es-CR", fractionDigits: 2 },
  contact: { email: null, instagramUrl: null },
  heroImage: "/images/bolsa-mix.webp",
  heroImageAlt: "Bolsa transparente de gomitas enchiladas con chamoy y sticker de Onky\u2019s",
  gummies: {
    weights: [100, 200, 500],
    types: [
      {
        id: "ositos",
        name: "Ositos",
        coatingLabel: "enchilados",
        tag: "Peque\xF1os, con car\xE1cter",
        description: "El antojo de siempre, con un giro picosito.",
        image: "/images/ositos-bolsa.webp",
        imageAlt: "Bolsa de ositos enchilados con chamoy y sticker de Onky\u2019s",
        available: true,
        prices: { 100: 12e4, 200: 22e4, 500: 48e4 }
      },
      {
        id: "tiritas",
        name: "Tiritas",
        coatingLabel: "enchiladas",
        tag: "El lado m\xE1s dulce",
        description: "Capas de color y un toque de chile.",
        image: "/images/tiritas.jpg",
        imageAlt: "Tiritas y gomitas azucaradas de colores",
        imagePosition: "50% 38%",
        available: true,
        visible: false,
        // Oculto por ahora; reactivar cuando vuelva al catálogo.
        prices: { 100: 13e4, 200: 24e4, 500: 52e4 }
      },
      {
        id: "gusanitos",
        name: "Gusanitos",
        coatingLabel: "enchilados",
        tag: "Fuera de lo habitual",
        description: "Dulces, divertidos y con ese toque de picante.",
        image: "/images/gusanitos.jpg",
        imageAlt: "Gusanitos de gomita multicolor",
        available: true,
        visible: false,
        // Oculto por ahora; reactivar cuando vuelva al catálogo.
        prices: { 100: 12e4, 200: 23e4, 500: 5e5 }
      }
    ],
    mixes: {
      enabled: true,
      note: "Elige un solo tipo o mezcla dos o tres. El peso es el total de la bolsa; las proporciones se coordinan con la tienda.",
      // Combinaciones explícitas. Precios provisionales, no suplementos calculados.
      combinations: [
        { typeIds: ["ositos", "tiritas"], prices: { 100: 14e4, 200: 25e4, 500: 55e4 }, image: "/images/bolsa-mix.webp" },
        { typeIds: ["ositos", "gusanitos"], prices: { 100: 14e4, 200: 25e4, 500: 55e4 }, image: "/images/bolsa-mix.webp" },
        { typeIds: ["tiritas", "gusanitos"], prices: { 100: 14e4, 200: 25e4, 500: 55e4 }, image: "/images/bolsa-mix.webp" },
        { typeIds: ["ositos", "tiritas", "gusanitos"], prices: { 100: 14e4, 200: 25e4, 500: 55e4 }, image: "/images/bolsa-mix.webp" }
      ]
    }
  },
  desserts: [
    {
      id: "brownie",
      name: "Brownie de chocolate",
      tag: "Una pausa de chocolate",
      description: "Para ese momento que merece algo especial.",
      image: "/images/brownie.jpg",
      imageAlt: "Brownies de chocolate sobre un plato",
      imagePosition: "50% 52%",
      available: true,
      ingredients: null,
      allergenInfo: null,
      variants: [
        { id: "individual", label: "Individual", description: "1 unidad", priceMinor: 15e4, available: true },
        { id: "box-4", label: "Para compartir", description: "Caja de 4 unidades", priceMinor: 52e4, available: true }
      ]
    },
    {
      id: "cheesecake",
      name: "Cheesecake",
      tag: "Disfruta sin prisa",
      description: "Un peque\xF1o gusto para bajar el ritmo.",
      image: "/images/cheesecake.jpg",
      imageAlt: "Porci\xF3n de cheesecake con frutos rojos",
      imagePosition: "50% 50%",
      available: true,
      ingredients: null,
      allergenInfo: null,
      variants: [
        { id: "individual", label: "Para ti", description: "1 porci\xF3n", priceMinor: 24e4, available: true },
        { id: "duo", label: "Para dos", description: "2 porciones", priceMinor: 44e4, available: true }
      ]
    },
    {
      id: "cookies",
      name: "Galletas con chocolate",
      tag: "Mejor en buena compa\xF1\xEDa",
      description: "El detalle perfecto para acompa\xF1ar tu d\xEDa.",
      image: "/images/cookies.jpg",
      imageAlt: "Galletas con trocitos de chocolate",
      imagePosition: "50% 45%",
      available: true,
      ingredients: null,
      allergenInfo: null,
      variants: [
        { id: "duo", label: "Un peque\xF1o gusto", description: "2 unidades", priceMinor: 18e4, available: true },
        { id: "box-6", label: "Para compartir", description: "Caja de 6 unidades", priceMinor: 48e4, available: true }
      ]
    }
  ],
  deliveryMethods: [
    {
      id: "delivery",
      name: "Env\xEDo por Correos",
      description: "\u20A12.800 \xB7 Todo Costa Rica",
      enabled: true,
      requiresAddress: true,
      addressLabel: "Direcci\xF3n o punto de entrega",
      feeMinor: 28e4,
      freeAboveMinor: 15e5,
      coverage: "Todo Costa Rica",
      conditions: "Correos de Costa Rica: \u20A12.800. Env\xEDo gratis en compras mayores a \u20A115.000, sin contar el env\xEDo."
    },
    {
      id: "pickup",
      name: "Recogida",
      description: "Punto por coordinar",
      enabled: true,
      requiresAddress: false,
      feeMinor: 0,
      coverage: null,
      pickupPoint: null,
      conditions: "M\xE9todo de ejemplo sin cargo. Punto y horario pendientes de confirmar con la tienda."
    }
  ]
};

// server/store/database.ts
import { createHash as createHash2, randomBytes as randomBytes2, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

// server/store/schema.ts
var schema = `
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
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0), receipt_id TEXT REFERENCES receipts(id),
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
`;

// src/lib/shop.ts
var MAX_QUANTITY = 99;
function selectionKey(selection2) {
  return selection2.kind === "gummy" ? `gummy:${[...new Set(selection2.typeIds)].sort().join("+")}:${selection2.weight}` : `dessert:${selection2.productId}:${selection2.variantId}`;
}
function validPrice(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function resolveLine(item, config) {
  const { selection: selection2, quantity } = item;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) return null;
  const key = selectionKey(selection2);
  if (selection2.kind === "gummy") {
    if (!config.gummies.weights.includes(selection2.weight)) return null;
    const ids = [...new Set(selection2.typeIds)].sort();
    if (!ids.length || ids.length > 1 && !config.gummies.mixes.enabled) return null;
    const types = ids.map((id) => config.gummies.types.find((type) => type.id === id));
    if (types.some((type) => !type?.available)) return null;
    const first = types[0];
    const mix = ids.length > 1 ? config.gummies.mixes.combinations.find((combo) => [...combo.typeIds].sort().join("+") === ids.join("+")) : void 0;
    const price = ids.length === 1 ? first.prices[selection2.weight] : mix?.prices[selection2.weight];
    if (!validPrice(price)) return null;
    return {
      selection: { ...selection2, typeIds: ids },
      quantity,
      key,
      name: ids.length === 1 ? `${first.name} ${first.coatingLabel}` : "Mix de gomitas enchiladas",
      options: [ids.length > 1 ? "Mixto" : "Un solo tipo", types.map((type) => type.name).join(" + "), `${selection2.weight} g${ids.length > 1 ? " en total por bolsa" : " por bolsa"}`],
      image: mix?.image ?? first.variantImages?.[selection2.weight] ?? first.image,
      imageAlt: mix?.image ? config.heroImageAlt : first.imageAlt,
      unitPriceMinor: price,
      lineTotalMinor: price * quantity
    };
  }
  if (!config.categories.dessertsEnabled) return null;
  const dessert = config.desserts.find((product) => product.id === selection2.productId);
  const variant = dessert?.variants.find((variant2) => variant2.id === selection2.variantId);
  if (!dessert?.available || !variant?.available || !validPrice(variant.priceMinor)) return null;
  return {
    selection: selection2,
    quantity,
    key,
    name: dessert.name,
    options: ["Postre", variant.label, variant.description],
    image: variant.image ?? dessert.image,
    imageAlt: dessert.imageAlt,
    unitPriceMinor: variant.priceMinor,
    lineTotalMinor: variant.priceMinor * quantity
  };
}
function shippingFee(subtotal, method) {
  if (!method?.enabled || !validPrice(method.feeMinor)) return null;
  return validPrice(method.freeAboveMinor) && subtotal > method.freeAboveMinor ? 0 : method.feeMinor;
}
function totals(lines, method) {
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
  const shipping = shippingFee(subtotal, method);
  return { subtotal, shipping, total: shipping === null ? null : subtotal + shipping };
}
function validateCheckout(lines, customer, config) {
  const errors = {};
  if (!lines.length) errors.cart = "A\xF1ade alg\xFAn favorito para preparar tu pedido.";
  if (!customer.name.trim()) errors.name = "\xBFC\xF3mo te llamas? Escribe tu nombre.";
  else if (customer.name.trim().length > 100) errors.name = "Usa un nombre de hasta 100 caracteres.";
  const method = config.deliveryMethods.find((method2) => method2.id === customer.deliveryId && method2.enabled);
  if (!method) errors.deliveryId = "Elige c\xF3mo quieres recibir tu pedido.";
  if (method?.requiresAddress && !customer.address.trim()) errors.address = "Indica d\xF3nde te gustar\xEDa recibirlo.";
  else if (method?.requiresAddress && customer.address.trim().length > 500) errors.address = "La direcci\xF3n debe tener hasta 500 caracteres.";
  if (customer.notes.trim().length > 1e3) errors.notes = "Las observaciones deben tener hasta 1.000 caracteres.";
  return errors;
}

// server/payments/model.ts
var PaymentsError = class extends Error {
  status;
  constructor(status, message) {
    super(message);
    this.name = "PaymentsError";
    this.status = status;
  }
};

// server/payments/validation.ts
function object(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PaymentsError(422, "Se esperaba un objeto JSON.");
  return value;
}
function fields(data, allowed) {
  if (Object.keys(data).some((key) => !allowed.includes(key))) throw new PaymentsError(422, "El JSON contiene campos no permitidos.");
}
function text(value, max) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new PaymentsError(422, "Campo de texto ausente o inv\xE1lido.");
  return value.trim();
}
function selection(value) {
  const data = object(value);
  if (data.kind === "gummy") {
    fields(data, ["kind", "typeIds", "weight"]);
    if (!Array.isArray(data.typeIds) || data.typeIds.length < 1 || data.typeIds.length > 3 || ![100, 200, 500].includes(data.weight)) {
      throw new PaymentsError(422, "La selecci\xF3n de gomitas es inv\xE1lida.");
    }
    const typeIds = data.typeIds.map((id) => text(id, 64)).sort();
    if (new Set(typeIds).size !== typeIds.length) throw new PaymentsError(422, "Hay ingredientes repetidos.");
    return { kind: "gummy", typeIds, weight: data.weight };
  }
  if (data.kind === "dessert") {
    fields(data, ["kind", "productId", "variantId"]);
    return { kind: "dessert", productId: text(data.productId, 64), variantId: text(data.variantId, 64) };
  }
  throw new PaymentsError(422, "El producto no es v\xE1lido.");
}
function parseOrderInput(value) {
  const data = object(value);
  fields(data, ["items", "deliveryId"]);
  if (!Array.isArray(data.items) || !data.items.length || data.items.length > 100) throw new PaymentsError(422, "Se requieren entre 1 y 100 variantes.");
  const items = data.items.map((value2) => {
    const item = object(value2);
    fields(item, ["selection", "quantity"]);
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new PaymentsError(422, "Cantidad inv\xE1lida.");
    return { selection: selection(item.selection), quantity: item.quantity };
  });
  return { items, deliveryId: text(data.deliveryId, 64) };
}

// server/store/validation.ts
var StoreError = class extends Error {
  status;
  constructor(status, message) {
    super(message);
    this.name = "StoreError";
    this.status = status;
  }
};
function record(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new StoreError(422, "Se esperaba un objeto JSON.");
  return value;
}
function fields2(data, allowed) {
  if (Object.keys(data).some((key) => !allowed.includes(key))) throw new StoreError(422, "Hay campos no permitidos en la solicitud.");
}
function text2(value, min, max, label) {
  if (typeof value !== "string" || value.trim().length < min || value.length > max) throw new StoreError(422, `${label}: usa entre ${min} y ${max} caracteres.`);
  return value.trim();
}
function phoneNumber(value) {
  const raw = text2(value, 8, 24, "Tel\xE9fono").replace(/[\s()-]/g, "").replace(/^\+?506/, "");
  if (!/^[2-9]\d{7}$/.test(raw)) throw new StoreError(422, "Escribe un tel\xE9fono costarricense v\xE1lido de 8 d\xEDgitos.");
  return raw;
}
function bankReference(value) {
  const reference = text2(value, 6, 80, "Referencia bancaria").toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9/-]{5,79}$/.test(reference)) throw new StoreError(422, "La referencia bancaria debe contener de 6 a 80 letras, n\xFAmeros, guiones o barras, sin espacios.");
  return reference;
}
function orderCode(value) {
  const code = text2(value, 8, 20, "C\xF3digo de pedido").toUpperCase();
  if (!/^ONK-[A-F0-9]{4,16}$/.test(code)) throw new StoreError(422, "El c\xF3digo de pedido no tiene el formato esperado.");
  return code;
}
function minorAmount(value, allowZero = false) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < (allowZero ? 0 : 1) || value > 1e8) throw new StoreError(422, "Monto inv\xE1lido. Debe ser un entero en c\xE9ntimos de CRC, dentro del l\xEDmite t\xE9cnico de \u20A11.000.000.");
  return value;
}
function version(value) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) throw new StoreError(422, "Falta la versi\xF3n vigente del pedido. Actualiza la vista.");
  return value;
}
function parseSettings(value) {
  const data = record(value);
  fields2(data, ["enabled", "phone", "beneficiary"]);
  if (typeof data.enabled !== "boolean") throw new StoreError(422, "Indica si SINPE est\xE1 habilitado.");
  return {
    enabled: data.enabled,
    phone: data.enabled || data.phone ? phoneNumber(data.phone) : "",
    beneficiary: text2(data.beneficiary, data.enabled ? 3 : 0, 120, "Nombre del beneficiario")
  };
}
function parseNewOrder(value, config) {
  const data = record(value);
  fields2(data, ["items", "deliveryId", "customer", "privacyAccepted"]);
  if (data.privacyAccepted !== true) throw new StoreError(422, "Debes aceptar el uso de tus datos para gestionar el pedido y revisar el pago.");
  const input = parseOrderInput({ items: data.items, deliveryId: data.deliveryId });
  const rawCustomer = record(data.customer);
  fields2(rawCustomer, ["name", "phone", "address", "notes"]);
  const customer = {
    name: text2(rawCustomer.name, 1, 100, "Nombre"),
    phone: phoneNumber(rawCustomer.phone),
    address: text2(rawCustomer.address, 0, 500, "Direcci\xF3n"),
    notes: text2(rawCustomer.notes, 0, 1e3, "Observaciones")
  };
  const resolved = input.items.map((item) => {
    const line = resolveLine(item, config);
    if (!line) throw new StoreError(422, "Hay productos o precios no disponibles. Actualiza el carrito.");
    return line;
  });
  if (new Set(resolved.map((line) => line.key)).size !== resolved.length) throw new StoreError(422, "Hay variantes repetidas en el carrito.");
  const errors = validateCheckout(resolved, { ...customer, deliveryId: input.deliveryId }, config);
  if (Object.keys(errors).length) throw new StoreError(422, Object.values(errors)[0]);
  if (config.currency.code !== "CRC" || config.currency.fractionDigits !== 2) throw new StoreError(422, "La tienda debe usar CRC en c\xE9ntimos enteros.");
  const method = config.deliveryMethods.find((method2) => method2.id === input.deliveryId && method2.enabled);
  if (!method.requiresAddress) customer.address = "";
  const amounts = totals(resolved, method);
  minorAmount(amounts.subtotal);
  if (amounts.total !== null) minorAmount(amounts.total);
  const lines = resolved.map(({ key, name, options, quantity, unitPriceMinor, lineTotalMinor }) => ({ key, name, options, quantity, unitPriceMinor, lineTotalMinor }));
  return { input, customer, lines, amounts, delivery: { id: method.id, name: method.name, requiresAddress: method.requiresAddress } };
}

// server/store/security.ts
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
var tokenHash = (token) => createHash("sha256").update(token).digest("hex");
var newToken = () => randomBytes(32).toString("base64url");
var constantEqual = (a, b) => timingSafeEqual(Buffer.from(tokenHash(a), "hex"), Buffer.from(tokenHash(b), "hex"));
function passwordHash(value) {
  const password = text2(value, 12, 200, "Contrase\xF1a");
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 }).toString("hex")}`;
}
function passwordMatches(value, stored) {
  if (typeof value !== "string" || value.length > 200) return false;
  const [salt, hash] = stored.split(":");
  const actual = scryptSync(value.trim(), salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 });
  return hash.length === 128 && timingSafeEqual(actual, Buffer.from(hash, "hex"));
}
function generateSession(role, now = Date.now()) {
  const token = newToken();
  const session = { hash: tokenHash(token), role, csrf: newToken(), expiresAt: now + (role === "admin" ? 8 * 36e5 : 7 * 864e5) };
  return { token, session };
}
function createSession(db, role, now = Date.now()) {
  const { token, session } = generateSession(role, now);
  db.prepare("INSERT INTO sessions (token_hash, role, csrf, expires_at) VALUES (?, ?, ?, ?)").run(session.hash, role, session.csrf, session.expiresAt);
  return { token, session };
}
function findSession(db, token, role, now = Date.now()) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const row = db.prepare("SELECT * FROM sessions WHERE token_hash = ? AND role = ? AND expires_at > ?").get(tokenHash(token), role, now);
  return row ? { hash: row.token_hash, role, csrf: row.csrf, expiresAt: row.expires_at } : null;
}
function requireCsrf(session, supplied) {
  if (!supplied || !constantEqual(session.csrf, supplied)) throw new StoreError(403, "La sesi\xF3n de seguridad cambi\xF3. Actualiza la p\xE1gina antes de continuar.");
}
var RateLimits = class {
  entries = /* @__PURE__ */ new Map();
  clear(key) {
    this.entries.delete(key);
  }
  check(key, max, windowMs, now = Date.now()) {
    for (const [id, entry2] of this.entries) if (entry2.expires <= now) this.entries.delete(id);
    const entry = this.entries.get(key) ?? { count: 0, expires: now + windowMs };
    if (entry.count >= max || this.entries.size > 1e4) throw new StoreError(429, "Demasiados intentos. Espera unos minutos y vuelve a intentar.");
    entry.count++;
    this.entries.set(key, entry);
  }
};

// server/store/database.ts
var statuses = ["pending_details", "awaiting_payment", "pending_review", "ready", "rejected"];
var timestamp = () => (/* @__PURE__ */ new Date()).toISOString();
var ShopDatabase = class {
  database;
  catalog;
  constructor(path, catalog) {
    this.database = new DatabaseSync(path);
    this.catalog = catalog;
    this.database.exec(schema);
    const receiptCol = this.database.prepare(`SELECT "notnull" FROM pragma_table_info('manual_payments') WHERE name = 'receipt_id'`).get();
    if (receiptCol?.notnull === 1) {
      this.transaction(() => {
        this.database.exec(`
          ALTER TABLE manual_payments RENAME TO manual_payments_old;
          CREATE TABLE manual_payments (
            order_id TEXT PRIMARY KEY REFERENCES shop_orders(id), bank_reference TEXT NOT NULL UNIQUE,
            amount_minor INTEGER NOT NULL CHECK (amount_minor > 0), receipt_id TEXT REFERENCES receipts(id),
            confirmed_by TEXT NOT NULL, confirmed_at TEXT NOT NULL, note TEXT NOT NULL
          );
          INSERT INTO manual_payments SELECT * FROM manual_payments_old;
          DROP TABLE manual_payments_old;
        `);
      });
    }
    this.transaction(() => this.completePendingDetails());
  }
  close() {
    this.database.close();
  }
  transaction(operation) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
  audit(orderId, event, actor, detail) {
    this.database.prepare("INSERT INTO shop_audit (order_id, event, actor, detail, created_at) VALUES (?, ?, ?, ?, ?)").run(orderId, event, actor, detail, timestamp());
  }
  event(order, event) {
    this.database.prepare("INSERT INTO shop_events (id, order_id, version, event, created_at) VALUES (?, ?, ?, ?, ?)").run(randomUUID(), order.id, order.version, event, timestamp());
  }
  initialized() {
    return !!this.database.prepare("SELECT id FROM admin WHERE id = 1").get();
  }
  adminName() {
    return this.database.prepare("SELECT username FROM admin WHERE id = 1").get()?.username;
  }
  ensureSetupToken(token) {
    if (this.initialized()) return;
    this.database.prepare("INSERT INTO metadata (key, value) VALUES ('setup_hash', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(tokenHash(token));
  }
  setupAdmin(value) {
    const data = record(value);
    fields2(data, ["setupToken", "username", "password"]);
    const username = text2(data.username, 3, 40, "Usuario").toLowerCase();
    if (!/^[a-z0-9._-]+$/.test(username)) throw new StoreError(422, "El usuario solo admite letras, n\xFAmeros, puntos, guiones y guiones bajos.");
    const setupToken = text2(data.setupToken, 43, 43, "C\xF3digo de instalaci\xF3n");
    if (this.initialized()) throw new StoreError(409, "La administraci\xF3n ya fue configurada. Inicia sesi\xF3n.");
    const expected = this.database.prepare("SELECT value FROM metadata WHERE key = 'setup_hash'").get()?.value;
    if (!expected || !constantEqual(tokenHash(setupToken), expected)) throw new StoreError(403, "C\xF3digo de instalaci\xF3n incorrecto.");
    const hash = passwordHash(data.password);
    return this.transaction(() => {
      if (this.initialized()) throw new StoreError(409, "La administraci\xF3n ya fue configurada.");
      this.database.prepare("INSERT INTO admin (id, username, password_hash) VALUES (1, ?, ?)").run(username, hash);
      this.database.prepare("DELETE FROM metadata WHERE key = 'setup_hash'").run();
      this.audit(null, "admin.created", username, "Configuraci\xF3n inicial completada.");
      return createSession(this.database, "admin");
    });
  }
  login(value) {
    const data = record(value);
    fields2(data, ["username", "password"]);
    const username = text2(data.username, 1, 40, "Usuario").toLowerCase();
    const admin = this.database.prepare("SELECT username, password_hash FROM admin WHERE id = 1").get();
    if (!admin || !constantEqual(username, admin.username) || !passwordMatches(data.password, admin.password_hash)) throw new StoreError(401, "Usuario o contrase\xF1a incorrectos.");
    this.database.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
    return createSession(this.database, "admin");
  }
  session(token, role) {
    return findSession(this.database, token, role);
  }
  customerSession(token) {
    const existing = this.session(token, "customer");
    if (existing) return { session: existing, token: null };
    this.database.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
    return createSession(this.database, "customer");
  }
  logout(session) {
    this.database.prepare("DELETE FROM sessions WHERE token_hash = ?").run(session.hash);
  }
  settings() {
    const value = this.database.prepare("SELECT value FROM metadata WHERE key = 'sinpe'").get()?.value;
    return value ? JSON.parse(value) : { enabled: false, phone: "", beneficiary: "" };
  }
  destination() {
    const settings = this.settings();
    return settings.enabled ? { phone: settings.phone, beneficiary: settings.beneficiary, bank: "BAC Credomatic" } : null;
  }
  configure(value, actor) {
    const settings = parseSettings(value);
    return this.transaction(() => {
      this.database.prepare("INSERT INTO metadata (key, value) VALUES ('sinpe', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(settings));
      this.audit(null, "sinpe.configured", actor, settings.enabled ? "Destino SINPE habilitado. Los pedidos con instrucciones conservan su destino original." : "Nuevas instrucciones SINPE deshabilitadas.");
      this.completePendingDetails();
      return settings;
    });
  }
  isDemo() {
    return this.catalog.demo;
  }
  completePendingDetails() {
    const destination = this.destination();
    for (const row of this.database.prepare("SELECT * FROM shop_orders WHERE status = 'pending_details' AND current_receipt_id IS NULL").all()) {
      const delivery = JSON.parse(row.delivery_json);
      const shipping = row.shipping_minor === null ? shippingFee(row.subtotal_minor, this.catalog.deliveryMethods.find((method) => method.id === delivery.id)) : row.shipping_minor;
      const total = shipping === null ? null : minorAmount(row.subtotal_minor + shipping);
      const savedDestination = destination ? JSON.stringify(destination) : row.destination_json;
      const status = total !== null && destination ? "awaiting_payment" : "pending_details";
      if (shipping === row.shipping_minor && total === row.total_minor && savedDestination === row.destination_json && status === row.status) continue;
      this.database.prepare("UPDATE shop_orders SET shipping_minor = ?, total_minor = ?, destination_json = ?, status = ?, version = version + 1, updated_at = ? WHERE id = ?").run(shipping, total, savedDestination, status, timestamp(), row.id);
      this.audit(row.id, "order.details_completed", "system", "Entrega calculada autom\xE1ticamente. Las instrucciones SINPE se habilitan cuando el destino est\xE1 configurado.");
    }
  }
  fromRow(row) {
    const receipt = row.current_receipt_id ? this.database.prepare("SELECT id, content_type, size, submitted_at, bank_reference FROM receipts WHERE id = ? AND order_id = ?").get(row.current_receipt_id, row.id) : void 0;
    return {
      id: row.id,
      code: row.code,
      version: row.version,
      status: row.status,
      demo: row.demo === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lines: JSON.parse(row.lines_json),
      customer: JSON.parse(row.customer_json),
      delivery: JSON.parse(row.delivery_json),
      destination: row.destination_json ? JSON.parse(row.destination_json) : null,
      subtotalMinor: row.subtotal_minor,
      shippingMinor: row.shipping_minor,
      totalMinor: row.total_minor,
      receipt: receipt ? { id: receipt.id, contentType: receipt.content_type, size: receipt.size, submittedAt: receipt.submitted_at, bankReference: receipt.bank_reference } : null,
      customerMessage: row.customer_message,
      paymentConfirmedAt: row.payment_confirmed_at,
      paymentVerification: row.payment_confirmed_at ? "manual" : null
    };
  }
  getOrder(id) {
    const row = this.database.prepare("SELECT * FROM shop_orders WHERE id = ?").get(id);
    if (!row) throw new StoreError(404, "Pedido no encontrado.");
    return this.fromRow(row);
  }
  customerOrder(id, owner) {
    const row = this.database.prepare("SELECT * FROM shop_orders WHERE id = ? AND owner_hash = ?").get(id, owner);
    if (!row) throw new StoreError(404, "Pedido no encontrado en esta sesi\xF3n.");
    return this.fromRow(row);
  }
  currentOrder(owner) {
    const row = this.database.prepare("SELECT * FROM shop_orders WHERE owner_hash = ? ORDER BY created_at DESC, rowid DESC LIMIT 1").get(owner);
    return row ? this.fromRow(row) : null;
  }
  createOrder(value, owner, key) {
    if (!/^[A-Za-z0-9-]{16,128}$/.test(key)) throw new StoreError(422, "Falta una clave de idempotencia v\xE1lida.");
    record(value);
    const hash = createHash2("sha256").update(JSON.stringify(value)).digest("hex");
    return this.transaction(() => {
      const previous = this.database.prepare("SELECT * FROM shop_orders WHERE owner_hash = ? AND idempotency_key = ?").get(owner, key);
      if (previous) {
        if (previous.request_hash !== hash) throw new StoreError(409, "Esta solicitud ya corresponde a otro carrito. Actualiza los datos.");
        return this.fromRow(previous);
      }
      const parsed = parseNewOrder(value, this.catalog);
      const destination = this.destination();
      const ready = destination !== null && parsed.amounts.total !== null;
      const id = randomUUID();
      const code = `ONK-${randomBytes2(2).toString("hex").toUpperCase()}`;
      const now = timestamp();
      this.database.prepare(`INSERT INTO shop_orders
        (id, code, owner_hash, idempotency_key, request_hash, status, demo, created_at, updated_at, lines_json, customer_json, delivery_json,
         destination_json, subtotal_minor, shipping_minor, total_minor, privacy_version, privacy_accepted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sinpe-checkout-v1', ?)`).run(
        id,
        code,
        owner,
        key,
        hash,
        ready ? "awaiting_payment" : "pending_details",
        this.catalog.demo ? 1 : 0,
        now,
        now,
        JSON.stringify(parsed.lines),
        JSON.stringify(parsed.customer),
        JSON.stringify(parsed.delivery),
        destination ? JSON.stringify(destination) : null,
        parsed.amounts.subtotal,
        parsed.amounts.shipping,
        parsed.amounts.total,
        now
      );
      this.audit(id, "order.created", "customer", ready ? "Pedido registrado. Pendiente de pago; no se ha verificado ning\xFAn abono." : "Pedido registrado. No solicitar pago hasta confirmar destino y total.");
      const order = this.getOrder(id);
      this.event(order, "order.created");
      return order;
    });
  }
  assertCode(order, supplied) {
    if (!constantEqual(order.code, orderCode(supplied))) throw new StoreError(422, "El c\xF3digo no corresponde a este pedido. Copia exactamente el c\xF3digo mostrado.");
  }
  checkUpload(id, owner, suppliedCode) {
    const order = this.customerOrder(id, owner);
    if (suppliedCode !== void 0 && suppliedCode !== null && suppliedCode !== "") this.assertCode(order, suppliedCode);
    return order;
  }
  addReceipt(id, owner, suppliedCode, suppliedReference, uploadKey, suppliedVersion, file) {
    const key = text2(uploadKey, 16, 128, "Identificador de carga");
    const expectedVersion = version(suppliedVersion);
    return this.transaction(() => {
      const order = this.checkUpload(id, owner, suppliedCode);
      const reference = suppliedReference === void 0 || suppliedReference === null || suppliedReference === "" ? bankReference(`${order.code}-${key.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase()}`) : bankReference(suppliedReference);
      const previous = this.database.prepare("SELECT * FROM receipts WHERE order_id = ? AND upload_key = ?").get(id, key);
      if (previous) {
        if (previous.raw_hash !== file.rawHash || previous.bank_reference !== reference) throw new StoreError(409, "La carga repetida contiene datos distintos. Actualiza el pedido.");
        return order;
      }
      if (order.version !== expectedVersion) throw new StoreError(409, "El pedido cambi\xF3 mientras adjuntabas el comprobante. Actualiza su estado.");
      if (order.status !== "awaiting_payment" && order.status !== "rejected") throw new StoreError(409, "Este pedido no admite un nuevo comprobante en su estado actual.");
      if (!order.destination || order.totalMinor === null) throw new StoreError(409, "Primero deben confirmarse el destino SINPE y el total.");
      const duplicate = this.database.prepare("SELECT order_id FROM receipts WHERE raw_hash = ? AND order_id != ?").get(file.rawHash, id);
      if (duplicate) throw new StoreError(409, "Este comprobante ya est\xE1 asociado a otro pedido. Adjunta el comprobante correspondiente.");
      const count = Number(this.database.prepare("SELECT count(*) AS count FROM receipts WHERE order_id = ?").get(id).count);
      if (count >= 5) throw new StoreError(409, "Este pedido alcanz\xF3 el l\xEDmite de correcciones. La tienda debe revisar el historial.");
      const receiptId = randomUUID();
      const now = timestamp();
      this.database.prepare("INSERT INTO receipts (id, order_id, upload_key, raw_hash, content_type, size, data, submitted_at, bank_reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(receiptId, id, key, file.rawHash, file.contentType, file.data.length, file.data, now, reference);
      this.database.prepare("UPDATE shop_orders SET current_receipt_id = ?, status = 'pending_review', customer_message = NULL, version = version + 1, updated_at = ? WHERE id = ?").run(receiptId, now, id);
      this.audit(id, "receipt.submitted", "customer", "C\xF3digo validado y comprobante recibido. Esto no confirma el pago.");
      const updated = this.getOrder(id);
      this.event(updated, "payment.review_requested");
      return updated;
    });
  }
  receipt(orderId, receiptId) {
    const row = this.database.prepare("SELECT data, content_type FROM receipts WHERE order_id = ? AND id = ?").get(orderId, receiptId);
    if (!row) throw new StoreError(404, "Comprobante no encontrado.");
    return { data: Buffer.from(row.data), contentType: row.content_type };
  }
  confirm(id, value, actor) {
    const data = record(value);
    fields2(data, ["version", "receiptId"]);
    const expectedVersion = version(data.version);
    const receiptId = data.receiptId === void 0 || data.receiptId === null ? null : text2(data.receiptId, 36, 36, "Comprobante revisado");
    return this.transaction(() => {
      const order = this.getOrder(id);
      const existing = this.database.prepare("SELECT receipt_id FROM manual_payments WHERE order_id = ?").get(id);
      if (order.status === "ready" && existing && (receiptId === null || existing.receipt_id === receiptId)) return order;
      if (order.version !== expectedVersion || order.status === "ready") throw new StoreError(409, "El pedido cambi\xF3 o no tiene este comprobante pendiente de revisi\xF3n. Actualiza la vista.");
      if (receiptId !== null && (order.status !== "pending_review" || !order.receipt || order.receipt.id !== receiptId || !order.destination || order.totalMinor === null)) {
        throw new StoreError(409, "El pedido cambi\xF3 o no tiene este comprobante pendiente de revisi\xF3n. Actualiza la vista.");
      }
      const useReceipt = order.receipt && order.status === "pending_review" ? order.receipt : null;
      const reference = useReceipt ? bankReference(useReceipt.bankReference) : `MANUAL-${order.code}`;
      const amount = minorAmount(order.totalMinor ?? order.subtotalMinor);
      const note = useReceipt ? "Confirmado manualmente por el administrador al revisar el pedido, su c\xF3digo y el comprobante. Sin consulta bancaria autom\xE1tica." : "Confirmado manualmente por el administrador tras verificar el pago. Sin consulta bancaria autom\xE1tica.";
      if (this.database.prepare("SELECT order_id FROM manual_payments WHERE bank_reference = ? AND order_id != ?").get(reference, id)) throw new StoreError(409, "Esta referencia bancaria ya fue utilizada para confirmar otro pedido.");
      const now = timestamp();
      this.database.prepare("INSERT INTO manual_payments (order_id, bank_reference, amount_minor, receipt_id, confirmed_by, confirmed_at, note) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, reference, amount, useReceipt?.id ?? null, actor, now, note);
      this.database.prepare("UPDATE shop_orders SET status = 'ready', payment_confirmed_at = ?, customer_message = NULL, version = version + 1, updated_at = ? WHERE id = ?").run(now, now, id);
      this.audit(id, "payment.confirmed_manual", actor, note);
      const updated = this.getOrder(id);
      this.event(updated, "payment.confirmed_manual");
      return updated;
    });
  }
  reject(id, value, actor) {
    const data = record(value);
    fields2(data, ["version", "reason"]);
    const expectedVersion = version(data.version);
    const reason = text2(data.reason, 5, 500, "Motivo de correcci\xF3n");
    return this.transaction(() => {
      const order = this.getOrder(id);
      if (order.status !== "pending_review" || order.version !== expectedVersion) throw new StoreError(409, "El pedido ya no tiene esta revisi\xF3n pendiente. Actualiza la vista.");
      this.database.prepare("UPDATE shop_orders SET status = 'rejected', customer_message = ?, version = version + 1, updated_at = ? WHERE id = ?").run(reason, timestamp(), id);
      this.audit(id, "receipt.correction_requested", actor, reason);
      return this.getOrder(id);
    });
  }
  auditFor(id) {
    this.getOrder(id);
    return this.database.prepare("SELECT event, actor, detail, created_at AS createdAt FROM shop_audit WHERE order_id = ? ORDER BY id").all(id);
  }
  list(query) {
    const page = Math.max(1, Math.min(1e5, Number.parseInt(query.get("page") ?? "1", 10) || 1));
    const filter = query.get("status") ?? "all";
    const search = (query.get("q") ?? "").trim().slice(0, 80);
    const conditions = [];
    const parameters = [];
    if (filter === "pending") conditions.push("status IN ('pending_details', 'awaiting_payment', 'pending_review', 'rejected')");
    else if (statuses.includes(filter)) {
      conditions.push("status = ?");
      parameters.push(filter);
    } else if (filter !== "all") throw new StoreError(422, "Filtro de estado inv\xE1lido.");
    if (search) {
      conditions.push("(code LIKE ? ESCAPE '\\' OR customer_json LIKE ? ESCAPE '\\')");
      const like = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
      parameters.push(like, like);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const total = Number(this.database.prepare(`SELECT count(*) AS count FROM shop_orders ${where}`).get(...parameters).count);
    const orders = this.database.prepare(`SELECT * FROM shop_orders ${where} ORDER BY created_at DESC, rowid DESC LIMIT 50 OFFSET ?`).all(...parameters, (page - 1) * 50).map((row) => this.fromRow(row));
    const counts = Object.fromEntries(statuses.map((status) => [status, 0]));
    for (const row of this.database.prepare("SELECT status, count(*) AS count FROM shop_orders GROUP BY status").all()) counts[row.status] = Number(row.count);
    return { orders, counts, total, page, pageSize: 50 };
  }
};

// server/store/mongo.ts
import { createHash as createHash3, randomBytes as randomBytes3, randomUUID as randomUUID2 } from "node:crypto";
import { MongoClient } from "mongodb";
var statuses2 = ["pending_details", "awaiting_payment", "pending_review", "ready", "rejected"];
var timestamp2 = () => (/* @__PURE__ */ new Date()).toISOString();
var MongoShopDatabase = class {
  client;
  db;
  catalog;
  initializedPromise = null;
  constructor(uri, catalog, options = {}) {
    this.client = new MongoClient(uri);
    this.db = this.client.db(options.dbName || "onkys");
    this.catalog = catalog;
  }
  collection(name) {
    return this.db.collection(name);
  }
  async init() {
    if (!this.initializedPromise) {
      this.initializedPromise = (async () => {
        await Promise.all([
          this.collection("metadata").createIndex({ key: 1 }, { unique: true }),
          this.collection("admin").createIndex({ id: 1 }, { unique: true }),
          this.collection("sessions").createIndex({ token_hash: 1 }, { unique: true }),
          this.collection("sessions").createIndex({ expires_at: 1 }),
          this.collection("shop_orders").createIndex({ code: 1 }, { unique: true }),
          this.collection("shop_orders").createIndex({ owner_hash: 1, idempotency_key: 1 }, { unique: true }),
          this.collection("shop_orders").createIndex({ status: 1, created_at: -1 }),
          this.collection("receipts").createIndex({ order_id: 1, upload_key: 1 }, { unique: true }),
          this.collection("receipts").createIndex({ raw_hash: 1 }),
          this.collection("manual_payments").createIndex({ bank_reference: 1 }, { unique: true }),
          this.collection("shop_audit").createIndex({ order_id: 1, created_at: 1 }),
          this.collection("shop_events").createIndex({ order_id: 1, version: 1, event: 1 }, { unique: true })
        ]);
        await this.completePendingDetails();
      })();
    }
    return this.initializedPromise;
  }
  async close() {
    await this.client.close();
  }
  async transaction(operation) {
    const session = this.client.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await operation(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }
  async audit(orderId, event, actor, detail, session) {
    const docId = `audit_${randomUUID2()}`;
    await this.collection("shop_audit").insertOne({
      _id: docId,
      id: docId,
      order_id: orderId,
      event,
      actor,
      detail,
      created_at: timestamp2()
    }, { session });
  }
  async event(order, event, session) {
    const id = randomUUID2();
    await this.collection("shop_events").insertOne({
      _id: id,
      id,
      order_id: order.id,
      version: order.version,
      event,
      created_at: timestamp2()
    }, { session });
  }
  async initialized() {
    const admin = await this.collection("admin").findOne({ id: 1 });
    return !!admin;
  }
  async adminName() {
    const admin = await this.collection("admin").findOne({ id: 1 });
    return admin?.username;
  }
  async ensureSetupToken(token) {
    if (await this.initialized()) return;
    await this.collection("metadata").updateOne(
      { key: "setup_hash" },
      { $set: { _id: "setup_hash", key: "setup_hash", value: tokenHash(token) } },
      { upsert: true }
    );
  }
  async setupAdmin(value) {
    const data = record(value);
    fields2(data, ["setupToken", "username", "password"]);
    const username = text2(data.username, 3, 40, "Usuario").toLowerCase();
    if (!/^[a-z0-9._-]+$/.test(username)) throw new StoreError(422, "El usuario solo admite letras, n\xFAmeros, puntos, guiones y guiones bajos.");
    const setupToken = text2(data.setupToken, 43, 43, "C\xF3digo de instalaci\xF3n");
    if (await this.initialized()) throw new StoreError(409, "La administraci\xF3n ya fue configurada. Inicia sesi\xF3n.");
    const meta = await this.collection("metadata").findOne({ key: "setup_hash" });
    const expected = meta?.value;
    if (!expected || !constantEqual(tokenHash(setupToken), expected)) throw new StoreError(403, "C\xF3digo de instalaci\xF3n incorrecto.");
    const hash = passwordHash(data.password);
    return this.transaction(async (session) => {
      if (await this.initialized()) throw new StoreError(409, "La administraci\xF3n ya fue configurada.");
      await this.collection("admin").insertOne({ _id: 1, id: 1, username, password_hash: hash }, { session });
      await this.collection("metadata").deleteOne({ key: "setup_hash" }, { session });
      await this.audit(null, "admin.created", username, "Configuraci\xF3n inicial completada.", session);
      return this.createAdminSession(session);
    });
  }
  async login(value) {
    const data = record(value);
    fields2(data, ["username", "password"]);
    const username = text2(data.username, 1, 40, "Usuario").toLowerCase();
    const admin = await this.collection("admin").findOne({ id: 1 });
    if (!admin || !constantEqual(username, admin.username) || !passwordMatches(data.password, admin.password_hash)) throw new StoreError(401, "Usuario o contrase\xF1a incorrectos.");
    await this.collection("sessions").deleteMany({ expires_at: { $lte: Date.now() } });
    return this.createAdminSession();
  }
  async createAdminSession(session) {
    const { token, session: newSession } = generateSession("admin");
    await this.collection("sessions").updateOne(
      { token_hash: newSession.hash },
      { $set: { _id: newSession.hash, token_hash: newSession.hash, role: newSession.role, csrf: newSession.csrf, expires_at: newSession.expiresAt } },
      { upsert: true, session }
    );
    return { token, session: newSession };
  }
  async session(token, role) {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const hash = tokenHash(token);
    const doc = await this.collection("sessions").findOne({ token_hash: hash, role, expires_at: { $gt: Date.now() } });
    return doc ? { hash: doc.token_hash, role, csrf: doc.csrf, expiresAt: doc.expires_at } : null;
  }
  async customerSession(token) {
    const existing = await this.session(token, "customer");
    if (existing) return { session: existing, token: null };
    await this.collection("sessions").deleteMany({ expires_at: { $lte: Date.now() } });
    const { token: newTokenValue, session } = generateSession("customer");
    await this.collection("sessions").updateOne(
      { token_hash: session.hash },
      { $set: { _id: session.hash, token_hash: session.hash, role: session.role, csrf: session.csrf, expires_at: session.expiresAt } },
      { upsert: true }
    );
    return { session, token: newTokenValue };
  }
  async logout(session) {
    await this.collection("sessions").deleteOne({ token_hash: session.hash });
  }
  async settings() {
    const doc = await this.collection("metadata").findOne({ key: "sinpe" });
    return doc?.value ? JSON.parse(doc.value) : { enabled: false, phone: "", beneficiary: "" };
  }
  async destination() {
    const settings = await this.settings();
    return settings.enabled ? { phone: settings.phone, beneficiary: settings.beneficiary, bank: "BAC Credomatic" } : null;
  }
  async configure(value, actor) {
    const settings = parseSettings(value);
    return this.transaction(async (session) => {
      await this.collection("metadata").updateOne(
        { key: "sinpe" },
        { $set: { _id: "sinpe", key: "sinpe", value: JSON.stringify(settings) } },
        { upsert: true, session }
      );
      await this.audit(null, "sinpe.configured", actor, settings.enabled ? "Destino SINPE habilitado. Los pedidos con instrucciones conservan su destino original." : "Nuevas instrucciones SINPE deshabilitadas.", session);
      await this.completePendingDetails(session);
      return settings;
    });
  }
  isDemo() {
    return this.catalog.demo;
  }
  async completePendingDetails(session) {
    const destination = await this.destination();
    const cursor = this.collection("shop_orders").find({ status: "pending_details", current_receipt_id: null }, { session });
    for await (const row of cursor) {
      const delivery = JSON.parse(row.delivery_json);
      const shipping = row.shipping_minor === null ? shippingFee(row.subtotal_minor, this.catalog.deliveryMethods.find((method) => method.id === delivery.id)) : row.shipping_minor;
      const total = shipping === null ? null : minorAmount(row.subtotal_minor + shipping);
      const savedDestination = destination ? JSON.stringify(destination) : row.destination_json;
      const status = total !== null && destination ? "awaiting_payment" : "pending_details";
      if (shipping === row.shipping_minor && total === row.total_minor && savedDestination === row.destination_json && status === row.status) continue;
      await this.collection("shop_orders").updateOne(
        { _id: row._id },
        {
          $set: {
            shipping_minor: shipping,
            total_minor: total,
            destination_json: savedDestination,
            status,
            updated_at: timestamp2()
          },
          $inc: { version: 1 }
        },
        { session }
      );
      await this.audit(row.id, "order.details_completed", "system", "Entrega calculada autom\xE1ticamente. Las instrucciones SINPE se habilitan cuando el destino est\xE1 configurado.", session);
    }
  }
  async fromDoc(row, session) {
    let receipt = null;
    if (row.current_receipt_id) {
      receipt = await this.collection("receipts").findOne({ id: row.current_receipt_id, order_id: row.id }, { session });
    }
    return {
      id: row.id,
      code: row.code,
      version: row.version,
      status: row.status,
      demo: row.demo === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lines: JSON.parse(row.lines_json),
      customer: JSON.parse(row.customer_json),
      delivery: JSON.parse(row.delivery_json),
      destination: row.destination_json ? JSON.parse(row.destination_json) : null,
      subtotalMinor: row.subtotal_minor,
      shippingMinor: row.shipping_minor,
      totalMinor: row.total_minor,
      receipt: receipt ? {
        id: receipt.id,
        contentType: receipt.content_type,
        size: receipt.size,
        submittedAt: receipt.submitted_at,
        bankReference: receipt.bank_reference
      } : null,
      customerMessage: row.customer_message,
      paymentConfirmedAt: row.payment_confirmed_at,
      paymentVerification: row.payment_confirmed_at ? "manual" : null
    };
  }
  async getOrder(id, session) {
    const row = await this.collection("shop_orders").findOne({ id }, { session });
    if (!row) throw new StoreError(404, "Pedido no encontrado.");
    return this.fromDoc(row, session);
  }
  async customerOrder(id, owner) {
    const row = await this.collection("shop_orders").findOne({ id, owner_hash: owner });
    if (!row) throw new StoreError(404, "Pedido no encontrado en esta sesi\xF3n.");
    return this.fromDoc(row);
  }
  async currentOrder(owner) {
    const row = await this.collection("shop_orders").findOne({ owner_hash: owner }, { sort: { created_at: -1, _id: -1 } });
    return row ? this.fromDoc(row) : null;
  }
  async createOrder(value, owner, key) {
    if (!/^[A-Za-z0-9-]{16,128}$/.test(key)) throw new StoreError(422, "Falta una clave de idempotencia v\xE1lida.");
    record(value);
    const hash = createHash3("sha256").update(JSON.stringify(value)).digest("hex");
    return this.transaction(async (session) => {
      const previous = await this.collection("shop_orders").findOne({ owner_hash: owner, idempotency_key: key }, { session });
      if (previous) {
        if (previous.request_hash !== hash) throw new StoreError(409, "Esta solicitud ya corresponde a otro carrito. Actualiza los datos.");
        return this.fromDoc(previous, session);
      }
      const parsed = parseNewOrder(value, this.catalog);
      const destination = await this.destination();
      const ready = destination !== null && parsed.amounts.total !== null;
      const id = randomUUID2();
      const code = `ONK-${randomBytes3(2).toString("hex").toUpperCase()}`;
      const now = timestamp2();
      const newOrder = {
        _id: id,
        id,
        code,
        owner_hash: owner,
        idempotency_key: key,
        request_hash: hash,
        version: 1,
        status: ready ? "awaiting_payment" : "pending_details",
        demo: this.catalog.demo ? 1 : 0,
        created_at: now,
        updated_at: now,
        lines_json: JSON.stringify(parsed.lines),
        customer_json: JSON.stringify(parsed.customer),
        delivery_json: JSON.stringify(parsed.delivery),
        destination_json: destination ? JSON.stringify(destination) : null,
        subtotal_minor: parsed.amounts.subtotal,
        shipping_minor: parsed.amounts.shipping,
        total_minor: parsed.amounts.total,
        current_receipt_id: null,
        customer_message: null,
        payment_confirmed_at: null,
        privacy_version: "sinpe-checkout-v1",
        privacy_accepted_at: now
      };
      await this.collection("shop_orders").insertOne(newOrder, { session });
      await this.audit(id, "order.created", "customer", ready ? "Pedido registrado. Pendiente de pago; no se ha verificado ning\xFAn abono." : "Pedido registrado. No solicitar pago hasta confirmar destino y total.", session);
      const order = await this.getOrder(id, session);
      await this.event(order, "order.created", session);
      return order;
    });
  }
  assertCode(order, supplied) {
    if (!constantEqual(order.code, orderCode(supplied))) throw new StoreError(422, "El c\xF3digo no corresponde a este pedido. Copia exactamente el c\xF3digo mostrado.");
  }
  async checkUpload(id, owner, suppliedCode) {
    const order = await this.customerOrder(id, owner);
    if (suppliedCode !== void 0 && suppliedCode !== null && suppliedCode !== "") this.assertCode(order, suppliedCode);
    return order;
  }
  async addReceipt(id, owner, suppliedCode, suppliedReference, uploadKey, suppliedVersion, file) {
    const key = text2(uploadKey, 16, 128, "Identificador de carga");
    const expectedVersion = version(suppliedVersion);
    return this.transaction(async (session) => {
      const order = await this.checkUpload(id, owner, suppliedCode);
      const reference = suppliedReference === void 0 || suppliedReference === null || suppliedReference === "" ? bankReference(`${order.code}-${key.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase()}`) : bankReference(suppliedReference);
      const previous = await this.collection("receipts").findOne({ order_id: id, upload_key: key }, { session });
      if (previous) {
        if (previous.raw_hash !== file.rawHash || previous.bank_reference !== reference) throw new StoreError(409, "La carga repetida contiene datos distintos. Actualiza el pedido.");
        return order;
      }
      if (order.version !== expectedVersion) throw new StoreError(409, "El pedido cambi\xF3 mientras adjuntabas el comprobante. Actualiza su estado.");
      if (order.status !== "awaiting_payment" && order.status !== "rejected") throw new StoreError(409, "Este pedido no admite un nuevo comprobante en su estado actual.");
      if (!order.destination || order.totalMinor === null) throw new StoreError(409, "Primero deben confirmarse el destino SINPE y el total.");
      const duplicate = await this.collection("receipts").findOne({ raw_hash: file.rawHash, order_id: { $ne: id } }, { session });
      if (duplicate) throw new StoreError(409, "Este comprobante ya est\xE1 asociado a otro pedido. Adjunta el comprobante correspondiente.");
      const count = await this.collection("receipts").countDocuments({ order_id: id }, { session });
      if (count >= 5) throw new StoreError(409, "Este pedido alcanz\xF3 el l\xEDmite de correcciones. La tienda debe revisar el historial.");
      const receiptId = randomUUID2();
      const now = timestamp2();
      await this.collection("receipts").insertOne({
        _id: receiptId,
        id: receiptId,
        order_id: id,
        upload_key: key,
        raw_hash: file.rawHash,
        content_type: file.contentType,
        size: file.data.length,
        data: file.data,
        submitted_at: now,
        bank_reference: reference
      }, { session });
      await this.collection("shop_orders").updateOne(
        { id },
        {
          $set: { current_receipt_id: receiptId, status: "pending_review", customer_message: null, updated_at: now },
          $inc: { version: 1 }
        },
        { session }
      );
      await this.audit(id, "receipt.submitted", "customer", "C\xF3digo validado y comprobante recibido. Esto no confirma el pago.", session);
      const updated = await this.getOrder(id, session);
      await this.event(updated, "payment.review_requested", session);
      return updated;
    });
  }
  async receipt(orderId, receiptId) {
    const row = await this.collection("receipts").findOne({ order_id: orderId, id: receiptId });
    if (!row) throw new StoreError(404, "Comprobante no encontrado.");
    const buffer = Buffer.isBuffer(row.data) ? row.data : row.data?.buffer ? Buffer.from(row.data.buffer) : Buffer.from(row.data);
    return { data: buffer, contentType: row.content_type };
  }
  async confirm(id, value, actor) {
    const data = record(value);
    fields2(data, ["version", "receiptId"]);
    const expectedVersion = version(data.version);
    const receiptId = data.receiptId === void 0 || data.receiptId === null ? null : text2(data.receiptId, 36, 36, "Comprobante revisado");
    return this.transaction(async (session) => {
      const order = await this.getOrder(id, session);
      const existing = await this.collection("manual_payments").findOne({ order_id: id }, { session });
      if (order.status === "ready" && existing && (receiptId === null || existing.receipt_id === receiptId)) return order;
      if (order.version !== expectedVersion || order.status === "ready") throw new StoreError(409, "El pedido cambi\xF3 o no tiene este comprobante pendiente de revisi\xF3n. Actualiza la vista.");
      if (receiptId !== null && (order.status !== "pending_review" || !order.receipt || order.receipt.id !== receiptId || !order.destination || order.totalMinor === null)) {
        throw new StoreError(409, "El pedido cambi\xF3 o no tiene este comprobante pendiente de revisi\xF3n. Actualiza la vista.");
      }
      const useReceipt = order.receipt && order.status === "pending_review" ? order.receipt : null;
      const reference = useReceipt ? bankReference(useReceipt.bankReference) : `MANUAL-${order.code}`;
      const amount = minorAmount(order.totalMinor ?? order.subtotalMinor);
      const note = useReceipt ? "Confirmado manualmente por el administrador al revisar el pedido, su c\xF3digo y el comprobante. Sin consulta bancaria autom\xE1tica." : "Confirmado manualmente por el administrador tras verificar el pago. Sin consulta bancaria autom\xE1tica.";
      const dup = await this.collection("manual_payments").findOne({ bank_reference: reference, order_id: { $ne: id } }, { session });
      if (dup) throw new StoreError(409, "Esta referencia bancaria ya fue utilizada para confirmar otro pedido.");
      const now = timestamp2();
      await this.collection("manual_payments").insertOne({
        _id: id,
        order_id: id,
        bank_reference: reference,
        amount_minor: amount,
        receipt_id: useReceipt?.id ?? null,
        confirmed_by: actor,
        confirmed_at: now,
        note
      }, { session });
      await this.collection("shop_orders").updateOne(
        { id },
        {
          $set: { status: "ready", payment_confirmed_at: now, customer_message: null, updated_at: now },
          $inc: { version: 1 }
        },
        { session }
      );
      await this.audit(id, "payment.confirmed_manual", actor, note, session);
      const updated = await this.getOrder(id, session);
      await this.event(updated, "payment.confirmed_manual", session);
      return updated;
    });
  }
  async reject(id, value, actor) {
    const data = record(value);
    fields2(data, ["version", "reason"]);
    const expectedVersion = version(data.version);
    const reason = text2(data.reason, 5, 500, "Motivo de correcci\xF3n");
    return this.transaction(async (session) => {
      const order = await this.getOrder(id, session);
      if (order.status !== "pending_review" || order.version !== expectedVersion) throw new StoreError(409, "El pedido ya no tiene esta revisi\xF3n pendiente. Actualiza la vista.");
      const now = timestamp2();
      await this.collection("shop_orders").updateOne(
        { id },
        {
          $set: { status: "rejected", customer_message: reason, updated_at: now },
          $inc: { version: 1 }
        },
        { session }
      );
      await this.audit(id, "receipt.correction_requested", actor, reason, session);
      return this.getOrder(id, session);
    });
  }
  async auditFor(id) {
    await this.getOrder(id);
    const docs = await this.collection("shop_audit").find({ order_id: id }).sort({ created_at: 1, _id: 1 }).toArray();
    return docs.map((d) => ({
      event: d.event,
      actor: d.actor,
      detail: d.detail,
      createdAt: d.created_at
    }));
  }
  async list(query) {
    const page = Math.max(1, Math.min(1e5, Number.parseInt(query.get("page") ?? "1", 10) || 1));
    const filter = query.get("status") ?? "all";
    const search = (query.get("q") ?? "").trim().slice(0, 80);
    const filterQuery = {};
    if (filter === "pending") {
      filterQuery.status = { $in: ["pending_details", "awaiting_payment", "pending_review", "rejected"] };
    } else if (statuses2.includes(filter)) {
      filterQuery.status = filter;
    } else if (filter !== "all") {
      throw new StoreError(422, "Filtro de estado inv\xE1lido.");
    }
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filterQuery.$or = [
        { code: { $regex: regex } },
        { customer_json: { $regex: regex } }
      ];
    }
    const total = await this.collection("shop_orders").countDocuments(filterQuery);
    const rows = await this.collection("shop_orders").find(filterQuery).sort({ created_at: -1, _id: -1 }).skip((page - 1) * 50).limit(50).toArray();
    const orders = await Promise.all(rows.map((row) => this.fromDoc(row)));
    const counts = Object.fromEntries(statuses2.map((status) => [status, 0]));
    const agg = await this.collection("shop_orders").aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]).toArray();
    for (const item of agg) {
      if (item._id in counts) {
        counts[item._id] = item.count;
      }
    }
    return { orders, counts, total, page, pageSize: 50 };
  }
};

// server/store/http.ts
import { unlinkSync } from "node:fs";

// server/store/receipts.ts
import { createHash as createHash4 } from "node:crypto";
import sharp from "sharp";
var MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
async function prepareReceipt(data, declaredType) {
  if (!data.length || data.length > MAX_RECEIPT_BYTES) throw new StoreError(413, "El comprobante debe pesar entre 1 byte y 5 MB.");
  const rawHash = createHash4("sha256").update(data).digest("hex");
  if (declaredType === "application/pdf") {
    if (!/^%PDF-(1\.[0-7]|2\.0)/.test(data.subarray(0, 9).toString("ascii")) || !data.subarray(-2048).toString("ascii").includes("%%EOF")) throw new StoreError(422, "El archivo no parece un PDF v\xE1lido.");
    return { rawHash, contentType: "application/pdf", data };
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(declaredType)) throw new StoreError(415, "Adjunta una imagen JPG, PNG o WebP, o un PDF. No se admite SVG ni archivos ejecutables.");
  try {
    const image = sharp(data, { limitInputPixels: 2e7, failOn: "warning", animated: false });
    const metadata = await image.metadata();
    const expected = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" }[declaredType];
    if (metadata.format !== expected || (metadata.pages ?? 1) !== 1) throw new Error("Unexpected image format");
    const clean = await image.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).timeout({ seconds: 10 }).toBuffer();
    if (clean.length > MAX_RECEIPT_BYTES) throw new Error("Image too large");
    return { rawHash, contentType: "image/webp", data: clean };
  } catch {
    throw new StoreError(422, "No pudimos leer la imagen. Usa una imagen v\xE1lida, sin animaci\xF3n y de hasta 20 megap\xEDxeles.");
  }
}

// server/store/http.ts
var ID = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
var CUSTOMER_COOKIE = "onkys_customer";
var ADMIN_COOKIE = "onkys_admin";
function cookie(request, name) {
  return request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}
function setCookie(response, name, value, maxAge, secure) {
  response.setHeader("Set-Cookie", `${name}=${value}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`);
}
function json(response, status, body2) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'" });
  response.end(JSON.stringify(body2));
}
async function body(request, max) {
  if (request.headers["content-encoding"] && request.headers["content-encoding"] !== "identity") throw new StoreError(415, "No se admiten cuerpos comprimidos.");
  if (Number(request.headers["content-length"]) > max) {
    request.resume();
    throw new StoreError(413, "El archivo o la solicitud supera el tama\xF1o permitido.");
  }
  return new Promise((resolve2, reject) => {
    const chunks = [];
    let size = 0;
    let rejected = false;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > max) {
        if (!rejected) reject(new StoreError(413, "El archivo o la solicitud supera el tama\xF1o permitido."));
        rejected = true;
        chunks.length = 0;
      } else if (!rejected) chunks.push(chunk);
    });
    request.on("error", () => reject(new StoreError(400, "La carga se interrumpi\xF3. Puedes intentarlo de nuevo.")));
    request.on("aborted", () => reject(new StoreError(400, "La carga se interrumpi\xF3.")));
    request.on("end", () => {
      if (!rejected) resolve2(Buffer.concat(chunks));
    });
  });
}
async function jsonBody(request) {
  if (request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") throw new StoreError(415, "Usa Content-Type: application/json.");
  const bytes = await body(request, 64 * 1024);
  try {
    return record(JSON.parse(bytes.toString("utf8")));
  } catch (error) {
    if (error instanceof StoreError) throw error;
    throw new StoreError(400, "JSON inv\xE1lido.");
  }
}
function makeShopHandler(store2, options = {}) {
  const limits = new RateLimits();
  const secureCookies = options.secureCookies ?? false;
  return async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      const path = url.pathname;
      const method = request.method;
      const origin = request.headers.origin;
      if (request.headers["sec-fetch-site"] === "cross-site") throw new StoreError(403, "Solicitud desde un sitio no autorizado.");
      if (origin) {
        let allowed = false;
        try {
          const parsed = new URL(origin);
          allowed = options.publicOrigin ? parsed.origin === options.publicOrigin : ["http:", "https:"].includes(parsed.protocol) && parsed.host === request.headers.host;
        } catch {
        }
        if (!allowed) throw new StoreError(403, "Origen no autorizado. Abre la tienda y el panel desde la misma direcci\xF3n.");
      }
      const ip = request.socket.remoteAddress ?? "local";
      const requireSession = async (role, mutate = false) => {
        const session = await store2.session(cookie(request, role === "admin" ? ADMIN_COOKIE : CUSTOMER_COOKIE), role);
        if (!session) throw new StoreError(401, role === "admin" ? "Inicia sesi\xF3n en administraci\xF3n." : "Tu sesi\xF3n de compra venci\xF3. Actualiza la tienda.");
        if (mutate) requireCsrf(session, request.headers["x-csrf-token"]);
        return session;
      };
      const authReply = async (session) => ({
        initialized: await store2.initialized(),
        authenticated: !!session,
        username: session ? await store2.adminName() : null,
        csrfToken: session?.csrf ?? null
      });
      if (path === "/api/checkout" && method === "GET") {
        const token = cookie(request, CUSTOMER_COOKIE);
        if (!await store2.session(token, "customer")) limits.check(`session:${ip}`, 120, 36e5);
        const customer = await store2.customerSession(token);
        if (customer.token) setCookie(response, CUSTOMER_COOKIE, customer.token, 7 * 86400, secureCookies);
        json(response, 200, { csrfToken: customer.session.csrf, sinpe: await store2.destination(), demo: store2.isDemo(), maxReceiptBytes: MAX_RECEIPT_BYTES });
        return;
      }
      if (path === "/api/admin/session" && method === "GET") {
        json(response, 200, await authReply(await store2.session(cookie(request, ADMIN_COOKIE), "admin")));
        return;
      }
      if ((path === "/api/admin/setup" || path === "/api/admin/login") && method === "POST") {
        limits.check(`login:${ip}`, 10, 15 * 6e4);
        const data = await jsonBody(request);
        const session = await (path.endsWith("/setup") ? store2.setupAdmin(data) : store2.login(data));
        limits.clear(`login:${ip}`);
        const previous = await store2.session(cookie(request, ADMIN_COOKIE), "admin");
        if (previous) await store2.logout(previous);
        setCookie(response, ADMIN_COOKIE, session.token, 8 * 3600, secureCookies);
        if (path.endsWith("/setup") && options.setupTokenPath) {
          try {
            unlinkSync(options.setupTokenPath);
          } catch {
          }
        }
        json(response, 200, await authReply(session.session));
        return;
      }
      if (path === "/api/admin/logout" && method === "POST") {
        await store2.logout(await requireSession("admin", true));
        setCookie(response, ADMIN_COOKIE, "", 0, secureCookies);
        json(response, 200, { ok: true });
        return;
      }
      if (path === "/api/admin/settings") {
        await requireSession("admin", method === "PUT");
        if (method === "GET") {
          json(response, 200, await store2.settings());
          return;
        }
        if (method === "PUT") {
          json(response, 200, await store2.configure(await jsonBody(request), await store2.adminName()));
          return;
        }
      }
      if (path === "/api/orders/current" && method === "GET") {
        json(response, 200, { order: await store2.currentOrder((await requireSession("customer")).hash) });
        return;
      }
      if (path === "/api/orders" && method === "POST") {
        const session = await requireSession("customer", true);
        limits.check(`order:${session.hash}`, 20, 15 * 6e4);
        const key = request.headers["idempotency-key"];
        if (typeof key !== "string") throw new StoreError(422, "Falta Idempotency-Key.");
        json(response, 200, await store2.createOrder(await jsonBody(request), session.hash, key));
        return;
      }
      const orderPath = new RegExp(`^/api/orders/(${ID})$`).exec(path);
      if (orderPath && method === "GET") {
        json(response, 200, await store2.customerOrder(orderPath[1], (await requireSession("customer")).hash));
        return;
      }
      const uploadPath = new RegExp(`^/api/orders/(${ID})/receipt$`).exec(path);
      if (uploadPath && method === "POST") {
        const session = await requireSession("customer", true);
        limits.check(`upload:${session.hash}`, 20, 36e5);
        limits.check(`upload-ip:${ip}`, 60, 36e5);
        const type = request.headers["content-type"] ?? "";
        if (!type.toLowerCase().startsWith("multipart/form-data;")) throw new StoreError(415, "Env\xEDa el comprobante como multipart/form-data.");
        const bytes = await body(request, MAX_RECEIPT_BYTES + 64 * 1024);
        let form;
        try {
          form = await new Response(new Uint8Array(bytes), { headers: { "Content-Type": type } }).formData();
        } catch {
          throw new StoreError(400, "No se pudo leer el formulario del comprobante.");
        }
        const entries = [...form.entries()];
        const keys = entries.map(([key]) => key);
        if (new Set(keys).size !== entries.length || keys.some((key) => !["code", "bankReference", "uploadKey", "version", "receipt"].includes(key)) || !["uploadKey", "version", "receipt"].every((req) => keys.includes(req))) throw new StoreError(422, "El formulario contiene campos ausentes, repetidos o no permitidos.");
        await store2.checkUpload(uploadPath[1], session.hash, form.get("code"));
        const file = form.get("receipt");
        if (!(file instanceof Blob)) throw new StoreError(422, "Selecciona un comprobante.");
        if (file.size > MAX_RECEIPT_BYTES) throw new StoreError(413, "El comprobante no puede superar 5 MB.");
        const version2 = form.get("version");
        if (typeof version2 !== "string" || !/^[1-9]\d{0,8}$/.test(version2)) throw new StoreError(422, "Versi\xF3n del pedido inv\xE1lida.");
        const prepared = await prepareReceipt(Buffer.from(await file.arrayBuffer()), file.type);
        json(response, 200, await store2.addReceipt(uploadPath[1], session.hash, form.get("code"), form.get("bankReference"), form.get("uploadKey"), Number(version2), prepared));
        return;
      }
      const receiptPath = new RegExp(`^/api/(admin/)?orders/(${ID})/receipts/(${ID})$`).exec(path);
      if (receiptPath && method === "GET") {
        if (receiptPath[1]) await requireSession("admin");
        else await store2.customerOrder(receiptPath[2], (await requireSession("customer")).hash);
        const receipt = await store2.receipt(receiptPath[2], receiptPath[3]);
        const order = await store2.getOrder(receiptPath[2]);
        const pdf = receipt.contentType === "application/pdf";
        response.writeHead(200, {
          "Content-Type": receipt.contentType,
          "Content-Length": receipt.data.length,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          "Content-Disposition": `${pdf ? "attachment" : "inline"}; filename="${order.code}.${pdf ? "pdf" : "webp"}"`,
          "Content-Security-Policy": "sandbox; default-src 'none'; frame-ancestors 'none'"
        });
        response.end(receipt.data);
        return;
      }
      if (path === "/api/admin/orders" && method === "GET") {
        await requireSession("admin");
        json(response, 200, await store2.list(url.searchParams));
        return;
      }
      const adminOrder = new RegExp(`^/api/admin/orders/(${ID})(?:/(confirm|reject))?$`).exec(path);
      if (adminOrder) {
        await requireSession("admin", method !== "GET");
        if (!adminOrder[2] && method === "GET") {
          json(response, 200, { order: await store2.getOrder(adminOrder[1]), audit: await store2.auditFor(adminOrder[1]) });
          return;
        }
        if (method === "POST" && adminOrder[2]) {
          const data = await jsonBody(request);
          const operation = adminOrder[2] === "confirm" ? store2.confirm.bind(store2) : store2.reject.bind(store2);
          json(response, 200, await operation(adminOrder[1], data, await store2.adminName()));
          return;
        }
      }
      throw new StoreError(404, "Ruta no encontrada.");
    } catch (error) {
      if (response.destroyed || response.writableEnded) return;
      const known = error instanceof StoreError || error instanceof PaymentsError;
      json(response, known ? error.status : 500, { error: known ? error.message : "No pudimos completar la operaci\xF3n. Actualiza el estado antes de reintentar; no se ha confirmado autom\xE1ticamente ning\xFAn pago." });
    }
  };
}

// server/store/runtime.ts
async function createShopRuntime() {
  const directory = resolve(process.env.STORE_DATA_DIR || (process.env.VERCEL ? "/tmp/store" : ".data/store"));
  const unsafeRoots = [resolve("public"), resolve("dist")];
  if (directory === resolve(".") || unsafeRoots.some((root) => directory === root || directory.startsWith(`${root}/`) || directory.startsWith(`${root}\\`))) throw new Error("La carpeta de datos privados no puede ser la ra\xEDz del proyecto ni estar dentro de public/ o dist/.");
  mkdirSync(directory, { recursive: true });
  const mongoUri = process.env.MONGODB_URI;
  let database;
  if (mongoUri) {
    const mongoDb = new MongoShopDatabase(mongoUri, store, { dbName: process.env.MONGODB_DB_NAME || "onkys" });
    await mongoDb.init();
    database = mongoDb;
  } else {
    database = new ShopDatabase(resolve(directory, "orders.sqlite"), store);
  }
  const setupPath = resolve(directory, "admin-setup-token.txt");
  if (!await database.initialized()) {
    let token;
    try {
      token = readFileSync(setupPath, "utf8").trim();
    } catch (error) {
      if (error.code !== "ENOENT") {
        await database.close();
        throw error;
      }
      token = newToken();
      writeFileSync(setupPath, `${token}
`, { flag: "wx", mode: 384 });
    }
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      await database.close();
      throw new Error("El c\xF3digo de instalaci\xF3n local no es v\xE1lido. No se sobrescribi\xF3 el archivo existente.");
    }
    await database.ensureSetupToken(token);
    console.info("Onky\u2019s: configura administraci\xF3n en /admin. El c\xF3digo de instalaci\xF3n est\xE1 en el archivo privado admin-setup-token.txt de la carpeta de datos.");
  }
  const secure = process.env.STORE_SECURE_COOKIES === "true" || Boolean(process.env.VERCEL);
  const publicOrigin = process.env.STORE_PUBLIC_ORIGIN || (process.env.VERCEL && process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : void 0);
  if (process.env.NODE_ENV === "production" && !process.env.VERCEL && (!secure || !publicOrigin?.startsWith("https://"))) {
    await database.close();
    throw new Error("Para producci\xF3n se requieren STORE_SECURE_COOKIES=true y STORE_PUBLIC_ORIGIN con HTTPS. Revisa tambi\xE9n la gu\xEDa de despliegue y privacidad.");
  }
  const handler2 = makeShopHandler(database, { secureCookies: secure, publicOrigin, setupTokenPath: setupPath });
  let closed = false;
  return { database, handler: handler2, close: () => {
    if (!closed) {
      closed = true;
      void database.close();
    }
  } };
}

// server/store/api-handler.ts
var runtimePromise = null;
async function handler(request, response) {
  if (!runtimePromise) {
    runtimePromise = createShopRuntime();
  }
  const runtime = await runtimePromise;
  return runtime.handler(request, response);
}
export {
  handler as default
};
