/* MOCK-банк — имитация приёма платежа картой. НЕ настоящий банк, деньги не списываются.
   Монтируется как обычный Express-роутер внутри основного сервера (server.js, по умолчанию на /bank),
   поэтому у магазина и у «банка» один и тот же публичный URL — удобно для раздачи ссылки и для хостинга
   (не нужен второй процесс/сервис). При желании этот же роутер можно поднять и отдельным процессом —
   см. mock-bank/server.js, где applyResult вместо прямого вызова шлёт подписанный HTTP-запрос магазину.
   Магазин присылает сюда посетителя по подписанной ссылке /pay?orderId=&amount=&returnUrl=&sig=.
   Итог оплаты применяется через applyResult(...) — так же авторитетно, как раньше через вебхук,
   просто без лишнего сетевого прыжка, когда оба работают в одном процессе. */
const express = require("express");
const crypto = require("crypto");
const { sign, verify } = require("../payments");

const fmt = (n) => Number(n).toLocaleString("ru-RU") + " ₽";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Стиль повторяет «стикерную» тему магазина HomeJoy: плоские цвета, жирные чёрные контуры, жёсткие тени
const BASE_CSS = `
  @import url("https://fonts.googleapis.com/css2?family=Unbounded:wght@700;800&family=Onest:wght@400;600;700&family=JetBrains+Mono:wght@600;700&display=swap");
  :root{
    --paper:#fff6e5; --ink:#14110f; --tomato:#ff5a36; --butter:#ffd23f; --cobalt:#2b4bff;
    --mint:#bfe9d6; --muted:#5d564d;
    --b:2px solid var(--ink); --sh:3px 3px 0 var(--ink); --sh-lg:6px 6px 0 var(--ink);
  }
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background-color:var(--paper);
    background-image:radial-gradient(rgba(20,17,15,.1) 1px,transparent 1.3px);background-size:22px 22px;
    font:15px/1.5 "Onest","Segoe UI",Arial,sans-serif;color:var(--ink);padding:20px;-webkit-font-smoothing:antialiased}
  .card{width:100%;max-width:420px;background:#fff;border:var(--b);border-radius:18px;box-shadow:var(--sh-lg);overflow:hidden}
  .head{display:flex;align-items:center;gap:10px;background:var(--ink);color:var(--butter);padding:16px 22px}
  .head .mark{display:grid;place-items:center;width:32px;height:32px;background:var(--tomato);border:2px solid var(--butter);border-radius:9px;flex:none}
  .head .mark svg{width:18px;height:18px}
  .head b{font-family:"Unbounded","Onest",sans-serif;font-size:17px;letter-spacing:-0.02em}
  .banner{background:var(--butter);color:var(--ink);font-family:"JetBrains Mono",monospace;font-size:12px;
    font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:9px 22px;border-bottom:var(--b)}
  .body{padding:24px 24px 28px}
  .sum{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:20px;padding:12px 16px;
    background:var(--mint);border:var(--b);border-radius:12px;font-weight:600}
  .sum b{font-family:"Unbounded","Onest",sans-serif;font-size:19px}
  label{display:block;margin-bottom:14px;font-size:13px;color:var(--muted);font-weight:700}
  input{display:block;width:100%;margin-top:6px;padding:11px 13px;border:var(--b);border-radius:10px;
    background:var(--paper);font-size:15px;font-family:inherit;color:var(--ink)}
  input:focus{outline:none;box-shadow:3px 3px 0 var(--cobalt);border-color:var(--ink)}
  .row{display:flex;gap:10px}
  .row label{flex:1}
  .err{background:#ffd9d0;color:#8a1f06;border:var(--b);border-radius:10px;padding:11px 14px;margin-bottom:16px;font-size:13.5px;font-weight:600}
  button{width:100%;padding:13px;margin-top:8px;background:var(--tomato);color:var(--ink);border:var(--b);
    border-radius:12px;box-shadow:var(--sh);font-size:15px;font-weight:700;cursor:pointer;
    transition:translate .15s,box-shadow .15s}
  button:hover{translate:-2px -2px;box-shadow:4px 4px 0 var(--ink)}
  button:active{translate:2px 2px;box-shadow:0 0 0 var(--ink)}
  button:disabled{opacity:.55;cursor:default;translate:none;box-shadow:var(--sh)}
  .hint{margin-top:18px;font-size:12px;color:var(--muted);line-height:1.6}
  .hint code{background:var(--paper);border:1px solid var(--ink);padding:1px 6px;border-radius:5px;font-family:"JetBrains Mono",monospace}
  a.back{display:inline-block;margin-top:16px;font-size:13px;font-weight:700;color:var(--cobalt);text-decoration:underline}
`;

