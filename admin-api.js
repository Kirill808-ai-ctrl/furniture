/* API админ-панели (/api/admin/*). Доступ — по паролю, сессия в HttpOnly-cookie.
   Пароль: переменная окружения ADMIN_PASSWORD, иначе хэш из базы (создаётся при первом запуске
   или командой `npm run admin-password`). */
const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { db, toProduct, categories } = require("./db");
const { buildReport } = require("./report");

const COOKIE = "hj_admin";
const SESSION_MS = 8 * 60 * 60 * 1000;
const ORDER_STATUSES = { new: "Новый", confirmed: "Подтверждён", shipped: "Отправлен", done: "Выполнен", cancelled: "Отменён" };

/* ---------- Пароль ---------- */
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return `${salt.toString("hex")}:${crypto.scryptSync(pw, salt, 32).toString("hex")}`;
}

function verifyHash(pw, stored) {
  const [salt, key] = stored.split(":");
  const test = crypto.scryptSync(pw, Buffer.from(salt, "hex"), 32);
  return crypto.timingSafeEqual(test, Buffer.from(key, "hex"));
}

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();

function checkPassword(pw) {
  if (typeof pw !== "string" || pw.length === 0 || pw.length > 200) return false;
  if (process.env.ADMIN_PASSWORD) return crypto.timingSafeEqual(sha(pw), sha(process.env.ADMIN_PASSWORD));
  const row = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
  return row ? verifyHash(pw, row.value) : false;
}

function setAdminPassword(pw) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('admin_password', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(hashPassword(pw));
}

// Если пароль нигде не задан — создаём случайный и показываем один раз в консоли
function ensurePassword() {
  if (process.env.ADMIN_PASSWORD) return null;
  const row = db.prepare("SELECT 1 FROM settings WHERE key = 'admin_password'").get();
  if (row) return null;
  const pw = crypto.randomBytes(9).toString("base64url");
  setAdminPassword(pw);
  return pw;
}

/* ---------- Сессии и защита ---------- */
const sessions = new Map(); // токен -> время окончания
const failures = new Map(); // ip -> { count, since }

