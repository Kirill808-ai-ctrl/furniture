/* Общая подпись для связи магазина и MOCK-банка (mock-bank/). Оба процесса читают один и тот же секрет,
   поэтому банк может доказать магазину, что статус оплаты пришёл именно от него, а не подделан посетителем. */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Секрет из переменной окружения PAYMENT_SECRET — если её нет, создаём случайный один раз и кладём
// в data/payment-secret.txt (не в git). Подходит для локальной разработки, где оба процесса на одной машине.
function paymentSecret(dataDir) {
  if (process.env.PAYMENT_SECRET) return process.env.PAYMENT_SECRET;
  const file = path.join(dataDir, "payment-secret.txt");
  try {
    const existing = fs.readFileSync(file, "utf8").trim();
    if (existing) return existing;
  } catch {}
  const secret = crypto.randomBytes(32).toString("hex");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(file, secret);
  return secret;
}

function sign(secret, parts) {
  return crypto.createHmac("sha256", secret).update(parts.join(".")).digest("hex");
}

function verify(secret, parts, sig) {
  if (typeof sig !== "string" || !sig) return false;
  const expected = sign(secret, parts);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(sig, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { paymentSecret, sign, verify };
