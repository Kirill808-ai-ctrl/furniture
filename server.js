require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const { db, seedIfEmpty, addMissingProducts, toProduct, categories } = require("./db");
const createAdmin = require("./admin-api");
const createAssistant = require("./assistant-api");
const { paymentSecret, sign, verify } = require("./payments");
const createMockBank = require("./mock-bank/router");
const delivery = require("./delivery");

const app = express();
const PORT = process.env.PORT || 3000;

// Фото товаров: положите images/<id>.jpg (или .png/.webp) — и API отдаст поле image.
// На хостинге с постоянным диском можно вынести папку туда: IMAGES_DIR=/var/data/images
// (иначе фото, загруженные через админку, пропадут при пересоздании контейнера — как и база без DB_PATH).
const IMAGES_DIR = process.env.IMAGES_DIR || path.join(__dirname, "images");
fs.mkdirSync(IMAGES_DIR, { recursive: true });
const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp"];

// Основное фото — <id>.jpg, дополнительные для галереи — <id>-2.jpg, <id>-3.jpg … (до 6 штук)
const MAX_PHOTOS = 6;

function withImage(product) {
  const find = (name) => {
    const ext = IMAGE_EXTS.find((e) => fs.existsSync(path.join(IMAGES_DIR, `${name}.${e}`)));
    return ext ? `/images/${name}.${ext}` : null;
  };
  const images = [find(product.id)];
  for (let n = 2; n <= MAX_PHOTOS; n++) images.push(find(`${product.id}-${n}`));
  const found = images.filter(Boolean);
  return found.length ? { ...product, image: found[0], images: found } : product;
}

const admin = createAdmin({ withImage, IMAGES_DIR, IMAGE_EXTS, MAX_PHOTOS });
const firstPassword = admin.ensurePassword();
if (firstPassword) {
  console.log("────────────────────────────────────────────");
  console.log(" Пароль администратора (показан один раз):");
  console.log(`   ${firstPassword}`);
  console.log(" Сменить: npm run admin-password -- <новый пароль>");
  console.log("────────────────────────────────────────────");
}

const seeded = seedIfEmpty();
if (seeded) console.log(`База заполнена: ${seeded} товаров`);
const added = addMissingProducts();
if (added) console.log(`Добавлено новых товаров: ${added}`);

app.disable("x-powered-by");
// За прокси хостинга (Render, Railway, nginx) задайте TRUST_PROXY=1, чтобы видеть настоящий IP клиента
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || true);

// CSP: разрешены только свои файлы, шрифты Google Fonts, карта Google Maps на странице контактов
// и тайлы OpenStreetMap для карты маршрута на странице отслеживания заказа (/track.html).
// script-src 'unsafe-inline' — ради крошечного инлайн-скрипта выбора темы в <head> (без него тема мигала бы
// при загрузке); сторонних и тем более пользовательских скриптов на сайте нет.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://*.tile.openstreetmap.org",
  "connect-src 'self'",
  "frame-src https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": CSP,
    "Permissions-Policy": "geolocation=(), camera=(), microphone=(), payment=()",
    "Strict-Transport-Security": "max-age=15552000; includeSubDomains",
  });
  next();
});