const LOGO_SVG = `<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" fill="#FFD23F" stroke="#14110F" stroke-width="2" stroke-linejoin="round"/><path d="M8.5 14.5q3.5 3 7 0" fill="none" stroke="#14110F" stroke-width="2" stroke-linecap="round"/></svg>`;

function page(title, body) {
  return `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow"><title>${esc(title)}</title><style>${BASE_CSS}</style></head>
    <body><div class="card">${body}</div></body></html>`;
}

/**
 * @param {object} opts
 * @param {string} opts.secret — общий секрет для подписи ссылок (payments.js)
 * @param {string} [opts.basePath] — путь монтирования роутера (например "/bank"), для ссылок внутри страниц
 * @param {(r: {orderId:number, amount:number, status:"success"|"failed", txnId:string, returnUrl:URL}) => Promise<{ok:boolean, error?:string}>} opts.applyResult
 *        — применяет результат оплаты к заказу (авторитетно, минуя браузер)
 */
function createMockBank({ secret, basePath = "", applyResult }) {
  const router = express.Router();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  router.use((req, res, next) => {
    res.set({
      "X-Frame-Options": "DENY", // страницу оплаты нельзя вставлять во фрейм — как у настоящих банков
      "Cache-Control": "no-store",
    });
    next();
  });
  router.use(express.urlencoded({ extended: false, limit: "5kb" }));

  function errorPage(text) {
    return page("Ошибка оплаты", `
      <div class="head"><span class="mark">${LOGO_SVG}</span><b>HomeJoy Pay</b></div>
      <div class="banner">Тестовый платёжный шлюз — реальные деньги не списываются</div>
      <div class="body">
        <p class="err">${esc(text)}</p>
        <a class="back" href="${basePath}/">На главную MockPay</a>
      </div>`);
  }

  // Ссылка создаётся магазином и подписана им же: проверяем orderId+amount, иначе сумму мог подменить кто угодно
  function checkLink(q) {
    const orderId = Number(q.orderId);
    const amount = Number(q.amount);
    if (!Number.isInteger(orderId) || !Number.isFinite(amount) || amount <= 0) return null;
    if (!verify(secret, [String(orderId), String(amount)], q.sig)) return null;
    let returnUrl;
    try {
      returnUrl = new URL(String(q.returnUrl ?? ""));
      if (returnUrl.protocol !== "http:" && returnUrl.protocol !== "https:") return null;
    } catch {
      return null;
    }
    return { orderId, amount, returnUrl };
  }

  router.get("/", (req, res) => {
    res.send(page("MockPay", `
      <div class="head"><span class="mark">${LOGO_SVG}</span><b>HomeJoy Pay</b></div>
      <div class="banner">Тестовый платёжный шлюз — реальные деньги не списываются</div>
      <div class="body">
        <p>Это демонстрационное приложение, имитирующее работу банка для магазина HomeJoy.</p>
        <p>Самостоятельно оно не открывается — ссылка на оплату создаётся магазином при оформлении заказа с оплатой картой онлайн.</p>
      </div>`));
  });

  router.get("/pay", (req, res) => {
    const link = checkLink(req.query);
    if (!link) return res.status(400).send(errorPage("Ссылка на оплату повреждена, устарела или подделана. Вернитесь в магазин и попробуйте оформить заказ заново."));

    res.send(page(`Оплата заказа № ${link.orderId}`, `
      <div class="head"><span class="mark">${LOGO_SVG}</span><b>HomeJoy Pay</b></div>
      <div class="banner">Тестовый режим — реальные деньги не списываются</div>
      <div class="body">
        <div class="sum"><span>Заказ № ${link.orderId}</span><b>${fmt(link.amount)}</b></div>
        <form method="post" action="${basePath}/pay">
          <input type="hidden" name="orderId" value="${link.orderId}">
          <input type="hidden" name="amount" value="${link.amount}">
          <input type="hidden" name="returnUrl" value="${esc(link.returnUrl.href)}">
          <input type="hidden" name="sig" value="${esc(req.query.sig)}">
          <label>Номер карты
            <input type="text" name="cardNumber" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" maxlength="23" required>
          </label>
          <div class="row">
            <label>Срок действия
              <input type="text" name="expiry" autocomplete="cc-exp" placeholder="MM/ГГ" maxlength="5" required>
            </label>
            <label>CVC
              <input type="text" name="cvc" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4" required>
            </label>
          </div>
          <label>Имя держателя карты
            <input type="text" name="cardholder" autocomplete="cc-name" placeholder="IVAN IVANOV" maxlength="60" required>
          </label>
          <button type="submit">Оплатить ${fmt(link.amount)}</button>
        </form>
        <p class="hint">Тестовые карты: <code>4242 4242 4242 4242</code> — успешная оплата, <code>4000 0000 0000 0002</code> — отклонённая. Остальные данные — любые.</p>
      </div>`));
  });

  router.post("/pay", async (req, res) => {
    const b = req.body ?? {};
    const link = checkLink(b);
    if (!link) return res.status(400).send(errorPage("Ссылка на оплату повреждена, устарела или подделана. Вернитесь в магазин и попробуйте оформить заказ заново."));

    const cardDigits = String(b.cardNumber ?? "").replace(/\D/g, "");
    const expiryOk = /^\d{2}\/\d{2}$/.test(String(b.expiry ?? "").trim());
    const cvcOk = /^\d{3,4}$/.test(String(b.cvc ?? "").trim());
    const nameOk = String(b.cardholder ?? "").trim().length >= 2;

    const fail = (msg) => {
      const hidden = `
        <input type="hidden" name="orderId" value="${link.orderId}">
        <input type="hidden" name="amount" value="${link.amount}">
        <input type="hidden" name="returnUrl" value="${esc(link.returnUrl.href)}">
        <input type="hidden" name="sig" value="${esc(b.sig)}">`;
      res.status(400).send(page(`Оплата заказа № ${link.orderId}`, `
        <div class="head"><span class="mark">${LOGO_SVG}</span><b>HomeJoy Pay</b></div>
        <div class="banner">Тестовый режим — реальные деньги не списываются</div>
        <div class="body">
          <p class="err">${esc(msg)}</p>
          <div class="sum"><span>Заказ № ${link.orderId}</span><b>${fmt(link.amount)}</b></div>
          <form method="post" action="${basePath}/pay">
            ${hidden}
            <label>Номер карты<input type="text" name="cardNumber" inputmode="numeric" placeholder="4242 4242 4242 4242" maxlength="23" required></label>
            <div class="row">
              <label>Срок действия<input type="text" name="expiry" placeholder="MM/ГГ" maxlength="5" required></label>
              <label>CVC<input type="text" name="cvc" inputmode="numeric" placeholder="123" maxlength="4" required></label>
            </div>
            <label>Имя держателя карты<input type="text" name="cardholder" placeholder="IVAN IVANOV" maxlength="60" required></label>
            <button type="submit">Оплатить ${fmt(link.amount)}</button>
          </form>
          <p class="hint">Тестовые карты: <code>4242 4242 4242 4242</code> — успешная оплата, <code>4000 0000 0000 0002</code> — отклонённая.</p>
        </div>`));
    };

    if (cardDigits.length < 13 || cardDigits.length > 19) return fail("Проверьте номер карты.");
    if (!expiryOk) return fail("Укажите срок действия в формате MM/ГГ.");
    if (!cvcOk) return fail("CVC — 3 или 4 цифры на обороте карты.");
    if (!nameOk) return fail("Укажите имя держателя карты.");

    await sleep(900); // имитация обращения к процессингу
    const status = cardDigits === "4000000000000002" ? "failed" : "success";
    const txnId = crypto.randomBytes(8).toString("hex");

    try {
      const result = await applyResult({ orderId: link.orderId, amount: link.amount, status, txnId, returnUrl: link.returnUrl });
      if (!result?.ok) return res.status(400).send(errorPage(result?.error || "Не удалось обработать платёж."));
    } catch (err) {
      console.error("MockPay: не удалось сообщить магазину результат:", err.message);
      return res.status(502).send(errorPage("Платёж обработан, но не удалось подтвердить его магазину. Напишите в поддержку магазина, указав номер заказа."));
    }

    const resultSig = sign(secret, [String(link.orderId), status]);
    const back = new URL(link.returnUrl.href);
    back.searchParams.set("status", status);
    back.searchParams.set("sig", resultSig);
    res.redirect(303, back.href);
  });

  router.use((req, res) => res.status(404).send(errorPage("Страница не найдена.")));

  return router;
}

module.exports = createMockBank;
