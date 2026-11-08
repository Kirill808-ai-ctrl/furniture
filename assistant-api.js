/* ИИ-консультант (/api/assistant/chat). Модель — Gemini (бесплатный уровень), ключ только на сервере.
   Браузер никогда не видит ключ и не ходит к Google напрямую — только к нашему прокси. */
const MODEL = "gemini-3.5-flash-lite";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 15_000;

const MAX_HISTORY = 16; // сколько последних сообщений (вопрос+ответ) берём в контекст
const MAX_MESSAGE_LEN = 600;
const MAX_REPLY_TOKENS = 400;

// Не больше 20 сообщений за 10 минут с одного адреса — бесплатный лимит Gemini общий на весь сайт
const HITS_WINDOW_MS = 10 * 60_000;
const HITS_MAX = 20;

function buildSystemPrompt({ db, categories, promo, freeDeliveryFrom, deliveryPrice }) {
  const rows = db
    .prepare("SELECT category, COUNT(*) AS n, MIN(price) AS lo, MAX(price) AS hi FROM products GROUP BY category")
    .all();
  const catalogLines = rows
    .map((r) => `- ${categories[r.category] ?? r.category}: ${r.n} шт., цены от ${r.lo} до ${r.hi} ₽`)
    .join("\n");
  const promoCode = Object.keys(promo)[0];
  const promoRate = Math.round(promo[promoCode] * 100);

  return `Ты — дружелюбный консультант интернет-магазина мебели HomeJoy. Отвечай по-русски, коротко (обычно 2-5 предложений), по делу, без канцелярита.

Сейчас в каталоге:
${catalogLines || "(каталог временно недоступен)"}

Правила магазина:
- Доставка бесплатна от ${freeDeliveryFrom.toLocaleString("ru-RU")} ₽, иначе ${deliveryPrice.toLocaleString("ru-RU")} ₽. Самовывоз всегда бесплатный.
- Промокод ${promoCode} даёт скидку ${promoRate}% на первый заказ.
- Гарантия на мебель — до 3 лет, возврат в течение 14 дней.
- Оформление заказа — на странице «Оформление заказа» (checkout.html), после наполнения корзины.

Как отвечать:
- Ты НЕ знаешь точных названий, артикулов и цен конкретных моделей мебели — только то, что указано выше про категории. Не выдумывай их.
- Если спрашивают конкретный товар или подбор под параметры — подскажи категорию и диапазон цен, предложи открыть «Каталог» и воспользоваться фильтрами по цене/категории, «Избранным» и «Сравнением».
- Если вопрос про статус уже оформленного заказа, личные данные или то, чего ты не знаешь — вежливо направь на страницу «Контакты» (телефон/почта/форма).
- Не представляйся сотрудником-человеком и не обещай того, чего магазин не предлагает. Не используй разметку Markdown — только обычный текст.`;
}

// Грубая, но достаточная проверка: массив { role: "user"|"assistant", text: string }, последним — пользователь
function parseMessages(body) {
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_HISTORY) {
    return { error: "Некорректная история сообщений" };
  }
  const clean = [];
  for (const m of messages) {
    const role = m?.role === "assistant" ? "assistant" : m?.role === "user" ? "user" : null;
    const text = typeof m?.text === "string" ? m.text.trim().slice(0, MAX_MESSAGE_LEN) : "";
    if (!role || !text) return { error: "Некорректное сообщение в истории" };
    clean.push({ role, text });
  }
  if (clean[clean.length - 1].role !== "user") return { error: "Последнее сообщение должно быть от пользователя" };
  return { value: clean };
}

module.exports = function createAssistant({ db, categories, promo, freeDeliveryFrom, deliveryPrice }) {
  const express = require("express");
  const router = express.Router();

  const hits = new Map(); // ip -> время обращений
  function tooMany(ip) {
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < HITS_WINDOW_MS);
    if (recent.length >= HITS_MAX) {
      hits.set(ip, recent);
      return true;
    }
    hits.set(ip, [...recent, now]);
    return false;
  }

  router.post("/chat", express.json({ limit: "20kb" }), async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "Ассистент временно недоступен" });
    if (tooMany(req.ip)) {
      return res.status(429).json({ error: "Слишком много сообщений подряд. Подождите немного." });
    }

    const { value: messages, error } = parseMessages(req.body);
    if (error) return res.status(400).json({ error });

    const contents = messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text }] }));
    const systemInstruction = { parts: [{ text: buildSystemPrompt({ db, categories, promo, freeDeliveryFrom, deliveryPrice }) }] };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(`${API_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction,
          contents,
          generationConfig: { temperature: 0.4, maxOutputTokens: MAX_REPLY_TOKENS },
        }),
        signal: controller.signal,
      });

      if (!r.ok) {
        console.error("Gemini API error:", r.status); // тело ответа не логируем — может содержать служебные детали
        return res.status(502).json({ error: "Ассистент сейчас не отвечает. Попробуйте чуть позже." });
      }

      const data = await r.json();
      if (data.promptFeedback?.blockReason) {
        return res.json({ reply: "Не могу ответить на это. Спросите что-нибудь о мебели, доставке или заказе — с радостью помогу." });
      }
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const reply = parts.map((p) => p.text ?? "").join("").trim();
      if (!reply) return res.json({ reply: "Не получилось сформулировать ответ. Попробуйте переформулировать вопрос." });

      res.json({ reply: reply.slice(0, 4000) });
    } catch (err) {
      console.error("Gemini request failed:", err.name === "AbortError" ? "timeout" : err.message);
      res.status(502).json({ error: "Ассистент сейчас не отвечает. Попробуйте чуть позже." });
    } finally {
      clearTimeout(timer);
    }
  });

  return { router };
};