// Адрес сайта для sitemap и для ссылки возврата из MOCK-банка: SITE_URL=https://example.com (иначе из запроса)
const siteUrl = (req) => (process.env.SITE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");

/* ---------- API ---------- */
const api = express.Router();

api.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Список категорий с количеством товаров
api.get("/categories", (req, res) => {
  const counts = Object.fromEntries(
    db
      .prepare("SELECT category, COUNT(*) AS n FROM products GROUP BY category")
      .all()
      .map((r) => [r.category, r.n])
  );
  res.json(Object.entries(categories).map(([id, name]) => ({ id, name, count: counts[id] ?? 0 })));
});

// Каталог: GET /api/products?category=sofa&q=диван&minPrice=10000&maxPrice=50000&sort=price_asc&page=1&limit=6
// Без limit отдаётся весь список (его использует конструктор комнаты и корзина)
api.get("/products", (req, res) => {
  const { category, q, minPrice, maxPrice, sort, page, limit } = req.query;

  if (limit !== undefined || page !== undefined) {
    const l = limit === undefined ? 12 : Number(limit);
    const pg = page === undefined ? 1 : Number(page);
    if (!Number.isInteger(l) || l < 1 || l > 50 || !Number.isInteger(pg) || pg < 1) {
      return res.status(400).json({ error: "limit: целое от 1 до 50, page: целое от 1" });
    }
  }

  if (category && !categories[category]) {
    return res.status(400).json({ error: `Неизвестная категория: ${category}` });
  }
  const min = minPrice === undefined ? 0 : Number(minPrice);
  const max = maxPrice === undefined ? Number.MAX_SAFE_INTEGER : Number(maxPrice);
  if (Number.isNaN(min) || Number.isNaN(max)) {
    return res.status(400).json({ error: "minPrice и maxPrice должны быть числами" });
  }
  if (sort !== undefined && sort !== "price_asc" && sort !== "price_desc") {
    return res.status(400).json({ error: "sort: price_asc или price_desc" });
  }

  const where = ["price >= ?", "price <= ?"];
  const args = [min, max];
  if (category) {
    where.push("category = ?");
    args.push(category);
  }
  const query = typeof q === "string" ? q.trim().toLowerCase() : "";
  if (query) {
    where.push("instr(lc(name), ?) > 0");
    args.push(query);
  }

  const order = sort === "price_asc" ? "price ASC, rowid" : sort === "price_desc" ? "price DESC, rowid" : "rowid";
  const whereSql = where.join(" AND ");

  if (limit === undefined && page === undefined) {
    const rows = db.prepare(`SELECT * FROM products WHERE ${whereSql} ORDER BY ${order}`).all(...args);
    const items = rows.map(toProduct).map(withImage);
    return res.json({ total: items.length, items });
  }

  const size = limit === undefined ? 12 : Number(limit);
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM products WHERE ${whereSql}`).get(...args);
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page === undefined ? 1 : Number(page), pages);
  const rows = db
    .prepare(`SELECT * FROM products WHERE ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .all(...args, size, (current - 1) * size);

  res.json({ total, page: current, pages, limit: size, items: rows.map(toProduct).map(withImage) });
});

// Один товар
api.get("/products/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Товар не найден" });
  res.json(withImage(toProduct(row)));
});

/* ---------- Отзывы ---------- */
// Не больше 3 отзывов в минуту с одного адреса — защита от спама
const reviewHits = new Map();
function tooManyReviews(ip) {
  const now = Date.now();
  const recent = (reviewHits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 3) {
    reviewHits.set(ip, recent);
    return true;
  }
  reviewHits.set(ip, [...recent, now]);
  return false;
}

api.get("/products/:id/reviews", (req, res) => {
  const product = db.prepare("SELECT id FROM products WHERE id = ?").get(req.params.id);
  if (!product) return res.status(404).json({ error: "Товар не найден" });
  const items = db
    .prepare("SELECT id, name, rating, text, created_at AS createdAt FROM reviews WHERE product_id = ? ORDER BY id DESC LIMIT 100")
    .all(req.params.id);
  res.json({ total: items.length, items });
});

api.post("/products/:id/reviews", express.json({ limit: "10kb" }), (req, res) => {
  const product = db.prepare("SELECT id, rating, reviews FROM products WHERE id = ?").get(req.params.id);
  if (!product) return res.status(404).json({ error: "Товар не найден" });

  const body = req.body ?? {};
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 50) : "";
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 1000) : "";
  const rating = Number(body.rating);

  if (name.length < 2) return res.status(400).json({ error: "Укажите имя" });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Поставьте оценку от 1 до 5" });
  }
  if (text.length < 5) return res.status(400).json({ error: "Напишите отзыв (минимум 5 символов)" });
  if (tooManyReviews(req.ip)) {
    return res.status(429).json({ error: "Слишком много отзывов. Попробуйте через минуту." });
  }

  // Рейтинг пересчитывается с учётом уже накопленных оценок: (старый × число + новая) / (число + 1)
  const result = db.transaction(() => {
    const { lastInsertRowid } = db
      .prepare("INSERT INTO reviews (product_id, name, rating, text) VALUES (?, ?, ?, ?)")
      .run(product.id, name, rating, text);
    const count = product.reviews + 1;
    const avg = Math.round((((product.rating ?? rating) * product.reviews + rating) / count) * 10) / 10;
    db.prepare("UPDATE products SET rating = ?, reviews = ? WHERE id = ?").run(avg, count, product.id);
    return { id: Number(lastInsertRowid), rating: avg, reviews: count };
  })();

  res.status(201).json(result);
});

