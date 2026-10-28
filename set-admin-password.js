// Задать пароль администратора: npm run admin-password -- МойПароль  (без аргумента — случайный)
const crypto = require("crypto");
const { setAdminPassword } = require("./admin-api");

let pw = process.argv[2];
if (pw === undefined) {
  pw = crypto.randomBytes(9).toString("base64url");
} else if (pw.length < 8) {
  console.error("Пароль должен быть не короче 8 символов.");
  process.exit(1);
}

setAdminPassword(pw);
console.log("Пароль администратора сохранён:", pw);
if (process.env.ADMIN_PASSWORD) {
  console.log("Внимание: задана переменная ADMIN_PASSWORD — она важнее пароля из базы.");
}