function cookieToken(req) {
  const m = (req.headers.cookie ?? "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([\\w-]+)`));
  return m ? m[1] : null;
}

function isLoggedIn(req) {
  const token = cookieToken(req);
  const until = token && sessions.get(token);
  if (!until) return false;
  if (until < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

// Запросы, меняющие данные, принимаем только со своего сайта: свой заголовок + Origin
function sameSiteWrite(req) {
  if (req.method === "GET" || req.method === "HEAD") return true;
  if (req.get("x-admin-request") !== "1") return false;
  const origin = req.get("origin");
  return !origin || origin === `${req.protocol}://${req.get("host")}`;
}

function requireAdmin(req, res, next) {
  if (!isLoggedIn(req)) return res.status(401).json({ error: "Нужно войти" });
  next();
}

/* ---------- Проверка данных товара ---------- */
const SPEC_KEYS = ["Размер", "Материал", "Цвет", "Гарантия"];

function parseProduct(body) {
  const b = body ?? {};
  const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const name = str(b.name, 120);
  const description = str(b.description, 1000);
  const badge = str(b.badge, 20);
  const price = Number(b.price);
  const oldPrice = b.oldPrice === "" || b.oldPrice == null ? null : Number(b.oldPrice);

  if (name.length < 2) return { error: "Укажите название (минимум 2 символа)" };
  if (typeof b.category !== "string" || !(b.category in categories)) return { error: "Выберите категорию" };
  if (!Number.isInteger(price) || price < 1 || price > 10_000_000) return { error: "Цена — целое число рублей" };
  if (oldPrice !== null && (!Number.isInteger(oldPrice) || oldPrice <= price || oldPrice > 10_000_000)) {
    return { error: "Старая цена должна быть больше текущей" };
  }
  if (description.length < 10) return { error: "Описание — минимум 10 символов" };

  const specs = {};
  for (const key of SPEC_KEYS) {
    const v = str(b.specs?.[key], 100);
    if (!v) return { error: `Заполните характеристику «${key}»` };
    specs[key] = v;
  }
  return { value: { name, category: b.category, price, oldPrice, badge: badge || null, description, specs } };
}

/* ---------- Фото: определяем тип по содержимому, а не по заголовку ---------- */
function detectImage(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

module.exports = function createAdmin({ withImage, IMAGES_DIR, IMAGE_EXTS, MAX_PHOTOS }) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!sameSiteWrite(req)) return res.status(403).json({ error: "Запрещено" });
    next();
  });

  /* ----- вход / выход ----- */
  router.post("/login", express.json({ limit: "2kb" }), (req, res) => {
    const ip = req.ip;
    const now = Date.now();
    const f = failures.get(ip);
    if (f && now - f.since < 15 * 60_000 && f.count >= 5) {
      return res.status(429).json({ error: "Слишком много попыток. Подождите 15 минут." });
    }
    if (!checkPassword(req.body?.password)) {
      const fresh = f && now - f.since < 15 * 60_000 ? f : { count: 0, since: now };
      failures.set(ip, { count: fresh.count + 1, since: fresh.since });
      return res.status(401).json({ error: "Неверный пароль" });
    }
    failures.delete(ip);
    const token = crypto.randomBytes(32).toString("base64url");
    sessions.set(token, now + SESSION_MS);
    res.append(
      "Set-Cookie",
      `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${SESSION_MS / 1000}${req.secure ? "; Secure" : ""}`
    );
    res.json({ ok: true });
  });

  router.post("/logout", (req, res) => {
    const token = cookieToken(req);
    if (token) sessions.delete(token);
    res.append("Set-Cookie", `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0`);
    res.json({ ok: true });
  });

  router.get("/me", requireAdmin, (req, res) => res.json({ ok: true }));

  router.use(requireAdmin);

  /* ----- сводка ----- */
  router.get("/stats", (req, res) => {
    const one = (sql) => db.prepare(sql).get();
    res.json({
      newOrders: one("SELECT COUNT(*) AS n FROM orders WHERE status = 'new'").n,
      orders: one("SELECT COUNT(*) AS n FROM orders").n,
      revenue: one("SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE status != 'cancelled'").n,
      products: one("SELECT COUNT(*) AS n FROM products").n,
      reviews: one("SELECT COUNT(*) AS n FROM reviews").n,
    });
  });

  /* ----- заказы ----- */
  router.get("/orders", (req, res) => {
    const { status } = req.query;
    if (status !== undefined && !(status in ORDER_STATUSES)) return res.status(400).json({ error: "Неизвестный статус" });
    const orders = db
      .prepare(`SELECT * FROM orders ${status ? "WHERE status = ?" : ""} ORDER BY id DESC LIMIT 200`)
      .all(...(status ? [status] : []));
    const itemsStmt = db.prepare("SELECT product_id AS productId, name, price, qty FROM order_items WHERE order_id = ?");
    res.json({
      statuses: ORDER_STATUSES,
      items: orders.map((o) => ({
        id: o.id,
        createdAt: o.created_at,
        status: o.status,
        name: o.name,
        phone: o.phone,
        email: o.email,
        delivery: o.delivery,
        address: o.address,
        comment: o.comment,
        promo: o.promo,
        subtotal: o.subtotal,
        discount: o.discount,
        deliveryCost: o.delivery_cost,
        total: o.total,
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        lines: itemsStmt.all(o.id),
      })),
    });
  });

  // Выгрузка для бухгалтерии: ?kind=orders|items &status= &from=ГГГГ-ММ-ДД &to=ГГГГ-ММ-ДД
  router.get("/orders.csv", (req, res) => {
    const one = (v) => (typeof v === "string" ? v : undefined);
    const out = buildReport({
      db,
      categories,
      kind: one(req.query.kind) ?? "orders",
      status: one(req.query.status),
      from: one(req.query.from),
      to: one(req.query.to),
    });
    if (out.error) return res.status(400).json({ error: out.error });
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${out.filename}"`,
      "X-Rows": String(out.count),
    });
    res.send(out.csv);
  });

  router.patch("/orders/:id", express.json({ limit: "2kb" }), (req, res) => {
    const status = req.body?.status;
    if (!(typeof status === "string" && status in ORDER_STATUSES)) return res.status(400).json({ error: "Неизвестный статус" });
    // Статус — для учёта в админке; анимация курьера на /track.html идёт сама по себе, от времени
    // оформления заказа (см. /api/orders/:id/route), и ручного перевода в «Отправлен» не требует.
    const { changes } = db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, Number(req.params.id));
    if (!changes) return res.status(404).json({ error: "Заказ не найден" });
    res.json({ ok: true });
  });

  // Ручная отметка «оплачено» для наличных/оплаты при получении — картой онлайн статус ставит только вебхук банка
  router.patch("/orders/:id/payment", express.json({ limit: "1kb" }), (req, res) => {
    const order = db.prepare("SELECT id, payment_method FROM orders WHERE id = ?").get(Number(req.params.id));
    if (!order) return res.status(404).json({ error: "Заказ не найден" });
    if (order.payment_method === "card_online") {
      return res.status(400).json({ error: "Статус оплаты картой онлайн меняет только банк" });
    }
    db.prepare("UPDATE orders SET payment_status = 'paid' WHERE id = ?").run(order.id);
    res.json({ ok: true });
  });

  /* ----- товары ----- */
  const getRow = (id) => db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  const view = (row) => withImage(toProduct(row));

  router.get("/products", (req, res) => {
    const rows = db.prepare("SELECT * FROM products ORDER BY CAST(id AS INTEGER), id").all();
    res.json({
      categories: Object.entries(categories).map(([id, name]) => ({ id, name })),
      maxPhotos: MAX_PHOTOS,
      items: rows.map(view),
    });
  });

  function nextId() {
    const ids = [
      ...db.prepare("SELECT id FROM products").all(),
      ...db.prepare("SELECT id FROM deleted_products").all(),
    ].map((r) => Number(r.id));
    return String(Math.max(0, ...ids.filter(Number.isFinite)) + 1);
  }

  router.post("/products", express.json({ limit: "20kb" }), (req, res) => {
    const { value, error } = parseProduct(req.body);
    if (error) return res.status(400).json({ error });
    const id = nextId();
    db.prepare(
      `INSERT INTO products (id, name, category, price, oldPrice, badge, rating, reviews, description, specs)
       VALUES (?, ?, ?, ?, ?, ?, NULL, 0, ?, ?)`
    ).run(id, value.name, value.category, value.price, value.oldPrice, value.badge, value.description, JSON.stringify(value.specs));
    res.status(201).json(view(getRow(id)));
  });

  router.put("/products/:id", express.json({ limit: "20kb" }), (req, res) => {
    const row = getRow(req.params.id);
    if (!row) return res.status(404).json({ error: "Товар не найден" });
    const { value, error } = parseProduct(req.body);
    if (error) return res.status(400).json({ error });
    db.prepare(
      `UPDATE products SET name = ?, category = ?, price = ?, oldPrice = ?, badge = ?, description = ?, specs = ? WHERE id = ?`
    ).run(value.name, value.category, value.price, value.oldPrice, value.badge, value.description, JSON.stringify(value.specs), row.id);
    res.json(view(getRow(row.id)));
  });

  const photoFiles = (id, n) => {
    const base = n === 1 ? id : `${id}-${n}`;
    return IMAGE_EXTS.map((e) => path.join(IMAGES_DIR, `${base}.${e}`));
  };
  const removePhoto = (id, n) => photoFiles(id, n).forEach((f) => fs.rmSync(f, { force: true }));

  router.delete("/products/:id", (req, res) => {
    const row = getRow(req.params.id);
    if (!row) return res.status(404).json({ error: "Товар не найден" });
    db.transaction(() => {
      db.prepare("DELETE FROM reviews WHERE product_id = ?").run(row.id);
      db.prepare("DELETE FROM products WHERE id = ?").run(row.id);
      db.prepare("INSERT OR IGNORE INTO deleted_products (id) VALUES (?)").run(row.id);
    })();
    for (let n = 1; n <= MAX_PHOTOS; n++) removePhoto(row.id, n);
    res.json({ ok: true });
  });

  /* ----- фото товара: n = 1 — основное, 2…6 — галерея ----- */
  const slot = (req, res) => {
    const row = getRow(req.params.id);
    if (!row) return res.status(404).json({ error: "Товар не найден" }) && null;
    const n = Number(req.params.n);
    if (!Number.isInteger(n) || n < 1 || n > MAX_PHOTOS) return res.status(400).json({ error: "Номер фото от 1 до " + MAX_PHOTOS }) && null;
    return { row, n };
  };

  router.post("/products/:id/images/:n", express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "6mb" }), (req, res) => {
    const s = slot(req, res);
    if (!s) return;
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(415).json({ error: "Отправьте файл JPG, PNG или WebP до 6 МБ" });
    }
    const ext = detectImage(req.body);
    if (!ext) return res.status(415).json({ error: "Файл не похож на JPG, PNG или WebP" });
    removePhoto(s.row.id, s.n);
    const name = (s.n === 1 ? s.row.id : `${s.row.id}-${s.n}`) + "." + ext;
    fs.writeFileSync(path.join(IMAGES_DIR, name), req.body);
    res.json(view(getRow(s.row.id)));
  });

  router.delete("/products/:id/images/:n", (req, res) => {
    const s = slot(req, res);
    if (!s) return;
    removePhoto(s.row.id, s.n);
    res.json(view(getRow(s.row.id)));
  });

  /* ----- отзывы ----- */
  router.get("/reviews", (req, res) => {
    const items = db
      .prepare(
        `SELECT r.id, r.product_id AS productId, p.name AS productName, r.name, r.rating, r.text, r.created_at AS createdAt
         FROM reviews r LEFT JOIN products p ON p.id = r.product_id ORDER BY r.id DESC LIMIT 200`
      )
      .all();
    res.json({ items });
  });

  router.delete("/reviews/:id", (req, res) => {
    const review = db.prepare("SELECT * FROM reviews WHERE id = ?").get(Number(req.params.id));
    if (!review) return res.status(404).json({ error: "Отзыв не найден" });
    db.transaction(() => {
      db.prepare("DELETE FROM reviews WHERE id = ?").run(review.id);
      // обратный пересчёт среднего: (avg × n − оценка) / (n − 1)
      const p = db.prepare("SELECT rating, reviews FROM products WHERE id = ?").get(review.product_id);
      if (p) {
        const n = Math.max(0, p.reviews - 1);
        const avg = n > 0 && p.rating != null ? Math.round((((p.rating * p.reviews - review.rating) / n) * 10)) / 10 : p.rating;
        db.prepare("UPDATE products SET rating = ?, reviews = ? WHERE id = ?").run(n > 0 ? Math.min(5, Math.max(1, avg)) : null, n, review.product_id);
      }
    })();
    res.json({ ok: true });
  });

  router.use((req, res) => res.status(404).json({ error: "Маршрут не найден" }));

  return { router, ensurePassword, setAdminPassword };
};

module.exports.setAdminPassword = setAdminPassword;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