/* ---------- Заказы ---------- */
const PROMOS = { JOY15: 0.15 };
const FREE_DELIVERY_FROM = 30000;
const DELIVERY_PRICE = 1500;
const MAX_QTY = 20;

/* ---------- Оплата ---------- */
// "card_online" уходит на MOCK-банк (см. mock-bank/) — демо-имитацию приёма карты. Деньги не настоящие,
// это учебный пример интеграции с платёжным шлюзом (редирект + подписанное подтверждение).
// По умолчанию банк встроен в этот же процесс на /bank (см. монтирование роутера ниже) — один сервис,
// одна публичная ссылка, удобно для хостинга. BANK_URL можно задать, только если банк поднят отдельно.
const PAYMENT_METHODS = { cash: "Наличными при получении", card_on_delivery: "Картой при получении", card_online: "Картой онлайн" };
const BANK_URL = process.env.BANK_URL ? process.env.BANK_URL.replace(/\/+$/, "") : "";
const SECRET = paymentSecret(path.join(__dirname, "data"));

function buildPayUrl(req, orderId, amount) {
  const returnUrl = `${siteUrl(req)}/payment-result.html?orderId=${orderId}`;
  const sig = sign(SECRET, [String(orderId), String(amount)]);
  const params = new URLSearchParams({ orderId: String(orderId), amount: String(amount), returnUrl, sig });
  const bankBase = BANK_URL || `${siteUrl(req)}/bank`;
  return `${bankBase}/pay?${params}`;
}

// Не больше 5 оформленных заказов в 10 минут с одного адреса — защита от спама и перебора промокодов
const orderHits = new Map();
function tooManyOrders(ip) {
  const now = Date.now();
  const recent = (orderHits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  if (recent.length >= 5) {
    orderHits.set(ip, recent);
    return true;
  }
  orderHits.set(ip, [...recent, now]);
  return false;
}

// Считает заказ по ценам из базы — цены и скидки от клиента не принимаются
function priceOrder(body) {
  const { items, promo, delivery } = body ?? {};

  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return { error: "Корзина пуста" };
  }
  if (delivery !== "courier" && delivery !== "pickup") {
    return { error: "Выберите способ получения" };
  }

  const getProduct = db.prepare("SELECT id, name, price FROM products WHERE id = ?");
  const merged = new Map();
  for (const it of items) {
    const qty = Number(it?.qty);
    if (typeof it?.id !== "string" || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return { error: `Количество товара должно быть от 1 до ${MAX_QTY}` };
    }
    merged.set(it.id, Math.min(MAX_QTY, (merged.get(it.id) ?? 0) + qty));
  }

  const lines = [];
  for (const [id, qty] of merged) {
    const p = getProduct.get(id);
    if (!p) return { error: "Один из товаров больше не продаётся. Обновите корзину." };
    lines.push({ id: p.id, name: p.name, price: p.price, qty });
  }

  let code = null;
  let rate = 0;
  if (promo !== undefined && promo !== null && String(promo).trim() !== "") {
    code = String(promo).trim().toUpperCase();
    if (!(code in PROMOS)) return { error: "Промокод не найден" };
    rate = PROMOS[code];
  }

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const discount = Math.round(subtotal * rate);
  const goods = subtotal - discount;
  const deliveryCost = delivery === "pickup" || goods >= FREE_DELIVERY_FROM ? 0 : DELIVERY_PRICE;

  return { items: lines, promo: code, delivery, subtotal, discount, deliveryCost, total: goods + deliveryCost };
}

