/* Выгрузка заказов в CSV для Excel/бухгалтерии. Только серверный модуль (из браузера недоступен). */

// Часовой пояс отчётов: даты в базе хранятся в UTC, бухгалтерии нужно местное время
let TZ = process.env.REPORT_TZ || "Europe/Moscow";
try {
  new Intl.DateTimeFormat("ru-RU", { timeZone: TZ });
} catch {
  TZ = "Europe/Moscow";
}

const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
const zoned = (date) => Object.fromEntries(partsFmt.formatToParts(date).map((p) => [p.type, p.value]));

// «2026-11-03 14:05:09» (UTC из SQLite) → «03.11.2026 17:05»
function formatDateTime(sqliteUtc) {
  const d = new Date(String(sqliteUtc).replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return String(sqliteUtc ?? "");
  const p = zoned(d);
  return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}`;
}

// Проверка даты «ГГГГ-ММ-ДД» (с учётом реального календаря)
function isValidDay(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

// Начало суток в часовом поясе отчёта → строка UTC в формате SQLite
function dayStartUtc(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const p = zoned(new Date(guess));
  const asLocal = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const start = new Date(guess - (asLocal - guess));
  return start.toISOString().slice(0, 19).replace("T", " ");
}

const nextDay = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};

// Ячейка CSV. Данные покупателей недоверенные: ячейка, начинающаяся с = + - @, в Excel стала бы формулой,
// поэтому перед ней ставится апостроф (рекомендация OWASP). Обычный телефон «+7 …» не трогаем.
function cell(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  let s = String(v).replace(/[\u0000-\u001f]+/g, " ").trim();
  if (/^[=+\-@]/.test(s) && !/^\+[\d\s().-]+$/.test(s)) s = "'" + s;
  return /[;"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const STATUS_NAMES = { new: "Новый", confirmed: "Подтверждён", shipped: "Отправлен", done: "Выполнен", cancelled: "Отменён" };
const DELIVERY_NAMES = { courier: "Курьер", pickup: "Самовывоз" };
const PAYMENT_METHOD_NAMES = { cash: "Наличными", card_on_delivery: "Картой при получении", card_online: "Картой онлайн" };
const PAYMENT_STATUS_NAMES = { unpaid: "Ожидает оплаты", paid: "Оплачен", failed: "Не оплачен" };

const KINDS = {
  orders: {
    file: "zakazy",
    head: ["№ заказа", "Дата и время", "Статус", "Покупатель", "Телефон", "Email", "Получение", "Адрес доставки", "Промокод", "Комментарий", "Позиций", "Штук", "Сумма товаров, ₽", "Скидка, ₽", "Доставка, ₽", "Итого, ₽", "Способ оплаты", "Статус оплаты"],
  },
  items: {
    file: "pozicii",
    head: ["№ заказа", "Дата и время", "Статус", "Покупатель", "Телефон", "Email", "Получение", "Адрес доставки", "Артикул", "Товар", "Категория", "Кол-во", "Цена за шт., ₽", "Сумма, ₽"],
  },
};

// Возвращает { csv, count, filename } либо { error }
function buildReport({ db, categories, kind = "orders", status, from, to }) {
  const spec = KINDS[kind];
  if (!spec) return { error: "Неизвестный вид отчёта" };
  if (status !== undefined && status !== "" && !(typeof status === "string" && status in STATUS_NAMES)) return { error: "Неизвестный статус" };
  for (const [label, v] of [["начала", from], ["конца", to]]) {
    if (v !== undefined && v !== "" && !isValidDay(v)) return { error: `Неверная дата ${label} периода` };
  }
  if (from && to && from > to) return { error: "Дата начала позже даты конца" };

  const where = [];
  const args = [];
  if (status) (where.push("o.status = ?"), args.push(status));
  if (from) (where.push("o.created_at >= ?"), args.push(dayStartUtc(from)));
  if (to) (where.push("o.created_at < ?"), args.push(dayStartUtc(nextDay(to))));
  const cond = where.length ? "WHERE " + where.join(" AND ") : "";

  let rows;
  if (kind === "orders") {
    rows = db
      .prepare(
        `SELECT o.*,
           (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS positions,
           (SELECT COALESCE(SUM(qty), 0) FROM order_items WHERE order_id = o.id) AS pieces
         FROM orders o ${cond} ORDER BY o.id`
      )
      .all(...args)
      .map((o) => [
        o.id, formatDateTime(o.created_at), STATUS_NAMES[o.status] ?? o.status, o.name, o.phone, o.email,
        DELIVERY_NAMES[o.delivery] ?? o.delivery, o.address, o.promo, o.comment,
        o.positions, o.pieces, o.subtotal, o.discount, o.delivery_cost, o.total,
        PAYMENT_METHOD_NAMES[o.payment_method] ?? o.payment_method, PAYMENT_STATUS_NAMES[o.payment_status] ?? o.payment_status,
      ]);
  } else {
    rows = db
      .prepare(
        `SELECT o.id, o.created_at, o.status, o.name, o.phone, o.email, o.delivery, o.address,
                oi.product_id, oi.name AS item, oi.price, oi.qty, p.category
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         LEFT JOIN products p ON p.id = oi.product_id
         ${cond} ORDER BY o.id, oi.id`
      )
      .all(...args)
      .map((r) => [
        r.id, formatDateTime(r.created_at), STATUS_NAMES[r.status] ?? r.status, r.name, r.phone, r.email,
        DELIVERY_NAMES[r.delivery] ?? r.delivery, r.address, r.product_id, r.item,
        (r.category && categories[r.category]) || "", r.qty, r.price, r.price * r.qty,
      ]);
  }

  // BOM — чтобы Excel сразу понял UTF-8 (кириллица); «;» — разделитель по умолчанию в русском Excel
  const lines = [spec.head, ...rows].map((r) => r.map(cell).join(";"));
  const range = from || to ? `_${from || "start"}_${to || "end"}` : `_${new Date().toISOString().slice(0, 10)}`;
  return { csv: "﻿" + lines.join("\r\n") + "\r\n", count: rows.length, filename: `homejoy-${spec.file}${range}.csv` };
}

module.exports = { buildReport, formatDateTime, isValidDay, cell, TZ };
