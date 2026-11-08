const Database = require("better-sqlite3");
const path = require("path");
const seed = require("./data/products.json");

// На хостинге базу кладут на постоянный диск: DB_PATH=/var/data/shop.db
const db = new Database(process.env.DB_PATH || path.join(__dirname, "data", "shop.db"));

// SQLite сравнивает регистр только у латиницы, поэтому для поиска по-русски
// приводим строки к нижнему регистру на стороне JS
db.function("lc", { deterministic: true }, (s) => (s == null ? null : String(s).toLowerCase()));

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,
    price       INTEGER NOT NULL,
    oldPrice    INTEGER,
    badge       TEXT,
    rating      REAL,
    reviews     INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    specs       TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    status       TEXT NOT NULL DEFAULT 'new',
    name         TEXT NOT NULL,
    phone        TEXT NOT NULL,
    email        TEXT,
    delivery     TEXT NOT NULL,
    address      TEXT,
    comment      TEXT,
    promo        TEXT,
    subtotal     INTEGER NOT NULL,
    discount     INTEGER NOT NULL,
    delivery_cost INTEGER NOT NULL,
    total        INTEGER NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    payment_txn_id TEXT
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER NOT NULL REFERENCES orders(id),
    product_id TEXT NOT NULL,
    name       TEXT NOT NULL,
    price      INTEGER NOT NULL,
    qty        INTEGER NOT NULL
  );
`);

// Миграция: в базах, созданных до появления оплаты, этих колонок ещё нет — CREATE TABLE IF NOT EXISTS их не добавит
{
  const cols = new Set(db.prepare("PRAGMA table_info(orders)").all().map((c) => c.name));
  if (!cols.has("payment_method")) db.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash'");
  if (!cols.has("payment_status")) db.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid'");
  if (!cols.has("payment_txn_id")) db.exec("ALTER TABLE orders ADD COLUMN payment_txn_id TEXT");
  if (!cols.has("dest_lat")) db.exec("ALTER TABLE orders ADD COLUMN dest_lat REAL");
  if (!cols.has("dest_lng")) db.exec("ALTER TABLE orders ADD COLUMN dest_lng REAL");
  if (!cols.has("shipped_at")) db.exec("ALTER TABLE orders ADD COLUMN shipped_at TEXT");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL REFERENCES products(id),
    name       TEXT NOT NULL,
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  -- товары, удалённые из админки: addMissingProducts() не должен возвращать их из products.json
  CREATE TABLE IF NOT EXISTS deleted_products (
    id TEXT PRIMARY KEY
  );
`);

// Заполняем базу только если таблица пустая — при перезапуске дублей не будет
function seedIfEmpty() {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM products").get();
  if (n > 0) return 0;

  const insert = db.prepare(`
    INSERT INTO products (id, name, category, price, oldPrice, badge, rating, reviews, description, specs)
    VALUES (@id, @name, @category, @price, @oldPrice, @badge, @rating, @reviews, @description, @specs)
  `);
  db.transaction((list) => {
    for (const p of list) {
      insert.run({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        oldPrice: p.oldPrice ?? null,
        badge: p.badge ?? null,
        rating: p.rating ?? null,
        reviews: p.reviews ?? 0,
        description: p.description,
        specs: JSON.stringify(p.specs),
      });
    }
  })(seed.products);
  return seed.products.length;
}

// Новые товары из data/products.json добавляются при запуске; существующие строки
// (с рейтингом, отзывами, правками цены) не трогаем
function addMissingProducts() {
  const exists = db.prepare("SELECT 1 FROM products WHERE id = ?");
  const gone = db.prepare("SELECT 1 FROM deleted_products WHERE id = ?");
  const missing = seed.products.filter((p) => !exists.get(p.id) && !gone.get(p.id));
  if (missing.length === 0) return 0;

  const insert = db.prepare(`
    INSERT INTO products (id, name, category, price, oldPrice, badge, rating, reviews, description, specs)
    VALUES (@id, @name, @category, @price, @oldPrice, @badge, @rating, @reviews, @description, @specs)
  `);
  db.transaction((list) => {
    for (const p of list) {
      insert.run({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        oldPrice: p.oldPrice ?? null,
        badge: p.badge ?? null,
        rating: p.rating ?? null,
        reviews: p.reviews ?? 0,
        description: p.description,
        specs: JSON.stringify(p.specs),
      });
    }
  })(missing);
  return missing.length;
}

// Строка таблицы -> объект товара (поля, которых нет у товара, не отдаём)
function toProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    ...(row.oldPrice != null && { oldPrice: row.oldPrice }),
    ...(row.badge != null && { badge: row.badge }),
    rating: row.rating,
    reviews: row.reviews,
    description: row.description,
    specs: JSON.parse(row.specs),
  };
}

module.exports = { db, seedIfEmpty, addMissingProducts, toProduct, categories: seed.categories };