// Предварительный расчёт для страницы оформления
api.post("/orders/quote", express.json({ limit: "20kb" }), (req, res) => {
  const result = priceOrder(req.body);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

api.post("/orders", express.json({ limit: "20kb" }), (req, res) => {
  if (tooManyOrders(req.ip)) {
    return res.status(429).json({ error: "Слишком много заказов подряд. Попробуйте через несколько минут." });
  }
  const body = req.body ?? {};
  const result = priceOrder(body);
  if (result.error) return res.status(400).json({ error: result.error });

  const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const name = text(body.name, 100);
  const phone = text(body.phone, 30);
  const email = text(body.email, 100);
  const address = text(body.address, 300);
  const comment = text(body.comment, 500);
  const paymentMethod = typeof body.paymentMethod === "string" ? body.paymentMethod : "";

  if (!(paymentMethod in PAYMENT_METHODS)) return res.status(400).json({ error: "Выберите способ оплаты" });
  if (name.length < 2) return res.status(400).json({ error: "Укажите имя" });
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return res.status(400).json({ error: "Укажите телефон в формате +7 900 000-00-00" });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Проверьте адрес электронной почты" });
  }
  if (result.delivery === "courier" && address.length < 5) {
    return res.status(400).json({ error: "Укажите адрес доставки" });
  }

  const insertOrder = db.prepare(`
    INSERT INTO orders (name, phone, email, delivery, address, comment, promo, subtotal, discount, delivery_cost, total, payment_method)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertItem = db.prepare(
    "INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)"
  );
  const orderId = db.transaction(() => {
    const { lastInsertRowid } = insertOrder.run(
      name,
      phone,
      email || null,
      result.delivery,
      result.delivery === "courier" ? address : null,
      comment || null,
      result.promo,
      result.subtotal,
      result.discount,
      result.deliveryCost,
      result.total,
      paymentMethod
    );
    for (const l of result.items) insertItem.run(lastInsertRowid, l.id, l.name, l.price, l.qty);
    return Number(lastInsertRowid);
  })();

  const payUrl = paymentMethod === "card_online" ? buildPayUrl(req, orderId, result.total) : undefined;
  res.status(201).json({ id: orderId, total: result.total, ...(payUrl && { payUrl }) });
});

/* ---------- Оплата: вебхук от MOCK-банка, статус, повторная ссылка ---------- */
// Не больше 30 проверок статуса за 10 минут с одного адреса — страница результата опрашивает редко
const payHits = new Map();
function tooManyPayHits(ip) {
  const now = Date.now();
  const recent = (payHits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  if (recent.length >= 30) {
    payHits.set(ip, recent);
    return true;
  }
  payHits.set(ip, [...recent, now]);
  return false;
}

// Применяет результат оплаты к заказу — авторитетно, в обход браузера. Статус в базе меняется только
// отсюда: ни редирект браузера обратно на сайт, ни query-параметры сами по себе ничего не решают.
// Используется и HTTP-вебхуком ниже (для отдельно запущенного MOCK-банка), и напрямую — когда MOCK-банк
// встроен в этот же процесс роутером mock-bank/router.js (см. его подключение на /bank ниже).
function applyPaymentResult({ orderId, amount, status, txnId }) {
  const order = db.prepare("SELECT id, total, payment_method FROM orders WHERE id = ?").get(orderId);
  if (!order) return { ok: false, error: "Заказ не найден" };
  if (order.payment_method !== "card_online") return { ok: false, error: "У заказа другой способ оплаты" };
  if (amount !== order.total) return { ok: false, error: "Сумма не совпадает с заказом" };

  const paymentStatus = status === "success" ? "paid" : "failed";
  db.prepare("UPDATE orders SET payment_status = ?, payment_txn_id = ?, status = CASE WHEN ? = 'paid' AND status = 'new' THEN 'confirmed' ELSE status END WHERE id = ?").run(
    paymentStatus,
    txnId ?? null,
    paymentStatus,
    orderId
  );
  return { ok: true };
}

// Вебхук для отдельно запущенного MOCK-банка (mock-bank/server.js, свой процесс/порт) — подписанный
// запрос сервер-сервер, не из браузера. Когда банк встроен в этот же процесс (по умолчанию, /bank),
// этот адрес не используется — applyPaymentResult вызывается напрямую.
api.post("/payments/callback", express.json({ limit: "5kb" }), (req, res) => {
  const b = req.body ?? {};
  const orderId = Number(b.orderId);
  const amount = Number(b.amount);
  const status = b.status;
  const txnId = typeof b.txnId === "string" ? b.txnId.slice(0, 100) : null;

  if (!Number.isInteger(orderId) || !Number.isFinite(amount) || (status !== "success" && status !== "failed")) {
    return res.status(400).json({ error: "Некорректное тело запроса" });
  }
  if (!verify(SECRET, [String(orderId), String(amount), status, String(txnId)], b.sig)) {
    return res.status(403).json({ error: "Неверная подпись" });
  }

  const result = applyPaymentResult({ orderId, amount, status, txnId });
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

// Для страницы «payment-result.html»: только статус, без персональных данных заказа
api.get("/orders/:id/payment-status", (req, res) => {
  if (tooManyPayHits(req.ip)) return res.status(429).json({ error: "Слишком много запросов" });
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Некорректный номер заказа" });
  const order = db.prepare("SELECT payment_method, payment_status FROM orders WHERE id = ?").get(id);
  if (!order) return res.status(404).json({ error: "Заказ не найден" });
  res.json({ method: order.payment_method, status: order.payment_status });
});

// Повторная оплата, если прошлая попытка сорвалась
api.post("/orders/:id/pay-link", (req, res) => {
  if (tooManyPayHits(req.ip)) return res.status(429).json({ error: "Слишком много запросов" });
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Некорректный номер заказа" });
  const order = db.prepare("SELECT id, total, payment_method, payment_status FROM orders WHERE id = ?").get(id);
  if (!order) return res.status(404).json({ error: "Заказ не найден" });
  if (order.payment_method !== "card_online") return res.status(400).json({ error: "У заказа другой способ оплаты" });
  if (order.payment_status === "paid") return res.status(400).json({ error: "Заказ уже оплачен" });
  res.json({ payUrl: buildPayUrl(req, order.id, order.total) });
});

/* ---------- Трек доставки: курьер «едет» по настоящей дороге (OSRM), но это демонстрация, не GPS ---------- */
api.get("/orders/:id/route", async (req, res) => {
  if (tooManyPayHits(req.ip)) return res.status(429).json({ error: "Слишком много запросов" });
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Некорректный номер заказа" });
  const order = db
    .prepare("SELECT id, status, delivery, address, dest_lat, dest_lng, created_at FROM orders WHERE id = ?")
    .get(id);
  if (!order) return res.status(404).json({ error: "Заказ не найден" });

  if (order.delivery !== "courier") {
    return res.json({ delivery: "pickup", store: [delivery.STORE.lat, delivery.STORE.lng] });
  }
  if (order.status === "cancelled") return res.json({ delivery: "courier", phase: "cancelled" });

  let dest = order.dest_lat != null && order.dest_lng != null ? { lat: order.dest_lat, lng: order.dest_lng } : null;
  if (!dest) {
    dest = await delivery.geocode(order.address || "");
    if (!dest) return res.status(502).json({ error: "Не удалось определить точку на карте по адресу" });
    db.prepare("UPDATE orders SET dest_lat = ?, dest_lng = ? WHERE id = ?").run(dest.lat, dest.lng, id);
  }

  const r = await delivery.route(delivery.STORE, dest);
  if (!r) return res.status(502).json({ error: "Не удалось построить маршрут" });

  // Курьер «выезжает» автоматически сам, без участия администратора: недолгая сборка заказа
  // (delivery.PREP_MS) сразу после оформления, затем демо-поездка (delivery.DEMO_TRIP_MS) —
  // отсчёт идёт от created_at, так что движение на /track.html видно сразу после заказа.
  let phase = "preparing";
  let progress = 0;
  if (order.status === "done") {
    phase = "done";
    progress = 1;
  } else {
    const elapsed = Date.now() - new Date(order.created_at.replace(" ", "T") + "Z").getTime();
    if (elapsed >= delivery.PREP_MS) {
      progress = Math.min(1, (elapsed - delivery.PREP_MS) / delivery.DEMO_TRIP_MS);
      phase = progress >= 1 ? "arrived" : "shipped";
    }
  }

  res.json({
    delivery: "courier",
    phase,
    progress,
    etaSeconds: r.durationSec,
    store: [delivery.STORE.lat, delivery.STORE.lng],
    dest: [dest.lat, dest.lng],
    geometry: r.geometry,
  });
});

const assistant = createAssistant({ db, categories, promo: PROMOS, freeDeliveryFrom: FREE_DELIVERY_FROM, deliveryPrice: DELIVERY_PRICE });
api.use("/assistant", assistant.router);

api.use("/admin", admin.router);

api.use((req, res) => {
  res.status(404).json({ error: "Маршрут не найден" });
});

app.use("/api", api);

/* ---------- Фронтенд (только публичные файлы) ---------- */
const PUBLIC_FILES = new Set([
  "index.html",
  "catalog.html",
  "product.html",
  "about.html",
  "contacts.html",
  "checkout.html",
  "payment-result.html",
  "track.html",
  "wishlist.html",
  "compare.html",
  "admin.html",
  "admin.js",
  "style.css",
  "script.js",
  "images.js",
  "assembly.js",
  "favicon.svg",
]);

app.get("/robots.txt", (req, res) => {
  const lines = ["User-agent: *", "Allow: /", "Disallow: /api/", "Disallow: /bank", "Disallow: /checkout.html", "Disallow: /payment-result.html", "Disallow: /track.html", "Disallow: /wishlist.html", "Disallow: /compare.html", "Disallow: /admin.html", `Sitemap: ${siteUrl(req)}/sitemap.xml`];
  res.type("text/plain").send(lines.join("\n") + "\n");
});

app.get("/sitemap.xml", (req, res) => {
  const base = siteUrl(req);
  const pages = ["", "catalog.html", "about.html", "contacts.html"].map((p) => `${base}/${p}`);
  const products = db.prepare("SELECT id FROM products ORDER BY rowid").all().map((p) => `${base}/product.html?id=${p.id}`);
  const urls = [...pages, ...products].map((u) => `  <url><loc>${u}</loc></url>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  res.type("application/xml").send(xml);
});

app.use("/images", express.static(IMAGES_DIR, { index: false, dotfiles: "deny" }));
// Leaflet для карты маршрута на /track.html — отдаём прямо из node_modules, без отдельной копии файлов
app.use(
  "/vendor/leaflet",
  express.static(path.join(__dirname, "node_modules", "leaflet", "dist"), { index: false, dotfiles: "deny" })
);
// MOCK-банк, встроенный в этот же процесс (см. mock-bank/router.js): applyPaymentResult применяет
// результат оплаты напрямую, без сетевого вебхука — оба «сервиса» живут в одном процессе.
app.use("/bank", createMockBank({ secret: SECRET, basePath: "/bank", applyResult: applyPaymentResult }));

app.get("/",(req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/:file", (req, res, next) => {
  if (!PUBLIC_FILES.has(req.params.file)) return next();
  if (req.params.file === "admin.html") res.set("X-Robots-Tag", "noindex, nofollow");
  res.sendFile(path.join(__dirname, req.params.file));
});

/* ---------- Ошибки ---------- */
app.use((req, res) => {
  res.status(404).send("Страница не найдена");
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed" || err.type === "entity.too.large") {
    return res.status(400).json({ error: "Некорректный запрос" });
  }
  console.error(err);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

app.listen(PORT, () => {
  console.log(`HomeJoy: http://localhost:${PORT}`);
});
