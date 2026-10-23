// server/store/runtime.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// src/config/store.ts
var store = {
  name: "Onky\u2019s",
  demo: false,
  categories: { dessertsEnabled: false },
  // Reactivar cuando haya catálogo y fotografías reales.
  currency: { code: "CRC", locale: "es-CR", fractionDigits: 2 },
  contact: { email: null, whatsappUrl: "https://wa.me/50661555619", instagramUrl: null },
  heroImage: "/images/bolsa-mix.webp",
  heroImageAlt: "Bolsa transparente de gomitas enchiladas con chamoy y sticker de Onky\u2019s",
  gummies: {
    weights: [100, 250, 500],
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
        prices: { 100: 125e3, 250: 25e4, 500: 45e4 }
      },
      {
        id: "tiritas",
        name: "Aros",
        coatingLabel: "enchilados",
        tag: "El lado m\xE1s dulce",
        description: "Aros frutales con cobertura de chamoy y chile.",
        image: "/images/tiritas.jpg",
        imageAlt: "Aros de gomita enchilados con chamoy",
        imagePosition: "50% 38%",
        available: true,
        visible: false,
        // Oculto como tarjeta individual; disponible en el mix.
        prices: { 100: 125e3, 250: 25e4, 500: 45e4 }
      },
      {
        id: "gusanitos",
        name: "Gusanos",
        coatingLabel: "enchilados",
        tag: "Fuera de lo habitual",
        description: "Gusanos dulces y \xE1cidos con ese toque de picante.",
        image: "/images/gusanitos.jpg",
        imageAlt: "Gusanos de gomita multicolor enchilados",
        available: true,
        visible: false,
        // Oculto como tarjeta individual; disponible en el mix.
        prices: { 100: 125e3, 250: 25e4, 500: 45e4 }
      }
    ],
    mixes: {
      enabled: true,
      note: "Elige un solo tipo o mezcla dos o tres. El peso es el total de la bolsa; las proporciones se coordinan con la tienda.",
      // Combinaciones explícitas. Precios provisionales, no suplementos calculados.
      combinations: [
        { typeIds: ["ositos", "tiritas"], prices: { 100: 125e3, 250: 25e4, 500: 45e4 }, image: "/images/bolsa-mix.webp" },
        { typeIds: ["ositos", "gusanitos"], prices: { 100: 125e3, 250: 25e4, 500: 45e4 }, image: "/images/bolsa-mix.webp" },
        { typeIds: ["tiritas", "gusanitos"], prices: { 100: 125e3, 250: 25e4, 500: 45e4 }, image: "/images/bolsa-mix.webp" },
        { typeIds: ["ositos", "tiritas", "gusanitos"], prices: { 100: 125e3, 250: 25e4, 500: 45e4 }, image: "/images/bolsa-mix.webp" }
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
  products: [
    {
      id: "uvarindas",
      name: "Uvarindas",
      tag: "Uvas con tamarindo",
      description: "Uvas frescas cubiertas con pulpa de tamarindo, chamoy de la casa y chilito en polvo.",
      image: "/images/uvarindas.webp",
      imageAlt: "Domo de Uvarindas Onky\u2019s: uvas cubiertas con tamarindo y chamoy",
      available: true,
      priceMinor: 2e5,
      unitLabel: "Domo",
      ingredients: "Uvas frescas, pulpa de tamarindo, chamoy artesanal, Taj\xEDn y chilito",
      allergenInfo: null,
      variants: [
        { id: "mediano", label: "Mediano", description: "Domo mediano", priceMinor: 2e5, available: true },
        { id: "grande", label: "Grande", description: "Domo grande", priceMinor: 25e4, available: true }
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
      conditions: "Correos de Costa Rica: \u20A12.800. Env\xEDo gratis en compras de \u20A115.000 o m\xE1s, sin contar el env\xEDo."
    },
    {
      id: "pickup",
      name: "Recoger",
      description: "Orotina Centro",
      enabled: true,
      requiresAddress: false,
      feeMinor: 0,
      coverage: null,
      pickupPoint: null,
      conditions: "Al completar el pago, nuestro equipo te contactar\xE1 por WhatsApp para coordinar la entrega."
    }
  ]
};

// server/store/database.ts
import { createHash as createHash2, randomUUID as randomUUID2 } from "node:crypto";
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
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  referral_code TEXT UNIQUE,
  created_at TEXT NOT NULL, welcome_order_id TEXT,
  privacy_version TEXT NOT NULL, privacy_accepted_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, role TEXT NOT NULL CHECK (role IN ('customer', 'admin')),
  csrf TEXT NOT NULL, expires_at INTEGER NOT NULL, account_id TEXT REFERENCES customers(id)
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
  account_id TEXT REFERENCES customers(id), discount_minor INTEGER NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
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
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL REFERENCES customers(id),
  referred_id TEXT NOT NULL UNIQUE REFERENCES customers(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'rewarded', 'revoked')),
  first_order_id TEXT UNIQUE REFERENCES shop_orders(id),
  order_total_minor INTEGER CHECK (order_total_minor >= 0),
  reward_minor INTEGER CHECK (reward_minor >= 0 AND reward_minor <= 500000),
  rewarded_at TEXT,
  created_at TEXT NOT NULL,
  CHECK (referrer_id != referred_id)
);
CREATE INDEX IF NOT EXISTS referrals_referrer ON referrals(referrer_id, status);
CREATE INDEX IF NOT EXISTS referrals_referred ON referrals(referred_id);
CREATE TABLE IF NOT EXISTS customer_credit_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  type TEXT NOT NULL CHECK (type IN ('referral_reward', 'order_redemption', 'referral_clawback', 'manual_adjustment')),
  amount_minor INTEGER NOT NULL,
  balance_after_minor INTEGER NOT NULL,
  order_id TEXT REFERENCES shop_orders(id),
  referral_id TEXT REFERENCES referrals(id),
  idempotency_key TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS credit_ledger_customer ON customer_credit_ledger(customer_id, created_at DESC);
`;

// src/lib/shop.ts
var MAX_QUANTITY = 99;
var moneyFormatters = /* @__PURE__ */ new Map();
function money(amountMinor, config) {
  const { code, locale, fractionDigits } = config.currency;
  const key = `${locale}:${code}:${fractionDigits}`;
  let formatter = moneyFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: "currency", currency: code, currencyDisplay: "narrowSymbol", minimumFractionDigits: 0, maximumFractionDigits: fractionDigits });
    moneyFormatters.set(key, formatter);
  }
  return formatter.format(amountMinor / 10 ** fractionDigits);
}
function selectionKey(selection2) {
  if (selection2.kind === "gummy") {
    return `gummy:${[...new Set(selection2.typeIds)].sort().join("+")}:${selection2.weight}`;
  }
  if (selection2.kind === "product") {
    return `product:${selection2.productId}${selection2.variantId ? `:${selection2.variantId}` : ""}`;
  }
  return `dessert:${selection2.productId}:${selection2.variantId}`;
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
  if (selection2.kind === "product") {
    const product = config.products?.find((p) => p.id === selection2.productId);
    if (!product?.available) return null;
    if (product.variants && product.variants.length > 0) {
      const variant2 = selection2.variantId === void 0 ? product.variants[0] : product.variants.find((v) => v.id === selection2.variantId);
      if (!variant2?.available || !validPrice(variant2.priceMinor)) return null;
      const canonical = { kind: "product", productId: product.id, variantId: variant2.id };
      return {
        selection: canonical,
        quantity,
        key: selectionKey(canonical),
        name: product.name,
        options: [product.tag, variant2.label],
        image: variant2.image ?? product.image,
        imageAlt: product.imageAlt,
        unitPriceMinor: variant2.priceMinor,
        lineTotalMinor: variant2.priceMinor * quantity
      };
    }
    if (selection2.variantId !== void 0 || !validPrice(product.priceMinor)) return null;
    return {
      selection: selection2,
      quantity,
      key,
      name: product.name,
      options: [product.tag, product.unitLabel ?? "Presentaci\xF3n individual"],
      image: product.image,
      imageAlt: product.imageAlt,
      unitPriceMinor: product.priceMinor,
      lineTotalMinor: product.priceMinor * quantity
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
  return validPrice(method.freeAboveMinor) && subtotal >= method.freeAboveMinor ? 0 : method.feeMinor;
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
    if (!Array.isArray(data.typeIds) || data.typeIds.length < 1 || data.typeIds.length > 3 || ![100, 250, 500].includes(data.weight)) {
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
  if (data.kind === "product") {
    fields(data, ["kind", "productId", "variantId"]);
    return {
      kind: "product",
      productId: text(data.productId, 64),
      variantId: data.variantId === void 0 ? void 0 : text(data.variantId, 64)
    };
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
function email(value) {
  const address = text2(value, 6, 254, "Correo electr\xF3nico").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) throw new StoreError(422, "Escribe un correo v\xE1lido, por ejemplo tucorreo@ejemplo.com.");
  return address;
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
  const code = text2(value, 6, 20, "C\xF3digo de pedido").toUpperCase();
  if (!/^ONK-[A-Z0-9]{3,16}$/.test(code)) throw new StoreError(422, "El c\xF3digo de pedido no tiene el formato esperado.");
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
  fields2(rawCustomer, ["name", "phone", "email", "address", "notes"]);
  const customer = {
    name: text2(rawCustomer.name, 1, 100, "Nombre"),
    phone: phoneNumber(rawCustomer.phone),
    email: email(rawCustomer.email),
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
  const password = text2(value, 8, 200, "Contrase\xF1a");
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 }).toString("hex")}`;
}
function passwordMatches(value, stored) {
  if (typeof value !== "string" || value.length > 200) return false;
  const [salt, hash] = stored.split(":");
  const actual = scryptSync(value.trim(), salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 });
  return hash.length === 128 && timingSafeEqual(actual, Buffer.from(hash, "hex"));
}
function generateSession(role, now = Date.now(), accountId = null) {
  const token = newToken();
  const session = { hash: tokenHash(token), role, csrf: newToken(), expiresAt: now + (role === "admin" ? 8 * 36e5 : 7 * 864e5), accountId };
  return { token, session };
}
function createSession(db, role, now = Date.now(), accountId = null) {
  const { token, session } = generateSession(role, now, accountId);
  db.prepare("INSERT INTO sessions (token_hash, role, csrf, expires_at, account_id) VALUES (?, ?, ?, ?, ?)").run(session.hash, role, session.csrf, session.expiresAt, accountId);
  return { token, session };
}
function findSession(db, token, role, now = Date.now()) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const row = db.prepare("SELECT * FROM sessions WHERE token_hash = ? AND role = ? AND expires_at > ?").get(tokenHash(token), role, now);
  return row ? { hash: row.token_hash, role, csrf: row.csrf, expiresAt: row.expires_at, accountId: row.account_id } : null;
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

// server/store/accounts.ts
import { randomBytes as randomBytes2, scrypt, timingSafeEqual as timingSafeEqual2 } from "node:crypto";
var derive = (password, salt) => new Promise((resolve2, reject) => {
  scrypt(password, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve2(key));
});
var dummyHash = `${"0".repeat(32)}:${"0".repeat(128)}`;
async function accountPasswordHash(value) {
  if (typeof value !== "string" || value.length < 8 || value.length > 128 || !value.trim()) throw new StoreError(422, "Usa una contrase\xF1a de entre 8 y 128 caracteres.");
  const salt = randomBytes2(16).toString("hex");
  return `${salt}:${(await derive(value, salt)).toString("hex")}`;
}
async function accountPasswordMatches(password, stored) {
  const [salt, hash] = (stored ?? dummyHash).split(":");
  const valid = /^[a-f0-9]{32}$/.test(salt) && /^[a-f0-9]{128}$/.test(hash);
  if (!valid) {
    await derive(password, "0".repeat(32));
    return false;
  }
  const actual = await derive(password, salt);
  return timingSafeEqual2(actual, Buffer.from(hash, "hex")) && !!stored;
}
function parseReferralCode(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  if (typeof value !== "string") throw new StoreError(422, "C\xF3digo de referido inv\xE1lido.");
  const code = value.trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,20}$/.test(code)) {
    throw new StoreError(422, "El formato del c\xF3digo de referido no es v\xE1lido.");
  }
  return code;
}
function parseRegistration(value) {
  const data = record(value);
  fields2(data, ["name", "email", "password", "privacyAccepted", "referralCode"]);
  if (data.privacyAccepted !== true) throw new StoreError(422, "Acepta el uso de tus datos para crear y gestionar tu cuenta.");
  return {
    name: text2(data.name, 2, 100, "Nombre"),
    email: email(data.email),
    password: data.password,
    referralCode: parseReferralCode(data.referralCode)
  };
}
function parseAccountLogin(value) {
  const data = record(value);
  fields2(data, ["email", "password"]);
  const address = email(data.email);
  if (typeof data.password !== "string" || !data.password.length || data.password.length > 128) throw new StoreError(401, "Correo o contrase\xF1a incorrectos.");
  return { email: address, password: data.password };
}
function requireGuest(session) {
  if (session.accountId) throw new StoreError(409, "Ya tienes una sesi\xF3n iniciada. Ci\xE9rrala antes de cambiar de cuenta.");
}
function requireAccount(session) {
  if (!session.accountId) throw new StoreError(401, "Inicia sesi\xF3n para consultar tu cuenta y tus pedidos.");
  return session.accountId;
}
var accountOwner = (id) => `account:${id}`;
var orderOwner = (session) => session.accountId ? accountOwner(session.accountId) : session.hash;
var accountIdFromOwner = (owner) => /^account:([a-f0-9-]{36})$/.exec(owner)?.[1] ?? null;
var accountPage = (query) => Math.max(1, Math.min(1e5, Number.parseInt(query.get("page") ?? "1", 10) || 1));

