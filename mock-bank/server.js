/* Отдельный запуск MOCK-банка своим процессом на своём порту (для локальной разработки/демонстрации
   архитектуры «отдельный банк»): node mock-bank/server.js (или npm run bank).
   В проде по умолчанию банк встроен в основной сервер (см. server.js, роутер mock-bank/router.js,
   путь /bank) — так на хостинге достаточно одного процесса и одной ссылки на магазин.
   Здесь, в отдельном процессе, результат оплаты сообщается магазину по сети — подписанным
   запросом на POST /api/payments/callback, а не прямым вызовом (как при встраивании). */
const express = require("express");
const path = require("path");
const { paymentSecret, sign } = require("../payments");
const createMockBank = require("./router");

const app = express();
const PORT = process.env.BANK_PORT || 4242;
const SECRET = paymentSecret(path.join(__dirname, "..", "data"));

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy":
      "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'",
    "Referrer-Policy": "no-referrer",
  });
  next();
});

async function applyResult({ orderId, amount, status, txnId, returnUrl }) {
  const payload = {
    orderId,
    amount,
    status,
    txnId,
    sig: sign(SECRET, [String(orderId), String(amount), status, String(txnId)]),
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(`${returnUrl.origin}/api/payments/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!r.ok) return { ok: false };
    return { ok: true };
  } finally {
    clearTimeout(timer);
  }
}

app.use("/", createMockBank({ secret: SECRET, basePath: "", applyResult }));

app.listen(PORT, () => {
  console.log(`MockPay (тестовый банк, отдельный процесс): http://localhost:${PORT}`);
});