// src/lib/welcome.ts
function welcomeDiscount(subtotalMinor, eligible) {
  return eligible ? Math.round(subtotalMinor / 10) : 0;
}

// server/store/checkout.ts
import { createHmac, randomUUID } from "node:crypto";
var signature = (payload, secret) => createHmac("sha256", secret).update(payload).digest("base64url");
function paymentPreview(parsed, owner, welcomeAvailable, destination, demo, code, secret) {
  if (!destination) throw new StoreError(409, "El pago con SINPE a\xFAn no est\xE1 disponible. Vuelve a intentarlo cuando la tienda confirme los datos de pago.");
  if (parsed.amounts.total === null) throw new StoreError(409, "Falta confirmar el costo de env\xEDo. Elige otro m\xE9todo de entrega para continuar al pago.");
  const discount = welcomeDiscount(parsed.amounts.subtotal, welcomeAvailable);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const order = {
    id: randomUUID(),
    code,
    version: 1,
    status: "awaiting_payment",
    demo,
    createdAt: now,
    updatedAt: now,
    lines: parsed.lines,
    customer: parsed.customer,
    delivery: parsed.delivery,
    destination,
    subtotalMinor: parsed.amounts.subtotal,
    shippingMinor: parsed.amounts.shipping,
    discountMinor: discount,
    totalMinor: parsed.amounts.total - discount,
    customerAccountId: accountIdFromOwner(owner),
    receipt: null,
    customerMessage: null,
    paymentConfirmedAt: null,
    paymentVerification: null
  };
  const payload = Buffer.from(JSON.stringify({ owner, order })).toString("base64url");
  return { order, token: `${payload}.${signature(payload, secret)}` };
}
function readPaymentPreview(value, owner, secret) {
  const token = text2(value, 40, 64 * 1024, "Datos de pago");
  const [payload, supplied, extra] = token.split(".");
  if (!payload || !supplied || extra !== void 0 || !constantEqual(signature(payload, secret), supplied)) throw new StoreError(422, "Los datos de pago no son v\xE1lidos. Vuelve al carrito para revisarlos.");
  let snapshot;
  try {
    snapshot = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new StoreError(422, "No se pudieron leer los datos de pago.");
  }
  if (snapshot.owner !== owner) throw new StoreError(403, "Estos datos de pago pertenecen a otra sesi\xF3n. Vuelve al carrito.");
  return snapshot.order;
}

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
    for (const [table, name, definition] of [
      ["customers", "referral_code", "TEXT UNIQUE"],
      ["sessions", "account_id", "TEXT REFERENCES customers(id)"],
      ["shop_orders", "account_id", "TEXT REFERENCES customers(id)"],
      ["shop_orders", "discount_minor", "INTEGER NOT NULL DEFAULT 0 CHECK (discount_minor >= 0)"]
    ]) {
      if (!this.database.prepare(`SELECT name FROM pragma_table_info('${table}') WHERE name = ?`).get(name)) this.database.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
    }
    const nullCodes = this.database.prepare("SELECT id FROM customers WHERE referral_code IS NULL").all();
    for (const c of nullCodes) {
      const code = this.generateReferralCode();
      this.database.prepare("UPDATE customers SET referral_code = ? WHERE id = ?").run(code, c.id);
    }
    this.database.exec("CREATE INDEX IF NOT EXISTS shop_orders_customer ON shop_orders(account_id, created_at)");
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
    this.database.prepare("INSERT INTO shop_events (id, order_id, version, event, created_at) VALUES (?, ?, ?, ?, ?)").run(randomUUID2(), order.id, order.version, event, timestamp());
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
  generateReferralCode() {
    for (let i = 0; i < 20; i++) {
      const code = `ONKY-${randomUUID2().slice(0, 6).toUpperCase()}`;
      const exists = this.database.prepare("SELECT id FROM customers WHERE referral_code = ?").get(code);
      if (!exists) return code;
    }
    return `ONKY-${randomUUID2().slice(0, 8).toUpperCase()}`;
  }
  consumedWelcomeOrder(id) {
    if (!id) return null;
    const row = this.database.prepare(`SELECT id FROM shop_orders WHERE id = ? AND (
      current_receipt_id IS NOT NULL OR payment_confirmed_at IS NOT NULL
      OR status IN ('pending_review', 'rejected', 'ready')
      OR EXISTS (SELECT 1 FROM receipts WHERE order_id = shop_orders.id)
    )`).get(id);
    return row ? row.id : null;
  }
  consumeWelcome(order) {
    if (!order.customerAccountId || !order.discountMinor) return;
    const account = this.database.prepare("SELECT welcome_order_id FROM customers WHERE id = ?").get(order.customerAccountId);
    if (!account) throw new StoreError(409, "No se encontr\xF3 la cuenta del pedido.");
    const consumed = this.consumedWelcomeOrder(account.welcome_order_id);
    if (consumed && consumed !== order.id) throw new StoreError(409, "El 10% de bienvenida ya se us\xF3 en otro pedido. Crea un nuevo pedido para obtener el total actualizado.");
    this.database.prepare("UPDATE customers SET welcome_order_id = ? WHERE id = ?").run(order.id, order.customerAccountId);
    if (!consumed) this.audit(order.id, "welcome.consumed", "system", "Beneficio de bienvenida aplicado al enviar el comprobante o confirmar el pago.");
  }
  accountFromRow(row) {
    const id = row.id;
    const balance = this.database.prepare("SELECT COALESCE(SUM(amount_minor), 0) AS balance FROM customer_credit_ledger WHERE customer_id = ?").get(id);
    let referralCode = row.referral_code || void 0;
    if (!referralCode) {
      referralCode = this.generateReferralCode();
      this.database.prepare("UPDATE customers SET referral_code = ? WHERE id = ?").run(referralCode, id);
    }
    return {
      id,
      name: row.name,
      email: row.email,
      createdAt: row.created_at,
      welcomeAvailable: !this.consumedWelcomeOrder(row.welcome_order_id),
      referralCode,
      creditBalanceMinor: Number(balance?.balance ?? 0)
    };
  }
  account(session) {
    if (!session.accountId) return null;
    const row = this.database.prepare("SELECT id, name, email, created_at, welcome_order_id, referral_code FROM customers WHERE id = ?").get(session.accountId);
    return row ? this.accountFromRow(row) : null;
  }
  signInCustomer(id, previous) {
    const valid = this.database.prepare("SELECT token_hash FROM sessions WHERE token_hash = ? AND role = 'customer' AND account_id IS NULL AND expires_at > ?").get(previous.hash, Date.now());
    if (!valid) throw new StoreError(409, "La sesi\xF3n cambi\xF3. Actualiza la p\xE1gina antes de continuar.");
    this.database.prepare("UPDATE shop_orders SET owner_hash = ?, account_id = ? WHERE owner_hash = ? AND account_id IS NULL").run(accountOwner(id), id, previous.hash);
    this.logout(previous);
    return createSession(this.database, "customer", Date.now(), id);
  }
  async registerCustomer(value, previous) {
    requireGuest(previous);
    const data = parseRegistration(value);
    const hash = await accountPasswordHash(data.password);
    return this.transaction(() => {
      if (this.database.prepare("SELECT id FROM customers WHERE email = ?").get(data.email)) throw new StoreError(409, "Ya existe una cuenta con este correo. Inicia sesi\xF3n.");
      let referrerId = null;
      if (data.referralCode) {
        const referrer = this.database.prepare("SELECT id, email FROM customers WHERE referral_code = ?").get(data.referralCode);
        if (!referrer) throw new StoreError(422, "El c\xF3digo de referido no existe.");
        if (referrer.email.toLowerCase() === data.email.toLowerCase()) throw new StoreError(422, "No puedes usar tu propio c\xF3digo de referido.");
        referrerId = referrer.id;
      }
      const id = randomUUID2();
      const referralCode = this.generateReferralCode();
      const now = timestamp();
      this.database.prepare("INSERT INTO customers (id, name, email, password_hash, referral_code, created_at, privacy_version, privacy_accepted_at) VALUES (?, ?, ?, ?, ?, ?, 'customer-account-v1', ?)").run(id, data.name, data.email, hash, referralCode, now, now);
      if (referrerId) {
        this.database.prepare("INSERT INTO referrals (id, referrer_id, referred_id, status, created_at) VALUES (?, ?, ?, 'pending', ?)").run(randomUUID2(), referrerId, id, now);
        this.audit(null, "customer.referral_pending", id, `Referido por ${referrerId}. Pendiente de primera compra.`);
      }
      const result = this.signInCustomer(id, previous);
      this.audit(null, "customer.registered", id, "Cuenta creada con consentimiento. Descuento de bienvenida disponible para el primer pedido.");
      return result;
    });
  }
  async loginCustomer(value, previous) {
    requireGuest(previous);
    const data = parseAccountLogin(value);
    const row = this.database.prepare("SELECT id, password_hash FROM customers WHERE email = ?").get(data.email);
    if (!await accountPasswordMatches(data.password, row?.password_hash)) throw new StoreError(401, "Correo o contrase\xF1a incorrectos.");
    return this.transaction(() => this.signInCustomer(row.id, previous));
  }
  accountOrders(session, query) {
    const id = requireAccount(session);
    const page = accountPage(query);
    const total = Number(this.database.prepare("SELECT count(*) AS count FROM shop_orders WHERE account_id = ?").get(id).count);
    const orders = this.database.prepare("SELECT * FROM shop_orders WHERE account_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 20 OFFSET ?").all(id, (page - 1) * 20).map((row) => this.fromRow(row));
    return { orders, total, page, pageSize: 20 };
  }
  customers(query) {
    const page = accountPage(query);
    const search = (query.get("q") ?? "").trim().slice(0, 80);
    const where = search ? "WHERE (c.name LIKE ? ESCAPE '\\' OR c.email LIKE ? ESCAPE '\\')" : "";
    const like = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    const params = search ? [like, like] : [];
    const total = Number(this.database.prepare(`SELECT count(*) AS count FROM customers c ${where}`).get(...params).count);
    const rows = this.database.prepare(`SELECT c.id, c.name, c.email, c.created_at, c.welcome_order_id, (SELECT count(*) FROM shop_orders o WHERE o.account_id = c.id) AS order_count FROM customers c ${where} ORDER BY c.created_at DESC, c.id DESC LIMIT 50 OFFSET ?`).all(...params, (page - 1) * 50);
    return { customers: rows.map((row) => ({ ...this.accountFromRow(row), orderCount: Number(row.order_count) })), total, page, pageSize: 50 };
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
      const total = shipping === null ? null : minorAmount(row.subtotal_minor - row.discount_minor + shipping);
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
      discountMinor: row.discount_minor,
      customerAccountId: row.account_id,
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
  checkoutSecret() {
    this.database.prepare("INSERT INTO metadata (key, value) VALUES ('checkout_secret', ?) ON CONFLICT(key) DO NOTHING").run(newToken());
    return this.database.prepare("SELECT value FROM metadata WHERE key = 'checkout_secret'").get().value;
  }
  previewOrder(value, owner) {
    const parsed = parseNewOrder(value, this.catalog);
    return this.transaction(() => {
      const accountId = accountIdFromOwner(owner);
      const account = accountId ? this.database.prepare("SELECT welcome_order_id FROM customers WHERE id = ?").get(accountId) : null;
      if (accountId && !account) throw new StoreError(401, "Inicia sesi\xF3n de nuevo para continuar al pago.");
      return paymentPreview(parsed, owner, !!account && !this.consumedWelcomeOrder(account.welcome_order_id), this.destination(), this.catalog.demo, this.nextOrderCode(), this.checkoutSecret());
    });
  }
  completeCheckout(token, owner, key, file) {
    const preview = readPaymentPreview(token, owner, this.checkoutSecret());
    const hash = tokenHash(`${token}:${file.rawHash}`);
    return this.transaction(() => {
      const previous = this.database.prepare("SELECT * FROM shop_orders WHERE id = ? AND owner_hash = ?").get(preview.id, owner);
      if (previous) {
        if (previous.request_hash !== hash) throw new StoreError(409, "Ya recibimos este pedido con otro comprobante. Actualiza su estado.");
        return this.fromRow(previous);
      }
      const now = timestamp();
      this.database.prepare(`INSERT INTO shop_orders
        (id, code, owner_hash, idempotency_key, request_hash, status, demo, created_at, updated_at, lines_json, customer_json, delivery_json,
         destination_json, subtotal_minor, shipping_minor, total_minor, privacy_version, privacy_accepted_at, account_id, discount_minor)
         VALUES (?, ?, ?, ?, ?, 'awaiting_payment', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sinpe-checkout-v2', ?, ?, ?)`).run(
        preview.id,
        preview.code,
        owner,
        preview.id,
        hash,
        preview.demo ? 1 : 0,
        now,
        now,
        JSON.stringify(preview.lines),
        JSON.stringify(preview.customer),
        JSON.stringify(preview.delivery),
        JSON.stringify(preview.destination),
        preview.subtotalMinor,
        preview.shippingMinor,
        preview.totalMinor,
        preview.createdAt,
        preview.customerAccountId ?? null,
        preview.discountMinor ?? 0
      );
      this.audit(preview.id, "order.created", "customer", "Pedido registrado al recibir el comprobante de pago.");
      this.event(this.getOrder(preview.id), "order.created");
      return this.saveReceipt(preview.id, owner, preview.code, null, key, 1, file);
    });
  }
  nextOrderCode() {
    let nextNum = 1001;
    const meta = this.database.prepare("SELECT value FROM metadata WHERE key = 'order_number'").get();
    if (meta?.value) {
      const parsedNum = Number(meta.value);
      if (Number.isSafeInteger(parsedNum) && parsedNum >= nextNum) nextNum = parsedNum + 1;
    } else {
      const rows = this.database.prepare("SELECT code FROM shop_orders WHERE code LIKE 'ONK-%'").all();
      for (const r of rows) {
        const match = /^ONK-(\d+)$/.exec(r.code);
        if (match && Number(match[1]) >= nextNum) nextNum = Number(match[1]) + 1;
      }
    }
    while (this.database.prepare("SELECT 1 FROM shop_orders WHERE code = ?").get(`ONK-${nextNum}`)) nextNum++;
    this.database.prepare("INSERT INTO metadata (key, value) VALUES ('order_number', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(nextNum));
    return `ONK-${nextNum}`;
  }
  // Legacy order creation is retained for existing integrations and data fixtures.
  // The public checkout API requires a receipt and uses completeCheckout instead.
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
      const accountId = accountIdFromOwner(owner);
      const account = accountId ? this.database.prepare("SELECT welcome_order_id FROM customers WHERE id = ?").get(accountId) : null;
      if (accountId && !account) throw new StoreError(401, "Inicia sesi\xF3n de nuevo para registrar el pedido.");
      const discount = welcomeDiscount(parsed.amounts.subtotal, !!account && !this.consumedWelcomeOrder(account.welcome_order_id));
      const total = parsed.amounts.total === null ? null : parsed.amounts.total - discount;
      const destination = this.destination();
      const ready = destination !== null && parsed.amounts.total !== null;
      const id = randomUUID2();
      const code = this.nextOrderCode();
      const now = timestamp();
      this.database.prepare(`INSERT INTO shop_orders
        (id, code, owner_hash, idempotency_key, request_hash, status, demo, created_at, updated_at, lines_json, customer_json, delivery_json,
         destination_json, subtotal_minor, shipping_minor, total_minor, privacy_version, privacy_accepted_at, account_id, discount_minor)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sinpe-checkout-v1', ?, ?, ?)`).run(
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
        total,
        now,
        accountId,
        discount
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
    return this.transaction(() => this.saveReceipt(id, owner, suppliedCode, suppliedReference, uploadKey, suppliedVersion, file));
  }
  saveReceipt(id, owner, suppliedCode, suppliedReference, uploadKey, suppliedVersion, file) {
    const key = text2(uploadKey, 16, 128, "Identificador de carga");
    const expectedVersion = version(suppliedVersion);
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
    this.consumeWelcome(order);
    const receiptId = randomUUID2();
    const now = timestamp();
    this.database.prepare("INSERT INTO receipts (id, order_id, upload_key, raw_hash, content_type, size, data, submitted_at, bank_reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(receiptId, id, key, file.rawHash, file.contentType, file.data.length, file.data, now, reference);
    this.database.prepare("UPDATE shop_orders SET current_receipt_id = ?, status = 'pending_review', customer_message = NULL, version = version + 1, updated_at = ? WHERE id = ?").run(receiptId, now, id);
    this.audit(id, "receipt.submitted", "customer", "C\xF3digo validado y comprobante recibido. Esto no confirma el pago.");
    const updated = this.getOrder(id);
    this.event(updated, "payment.review_requested");
    return updated;
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
      if (order.totalMinor === null) throw new StoreError(409, "Confirma el total del pedido antes de registrar el pago.");
      if (receiptId !== null && (order.status !== "pending_review" || !order.receipt || order.receipt.id !== receiptId || !order.destination || order.totalMinor === null)) {
        throw new StoreError(409, "El pedido cambi\xF3 o no tiene este comprobante pendiente de revisi\xF3n. Actualiza la vista.");
      }
      const useReceipt = order.receipt && order.status === "pending_review" ? order.receipt : null;
      const reference = useReceipt ? bankReference(useReceipt.bankReference) : `MANUAL-${order.code}`;
      const amount = minorAmount(order.totalMinor);
      const auto = actor.startsWith("auto:");
      const note = auto ? "Confirmado autom\xE1ticamente por n8n al coincidir un abono bancario con el c\xF3digo/referencia y el monto exacto del pedido. Sin intervenci\xF3n del administrador." : useReceipt ? "Confirmado manualmente por el administrador al revisar el pedido, su c\xF3digo y el comprobante. Sin consulta bancaria autom\xE1tica." : "Confirmado manualmente por el administrador tras verificar el pago. Sin consulta bancaria autom\xE1tica.";
      if (this.database.prepare("SELECT order_id FROM manual_payments WHERE bank_reference = ? AND order_id != ?").get(reference, id)) throw new StoreError(409, "Esta referencia bancaria ya fue utilizada para confirmar otro pedido.");
      this.consumeWelcome(order);
      const now = timestamp();
      this.database.prepare("INSERT INTO manual_payments (order_id, bank_reference, amount_minor, receipt_id, confirmed_by, confirmed_at, note) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, reference, amount, useReceipt?.id ?? null, actor, now, note);
      this.database.prepare("UPDATE shop_orders SET status = 'ready', payment_confirmed_at = ?, customer_message = NULL, version = version + 1, updated_at = ? WHERE id = ?").run(now, now, id);
      this.audit(id, "payment.confirmed_manual", actor, note);
      const updated = this.getOrder(id);
      this.rewardReferralIfEligible(updated);
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
    const customerId = query.get("customerId");
    if (customerId) {
      conditions.push("account_id = ?");
      parameters.push(customerId.slice(0, 36));
    }
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
    for (const row of this.database.prepare(`SELECT status, count(*) AS count FROM shop_orders ${customerId ? "WHERE account_id = ?" : ""} GROUP BY status`).all(...customerId ? [customerId.slice(0, 36)] : [])) counts[row.status] = Number(row.count);
    return { orders, counts, total, page, pageSize: 50 };
  }
  rewardReferralIfEligible(order) {
    if (!order.customerAccountId || !order.totalMinor || order.totalMinor <= 0) return;
    const buyerId = order.customerAccountId;
    const referral = this.database.prepare(
      "SELECT id, referrer_id, status FROM referrals WHERE referred_id = ? AND status = 'pending'"
    ).get(buyerId);
    if (!referral) return;
    const priorPaid = this.database.prepare(
      "SELECT count(*) AS count FROM shop_orders WHERE account_id = ? AND status = 'ready' AND id != ?"
    ).get(buyerId, order.id);
    if (Number(priorPaid.count) > 0) {
      this.database.prepare("UPDATE referrals SET status = 'revoked' WHERE id = ?").run(referral.id);
      return;
    }
    const MAX_REWARD_MINOR = 5e5;
    const rewardMinor = Math.min(Math.round(order.totalMinor * 0.1), MAX_REWARD_MINOR);
    const now = timestamp();
    const idempotencyKey = `reward:order:${order.id}:ref:${referral.id}`;
    const existing = this.database.prepare("SELECT id FROM customer_credit_ledger WHERE idempotency_key = ?").get(idempotencyKey);
    if (existing) return;
    const currentBalanceRow = this.database.prepare(
      "SELECT COALESCE(SUM(amount_minor), 0) AS balance FROM customer_credit_ledger WHERE customer_id = ?"
    ).get(referral.referrer_id);
    const balanceAfter = Number(currentBalanceRow?.balance ?? 0) + rewardMinor;
    this.database.prepare(`
      UPDATE referrals
      SET status = 'rewarded', first_order_id = ?, order_total_minor = ?, reward_minor = ?, rewarded_at = ?
      WHERE id = ? AND status = 'pending'
    `).run(order.id, order.totalMinor, rewardMinor, now, referral.id);
    this.database.prepare(`
      INSERT INTO customer_credit_ledger (
        customer_id, type, amount_minor, balance_after_minor, order_id, referral_id, idempotency_key, description, created_at
      ) VALUES (?, 'referral_reward', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      referral.referrer_id,
      rewardMinor,
      balanceAfter,
      order.id,
      referral.id,
      idempotencyKey,
      `Cr\xE9dito del 10% por la primera compra de tu referido (Pedido ${order.code})`,
      now
    );
    this.audit(order.id, "referral.rewarded", "system", `Cr\xE9dito de recompensa de \u20A1${(rewardMinor / 100).toLocaleString("es-CR")} registrado para el referente ${referral.referrer_id}`);
  }
  referrals(session) {
    const customerId = requireAccount(session);
    const customer = this.database.prepare("SELECT id, referral_code FROM customers WHERE id = ?").get(customerId);
    if (!customer) throw new StoreError(404, "No se encontr\xF3 la cuenta.");
    let referralCode = customer.referral_code;
    if (!referralCode) {
      referralCode = this.generateReferralCode();
      this.database.prepare("UPDATE customers SET referral_code = ? WHERE id = ?").run(referralCode, customerId);
      customer.referral_code = referralCode;
    }
    const balanceRow = this.database.prepare("SELECT COALESCE(SUM(amount_minor), 0) AS balance FROM customer_credit_ledger WHERE customer_id = ?").get(customerId);
    const creditBalanceMinor = Number(balanceRow?.balance ?? 0);
    const pendingRows = this.database.prepare(`
      SELECT r.id, c.name, r.created_at
      FROM referrals r
      JOIN customers c ON c.id = r.referred_id
      WHERE r.referrer_id = ? AND r.status = 'pending'
      ORDER BY r.created_at DESC
    `).all(customerId);
    const validRows = this.database.prepare(`
      SELECT r.id, c.name, r.reward_minor, r.rewarded_at, o.code AS order_code
      FROM referrals r
      JOIN customers c ON c.id = r.referred_id
      LEFT JOIN shop_orders o ON o.id = r.first_order_id
      WHERE r.referrer_id = ? AND r.status = 'rewarded'
      ORDER BY r.rewarded_at DESC
    `).all(customerId);
    const ledgerRows = this.database.prepare(`
      SELECT id, type, amount_minor, balance_after_minor, description, created_at
      FROM customer_credit_ledger
      WHERE customer_id = ?
      ORDER BY id DESC
      LIMIT 50
    `).all(customerId);
    const totalEarnedRow = this.database.prepare(`
      SELECT COALESCE(SUM(amount_minor), 0) AS total
      FROM customer_credit_ledger
      WHERE customer_id = ? AND type = 'referral_reward'
    `).get(customerId);
    const anonymize = (fullName) => {
      const parts = fullName.trim().split(/\s+/);
      return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}.`;
    };
    return {
      referralCode,
      shareUrl: `https://onkys.cr/?ref=${referralCode}`,
      creditBalanceMinor,
      summary: {
        pendingCount: pendingRows.length,
        validCount: validRows.length,
        totalEarnedMinor: Number(totalEarnedRow?.total ?? 0)
      },
      pendingReferrals: pendingRows.map((row) => ({
        id: row.id,
        referredName: anonymize(row.name),
        status: "pending",
        createdAt: row.created_at,
        firstOrderCode: null,
        rewardMinor: null,
        rewardedAt: null
      })),
      validReferrals: validRows.map((row) => ({
        id: row.id,
        referredName: anonymize(row.name),
        status: "rewarded",
        createdAt: row.rewarded_at,
        firstOrderCode: row.order_code,
        rewardMinor: row.reward_minor,
        rewardedAt: row.rewarded_at
      })),
      ledger: ledgerRows.map((row) => ({
        id: row.id,
        type: row.type,
        amountMinor: row.amount_minor,
        balanceAfterMinor: row.balance_after_minor,
        description: row.description,
        createdAt: row.created_at
      }))
    };
  }
};

// server/store/mongo.ts
import { createHash as createHash3, randomUUID as randomUUID3 } from "node:crypto";
import { MongoClient } from "mongodb";
var statuses2 = ["pending_details", "awaiting_payment", "pending_review", "ready", "rejected"];
var timestamp2 = () => (/* @__PURE__ */ new Date()).toISOString();
var MongoShopDatabase = class {
  client;
  db;
  catalog;
  initializedPromise = null;
  constructor(uri, catalog, options = {}) {
    this.client = new MongoClient(uri, { serverSelectionTimeoutMS: 8e3, connectTimeoutMS: 8e3, maxPoolSize: 10 });
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
          this.collection("customers").createIndex({ id: 1 }, { unique: true }),
          this.collection("customers").createIndex({ email: 1 }, { unique: true }),
          this.collection("shop_orders").createIndex({ id: 1 }, { unique: true }),
          this.collection("shop_orders").createIndex({ code: 1 }, { unique: true }),
          this.collection("shop_orders").createIndex({ owner_hash: 1, idempotency_key: 1 }, { unique: true }),
          this.collection("shop_orders").createIndex({ status: 1, created_at: -1 }),
          this.collection("shop_orders").createIndex({ account_id: 1, created_at: -1 }),
          this.collection("shop_orders").createIndex({ owner_hash: 1, created_at: -1, _id: -1 }),
          this.collection("receipts").createIndex({ id: 1 }, { unique: true }),
          this.collection("receipts").createIndex({ order_id: 1, upload_key: 1 }, { unique: true }),
          this.collection("receipts").createIndex({ raw_hash: 1 }),
          this.collection("manual_payments").createIndex({ bank_reference: 1 }, { unique: true }),
          this.collection("manual_payments").createIndex({ order_id: 1 }, { unique: true }),
          this.collection("shop_audit").createIndex({ order_id: 1, created_at: 1 }),
          this.collection("shop_events").createIndex({ order_id: 1, version: 1, event: 1 }, { unique: true })
        ]);
        await this.completePendingDetails();
      })().catch((error) => {
        this.initializedPromise = null;
        throw error;
      });
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
    const docId = `audit_${randomUUID3()}`;
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
    const id = randomUUID3();
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
    return doc ? { hash: doc.token_hash, role, csrf: doc.csrf, expiresAt: doc.expires_at, accountId: doc.account_id ?? null } : null;
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
  async generateReferralCode(session) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let attempts = 0;
    while (attempts++ < 10) {
      let code = "ONKY-";
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.collection("customers").findOne({ referral_code: code }, { session });
      if (!existing) return code;
    }
    return `ONKY-${Date.now().toString(36).toUpperCase().slice(-4)}`;
  }
  async consumedWelcomeOrder(id, session) {
    if (!id) return null;
    const order = await this.collection("shop_orders").findOne({ id }, { session, projection: { id: 1, current_receipt_id: 1, payment_confirmed_at: 1, status: 1 } });
    if (order?.current_receipt_id || order?.payment_confirmed_at || ["pending_review", "rejected", "ready"].includes(order?.status)) return id;
    const receipt = await this.collection("receipts").findOne({ order_id: id }, { session, projection: { id: 1 } });
    return receipt ? id : null;
  }
  async consumeWelcome(order, session) {
    if (!order.customerAccountId || !order.discountMinor) return;
    const account = await this.collection("customers").findOne({ id: order.customerAccountId }, { session });
    if (!account) throw new StoreError(409, "No se encontr\xF3 la cuenta del pedido.");
    const consumed = await this.consumedWelcomeOrder(account.welcome_order_id, session);
    if (consumed && consumed !== order.id) throw new StoreError(409, "El 10% de bienvenida ya se us\xF3 en otro pedido. Crea un nuevo pedido para obtener el total actualizado.");
    await this.collection("customers").updateOne({ id: order.customerAccountId }, { $set: { welcome_order_id: order.id }, $inc: { welcome_revision: 1 } }, { session });
    if (!consumed) await this.audit(order.id, "welcome.consumed", "system", "Beneficio de bienvenida aplicado al enviar el comprobante o confirmar el pago.", session);
  }
  async accountFromDoc(row, creditBalanceMinor = 0) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.created_at,
      welcomeAvailable: !await this.consumedWelcomeOrder(row.welcome_order_id),
      referralCode: row.referral_code || void 0,
      creditBalanceMinor
    };
  }
  async account(session) {
    if (!session.accountId) return null;
    const row = await this.collection("customers").findOne({ id: session.accountId }, { projection: { password_hash: 0 } });
    if (!row) return null;
    if (!row.referral_code) {
      const code = await this.generateReferralCode();
      row.referral_code = code;
      await this.collection("customers").updateOne({ id: row.id }, { $set: { referral_code: code } });
    }
    const ledgerDocs = await this.collection("customer_credit_ledger").find({ customer_id: row.id }).toArray();
    const balance = ledgerDocs.reduce((acc, cur) => acc + (cur.amount_minor || 0), 0);
    return this.accountFromDoc(row, balance);
  }
  async signInCustomer(id, previous, session) {
    const removed = await this.collection("sessions").deleteOne({ token_hash: previous.hash, role: "customer", account_id: null, expires_at: { $gt: Date.now() } }, { session });
    if (removed.deletedCount !== 1) throw new StoreError(409, "La sesi\xF3n cambi\xF3. Actualiza la p\xE1gina antes de continuar.");
    await this.collection("shop_orders").updateMany({ owner_hash: previous.hash, account_id: null }, { $set: { owner_hash: accountOwner(id), account_id: id } }, { session });
    const result = generateSession("customer", Date.now(), id);
    const next = result.session;
    await this.collection("sessions").insertOne({ _id: next.hash, token_hash: next.hash, role: next.role, csrf: next.csrf, expires_at: next.expiresAt, account_id: id }, { session });
    return result;
  }
  async registerCustomer(value, previous) {
    requireGuest(previous);
    const data = parseRegistration(value);
    const hash = await accountPasswordHash(data.password);
    try {
      return await this.transaction(async (session) => {
        if (await this.collection("customers").findOne({ email: data.email }, { session })) throw new StoreError(409, "Ya existe una cuenta con este correo. Inicia sesi\xF3n.");
        let referrerId = null;
        if (data.referralCode) {
          const referrer = await this.collection("customers").findOne({ referral_code: data.referralCode }, { session });
          if (!referrer) throw new StoreError(422, "El c\xF3digo de referido no existe.");
          if (referrer.email.toLowerCase() === data.email.toLowerCase()) throw new StoreError(422, "No puedes usar tu propio c\xF3digo de referido.");
          referrerId = referrer.id;
        }
        const id = randomUUID3();
        const referralCode = await this.generateReferralCode(session);
        const now = timestamp2();
        await this.collection("customers").insertOne({
          _id: id,
          id,
          name: data.name,
          email: data.email,
          password_hash: hash,
          referral_code: referralCode,
          created_at: now,
          welcome_order_id: null,
          privacy_version: "customer-account-v1",
          privacy_accepted_at: now
        }, { session });
        if (referrerId) {
          const refId = randomUUID3();
          await this.collection("referrals").insertOne({
            _id: refId,
            id: refId,
            referrer_id: referrerId,
            referred_id: id,
            status: "pending",
            created_at: now
          }, { session });
          await this.audit(null, "customer.referral_pending", id, `Referido por ${referrerId}. Pendiente de primera compra.`, session);
        }
        const result = await this.signInCustomer(id, previous, session);
        await this.audit(null, "customer.registered", id, "Cuenta creada con consentimiento. Descuento de bienvenida disponible para el primer pedido.", session);
        return result;
      });
    } catch (error) {
      if (error.code === 11e3) throw new StoreError(409, "Ya existe una cuenta con este correo. Inicia sesi\xF3n.");
      throw error;
    }
  }
  async loginCustomer(value, previous) {
    requireGuest(previous);
    const data = parseAccountLogin(value);
    const row = await this.collection("customers").findOne({ email: data.email });
    if (!await accountPasswordMatches(data.password, row?.password_hash)) throw new StoreError(401, "Correo o contrase\xF1a incorrectos.");
    return this.transaction((session) => this.signInCustomer(row.id, previous, session));
  }
  async accountOrders(session, query) {
    const id = requireAccount(session);
    const page = accountPage(query);
    const filter = { account_id: id };
    const total = await this.collection("shop_orders").countDocuments(filter);
    const rows = await this.collection("shop_orders").find(filter).sort({ created_at: -1, _id: -1 }).skip((page - 1) * 20).limit(20).toArray();
    return { orders: await this.fromDocs(rows), total, page, pageSize: 20 };
  }
  async referrals(session) {
    const customerId = requireAccount(session);
    const customer = await this.collection("customers").findOne({ id: customerId });
    if (!customer) throw new StoreError(404, "No se encontr\xF3 la cuenta.");
    let referralCode = customer.referral_code;
    if (!referralCode) {
      referralCode = await this.generateReferralCode();
      await this.collection("customers").updateOne({ id: customerId }, { $set: { referral_code: referralCode } });
    }
    const ledgerDocs = await this.collection("customer_credit_ledger").find({ customer_id: customerId }).sort({ created_at: -1 }).limit(50).toArray();
    const creditBalanceMinor = ledgerDocs.reduce((acc, cur) => acc + (cur.amount_minor || 0), 0);
    const pendingDocs = await this.collection("referrals").find({ referrer_id: customerId, status: "pending" }).sort({ created_at: -1 }).toArray();
    const validDocs = await this.collection("referrals").find({ referrer_id: customerId, status: "rewarded" }).sort({ rewarded_at: -1 }).toArray();
    const totalEarnedMinor = validDocs.reduce((acc, cur) => acc + (cur.reward_minor || 0), 0);
    const anonymize = (fullName) => {
      const parts = fullName.trim().split(/\s+/);
      return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}.`;
    };
    const customerIds = [.../* @__PURE__ */ new Set([...pendingDocs.map((r) => r.referred_id), ...validDocs.map((r) => r.referred_id)])];
    const referredCustomers = customerIds.length > 0 ? await this.collection("customers").find({ id: { $in: customerIds } }).toArray() : [];
    const namesMap = new Map(referredCustomers.map((c) => [c.id, anonymize(c.name || "Invitado")]));
    return {
      referralCode,
      shareUrl: `https://onkys.cr/?ref=${referralCode}`,
      creditBalanceMinor,
      summary: {
        pendingCount: pendingDocs.length,
        validCount: validDocs.length,
        totalEarnedMinor
      },
      pendingReferrals: pendingDocs.map((r) => ({
        id: r.id,
        referredName: namesMap.get(r.referred_id) || r.referred_name || "Invitado",
        status: "pending",
        createdAt: r.created_at,
        firstOrderCode: null,
        rewardMinor: null,
        rewardedAt: null
      })),
      validReferrals: validDocs.map((r) => ({
        id: r.id,
        referredName: namesMap.get(r.referred_id) || r.referred_name || "Invitado",
        status: "rewarded",
        createdAt: r.rewarded_at,
        firstOrderCode: r.first_order_code || null,
        rewardMinor: r.reward_minor,
        rewardedAt: r.rewarded_at
      })),
      ledger: ledgerDocs.map((l, idx) => ({
        id: idx + 1,
        type: l.type,
        amountMinor: l.amount_minor,
        balanceAfterMinor: l.balance_after_minor,
        description: l.description,
        createdAt: l.created_at
      }))
    };
  }
  async rewardReferralIfEligible(order, session) {
    if (!order.customerAccountId || !order.totalMinor || order.totalMinor <= 0) return;
    const buyerId = order.customerAccountId;
    const referral = await this.collection("referrals").findOne(
      { referred_id: buyerId, status: "pending" },
      { session }
    );
    if (!referral) return;
    const priorPaidCount = await this.collection("shop_orders").countDocuments(
      { account_id: buyerId, status: "ready", id: { $ne: order.id } },
      { session }
    );
    if (priorPaidCount > 0) {
      await this.collection("referrals").updateOne(
        { id: referral.id },
        { $set: { status: "revoked" } },
        { session }
      );
      return;
    }
    const MAX_REWARD_MINOR = 5e5;
    const rewardMinor = Math.min(Math.round(order.totalMinor * 0.1), MAX_REWARD_MINOR);
    const now = timestamp2();
    const idempotencyKey = `reward:order:${order.id}:ref:${referral.id}`;
    const existing = await this.collection("customer_credit_ledger").findOne(
      { idempotency_key: idempotencyKey },
      { session }
    );
    if (existing) return;
    const ledgerDocs = await this.collection("customer_credit_ledger").find(
      { customer_id: referral.referrer_id },
      { session }
    ).toArray();
    const currentBalance = ledgerDocs.reduce((acc, cur) => acc + (cur.amount_minor || 0), 0);
    const balanceAfter = currentBalance + rewardMinor;
    await this.collection("referrals").updateOne(
      { id: referral.id, status: "pending" },
      {
        $set: {
          status: "rewarded",
          first_order_id: order.id,
          order_total_minor: order.totalMinor,
          reward_minor: rewardMinor,
          rewarded_at: now
        }
      },
      { session }
    );
    await this.collection("customer_credit_ledger").insertOne(
      {
        _id: randomUUID3(),
        customer_id: referral.referrer_id,
        type: "referral_reward",
        amount_minor: rewardMinor,
        balance_after_minor: balanceAfter,
        order_id: order.id,
        referral_id: referral.id,
        idempotency_key: idempotencyKey,
        description: `Cr\xE9dito del 10% por la primera compra de tu referido (Pedido ${order.code})`,
        created_at: now
      },
      { session }
    );
    await this.audit(order.id, "referral.rewarded", "system", `Cr\xE9dito de recompensa de \u20A1${(rewardMinor / 100).toLocaleString("es-CR")} registrado para el referente ${referral.referrer_id}`, session);
  }
  async customers(query) {
    const page = accountPage(query);
    const search = (query.get("q") ?? "").trim().slice(0, 80);
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const filter = search ? { $or: [{ name: regex }, { email: regex }] } : {};
    const total = await this.collection("customers").countDocuments(filter);
    const rows = await this.collection("customers").find(filter, { projection: { password_hash: 0 } }).sort({ created_at: -1, id: -1 }).skip((page - 1) * 50).limit(50).toArray();
    const counts = rows.length ? await this.collection("shop_orders").aggregate([
      { $match: { account_id: { $in: rows.map((row) => row.id) } } },
      { $group: { _id: "$account_id", count: { $sum: 1 } } }
    ]).toArray() : [];
    const byCustomer = new Map(counts.map((row) => [row._id, row.count]));
    const customers = await Promise.all(rows.map(async (row) => ({ ...await this.accountFromDoc(row), orderCount: byCustomer.get(row.id) ?? 0 })));
    return { customers, total, page, pageSize: 50 };
  }
  async settings(session) {
    const doc = await this.collection("metadata").findOne({ key: "sinpe" }, { session });
    return doc?.value ? JSON.parse(doc.value) : { enabled: false, phone: "", beneficiary: "" };
  }
  async destination(session) {
    const settings = await this.settings(session);
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
    const destination = await this.destination(session);
    const cursor = this.collection("shop_orders").find({ status: "pending_details", current_receipt_id: null }, { session });
    for await (const row of cursor) {
      const delivery = JSON.parse(row.delivery_json);
      const shipping = row.shipping_minor === null ? shippingFee(row.subtotal_minor, this.catalog.deliveryMethods.find((method) => method.id === delivery.id)) : row.shipping_minor;
      const total = shipping === null ? null : minorAmount(row.subtotal_minor - (row.discount_minor ?? 0) + shipping);
      const savedDestination = destination ? JSON.stringify(destination) : row.destination_json;
      const status = total !== null && destination ? "awaiting_payment" : "pending_details";
      if (shipping === row.shipping_minor && total === row.total_minor && savedDestination === row.destination_json && status === row.status) continue;
      await this.collection("shop_orders").updateOne(
        { _id: row._id, status: "pending_details", version: row.version },
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
      receipt = await this.collection("receipts").findOne({ id: row.current_receipt_id, order_id: row.id }, { session, projection: { data: 0 } });
    }
    return this.orderFromDoc(row, receipt);
  }
  async fromDocs(rows) {
    const ids = rows.map((row) => row.current_receipt_id).filter(Boolean);
    const receipts = ids.length ? await this.collection("receipts").find({ id: { $in: ids } }, { projection: { data: 0 } }).toArray() : [];
    const byId = new Map(receipts.map((receipt) => [receipt.id, receipt]));
    return rows.map((row) => {
      const receipt = byId.get(row.current_receipt_id);
      return this.orderFromDoc(row, receipt?.order_id === row.id ? receipt : null);
    });
  }
  orderFromDoc(row, receipt) {
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
      discountMinor: row.discount_minor ?? 0,
      customerAccountId: row.account_id ?? null,
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
  async checkoutSecret(session) {
    const row = await this.collection("metadata").findOneAndUpdate(
      { key: "checkout_secret" },
      { $setOnInsert: { value: newToken() } },
      { upsert: true, returnDocument: "after", session }
    );
    return row.value;
  }
  async previewOrder(value, owner) {
    const parsed = parseNewOrder(value, this.catalog);
    return this.transaction(async (session) => {
      const accountId = accountIdFromOwner(owner);
      const account = accountId ? await this.collection("customers").findOne({ id: accountId }, { session }) : null;
      if (accountId && !account) throw new StoreError(401, "Inicia sesi\xF3n de nuevo para continuar al pago.");
      const eligible = !!account && !await this.consumedWelcomeOrder(account.welcome_order_id, session);
      return paymentPreview(parsed, owner, eligible, await this.destination(session), this.catalog.demo, await this.nextOrderCode(session), await this.checkoutSecret(session));
    });
  }
  async completeCheckout(token, owner, key, file) {
    const preview = readPaymentPreview(token, owner, await this.checkoutSecret());
    const hash = tokenHash(`${token}:${file.rawHash}`);
    return this.transaction(async (session) => {
      const previous = await this.collection("shop_orders").findOne({ id: preview.id, owner_hash: owner }, { session });
      if (previous) {
        if (previous.request_hash !== hash) throw new StoreError(409, "Ya recibimos este pedido con otro comprobante. Actualiza su estado.");
        return this.fromDoc(previous, session);
      }
      const now = timestamp2();
      await this.collection("shop_orders").insertOne({
        _id: preview.id,
        id: preview.id,
        code: preview.code,
        owner_hash: owner,
        idempotency_key: preview.id,
        request_hash: hash,
        version: 1,
        status: "awaiting_payment",
        demo: preview.demo ? 1 : 0,
        created_at: now,
        updated_at: now,
        lines_json: JSON.stringify(preview.lines),
        customer_json: JSON.stringify(preview.customer),
        delivery_json: JSON.stringify(preview.delivery),
        destination_json: JSON.stringify(preview.destination),
        subtotal_minor: preview.subtotalMinor,
        shipping_minor: preview.shippingMinor,
        total_minor: preview.totalMinor,
        discount_minor: preview.discountMinor ?? 0,
        account_id: preview.customerAccountId ?? null,
        current_receipt_id: null,
        customer_message: null,
        payment_confirmed_at: null,
        privacy_version: "sinpe-checkout-v2",
        privacy_accepted_at: preview.createdAt
      }, { session });
      await this.audit(preview.id, "order.created", "customer", "Pedido registrado al recibir el comprobante de pago.", session);
      await this.event(await this.getOrder(preview.id, session), "order.created", session);
      return this.saveReceipt(preview.id, owner, preview.code, null, key, 1, file, session);
    });
  }
  async nextOrderCode(session) {
    let nextNum = 1001;
    const meta = await this.collection("metadata").findOne({ key: "order_number" }, { session });
    if (meta && typeof meta.seq === "number" && meta.seq >= nextNum) {
      nextNum = meta.seq + 1;
    } else {
      const last = await this.collection("shop_orders").find({ code: /^ONK-\d+$/ }, { projection: { code: 1 }, session }).sort({ created_at: -1 }).limit(50).toArray();
      for (const doc of last) {
        const match = /^ONK-(\d+)$/.exec(doc.code);
        if (match && Number(match[1]) >= nextNum) nextNum = Number(match[1]) + 1;
      }
    }
    while (await this.collection("shop_orders").findOne({ code: `ONK-${nextNum}` }, { session })) nextNum++;
    await this.collection("metadata").updateOne({ key: "order_number" }, { $set: { seq: nextNum } }, { upsert: true, session });
    return `ONK-${nextNum}`;
  }
  // Legacy integrations/fixtures only; the public API uses completeCheckout.
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
      const accountId = accountIdFromOwner(owner);
      const account = accountId ? await this.collection("customers").findOne({ id: accountId }, { session }) : null;
      if (accountId && !account) throw new StoreError(401, "Inicia sesi\xF3n de nuevo para registrar el pedido.");
      const eligible = !!account && !await this.consumedWelcomeOrder(account.welcome_order_id, session);
      if (eligible) await this.collection("customers").updateOne({ id: accountId }, { $inc: { welcome_revision: 1 } }, { session });
      const discount = welcomeDiscount(parsed.amounts.subtotal, eligible);
      const total = parsed.amounts.total === null ? null : parsed.amounts.total - discount;
      const destination = await this.destination(session);
      const ready = destination !== null && parsed.amounts.total !== null;
      const id = randomUUID3();
      const code = await this.nextOrderCode(session);
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
        total_minor: total,
        discount_minor: discount,
        account_id: accountId,
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
  async checkUpload(id, owner, suppliedCode, session) {
    const row = await this.collection("shop_orders").findOne({ id, owner_hash: owner }, { session });
    if (!row) throw new StoreError(404, "Pedido no encontrado en esta sesi\xF3n.");
    const order = await this.fromDoc(row, session);
    if (suppliedCode !== void 0 && suppliedCode !== null && suppliedCode !== "") this.assertCode(order, suppliedCode);
    return order;
  }
  async addReceipt(id, owner, suppliedCode, suppliedReference, uploadKey, suppliedVersion, file) {
    return this.transaction((session) => this.saveReceipt(id, owner, suppliedCode, suppliedReference, uploadKey, suppliedVersion, file, session));
  }
  async saveReceipt(id, owner, suppliedCode, suppliedReference, uploadKey, suppliedVersion, file, session) {
    const key = text2(uploadKey, 16, 128, "Identificador de carga");
    const expectedVersion = version(suppliedVersion);
    const order = await this.checkUpload(id, owner, suppliedCode, session);
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
    await this.consumeWelcome(order, session);
    const receiptId = randomUUID3();
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
      if (order.totalMinor === null) throw new StoreError(409, "Confirma el total del pedido antes de registrar el pago.");
      if (receiptId !== null && (order.status !== "pending_review" || !order.receipt || order.receipt.id !== receiptId || !order.destination || order.totalMinor === null)) {
        throw new StoreError(409, "El pedido cambi\xF3 o no tiene este comprobante pendiente de revisi\xF3n. Actualiza la vista.");
      }
      const useReceipt = order.receipt && order.status === "pending_review" ? order.receipt : null;
      const reference = useReceipt ? bankReference(useReceipt.bankReference) : `MANUAL-${order.code}`;
      const amount = minorAmount(order.totalMinor);
      const auto = actor.startsWith("auto:");
      const note = auto ? "Confirmado autom\xE1ticamente por n8n al coincidir un abono bancario con el c\xF3digo/referencia y el monto exacto del pedido. Sin intervenci\xF3n del administrador." : useReceipt ? "Confirmado manualmente por el administrador al revisar el pedido, su c\xF3digo y el comprobante. Sin consulta bancaria autom\xE1tica." : "Confirmado manualmente por el administrador tras verificar el pago. Sin consulta bancaria autom\xE1tica.";
      const dup = await this.collection("manual_payments").findOne({ bank_reference: reference, order_id: { $ne: id } }, { session });
      if (dup) throw new StoreError(409, "Esta referencia bancaria ya fue utilizada para confirmar otro pedido.");
      await this.consumeWelcome(order, session);
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
      await this.rewardReferralIfEligible(updated, session);
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
    const customerId = query.get("customerId");
    if (customerId) filterQuery.account_id = customerId.slice(0, 36);
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
    const orders = await this.fromDocs(rows);
    const counts = Object.fromEntries(statuses2.map((status) => [status, 0]));
    const agg = await this.collection("shop_orders").aggregate([
      ...customerId ? [{ $match: { account_id: customerId.slice(0, 36) } }] : [],
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
import { createHash as createHash5, timingSafeEqual as timingSafeEqual3 } from "node:crypto";

// server/store/automation.ts
var AUTO_ACTOR = "auto:n8n-bac";
var CODE_PATTERN = /\bONK-[A-Z0-9]{3,16}\b/gi;
var CLOCK_SKEW_MS = 5 * 6e4;
var MAX_ORDER_AGE_MS = 72 * 36e5;
var OPEN_STATUSES = ["pending_review", "awaiting_payment"];
function parseBankMovement(value) {
  const data = record(value);
  fields2(data, ["source", "movementId", "bankReference", "amountMinor", "currency", "bookedAt", "description", "senderVerified"]);
  const amountMinor = data.amountMinor;
  if (typeof amountMinor !== "number" || !Number.isSafeInteger(amountMinor) || amountMinor < 1 || amountMinor > 1e8) {
    throw new StoreError(422, "amountMinor debe ser un entero positivo en c\xE9ntimos de CRC.");
  }
  if (data.currency !== "CRC") throw new StoreError(422, "Solo se admiten abonos en CRC.");
  if (typeof data.senderVerified !== "boolean") throw new StoreError(422, "senderVerified debe ser booleano.");
  const bookedAt = text2(data.bookedAt, 20, 40, "bookedAt");
  if (Number.isNaN(Date.parse(bookedAt)) || !/(Z|[+-]\d\d:\d\d)$/.test(bookedAt)) throw new StoreError(422, "bookedAt debe ser ISO 8601 con zona horaria.");
  const optional = (item, max, label) => item === null || item === void 0 || item === "" ? null : text2(item, 1, max, label);
  return {
    source: text2(data.source, 1, 40, "source"),
    movementId: text2(data.movementId, 6, 200, "movementId"),
    bankReference: optional(data.bankReference, 80, "bankReference")?.toUpperCase().replace(/\s+/g, "") ?? null,
    amountMinor,
    currency: "CRC",
    bookedAt: new Date(bookedAt).toISOString(),
    description: optional(data.description, 1e3, "description"),
    senderVerified: data.senderVerified
  };
}
async function openOrders(store2) {
  const found = [];
  for (const status of OPEN_STATUSES) {
    for (let page = 1; page <= 20; page++) {
      const result = await store2.list(new URLSearchParams({ status, page: String(page) }));
      found.push(...result.orders);
      if (result.orders.length < 50) break;
    }
  }
  return found;
}
async function decide(store2, movement, now) {
  const booked = Date.parse(movement.bookedAt);
  if (booked > now.getTime() + CLOCK_SKEW_MS) return { decision: "review", reason: "booked_in_the_future" };
  const orders = await openOrders(store2);
  const codes = [...new Set((movement.description?.match(CODE_PATTERN) ?? []).map((code) => code.toUpperCase()))];
  if (codes.length > 1) return { decision: "review", reason: "multiple_order_codes" };
  let order;
  let matchedBy = null;
  if (codes.length === 1) {
    matchedBy = "code";
    order = orders.find((candidate) => candidate.code === codes[0]);
    if (!order) {
      const known = (await store2.list(new URLSearchParams({ status: "ready", q: codes[0] }))).orders.find((candidate) => candidate.code === codes[0]);
      if (known) return known.totalMinor === movement.amountMinor ? { decision: "already_confirmed", orderCode: known.code } : { decision: "review", reason: "amount_mismatch_on_paid_order", orderCode: known.code };
      return { decision: "no_match", reason: "code_not_found_or_not_open" };
    }
  } else if (movement.bankReference) {
    const byReference = orders.filter((candidate) => candidate.receipt?.bankReference.toUpperCase() === movement.bankReference);
    if (byReference.length > 1) return { decision: "review", reason: "reference_matches_several_orders", candidates: byReference.map((item) => item.code) };
    if (byReference.length === 1) {
      order = byReference[0];
      matchedBy = "reference";
    }
  }
  if (!order || !matchedBy) {
    const created = (candidate) => Date.parse(candidate.createdAt);
    const candidates = orders.filter((candidate) => candidate.totalMinor === movement.amountMinor && booked >= created(candidate) - CLOCK_SKEW_MS && booked - created(candidate) <= MAX_ORDER_AGE_MS);
    return candidates.length ? { decision: "review", reason: "amount_and_time_only", candidates: candidates.map((item) => item.code) } : { decision: "no_match", reason: "no_order_with_that_amount" };
  }
  if (order.totalMinor !== movement.amountMinor) return { decision: "review", reason: "amount_mismatch", orderCode: order.code };
  const age = booked - Date.parse(order.createdAt);
  if (age < -CLOCK_SKEW_MS) return { decision: "review", reason: "credit_predates_order", orderCode: order.code };
  if (age > MAX_ORDER_AGE_MS) return { decision: "review", reason: "credit_too_late", orderCode: order.code };
  if (!movement.senderVerified) return { decision: "review", reason: "sender_not_verified", orderCode: order.code };
  try {
    const confirmed = await store2.confirm(order.id, {
      version: order.version,
      receiptId: order.status === "pending_review" && order.receipt ? order.receipt.id : null
    }, AUTO_ACTOR);
    return { decision: "confirmed", orderCode: order.code, matchedBy, order: confirmed };
  } catch (error) {
    if (error instanceof StoreError && error.status === 409) return { decision: "review", reason: "confirmation_conflict", orderCode: order.code };
    throw error;
  }
}
async function reconcileBankMovement(store2, value, now = /* @__PURE__ */ new Date()) {
  const movement = parseBankMovement(value);
  const decision = await decide(store2, movement, now);
  return { ...decision, movement: { movementId: movement.movementId, amountMinor: movement.amountMinor, bankReference: movement.bankReference, bookedAt: movement.bookedAt } };
}

// server/store/http.ts
import { isIP } from "node:net";

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
      const forwarded = options.trustVercelProxy ? request.headers["x-forwarded-for"] : void 0;
      const clientIp = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "";
      const ip = isIP(clientIp) ? clientIp : request.socket.remoteAddress ?? "local";
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
      if ((path === "/api/checkout" || path === "/api/account/session") && method === "GET") {
        const token = cookie(request, CUSTOMER_COOKIE);
        if (!await store2.session(token, "customer")) limits.check(`session:${ip}`, 120, 36e5);
        const customer = await store2.customerSession(token);
        if (customer.token) setCookie(response, CUSTOMER_COOKIE, customer.token, 7 * 86400, secureCookies);
        const account = await store2.account(customer.session);
        json(response, 200, path === "/api/account/session" ? { csrfToken: customer.session.csrf, user: account } : { csrfToken: customer.session.csrf, account, sinpe: await store2.destination(), demo: store2.isDemo(), maxReceiptBytes: MAX_RECEIPT_BYTES });
        return;
      }
      if ((path === "/api/account/register" || path === "/api/account/login") && method === "POST") {
        const previous = await requireSession("customer", true);
        const register = path.endsWith("/register");
        limits.check(`account-${register ? "register" : "login"}:${ip}`, register ? 8 : 20, register ? 36e5 : 15 * 6e4);
        const data = await jsonBody(request);
        if (!register && typeof data.email === "string") limits.check(`account-email:${tokenHash(data.email.trim().toLowerCase().slice(0, 254))}`, 10, 15 * 6e4);
        const result = await (register ? store2.registerCustomer(data, previous) : store2.loginCustomer(data, previous));
        setCookie(response, CUSTOMER_COOKIE, result.token, 7 * 86400, secureCookies);
        const user = await store2.account(result.session);
        if (register && user) {
          await options.mailer?.notifyWelcome(user);
        }
        json(response, 200, { user, csrfToken: result.session.csrf });
        return;
      }
      if (path === "/api/account/logout" && method === "POST") {
        await store2.logout(await requireSession("customer", true));
        const guest = await store2.customerSession(void 0);
        setCookie(response, CUSTOMER_COOKIE, guest.token, 7 * 86400, secureCookies);
        json(response, 200, { user: null, csrfToken: guest.session.csrf });
        return;
      }
      if (path === "/api/account/orders" && method === "GET") {
        json(response, 200, await store2.accountOrders(await requireSession("customer"), url.searchParams));
        return;
      }
      if (path === "/api/account/referrals" && method === "GET") {
        json(response, 200, await store2.referrals(await requireSession("customer")));
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
        json(response, 200, { order: await store2.currentOrder(orderOwner(await requireSession("customer"))) });
        return;
      }
      if (path === "/api/checkout/preview" && method === "POST") {
        const session = await requireSession("customer", true);
        limits.check(`preview:${session.hash}`, 60, 15 * 6e4);
        json(response, 200, await store2.previewOrder(await jsonBody(request), orderOwner(session)));
        return;
      }
      const orderPath = new RegExp(`^/api/orders/(${ID})$`).exec(path);
      if (orderPath && method === "GET") {
        json(response, 200, await store2.customerOrder(orderPath[1], orderOwner(await requireSession("customer"))));
        return;
      }
      const uploadPath = new RegExp(`^/api/orders/(${ID})/receipt$`).exec(path);
      if ((uploadPath || path === "/api/orders") && method === "POST") {
        const session = await requireSession("customer", true);
        limits.check(`upload:${session.hash}`, 20, 36e5);
        limits.check(`upload-ip:${ip}`, 60, 36e5);
        const type = request.headers["content-type"] ?? "";
        if (!type.toLowerCase().startsWith("multipart/form-data;")) throw new StoreError(415, "Para registrar el pedido debes enviar el comprobante. Actualiza la tienda y contin\xFAa al pago.");
        const bytes = await body(request, MAX_RECEIPT_BYTES + 128 * 1024);
        let form;
        try {
          form = await new Response(new Uint8Array(bytes), { headers: { "Content-Type": type } }).formData();
        } catch {
          throw new StoreError(400, "No se pudo leer el formulario del comprobante.");
        }
        const entries = [...form.entries()];
        const keys = entries.map(([key]) => key);
        const allowed = uploadPath ? ["code", "bankReference", "uploadKey", "version", "receipt"] : ["checkoutToken", "uploadKey", "receipt"];
        const required = uploadPath ? ["uploadKey", "version", "receipt"] : allowed;
        if (new Set(keys).size !== entries.length || keys.some((key) => !allowed.includes(key)) || !required.every((req) => keys.includes(req))) throw new StoreError(422, "El formulario contiene campos ausentes, repetidos o no permitidos.");
        if (uploadPath) await store2.checkUpload(uploadPath[1], orderOwner(session), form.get("code"));
        const file = form.get("receipt");
        if (!(file instanceof Blob)) throw new StoreError(422, "Selecciona un comprobante.");
        if (file.size > MAX_RECEIPT_BYTES) throw new StoreError(413, "El comprobante no puede superar 5 MB.");
        const version2 = form.get("version");
        if (uploadPath && (typeof version2 !== "string" || !/^[1-9]\d{0,8}$/.test(version2))) throw new StoreError(422, "Versi\xF3n del pedido inv\xE1lida.");
        const prepared = await prepareReceipt(Buffer.from(await file.arrayBuffer()), file.type);
        const received = uploadPath ? await store2.addReceipt(uploadPath[1], orderOwner(session), form.get("code"), form.get("bankReference"), form.get("uploadKey"), Number(version2), prepared) : await store2.completeCheckout(form.get("checkoutToken"), orderOwner(session), form.get("uploadKey"), prepared);
        await options.mailer?.notify("receipt.submitted", received);
        json(response, 200, received);
        return;
      }
      const receiptPath = new RegExp(`^/api/(admin/)?orders/(${ID})/receipts/(${ID})$`).exec(path);
      if (receiptPath && method === "GET") {
        if (receiptPath[1]) await requireSession("admin");
        else await store2.customerOrder(receiptPath[2], orderOwner(await requireSession("customer")));
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
      if (path === "/api/automation/bank-movements" && method === "POST") {
        if (!options.automationToken) throw new StoreError(404, "Ruta no encontrada.");
        limits.check(`automation:${ip}`, 600, 36e5);
        const supplied = request.headers.authorization ?? "";
        const digest = (value) => createHash5("sha256").update(value).digest();
        if (!timingSafeEqual3(digest(supplied), digest(`Bearer ${options.automationToken}`))) throw new StoreError(401, "Autenticaci\xF3n requerida.");
        const result = await reconcileBankMovement(store2, await jsonBody(request));
        if (result.decision === "confirmed") {
          await options.mailer?.notify("payment.confirmed_manual", result.order);
          json(response, 200, { decision: result.decision, orderCode: result.orderCode, matchedBy: result.matchedBy, movement: result.movement });
        } else json(response, 200, result);
        return;
      }
      if (path === "/api/admin/customers" && method === "GET") {
        await requireSession("admin");
        json(response, 200, await store2.customers(url.searchParams));
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
          const confirm = adminOrder[2] === "confirm";
          const operation = confirm ? store2.confirm.bind(store2) : store2.reject.bind(store2);
          const reviewed = await operation(adminOrder[1], data, await store2.adminName());
          await options.mailer?.notify(confirm ? "payment.confirmed_manual" : "receipt.correction_requested", reviewed);
          json(response, 200, reviewed);
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

// server/store/mailer.ts
import nodemailer from "nodemailer";
function readSmtpConfig(env = process.env) {
  const host = env.SMTP_HOST?.trim();
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(env.SMTP_PORT || "465");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("SMTP_PORT debe ser un n\xFAmero de puerto v\xE1lido.");
  const secure = port === 465 ? true : env.SMTP_SECURE ? env.SMTP_SECURE.toLowerCase() === "true" : false;
  return { host, port, secure, user, pass, from: env.MAIL_FROM?.trim() || `Onky\u2019s <${user}>`, replyTo: env.MAIL_REPLY_TO?.trim() || void 0, bcc: env.MAIL_BCC?.trim() || void 0 };
}
var totalDate = new Intl.DateTimeFormat("es-CR", { timeZone: "America/Costa_Rica", dateStyle: "long", timeStyle: "short" });
var orderDate = new Intl.DateTimeFormat("es-CR", { timeZone: "America/Costa_Rica", dateStyle: "medium" });
var storeOrigin = "https://onkys.shop";
function esc(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function linesTable(order, paid) {
  const html = order.lines.map((line) => `<tr><td style="padding:12px 12px 12px 0;border-bottom:1px solid #e5e0e6;vertical-align:top;">
      <p style="margin:0 0 5px;font-size:15px;line-height:21px;font-weight:700;color:#211d25;">${esc(line.name)}</p>
      ${line.options.length ? `<p style="margin:0 0 6px;font-size:12px;line-height:18px;color:#716b76;">${esc(line.options.join(" \xB7 "))}</p>` : ""}
      <p style="margin:0;font-size:12px;line-height:18px;color:#716b76;">${line.quantity} \xD7 ${esc(money(line.unitPriceMinor, store))}</p>
    </td><td align="right" style="padding:12px 0;border-bottom:1px solid #e5e0e6;vertical-align:top;font-size:14px;line-height:21px;font-weight:700;color:#382448;white-space:nowrap;">${esc(money(line.lineTotalMinor, store))}</td></tr>`).join("");
  const shipping = order.shippingMinor === null ? "Env\xEDo por confirmar" : order.shippingMinor === 0 ? "Sin costo" : money(order.shippingMinor, store);
  const total = order.totalMinor === null ? "Por confirmar" : money(order.totalMinor, store);
  return {
    html: `<table aria-label="Resumen de tu pedido" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;">
      <thead><tr>
        <th scope="col" align="left" style="padding:0 0 10px;border-bottom:1px solid #e5e0e6;color:#716b76;font-size:11px;font-weight:400;">Producto</th>
        <th scope="col" align="right" style="padding:0 0 10px;border-bottom:1px solid #e5e0e6;color:#716b76;font-size:11px;font-weight:400;">Importe</th>
      </tr></thead>
      <tbody>${html}
        <tr><td style="padding:14px 10px 6px 0;color:#716b76;font-size:13px;">Subtotal</td><td align="right" style="padding:14px 0 6px;color:#211d25;font-size:13px;white-space:nowrap;">${esc(money(order.subtotalMinor, store))}</td></tr>
        ${order.discountMinor ? `<tr><td style="padding:4px 10px 6px 0;color:#65447a;font-size:13px;">Bienvenida \xB7 10%</td><td align="right" style="padding:4px 0 6px;color:#65447a;font-size:13px;">\u2212${esc(money(order.discountMinor, store))}</td></tr>` : ""}
        <tr><td style="padding:4px 10px 14px 0;color:#716b76;font-size:13px;line-height:19px;">${esc(order.delivery.name)}</td><td align="right" style="padding:4px 0 14px;color:#211d25;font-size:13px;line-height:19px;">${esc(shipping)}</td></tr>
        <tr>
          <th scope="row" align="left" bgcolor="#f2edf5" style="padding:14px 16px;border-radius:8px 0 0 8px;color:#382448;font-size:14px;font-weight:700;">${paid ? "Total pagado" : "Total del pedido"}<br><span style="font-size:11px;line-height:20px;font-weight:400;color:#716b76;">Colones costarricenses \xB7 CRC</span></th>
          <td align="right" bgcolor="#f2edf5" class="order-total" style="padding:14px 16px 14px 0;border-radius:0 8px 8px 0;color:#382448;font-size:24px;line-height:30px;font-weight:700;letter-spacing:-0.8px;">${esc(total)}</td>
        </tr>
      </tbody></table>`,
    text: order.lines.map((line) => `\u2022 ${line.quantity} \xD7 ${line.name}${line.options.length ? ` (${line.options.join(", ")})` : ""} \u2014 ${money(line.lineTotalMinor, store)}`).join("\n") + `
Subtotal: ${money(order.subtotalMinor, store)}${order.discountMinor ? `
Bienvenida \xB7 10%: \u2212${money(order.discountMinor, store)}` : ""}
${order.delivery.name}: ${shipping}
${paid ? "Total pagado" : "Total del pedido"}: ${total} (CRC)`
  };
}
function noteBox(title, content) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;">
    <tr><td bgcolor="#fbfaf9" style="padding:16px 18px;border-radius:8px;font-size:14px;line-height:22px;color:#5d5664;">
      <h2 style="margin:0 0 6px;color:#382448;font-size:14px;line-height:20px;font-weight:700;">${esc(title)}</h2>${content}
    </td></tr></table>`;
}
function sinpeBox(order) {
  if (order.status === "pending_details" || !order.destination || order.totalMinor === null) {
    return noteBox("El siguiente paso", '<p style="margin:0;">Tu pedido est\xE1 guardado. La tienda debe confirmar los datos de pago antes de que realices el SINPE. Consulta las indicaciones desde tu pedido.</p>');
  }
  const destination = order.destination;
  const phone = destination.phone.length === 8 ? `${destination.phone.slice(0, 4)}-${destination.phone.slice(4)}` : destination.phone;
  return noteBox("Completa tu pago con SINPE M\xF3vil", `
    <p style="margin:0 0 8px;color:#382448;font-size:24px;line-height:30px;font-weight:700;letter-spacing:-0.5px;">${esc(phone)}</p>
    <p style="margin:0 0 12px;">${esc(destination.beneficiary)}<br><span style="color:#716b76;font-size:12px;">${esc(destination.bank)}</span></p>
    <p style="margin:0 0 8px;">Monto exacto: <strong>${esc(money(order.totalMinor, store))}</strong><br>Descripci\xF3n: <strong style="word-break:break-word;">${esc(order.code)}</strong></p>
    <p style="margin:0;">Despu\xE9s, sube el comprobante desde tu pedido en la tienda. Nuestro equipo revisar\xE1 el pago y te enviar\xE1 la confirmaci\xF3n.</p>`);
}
function orderEmailMessage(event, order, origin = storeOrigin) {
  const recipient = order.customer?.email;
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(recipient)) return null;
  const paid = event === "payment.confirmed_manual";
  const totals2 = linesTable(order, paid);
  const code = esc(order.code);
  const name = esc(order.customer.name.trim().split(/\s+/)[0] || order.customer.name);
  const image = `${(origin || storeOrigin).replace(/\/+$/, "")}/images/mail-gomitas-v1.png`;
  let title = "";
  let headline = "";
  let status = "";
  let preheader = "";
  let lead = "";
  let body2 = "";
  let detailText = "";
  let action = "Ir a mi pedido";
  if (event === "order.created") {
    title = "Recibimos tu pedido";
    headline = "Un antojo<br>bien elegido.";
    status = "Pedido recibido";
    const awaitingDetails = order.status === "pending_details" || !order.destination || order.totalMinor === null;
    preheader = awaitingDetails ? "Tu pedido est\xE1 guardado. Estamos por confirmar los datos de pago para continuar." : "Tu pedido est\xE1 guardado. Solo falta completar el pago con SINPE M\xF3vil para prepararlo.";
    lead = `\xA1Hola, ${name}! ${awaitingDetails ? "Tu pedido qued\xF3 registrado. La tienda debe confirmar los datos de pago para continuar." : "Recibimos tu pedido. Completa el pago con SINPE M\xF3vil para que podamos preparar tus gomitas."}`;
    body2 = sinpeBox(order);
    detailText = awaitingDetails ? "Estado: pedido registrado. Consulta las indicaciones de pago desde la tienda." : `Estado: pedido registrado. Realiza tu SINPE al ${order.destination.phone}, a nombre de ${order.destination.beneficiary} (${order.destination.bank}), por ${money(order.totalMinor, store)}. Incluye ${order.code} en la descripci\xF3n y sube el comprobante desde la tienda.`;
    action = awaitingDetails ? "Ir a mi pedido" : "Completar mi pedido";
  } else if (event === "receipt.submitted") {
    title = "Pago en revisi\xF3n";
    headline = "Tu pago,<br>en revisi\xF3n.";
    status = "Pago en revisi\xF3n";
    preheader = `Recibimos el comprobante de tu pedido ${order.code}.`;
    lead = `Hola, ${name}. Estamos revisando el pago de tu pedido. Este proceso suele tardar de 5 a 10 minutos.`;
    const reviewNext = order.delivery.requiresAddress ? "En cuanto confirmemos el pago, prepararemos tu pedido para la entrega y te avisaremos por este correo." : "En cuanto confirmemos el pago, nuestro equipo te contactar\xE1 por WhatsApp para coordinar la entrega.";
    body2 = noteBox("\xBFQu\xE9 sigue?", `<p style="margin:0;">Por ahora no necesitas hacer nada m\xE1s. ${reviewNext}</p>${order.receipt?.bankReference ? `<p style="margin:12px 0 0;font-size:12px;line-height:19px;color:#716b76;word-break:break-word;">Referencia del comprobante: ${esc(order.receipt.bankReference)}</p>` : ""}`);
    detailText = `Estado: pago en revisi\xF3n. Recibimos tu comprobante; revisarlo suele tardar de 5 a 10 minutos. Por ahora no necesitas hacer nada m\xE1s. ${reviewNext}${order.receipt?.bankReference ? `
Referencia del comprobante: ${order.receipt.bankReference}` : ""}`;
  } else if (paid) {
    title = "\xA1Pago confirmado!";
    headline = "Tu antojo,<br>confirmado.";
    status = "Pago confirmado";
    preheader = "Verificamos tu pago con \xE9xito. Tu pedido ya est\xE1 confirmado y entra a preparaci\xF3n para la entrega.";
    const confirmed = order.paymentConfirmedAt ? totalDate.format(new Date(order.paymentConfirmedAt)) : "";
    lead = `\xA1Gracias por elegir Onky\u2019s, ${name}! Verificamos tu pago y tu pedido ya entra a preparaci\xF3n.`;
    const next = order.delivery.requiresAddress ? "Prepararemos tu selecci\xF3n y la enviaremos a la direcci\xF3n registrada, con el m\xE9todo de entrega que elegiste." : "Prepararemos tu selecci\xF3n. Nuestro equipo te contactar\xE1 por WhatsApp para coordinar la entrega.";
    body2 = noteBox("Ahora viene lo bueno", `<p style="margin:0;">${next}</p>${confirmed ? `<p style="margin:12px 0 0;font-size:12px;line-height:19px;color:#716b76;">Pago verificado el ${esc(confirmed)}</p>` : ""}`);
    detailText = `Estado: pago confirmado. Tu pedido entra a preparaci\xF3n.${confirmed ? `
Pago verificado el ${confirmed}` : ""}
${order.delivery.requiresAddress ? `M\xE9todo de entrega: ${order.delivery.name}. Usaremos la direcci\xF3n registrada.` : "Nuestro equipo te contactar\xE1 por WhatsApp para coordinar la entrega."}`;
  } else {
    title = "Revisemos tu comprobante";
    headline = "Un detalle<br>por revisar.";
    status = "Revisa tu comprobante";
    preheader = "Revisamos tu comprobante pero necesitamos un detalle adicional para poder confirmar tu pedido.";
    const reason = order.customerMessage;
    lead = `Hola, ${name}. A\xFAn no pudimos confirmar el pago. Revisemos el comprobante para continuar con tu pedido.`;
    body2 = noteBox("Un paso m\xE1s y seguimos", `${reason ? `<p style="margin:0 0 10px;color:#382448;"><strong>Motivo:</strong> ${esc(reason)}</p>` : ""}<p style="margin:0;">Abre tu pedido en la tienda y adjunta el comprobante corregido. Conserva el mismo c\xF3digo de pedido: <strong style="word-break:break-word;">${code}</strong>.</p>`);
    detailText = `Estado: comprobante por corregir.${reason ? `
Motivo: ${reason}` : ""}
Abre tu pedido y adjunta el comprobante corregido, conservando el mismo c\xF3digo.`;
    action = "Revisar mi comprobante";
  }
  const message = `<!doctype html>
<html lang="es-CR" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
  <title>${esc(title)} \xB7 Onky\u2019s</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;} img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
    a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;}
    @media only screen and (max-width:480px){
      .mail-outer{padding:16px 8px!important;} .mail-pad{padding-left:20px!important;padding-right:20px!important;}
      .mail-hero{padding-top:22px!important;padding-bottom:22px!important;} .hero-title{font-size:30px!important;line-height:33px!important;letter-spacing:-1px!important;}
      .hero-art{width:92px!important;padding-left:14px!important;} .hero-art img{width:92px!important;height:auto!important;}
      .order-total{font-size:21px!important;} .mail-button{display:block!important;text-align:center!important;}
    }
    @media only screen and (max-width:360px){
      .hero-title{font-size:26px!important;line-height:29px!important;}
      .hero-art{width:76px!important;padding-left:10px!important;} .hero-art img{width:76px!important;}
      .order-meta{display:block!important;width:100%!important;text-align:left!important;}
      .order-date{padding-top:10px!important;padding-left:0!important;}
    }
  </style>
</head>
<body bgcolor="#f1eef3" style="margin:0;padding:0;width:100%;background-color:#f1eef3;font-family:Arial,Helvetica,sans-serif;color:#211d25;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1eef3" style="width:100%;">
  <tr><td align="center" class="mail-outer" style="padding:28px 16px;">
    <!--[if mso]><table role="presentation" width="680" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
    <table role="presentation" class="mail-card" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:680px;border:1px solid #e5e0e6;border-radius:16px;border-spacing:0;box-shadow:0 12px 32px rgba(56,36,72,0.09),0 2px 6px rgba(56,36,72,0.04);overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
      <tr><td class="mail-pad" bgcolor="#fbfaf9" style="padding:20px 36px;border-radius:16px 16px 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="color:#382448;font-size:34px;line-height:38px;font-weight:800;letter-spacing:-2px;">Onky\u2019s<span style="color:#9c7bb1;">.</span></td>
          <td align="right" style="color:#716b76;font-size:11px;line-height:17px;">Gomitas<br>enchiladas</td>
        </tr></table>
        <p style="margin:12px 0 0;color:#716b76;font-size:12px;line-height:19px;">${esc(preheader)}</p>
      </td></tr>
      <tr><td class="mail-pad mail-hero" bgcolor="#f2edf5" style="padding:24px 36px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="middle">
            <p style="margin:0 0 12px;color:#634479;font-size:12px;line-height:18px;font-weight:400;">${status}</p>
            <h1 class="hero-title" style="margin:0 0 12px;color:#382448;font-size:38px;line-height:41px;letter-spacing:-1.6px;font-weight:800;">${headline}</h1>
            <p style="margin:0;font-size:14px;line-height:23px;color:#5d5664;">${lead}</p>
          </td>
          <td class="hero-art" width="154" align="right" valign="middle" style="width:154px;padding-left:20px;">
            <img src="${esc(image)}" width="134" height="179" alt="Gomitas Onky\u2019s" style="display:block;width:134px;height:179px;color:#382448;font-size:12px;">
          </td>
        </tr></table>
      </td></tr>
      <tr><td class="mail-pad" style="padding:0 36px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td class="order-meta" style="padding:22px 0 0;">
            <p style="margin:0 0 6px;color:#716b76;font-size:12px;line-height:18px;">Tu pedido</p>
            <p style="margin:0;color:#382448;font-family:'Courier New',monospace;font-size:14px;line-height:20px;font-weight:700;word-break:break-word;">${code}</p>
          </td>
          <td align="right" class="order-meta order-date" style="padding:22px 0 0 16px;">
            <p style="margin:0 0 6px;color:#716b76;font-size:12px;line-height:18px;">Fecha del pedido</p>
            <p style="margin:0;color:#211d25;font-size:13px;line-height:20px;">${esc(orderDate.format(new Date(order.createdAt)))}</p>
          </td>
        </tr></table>
        <h2 style="margin:22px 0 14px;color:#211d25;font-size:20px;line-height:26px;letter-spacing:-0.4px;">Tu selecci\xF3n</h2>
        ${totals2.html}
      </td></tr>
      <tr><td class="mail-pad" style="padding:20px 36px;">
        <p style="margin:0 0 8px;color:#716b76;font-size:12px;line-height:18px;">${order.delivery.requiresAddress ? "Datos de entrega" : "Datos de recogida"}</p>
        <p style="margin:0 0 4px;color:#211d25;font-size:14px;line-height:22px;font-weight:700;">${esc(order.customer.name)}</p>
        <p style="margin:0;color:#5d5664;font-size:13px;line-height:21px;">${esc(order.delivery.name)}${order.delivery.requiresAddress && order.customer.address ? `<br>${esc(order.customer.address).replace(/\r?\n/g, "<br>")}` : ""}</p>
      </td></tr>
      <tr><td class="mail-pad" style="padding:0 36px;">${body2}</td></tr>
      ${origin ? `<tr><td align="center" class="mail-pad" style="padding:20px 36px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr><td align="center" bgcolor="#382448" style="border:1px solid #382448;border-radius:8px;mso-padding-alt:14px 28px;">
          <a class="mail-button" href="${esc(origin)}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:14px;line-height:20px;font-weight:700;text-decoration:none;border-radius:8px;">${action}</a>
        </td></tr></table>
        <p style="margin:10px 0 0;color:#716b76;font-size:11px;line-height:18px;">Abre <a href="${esc(origin)}" style="color:#65447a;word-break:break-word;">${esc(origin)}</a> y entra a \xABPedido y seguimiento\xBB<br>desde el navegador donde hiciste tu compra.</p>
      </td></tr>` : ""}
      <tr><td align="center" class="mail-pad" style="padding:20px 36px;">
        <p style="margin:0;color:#382448;font-size:14px;line-height:22px;font-weight:700;">Gracias por dejarnos ser parte de tu antojo.</p>
        <p style="margin:4px 0 0;color:#716b76;font-size:12px;line-height:19px;">Con cari\xF1o, el equipo de Onky\u2019s.</p>
      </td></tr>
      <tr><td align="center" class="mail-pad" bgcolor="#fbfaf9" style="padding:14px 36px;border-radius:0 0 16px 16px;">
        <p style="margin:0;color:#716b76;font-size:11px;line-height:18px;">Dulce. \xC1cido. Picosito.</p>
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;"><tr><td align="center" style="padding:16px 16px 0;color:#716b76;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;">
      Recibiste este correo por tu pedido en Onky\u2019s.<br>Conserva el c\xF3digo <span style="word-break:break-word;">${code}</span> para identificarlo.
    </td></tr></table>
  </td></tr></table>
</body></html>`;
  const text3 = `Onky\u2019s \xB7 ${title}
Hola, ${order.customer.name}.
Pedido: ${order.code} \xB7 ${orderDate.format(new Date(order.createdAt))}

${detailText}

${totals2.text}

Entrega: ${order.delivery.name}${order.delivery.requiresAddress && order.customer.address ? `
${order.customer.address}` : ""}.

${origin ? `Consulta tu pedido: ${origin}
Abre \xABPedido y seguimiento\xBB desde el navegador donde hiciste tu compra.` : "Consulta tu pedido en la tienda."}

Gracias por dejarnos ser parte de tu antojo.
El equipo de Onky\u2019s \xB7 Dulce. \xC1cido. Picosito.

Recibiste este correo por tu pedido en Onky\u2019s.`;
  return { subject: `Onky\u2019s \xB7 ${title} (${order.code})`, html: message, text: text3 };
}
function welcomeEmailMessage(account, origin = storeOrigin) {
  const recipient = account.email?.trim();
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(recipient)) return null;
  const name = esc(account.name.trim().split(/\s+/)[0] || account.name.trim() || "cliente");
  const email2 = esc(recipient);
  const image = `${(origin || storeOrigin).replace(/\/+$/, "")}/images/mail-gomitas-v1.png`;
  const title = "Tu cuenta est\xE1 lista";
  const headline = "Tu cuenta<br>est\xE1 lista.";
  const status = "Cuenta creada";
  const preheader = "Confirmaci\xF3n de registro en Onky\u2019s. Ya puedes acceder a tu cuenta y consultar tus pedidos.";
  const lead = `Hola, ${name}. Gracias por crear tu cuenta en Onky\u2019s. Puedes iniciar sesi\xF3n con el correo que registraste para guardar y consultar tus pedidos.`;
  const action = "Abrir la tienda";
  const message = `<!doctype html>
<html lang="es-CR" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
  <title>${esc(title)} \xB7 Onky\u2019s</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;} img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
    a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;}
    @media only screen and (max-width:480px){
      .mail-outer{padding:16px 8px!important;} .mail-pad{padding-left:20px!important;padding-right:20px!important;}
      .mail-hero{padding-top:22px!important;padding-bottom:22px!important;} .hero-title{font-size:30px!important;line-height:33px!important;letter-spacing:-1px!important;}
      .hero-art{width:92px!important;padding-left:14px!important;} .hero-art img{width:92px!important;height:auto!important;}
      .mail-button{display:block!important;text-align:center!important;}
    }
    @media only screen and (max-width:360px){
      .hero-title{font-size:26px!important;line-height:29px!important;}
      .hero-art{width:76px!important;padding-left:10px!important;} .hero-art img{width:76px!important;}
    }
  </style>
</head>
<body bgcolor="#f1eef3" style="margin:0;padding:0;width:100%;background-color:#f1eef3;font-family:Arial,Helvetica,sans-serif;color:#211d25;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1eef3" style="width:100%;">
  <tr><td align="center" class="mail-outer" style="padding:28px 16px;">
    <!--[if mso]><table role="presentation" width="680" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
    <table role="presentation" class="mail-card" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:680px;border:1px solid #e5e0e6;border-radius:16px;border-spacing:0;box-shadow:0 12px 32px rgba(56,36,72,0.09),0 2px 6px rgba(56,36,72,0.04);overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
      <tr><td class="mail-pad" bgcolor="#fbfaf9" style="padding:20px 36px;border-radius:16px 16px 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="color:#382448;font-size:34px;line-height:38px;font-weight:800;letter-spacing:-2px;">Onky\u2019s<span style="color:#9c7bb1;">.</span></td>
          <td align="right" style="color:#716b76;font-size:11px;line-height:17px;">Gomitas<br>enchiladas</td>
        </tr></table>
        <p style="margin:12px 0 0;color:#716b76;font-size:12px;line-height:19px;">${esc(preheader)}</p>
      </td></tr>
      <tr><td class="mail-pad mail-hero" bgcolor="#f2edf5" style="padding:24px 36px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="middle">
            <p style="margin:0 0 12px;color:#634479;font-size:12px;line-height:18px;font-weight:400;">${status}</p>
            <h1 class="hero-title" style="margin:0 0 12px;color:#382448;font-size:38px;line-height:41px;letter-spacing:-1.6px;font-weight:800;">${headline}</h1>
            <p style="margin:0;font-size:14px;line-height:23px;color:#5d5664;">${lead}</p>
          </td>
          <td class="hero-art" width="154" align="right" valign="middle" style="width:154px;padding-left:20px;">
            <img src="${esc(image)}" width="134" height="179" alt="Gomitas Onky\u2019s" style="display:block;width:134px;height:179px;color:#382448;font-size:12px;">
          </td>
        </tr></table>
      </td></tr>
      <tr><td class="mail-pad" style="padding:24px 36px 0;">
        <h2 style="margin:0 0 10px;color:#382448;font-size:16px;line-height:22px;font-weight:700;">Datos de tu cuenta</h2>
        <p style="margin:0;color:#211d25;font-size:14px;line-height:22px;"><strong>Nombre:</strong> ${esc(account.name)}<br><strong>Correo electr\xF3nico:</strong> <span style="word-break:break-word;">${email2}</span></p>
      </td></tr>
      <tr><td class="mail-pad" style="padding:20px 36px 0;">
        ${noteBox("Beneficio de bienvenida", '<p style="margin:0;">Tu primer pedido incluye un <strong>10% de descuento</strong> que se aplica autom\xE1ticamente al subtotal de productos al iniciar sesi\xF3n. El costo de env\xEDo no est\xE1 incluido.</p>')}
      </td></tr>
      ${origin ? `<tr><td align="center" class="mail-pad" style="padding:24px 36px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr><td align="center" bgcolor="#382448" style="border:1px solid #382448;border-radius:8px;mso-padding-alt:14px 28px;">
          <a class="mail-button" href="${esc(origin)}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:14px;line-height:20px;font-weight:700;text-decoration:none;border-radius:8px;">${action}</a>
        </td></tr></table>
        <p style="margin:10px 0 0;color:#716b76;font-size:11px;line-height:18px;">Entra a <a href="${esc(origin)}" style="color:#65447a;word-break:break-word;">${esc(origin)}</a> e inicia sesi\xF3n con el correo registrado para consultar tus pedidos.</p>
      </td></tr>` : ""}
      <tr><td align="center" class="mail-pad" style="padding:24px 36px;">
        <p style="margin:0;color:#382448;font-size:14px;line-height:22px;font-weight:700;">Gracias por dejarnos ser parte de tu antojo.</p>
        <p style="margin:4px 0 0;color:#716b76;font-size:12px;line-height:19px;">Con cari\xF1o, el equipo de Onky\u2019s.</p>
      </td></tr>
      <tr><td align="center" class="mail-pad" bgcolor="#fbfaf9" style="padding:14px 36px;border-radius:0 0 16px 16px;">
        <p style="margin:0;color:#716b76;font-size:11px;line-height:18px;">Dulce. \xC1cido. Picosito.</p>
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;"><tr><td align="center" style="padding:16px 16px 0;color:#716b76;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;">
      Recibiste este correo porque creaste una cuenta en Onky\u2019s.
    </td></tr></table>
  </td></tr></table>
</body></html>`;
  const text3 = `Onky\u2019s \xB7 ${title}
Hola, ${account.name}.

Gracias por crear tu cuenta en Onky\u2019s. Puedes iniciar sesi\xF3n con el correo que registraste para guardar y consultar tus pedidos.

Datos de tu cuenta:
Nombre: ${account.name}
Correo: ${recipient}

Beneficio de bienvenida:
Tu primer pedido incluye un 10% de descuento que se aplica autom\xE1ticamente al subtotal de productos al iniciar sesi\xF3n. El costo de env\xEDo no est\xE1 incluido.

${origin ? `Ir a la tienda: ${origin}
Inicia sesi\xF3n con el correo registrado para consultar tus pedidos.` : "Visita la tienda e inicia sesi\xF3n para consultar tus pedidos."}

Gracias por dejarnos ser parte de tu antojo.
El equipo de Onky\u2019s \xB7 Dulce. \xC1cido. Picosito.

Recibiste este correo porque creaste una cuenta en Onky\u2019s.`;
  return { subject: `Onky\u2019s \xB7 ${title}`, html: message, text: text3 };
}
var MAX_TRACKED = 400;
function createOrderMailer(env = process.env, deliver) {
  const config = readSmtpConfig(env);
  if (!config) return null;
  const origin = env.STORE_PUBLIC_ORIGIN?.trim() || storeOrigin;
  const transport = deliver ? { sendMail: deliver } : nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 6e3,
    greetingTimeout: 6e3,
    socketTimeout: 1e4
  });
  const send = (to, message) => transport.sendMail({
    from: config.from,
    to: to.trim(),
    replyTo: config.replyTo,
    bcc: config.bcc,
    ...message,
    // RFC 3834: these messages are generated by an account/order action.
    // This identifies automation to responders; it does not override spam filters.
    headers: { "Auto-Submitted": "auto-generated" }
  });
  const sent = /* @__PURE__ */ new Map();
  const first = (key) => {
    if (sent.has(key)) return false;
    if (sent.size >= MAX_TRACKED) for (const [old, time] of sent) {
      if (time < Date.now() - 36e5) sent.delete(old);
    }
    if (sent.size >= MAX_TRACKED) sent.delete(sent.keys().next().value);
    sent.set(key, Date.now());
    return true;
  };
  return {
    notify(event, order) {
      const key = `${order.id}:${order.version || 0}:${event}`;
      if (!first(key)) return Promise.resolve();
      const message = orderEmailMessage(event, order, origin);
      if (!message) return Promise.resolve();
      const to = order.customer.email;
      return send(to, message).then(() => {
        sent.set(key, Date.now());
      }).catch((error) => {
        sent.delete(key);
        console.warn(`Onky\u2019s: el correo ${event} del pedido ${order.code} no sali\xF3: ${error instanceof Error ? error.message : "error desconocido"}`);
      });
    },
    notifyWelcome(account) {
      const key = `welcome:${account.email.trim().toLowerCase()}`;
      if (!first(key)) return Promise.resolve();
      const message = welcomeEmailMessage(account, origin);
      if (!message) return Promise.resolve();
      const to = account.email.trim();
      return send(to, message).then(() => {
        sent.set(key, Date.now());
      }).catch((error) => {
        sent.delete(key);
        console.warn(`Onky\u2019s: el correo de bienvenida para ${account.email} no sali\xF3: ${error instanceof Error ? error.message : "error desconocido"}`);
      });
    }
  };
}

// server/store/runtime.ts
function automationToken() {
  const token = process.env.BANK_AUTOMATION_TOKEN?.trim();
  if (!token) return void 0;
  if (token.length < 32) throw new Error("BANK_AUTOMATION_TOKEN debe tener al menos 32 caracteres (usa 32 bytes en base64url).");
  return token;
}
async function createShopRuntime() {
  const directory = resolve(process.env.STORE_DATA_DIR || (process.env.VERCEL ? "/tmp/store" : ".data/store"));
  const unsafeRoots = [resolve("public"), resolve("dist")];
  if (directory === resolve(".") || unsafeRoots.some((root) => directory === root || directory.startsWith(`${root}/`) || directory.startsWith(`${root}\\`))) throw new Error("La carpeta de datos privados no puede ser la ra\xEDz del proyecto ni estar dentro de public/ o dist/.");
  mkdirSync(directory, { recursive: true });
  const mongoUri = process.env.MONGODB_URI;
  if (process.env.VERCEL && !mongoUri) throw new Error("Configura MONGODB_URI: el almacenamiento temporal de Vercel no conserva los pedidos.");
  let database;
  if (mongoUri) {
    const mongoDb = new MongoShopDatabase(mongoUri, store, { dbName: process.env.MONGODB_DB_NAME || "onkys" });
    try {
      await mongoDb.init();
    } catch (error) {
      await mongoDb.close();
      throw error;
    }
    database = mongoDb;
  } else {
    database = new ShopDatabase(resolve(directory, "orders.sqlite"), store);
  }
  const setupPath = resolve(directory, "admin-setup-token.txt");
  try {
    if (!await database.initialized()) {
      let token;
      try {
        token = readFileSync(setupPath, "utf8").trim();
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        token = newToken();
        writeFileSync(setupPath, `${token}
`, { flag: "wx", mode: 384 });
      }
      if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("El c\xF3digo de instalaci\xF3n local no es v\xE1lido. No se sobrescribi\xF3 el archivo existente.");
      await database.ensureSetupToken(token);
      console.info("Onky\u2019s: configura administraci\xF3n en /admin. El c\xF3digo de instalaci\xF3n est\xE1 en el archivo privado admin-setup-token.txt de la carpeta de datos.");
    }
    const secure = process.env.STORE_SECURE_COOKIES === "true" || Boolean(process.env.VERCEL);
    const publicOrigin = process.env.STORE_PUBLIC_ORIGIN || (process.env.VERCEL && process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : void 0);
    if (process.env.NODE_ENV === "production" && !process.env.VERCEL && (!secure || !publicOrigin?.startsWith("https://"))) {
      throw new Error("Para producci\xF3n se requieren STORE_SECURE_COOKIES=true y STORE_PUBLIC_ORIGIN con HTTPS. Revisa tambi\xE9n la gu\xEDa de despliegue y privacidad.");
    }
    const handler2 = makeShopHandler(database, { secureCookies: secure, publicOrigin, setupTokenPath: setupPath, mailer: createOrderMailer(), trustVercelProxy: process.env.VERCEL === "1", automationToken: automationToken() });
    let closed = false;
    return { database, handler: handler2, close: () => {
      if (!closed) {
        closed = true;
        void database.close();
      }
    } };
  } catch (error) {
    await database.close();
    throw error;
  }
}

// server/store/api-handler.ts
var runtimePromise = null;
async function handler(request, response) {
  try {
    runtimePromise ??= createShopRuntime().catch((error) => {
      runtimePromise = null;
      throw error;
    });
    const runtime = await runtimePromise;
    return await runtime.handler(request, response);
  } catch {
    if (response.destroyed || response.writableEnded) return;
    response.writeHead(503, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "5", "X-Content-Type-Options": "nosniff" });
    response.end(JSON.stringify({ error: "La tienda no pudo conectar con sus datos. Reintenta en unos momentos." }));
  }
}
export {
  handler as default
};
