const SHOP_NAME = "HomeJoy";

const $ = (sel, root = document) => root.querySelector(sel);
const fmt = (n) => n.toLocaleString("ru-RU") + " ₽";
const params = new URLSearchParams(location.search);

// Каталог приходит с сервера (GET /api/products, /api/categories) — см. loadCatalog()
let PRODUCTS = [];
let CATEGORIES = {};

/* ---------- Иллюстрации мебели (плоские, с жирным контуром) ---------- */
const INK = "#14110F";
// [цвет мебели, цвет фона карточки]
const PAIRS = [
  ["#2B4BFF", "#FFD23F"],
  ["#FF5A36", "#BFE9D6"],
  ["#FFD23F", "#FFB3C7"],
  ["#7BE0B5", "#B9D0FF"],
  ["#FFB3C7", "#7BE0B5"],
  ["#9B7BFF", "#FFD9A8"],
];
const CAT_BG = ["#FFD23F", "#BFE9D6", "#FFB3C7", "#B9D0FF", "#FFD9A8", "#D9C8FF", "#FFC2A8", "#C9F0A8"];
const pairFor = (p) => PAIRS[(Number(p.id) - 1) % PAIRS.length];

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  return "#" + [n >> 16, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, "0")).join("");
}

function furnitureInner(cat, tone) {
  const d = shade(tone, -0.25);
  const l = shade(tone, 0.45);
  const leg = "#7a4a2b";
  const parts = {
    sofa: `
      <rect x="34" y="38" width="132" height="58" rx="16" fill="${d}"/>
      <rect x="16" y="64" width="36" height="58" rx="14" fill="${tone}"/>
      <rect x="148" y="64" width="36" height="58" rx="14" fill="${tone}"/>
      <rect x="44" y="72" width="112" height="42" rx="12" fill="${tone}"/>
      <rect x="52" y="46" width="30" height="28" rx="9" fill="${l}"/>
      <rect x="30" y="120" width="8" height="12" rx="3" fill="${leg}"/>
      <rect x="162" y="120" width="8" height="12" rx="3" fill="${leg}"/>`,
    bed: `
      <rect x="26" y="26" width="148" height="70" rx="12" fill="${d}"/>
      <rect x="20" y="78" width="160" height="40" rx="10" fill="${tone}"/>
      <rect x="34" y="60" width="52" height="24" rx="10" fill="#fffaf2"/>
      <rect x="94" y="60" width="52" height="24" rx="10" fill="#fffaf2"/>
      <rect x="20" y="92" width="160" height="26" rx="8" fill="${l}"/>
      <rect x="26" y="116" width="8" height="16" rx="3" fill="${leg}"/>
      <rect x="166" y="116" width="8" height="16" rx="3" fill="${leg}"/>`,
    table: `
      <rect x="22" y="62" width="156" height="14" rx="7" fill="${tone}"/>
      <rect x="40" y="74" width="8" height="54" rx="3" fill="${d}"/>
      <rect x="152" y="74" width="8" height="54" rx="3" fill="${d}"/>
      <ellipse cx="62" cy="58" rx="16" ry="4" fill="#fffaf2"/>
      <ellipse cx="138" cy="58" rx="16" ry="4" fill="#fffaf2"/>
      <rect x="95" y="42" width="10" height="18" rx="4" fill="${l}"/>
      <circle cx="100" cy="36" r="9" fill="#7BE0B5"/>`,
    chair: `
      <rect x="62" y="20" width="76" height="62" rx="16" fill="${d}"/>
      <rect x="74" y="32" width="52" height="36" rx="10" fill="${l}"/>
      <rect x="54" y="76" width="92" height="20" rx="9" fill="${tone}"/>
      <rect x="62" y="94" width="8" height="38" rx="3" fill="${leg}"/>
      <rect x="130" y="94" width="8" height="38" rx="3" fill="${leg}"/>`,
    wardrobe: `
      <rect x="40" y="10" width="120" height="116" rx="8" fill="${tone}"/>
      <rect x="47" y="17" width="49" height="102" rx="4" fill="${l}"/>
      <rect x="104" y="17" width="49" height="102" rx="4" fill="${l}"/>
      <rect x="88" y="60" width="4" height="24" rx="2" fill="${d}"/>
      <rect x="108" y="60" width="4" height="24" rx="2" fill="${d}"/>
      <rect x="50" y="124" width="10" height="10" rx="2" fill="${leg}"/>
      <rect x="140" y="124" width="10" height="10" rx="2" fill="${leg}"/>`,
  };
  return `<ellipse cx="100" cy="136" rx="78" ry="5" fill="rgba(20,17,15,.2)"/>
    <g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${parts[cat] ?? parts.wardrobe}</g>`;
}

function furnitureSVG(cat, tone = PAIRS[0][0]) {
  return `<svg viewBox="0 0 200 150" aria-hidden="true">${furnitureInner(cat, tone)}</svg>`;
}

/* ---------- Общий каркас: бегущая строка, шапка, подвал, корзина ---------- */
const LOGO_MARK = `<span class="logo__mark"><svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" fill="#FFD23F" stroke="#14110F" stroke-width="2" stroke-linejoin="round"/><path d="M8.5 14.5q3.5 3 7 0" fill="none" stroke="#14110F" stroke-width="2" stroke-linecap="round"/></svg></span>`;

const TICKER = [
  "Бесплатная доставка от 30 000 ₽",
  "Сборка в подарок",
  "Промокод JOY15 — скидка 15%",
  "Гарантия до 3 лет",
  "Возврат 14 дней",
];

function renderLayout() {
  const page = document.body.dataset.page;
  const links = [
    ["index.html", "Главная", "home"],
    ["catalog.html", "Каталог", "catalog"],
    ["about.html", "О магазине", "about"],
    ["contacts.html", "Контакты", "contacts"],
  ];
  const navHtml = links
    .map(([href, label, key]) => {
      const active = key === page || (key === "catalog" && page === "product");
      return `<a href="${href}"${active ? ' class="is-current" aria-current="page"' : ""}>${label}</a>`;
    })
    .join("");

  const tickerItems = TICKER.map((t) => `<span>${t}</span><span aria-hidden="true">✦</span>`).join("");

  $("#site-header").outerHTML = `
    <a class="skip" href="#main">Перейти к содержимому</a>
    <div class="marquee" aria-hidden="true"><div class="marquee__track">${tickerItems}${tickerItems}</div></div>
    <header class="header">
      <div class="container header__inner">
        <a href="index.html" class="logo">${LOGO_MARK}${SHOP_NAME}</a>
        <nav class="nav" id="nav">${navHtml}</nav>
        <div class="header__actions">
          <button class="cart" id="cart-open" aria-label="Корзина">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6h15l-1.6 9H8z"/><path d="M6 6L5 3H2"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>
            <span class="cart__label">Корзина</span>
            <span class="cart__count" id="cart-count">0</span>
          </button>
          <button class="burger" id="burger" aria-label="Меню" aria-expanded="false" aria-controls="nav">☰</button>
        </div>
      </div>
    </header>`;

  $("#site-footer").outerHTML = `
    <footer class="footer">
      <div class="container footer__grid">
        <div>
          <a href="index.html" class="logo logo--light">${LOGO_MARK}${SHOP_NAME}</a>
          <p class="footer__about">Мебель, которая приносит радость каждый день. Яркая, честная и из натуральных материалов.</p>
        </div>
        <div>
          <h3>Разделы</h3>
          ${links.map(([href, label]) => `<a href="${href}">${label}</a>`).join("")}
        </div>
        <div>
          <h3>Контакты</h3>
          <p>+7 (000) 000-00-00</p>
          <p>info@homejoy.example</p>
          <p>Ежедневно с 9:00 до 20:00</p>
        </div>
      </div>
      <div class="footer__mark" aria-hidden="true">${SHOP_NAME}</div>
      <p class="footer__copy">© 2026 ${SHOP_NAME}. Все права защищены.</p>
    </footer>`;

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div class="overlay" id="overlay"></div>
    <aside class="drawer" id="drawer" aria-hidden="true">
      <div class="drawer__head">
        <h2>Ваш чек</h2>
        <button class="drawer__close" id="cart-close" aria-label="Закрыть">✕</button>
      </div>
      <ul class="drawer__list" id="cart-list"></ul>
      <div class="drawer__foot">
        <p class="drawer__total"><span>Итого</span><strong id="cart-total">0 ₽</strong></p>
        <button class="btn btn--block" id="checkout">Оформить заказ</button>
      </div>
    </aside>
    <div class="toast" id="toast"></div>`
  );
}

/* ---------- Карточка товара ---------- */
function ratingHTML(p) {
  if (!p.rating) return "";
  return `<p class="rating"><span class="rating__star">★</span> ${String(p.rating).replace(".", ",")} <span class="rating__count">(${p.reviews})</span></p>`;
}

function priceHTML(p) {
  return `${fmt(p.price)}${p.oldPrice ? ` <s class="price-old">${fmt(p.oldPrice)}</s>` : ""}`;
}

// Настоящее фото (если лежит в images/) или реалистичная SVG-иллюстрация из images.js
function productImage(p) {
  if (p.image) return `<img src="${p.image}" alt="${p.name}" loading="lazy">`;
  return realisticSVG(p);
}

function productCard(p) {
  const [, bg] = pairFor(p);
  const badge = p.badge ? `<span class="product__badge${p.oldPrice ? " product__badge--sale" : ""}">${p.badge}</span>` : "";
  const on = wish.includes(p.id);
  const material = p.specs["Материал"].split(",")[0];
  return `
    <article class="product">
      <div class="product__media" style="--bg:${bg}">
        ${badge}
        <button class="wish${on ? " is-on" : ""}" data-wish="${p.id}" aria-pressed="${on}" aria-label="В избранное">♥</button>
        <a href="product.html?id=${p.id}" class="product__img${p.image ? " product__img--photo" : ""}" tabindex="-1" aria-hidden="true">${productImage(p)}</a>
      </div>
      <div class="product__body">
        <p class="product__cat">${CATEGORIES[p.category]}</p>
        <h3><a href="product.html?id=${p.id}">${p.name}</a></h3>
        ${ratingHTML(p)}
        <p class="product__meta">${p.specs["Размер"]} · ${material}</p>
        <div class="product__foot">
          <span class="product__price">${priceHTML(p)}</span>
          <button class="btn btn--small" data-add="${p.id}">В корзину</button>
        </div>
      </div>
    </article>`;
}

/* ---------- Корзина ---------- */
let cart = [];
try {
  cart = JSON.parse(localStorage.getItem("cart")) || [];
} catch {
  cart = [];
}

function renderCart() {
  const list = $("#cart-list");
  list.innerHTML = "";

  if (cart.length === 0) {
    list.innerHTML = '<li class="drawer__empty">Чек пока пуст.<br>Загляните в каталог!</li>';
  }

  cart.forEach((item) => {
    const li = document.createElement("li");
    li.className = "cart-item";
    li.innerHTML = `
      <div class="cart-item__info">
        <span class="cart-item__name"></span>
        <span class="cart-item__price">${fmt(item.price * item.qty)}</span>
      </div>
      <div class="cart-item__qty">
        <button data-act="dec" data-id="${item.id}" aria-label="Меньше">−</button>
        <span>${item.qty}</span>
        <button data-act="inc" data-id="${item.id}" aria-label="Больше">+</button>
        <button data-act="del" data-id="${item.id}" class="cart-item__del" aria-label="Удалить">✕</button>
      </div>`;
    li.querySelector(".cart-item__name").textContent = item.name;
    list.appendChild(li);
  });

  const count = cart.reduce((s, i) => s + i.qty, 0);
  const badge = $("#cart-count");
  badge.textContent = count;
  badge.classList.toggle("is-empty", count === 0);
  $("#cart-total").textContent = fmt(cart.reduce((s, i) => s + i.qty * i.price, 0));
  try {
    localStorage.setItem("cart", JSON.stringify(cart));
  } catch {}
}

function addToCart(id, qty = 1, silent = false) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return;
  const found = cart.find((i) => i.id === id);
  if (found) found.qty += qty;
  else cart.push({ id, name: p.name, price: p.price, qty });
  renderCart();
  if (!silent) showToast(`«${p.name}» добавлен в корзину`);
}

function openCart() {
  $("#drawer").classList.add("is-open");
  $("#overlay").classList.add("is-open");
  $("#drawer").setAttribute("aria-hidden", "false");
}

function closeCart() {
  $("#drawer").classList.remove("is-open");
  $("#overlay").classList.remove("is-open");
  $("#drawer").setAttribute("aria-hidden", "true");
}

/* ---------- Избранное ---------- */
let wish = [];
try {
  wish = JSON.parse(localStorage.getItem("wish")) || [];
} catch {
  wish = [];
}

function toggleWish(btn) {
  const id = btn.dataset.wish;
  const on = !wish.includes(id);
  wish = on ? [...wish, id] : wish.filter((x) => x !== id);
  document.querySelectorAll(`[data-wish="${id}"]`).forEach((b) => {
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", on);
  });
  try {
    localStorage.setItem("wish", JSON.stringify(wish));
  } catch {}
  showToast(on ? "Добавлено в избранное" : "Удалено из избранного");
}

function flashAdded(btn) {
  const text = btn.dataset.label ?? (btn.dataset.label = btn.textContent);
  btn.textContent = "Добавлено ✓";
  btn.classList.add("is-added");
  setTimeout(() => {
    btn.textContent = text;
    btn.classList.remove("is-added");
  }, 1400);
}

function setNav(open) {
  $("#nav").classList.toggle("is-open", open);
  const b = $("#burger");
  b.setAttribute("aria-expanded", open);
  b.textContent = open ? "✕" : "☰";
}

/* ---------- Хлебные крошки, якорь основного блока ---------- */
function enhancePage() {
  const main = $("main");
  if (main) main.id = "main";
  const head = $(".page-head .container");
  if (head) {
    const title = $("h1", head).textContent;
    head.insertAdjacentHTML(
      "afterbegin",
      `<nav class="crumbs" aria-label="Хлебные крошки"><a href="index.html">Главная</a><span>/</span><b>${title}</b></nav>`
    );
  }
}

function bindGlobalEvents() {
  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      addToCart(add.dataset.add);
      flashAdded(add);
    }
    const w = e.target.closest("[data-wish]");
    if (w) toggleWish(w);
    if (e.target.closest("#nav a")) setNav(false);
  });

  $("#cart-list").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const item = cart.find((i) => i.id === btn.dataset.id);
    if (!item) return;
    if (btn.dataset.act === "inc") item.qty++;
    if (btn.dataset.act === "dec") item.qty--;
    if (btn.dataset.act === "del" || item.qty <= 0) cart = cart.filter((i) => i.id !== item.id);
    renderCart();
  });

  $("#checkout").addEventListener("click", () => {
    if (cart.length === 0) return showToast("Добавьте товары в корзину");
    location.href = "checkout.html";
  });

  $("#cart-open").addEventListener("click", openCart);
  $("#cart-close").addEventListener("click", closeCart);
  $("#overlay").addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeCart();
    setNav(false);
  });

  $("#burger").addEventListener("click", () => setNav(!$("#nav").classList.contains("is-open")));
  window.addEventListener("scroll", () => $(".header").classList.toggle("is-scrolled", scrollY > 8), { passive: true });
}

/* ---------- Уведомление ---------- */
let toastTimer;
function showToast(text) {
  const t = $("#toast");
  t.textContent = text;
  t.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("is-visible"), 2500);
}

/* ---------- Появление при прокрутке ---------- */
let revealObserver;
function initReveal() {
  revealObserver ??= new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("is-shown");
          revealObserver.unobserve(en.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  document.querySelectorAll(".product, .reveal-block").forEach((el) => {
    if (el.classList.contains("reveal")) return;
    el.classList.add("reveal");
    revealObserver.observe(el);
  });
}

/* ---------- Конструктор комнаты ---------- */
const WALLS = [
  ["Лимон", "#FFD23F"],
  ["Мята", "#BFE9D6"],
  ["Роза", "#FFC2D4"],
  ["Небо", "#B9D0FF"],
  ["Сливки", "#FFF1D6"],
  ["Томат", "#FF8A6B"],
];
const FLOORS = [
  ["Дуб", "#D9A066"],
  ["Орех", "#8A5A3B"],
  ["Бетон", "#B8B2A7"],
];
// категория, подпись, x в сцене
const SLOTS = [
  ["wardrobe", "Шкаф", 10],
  ["bed", "Кровать", 200],
  ["sofa", "Диван", 400],
  ["table", "Стол", 600],
  ["chair", "Стул", 800],
];

const room = { wall: WALLS[0][1], floor: FLOORS[0][1], items: { sofa: "1", table: "5", chair: "7" } };
let lastChanged = null;

function roomSVG() {
  const planks = [1, 2, 3, 4, 5].map((i) => `<path d="M0 ${270 + i * 22}H1000" stroke="rgba(20,17,15,.16)" stroke-width="2"/>`).join("");

  const slots = SLOTS.map(([cat, label, x]) => {
    const p = PRODUCTS.find((q) => q.id === room.items[cat]);
    if (p) {
      return `<g class="slot" data-slot="${cat}" transform="translate(${x} 176)">
        <g class="${lastChanged === cat ? "pop" : ""}">${
          REAL_DRAW[p.id]
            ? realisticSVG(p, 'width="198" height="149"')
            : `<svg width="198" height="149" viewBox="0 0 200 150">${furnitureInner(cat, pairFor(p)[0])}</svg>`
        }</g>
      </g>`;
    }
    return `<g class="slot slot--empty" data-slot="${cat}" transform="translate(${x} 176)">
      <rect x="14" y="20" width="168" height="116" rx="16"/>
      <text x="98" y="84" text-anchor="middle">+ ${label}</text>
    </g>`;
  }).join("");

  return `<svg viewBox="0 0 1000 400" role="img" aria-label="Ваша комната">
    <rect width="1000" height="270" fill="${room.wall}"/>
    <rect y="270" width="1000" height="130" fill="${room.floor}"/>${planks}
    <rect y="264" width="1000" height="10" fill="${INK}"/>
    <g stroke="${INK}" stroke-width="4">
      <rect x="415" y="26" width="170" height="128" rx="6" fill="#B9E6FF"/>
      <path d="M500 26V154M415 90H585" fill="none"/>
      <circle cx="458" cy="58" r="14" fill="#FFD23F"/>
      <rect x="235" y="40" width="66" height="84" rx="4" fill="#fff"/>
      <rect x="246" y="51" width="44" height="62" fill="#FF5A36"/>
      <rect x="320" y="58" width="52" height="52" rx="4" fill="#fff"/>
      <circle cx="346" cy="84" r="15" fill="#2B4BFF"/>
      <path d="M700 0V54" fill="none"/>
      <path d="M672 100l12-46h32l12 46z" fill="#FFD23F"/>
    </g>
    ${slots}
  </svg>`;
}

function roomPanelHTML() {
  const swatches = (list, attr, current) =>
    list
      .map(
        ([name, hex]) =>
          `<button class="swatch${hex === current ? " is-active" : ""}" data-${attr}="${hex}" style="background:${hex}" title="${name}" aria-label="${name}"></button>`
      )
      .join("");

  const picks = SLOTS.map(([cat, label]) => {
    const cur = room.items[cat];
    const opts = PRODUCTS.filter((p) => p.category === cat)
      .map(
        (p) =>
          `<button class="opt${cur === p.id ? " is-active" : ""}" data-cat="${cat}" data-id="${p.id}"><b>${p.name}</b><small>${fmt(p.price)}</small></button>`
      )
      .join("");
    return `<div class="pick"><span class="pick__label">${label}</span><div class="pick__opts">
      <button class="opt opt--none${cur ? "" : " is-active"}" data-cat="${cat}" data-id="">нет</button>${opts}</div></div>`;
  }).join("");

  return `
    <div class="ctl"><h3>Стены</h3><div class="swatches">${swatches(WALLS, "wall", room.wall)}</div></div>
    <div class="ctl"><h3>Пол</h3><div class="swatches">${swatches(FLOORS, "floor", room.floor)}</div></div>
    <div class="ctl ctl--wide"><h3>Мебель</h3><div class="picks">${picks}</div></div>`;
}

function roomBarHTML() {
  const chosen = Object.values(room.items)
    .map((id) => PRODUCTS.find((p) => p.id === id))
    .filter(Boolean);
  const total = chosen.reduce((s, p) => s + p.price, 0);
  return `
    <p class="builder__sum"><span>В комнате: ${chosen.length} из ${SLOTS.length}</span><strong>${fmt(total)}</strong></p>
    <div class="builder__btns">
      <button class="btn btn--light btn--small" id="room-random">🎲 Удиви меня</button>
      <button class="btn btn--light btn--small" id="room-reset">Очистить</button>
      <button class="btn" id="room-add"${chosen.length ? "" : " disabled"}>Всё в корзину</button>
    </div>`;
}

function drawRoom() {
  $("#room").innerHTML = roomSVG();
  $("#room-panel").innerHTML = roomPanelHTML();
  $("#room-bar").innerHTML = roomBarHTML();
}

function setSlot(cat, id) {
  if (id) room.items[cat] = id;
  else delete room.items[cat];
  lastChanged = id ? cat : null;
  drawRoom();
}

function initBuilder() {
  drawRoom();
  const root = $("#builder");
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  root.addEventListener("click", (e) => {
    const wall = e.target.closest("[data-wall]");
    const floor = e.target.closest("[data-floor]");
    const opt = e.target.closest(".opt");
    const slot = e.target.closest("[data-slot]");

    if (wall) {
      room.wall = wall.dataset.wall;
      lastChanged = null;
      drawRoom();
    } else if (floor) {
      room.floor = floor.dataset.floor;
      lastChanged = null;
      drawRoom();
    } else if (opt) {
      setSlot(opt.dataset.cat, opt.dataset.id);
    } else if (slot) {
      // клик по предмету в комнате: следующий вариант, затем пусто
      const cat = slot.dataset.slot;
      const variants = PRODUCTS.filter((p) => p.category === cat);
      const idx = variants.findIndex((p) => p.id === room.items[cat]);
      setSlot(cat, idx + 1 < variants.length ? variants[idx + 1].id : "");
    } else if (e.target.closest("#room-reset")) {
      room.items = {};
      lastChanged = null;
      drawRoom();
    } else if (e.target.closest("#room-random")) {
      room.wall = pick(WALLS)[1];
      room.floor = pick(FLOORS)[1];
      room.items = {};
      SLOTS.forEach(([cat]) => {
        if (Math.random() < 0.8) room.items[cat] = pick(PRODUCTS.filter((p) => p.category === cat)).id;
      });
      lastChanged = null;
      drawRoom();
    } else if (e.target.closest("#room-add")) {
      const ids = Object.values(room.items);
      ids.forEach((id) => addToCart(id, 1, true));
      showToast(`Добавлено в корзину: ${ids.length} шт.`);
      openCart();
    }
  });
}

/* ---------- Отзывы ---------- */
const escHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function reviewHTML(r) {
  const date = new Date(r.createdAt.replace(" ", "T") + "Z").toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  return `
    <li class="prod-review">
      <div class="prod-review__head">
        <b>${escHTML(r.name)}</b>
        <span class="prod-review__stars" aria-label="Оценка ${r.rating} из 5">${"★".repeat(r.rating)}<i>${"★".repeat(5 - r.rating)}</i></span>
        <time>${date}</time>
      </div>
      <p>${escHTML(r.text)}</p>
    </li>`;
}

async function initReviews(p) {
  const wrap = $("#reviews-wrap");
  wrap.hidden = false;
  wrap.innerHTML = `
    <h2>Отзывы</h2>
    <div class="prod-reviews__grid">
      <ul class="prod-reviews__list" id="reviews-list"><li class="status">Загрузка...</li></ul>
      <form class="form prod-reviews__form" id="review-form" novalidate>
        <h3>Оставить отзыв</h3>
        <label>Имя
          <input type="text" name="name" maxlength="50" autocomplete="name" required>
        </label>
        <div class="stars-field">
          <span class="stars__label" id="stars-label">Оценка</span>
          <div class="stars" role="radiogroup" aria-labelledby="stars-label">
          ${[5, 4, 3, 2, 1]
            .map((n) => `<input type="radio" name="rating" id="star${n}" value="${n}"><label for="star${n}" title="${n} из 5"><span class="sr-only">${n}</span>★</label>`)
            .join("")}
          </div>
        </div>
        <label>Отзыв
          <textarea name="text" rows="4" maxlength="1000" required></textarea>
        </label>
        <p class="form__error" id="review-error" role="alert" hidden></p>
        <button class="btn" type="submit">Отправить отзыв</button>
      </form>
    </div>`;

  const list = $("#reviews-list");
  const errorBox = $("#review-error");
  const showError = (m) => ((errorBox.textContent = m), (errorBox.hidden = !m));

  try {
    const { items } = await fetchJSON(`/api/products/${encodeURIComponent(p.id)}/reviews`);
    list.innerHTML = items.length ? items.map(reviewHTML).join("") : '<li class="prod-reviews__empty">Отзывов пока нет — станьте первым!</li>';
  } catch (err) {
    console.error(err);
    list.innerHTML = '<li class="status status--error"><p>Не удалось загрузить отзывы.</p></li>';
  }

  let busy = false;
  $("#review-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.target);
    showError("");
    if (String(f.get("name")).trim().length < 2) return showError("Укажите имя");
    if (!f.get("rating")) return showError("Поставьте оценку от 1 до 5");
    if (String(f.get("text")).trim().length < 5) return showError("Напишите отзыв (минимум 5 символов)");

    busy = true;
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(p.id)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: f.get("name"), rating: Number(f.get("rating")), text: f.get("text") }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Не удалось отправить отзыв");

      list.querySelector(".prod-reviews__empty")?.remove();
      list.insertAdjacentHTML(
        "afterbegin",
        reviewHTML({ name: f.get("name").trim(), rating: Number(f.get("rating")), text: f.get("text").trim(), createdAt: new Date().toISOString().slice(0, 19).replace("T", " ") })
      );
      const stars = $(".detail__info .rating");
      if (stars) stars.outerHTML = ratingHTML({ rating: json.rating, reviews: json.reviews });
      e.target.reset();
      showToast("Спасибо за отзыв!");
    } catch (err) {
      showError(err.message);
    } finally {
      busy = false;
      btn.disabled = false;
    }
  });
}

/* ---------- Страницы ---------- */
const pages = {
  home() {
    $("#featured").innerHTML = PRODUCTS.slice(0, 4).map(productCard).join("");
    $("#home-categories").innerHTML = Object.entries(CATEGORIES)
      .map(([key, name], i) => {
        const n = PRODUCTS.filter((p) => p.category === key).length;
        return `<a class="category-card" href="catalog.html?cat=${key}" style="--c:${CAT_BG[i]}">
          <span class="category-card__num">0${i + 1}</span>
          <h3>${name}</h3><p>${n} ${n === 1 ? "товар" : "товара"} →</p>
          <div class="category-card__art">${productImage(PRODUCTS.find((p) => p.category === key) ?? { id: "", category: key })}</div></a>`;
      })
      .join("");
    initBuilder();
  },

  catalog() {
    const PAGE_SIZE = 8;
    const SORTS = { default: "", asc: "price_asc", desc: "price_desc" };
    const num = (v) => (v !== "" && Number.isFinite(Number(v)) && Number(v) >= 0 ? String(Number(v)) : "");

    // состояние хранится в адресной строке, чтобы ссылкой можно было поделиться
    const state = {
      cat: CATEGORIES[params.get("cat")] ? params.get("cat") : "all",
      q: (params.get("q") ?? "").trim().slice(0, 100),
      min: num(params.get("min") ?? ""),
      max: num(params.get("max") ?? ""),
      sort: SORTS[params.get("sort")] !== undefined ? params.get("sort") : "default",
      page: Math.max(1, parseInt(params.get("page"), 10) || 1),
    };

    const filters = $("#filters");
    filters.innerHTML =
      `<button class="chip" data-filter="all">Все</button>` +
      Object.entries(CATEGORIES)
        .map(([k, n]) => `<button class="chip" data-filter="${k}">${n}</button>`)
        .join("");

    $("#search").value = state.q;
    $("#min").value = state.min;
    $("#max").value = state.max;
    $("#sort").value = state.sort;

    function syncUrl() {
      const p = new URLSearchParams();
      if (state.cat !== "all") p.set("cat", state.cat);
      if (state.q) p.set("q", state.q);
      if (state.min) p.set("min", state.min);
      if (state.max) p.set("max", state.max);
      if (state.sort !== "default") p.set("sort", state.sort);
      if (state.page > 1) p.set("page", state.page);
      const qs = p.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
    }

    function pagerHTML(page, pages) {
      if (pages <= 1) return "";
      const btn = (n, label, extra = "") =>
        `<button class="pager__btn${n === page ? " is-active" : ""}" data-page="${n}"${extra}>${label}</button>`;
      let html = btn(page - 1, "←", page === 1 ? " disabled" : "");
      for (let n = 1; n <= pages; n++) html += btn(n, n, n === page ? ' aria-current="page"' : "");
      return html + btn(page + 1, "→", page === pages ? " disabled" : "");
    }

    let seq = 0;
    async function draw() {
      filters.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", c.dataset.filter === state.cat));
      syncUrl();

      const query = new URLSearchParams({ page: state.page, limit: PAGE_SIZE });
      if (state.cat !== "all") query.set("category", state.cat);
      if (state.q) query.set("q", state.q);
      if (state.min) query.set("minPrice", state.min);
      if (state.max) query.set("maxPrice", state.max);
      if (SORTS[state.sort]) query.set("sort", SORTS[state.sort]);

      const mine = ++seq;
      const box = $("#products");
      if (!box.children.length) box.innerHTML = '<p class="status">Загрузка...</p>';

      let data;
      try {
        data = await fetchJSON("/api/products?" + query);
      } catch (err) {
        if (mine !== seq) return;
        console.error(err);
        box.innerHTML = `
          <div class="status status--error">
            <p>Не удалось загрузить товары. Проверьте, что сервер запущен, и попробуйте ещё раз.</p>
            <button class="btn btn--small" id="catalog-retry">Повторить</button>
          </div>`;
        $("#pager").innerHTML = "";
        return;
      }
      if (mine !== seq) return; // пришёл устаревший ответ

      state.page = data.page;
      syncUrl();
      box.innerHTML = data.items.map(productCard).join("");
      $("#empty").hidden = data.total > 0;
      $("#count").textContent = `Найдено: ${data.total}`;
      $("#pager").innerHTML = pagerHTML(data.page, data.pages);
      initReveal();
    }

    const redraw = () => ((state.page = 1), draw());
    const debounced = (fn, ms = 250) => {
      let t;
      return (...a) => (clearTimeout(t), (t = setTimeout(() => fn(...a), ms)));
    };

    filters.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-filter]");
      if (!btn) return;
      state.cat = btn.dataset.filter;
      redraw();
    });
    $("#search").addEventListener(
      "input",
      debounced((e) => {
        state.q = e.target.value.trim();
        redraw();
      })
    );
    for (const key of ["min", "max"]) {
      $("#" + key).addEventListener(
        "input",
        debounced((e) => {
          state[key] = num(e.target.value.trim());
          redraw();
        })
      );
    }
    $("#sort").addEventListener("change", (e) => {
      state.sort = e.target.value;
      redraw();
    });
    $("#pager").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-page]");
      if (!btn || btn.disabled) return;
      state.page = Number(btn.dataset.page);
      draw().then(() => $(".toolbar").scrollIntoView({ behavior: "smooth", block: "start" }));
    });
    $("#reset-filters").addEventListener("click", () => {
      Object.assign(state, { cat: "all", q: "", min: "", max: "", sort: "default" });
      $("#search").value = $("#min").value = $("#max").value = "";
      $("#sort").value = "default";
      redraw();
    });
    document.addEventListener("click", (e) => e.target.closest("#catalog-retry") && draw());

    draw();
  },

  product() {
    const p = PRODUCTS.find((x) => x.id === params.get("id"));
    const box = $("#product");

    if (!p) {
      document.title = `Товар не найден — ${SHOP_NAME}`;
      box.innerHTML = `<div class="notfound"><h1>Товар не найден</h1><p>Возможно, ссылка устарела.</p><a class="btn" href="catalog.html">В каталог</a></div>`;
      return;
    }

    document.title = `${p.name} — ${SHOP_NAME}`;
    const metaDesc = `${p.name} — ${fmt(p.price)}. ${p.description}`;
    $('meta[name="description"]')?.setAttribute("content", metaDesc);
    $('meta[property="og:title"]')?.setAttribute("content", document.title);
    $('meta[property="og:description"]')?.setAttribute("content", metaDesc);
    const [, bg] = pairFor(p);
    const specs = Object.entries(p.specs)
      .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`)
      .join("");

    box.innerHTML = `
      <p class="breadcrumbs"><a href="index.html">Главная</a> / <a href="catalog.html">Каталог</a> / <a href="catalog.html?cat=${p.category}">${CATEGORIES[p.category]}</a></p>
      <div class="detail">
        <div class="detail__media">
          <div class="detail__img${p.image ? " detail__img--photo" : ""}" style="--bg:${bg}">${productImage(p)}</div>
          ${
            p.images?.length > 1
              ? `<div class="thumbs">${p.images
                  .map(
                    (src, i) =>
                      `<button class="thumb${i === 0 ? " is-active" : ""}" data-src="${src}" aria-label="Фото ${i + 1}"><img src="${src}" alt="" loading="lazy"></button>`
                  )
                  .join("")}</div>`
              : ""
          }
        </div>
        <div class="detail__info">
          <p class="product__cat">${CATEGORIES[p.category]}</p>
          <h1>${p.name}</h1>
          ${ratingHTML(p)}
          <p class="detail__price">${priceHTML(p)}</p>
          <p class="detail__desc">${p.description}</p>
          <div class="detail__buy">
            <div class="qty">
              <button id="qty-dec" aria-label="Меньше">−</button>
              <span id="qty-val">1</span>
              <button id="qty-inc" aria-label="Больше">+</button>
            </div>
            <button class="btn" id="buy">Добавить в корзину</button>
          </div>
          <ul class="perks">
            <li>🚚 Бесплатная доставка от 30 000 ₽</li>
            <li>🛡️ Гарантия ${p.specs["Гарантия"]}</li>
            <li>↩️ Возврат в течение 14 дней</li>
          </ul>
          <table class="specs">${specs}</table>
        </div>
      </div>`;

    $(".thumbs")?.addEventListener("click", (e) => {
      const t = e.target.closest(".thumb");
      if (!t) return;
      $(".detail__img img").src = t.dataset.src;
      document.querySelectorAll(".thumb").forEach((b) => b.classList.toggle("is-active", b === t));
    });

    let qty = 1;
    const show = () => ($("#qty-val").textContent = qty);
    $("#qty-dec").addEventListener("click", () => ((qty = Math.max(1, qty - 1)), show()));
    $("#qty-inc").addEventListener("click", () => ((qty = Math.min(20, qty + 1)), show()));
    $("#buy").addEventListener("click", () => addToCart(p.id, qty));

    initReviews(p);

    const related = PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id);
    if (related.length) {
      $("#related-wrap").hidden = false;
      $("#related").innerHTML = related.map(productCard).join("");
    }
  },

  about() {
    $("#about-art").innerHTML = realisticSVG({ id: "2", category: "sofa" });
  },

  checkout() {
    const box = $("#checkout-box");
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

    if (cart.length === 0) {
      box.innerHTML = `<div class="status"><p>Чек пока пуст.</p><a class="btn" href="catalog.html">В каталог</a></div>`;
      return;
    }

    box.innerHTML = `
      <div class="checkout">
        <form class="form checkout__form" id="order-form" novalidate>
          <h2>Ваши данные</h2>
          <label>Имя
            <input type="text" name="name" autocomplete="name" maxlength="100" required>
          </label>
          <label>Телефон
            <input type="tel" name="phone" autocomplete="tel" placeholder="+7 900 000-00-00" maxlength="30" required>
          </label>
          <label>Email (необязательно)
            <input type="email" name="email" autocomplete="email" maxlength="100">
          </label>
          <fieldset class="choice">
            <legend>Получение</legend>
            <label><input type="radio" name="delivery" value="courier" checked> Курьером до двери</label>
            <label><input type="radio" name="delivery" value="pickup"> Самовывоз из магазина (бесплатно)</label>
          </fieldset>
          <label id="address-wrap">Адрес доставки
            <input type="text" name="address" autocomplete="street-address" maxlength="300">
          </label>
          <label>Комментарий (необязательно)
            <textarea name="comment" rows="3" maxlength="500"></textarea>
          </label>
          <p class="form__error" id="order-error" role="alert" hidden></p>
          <button class="btn btn--lg" type="submit" id="order-submit">Подтвердить заказ</button>
        </form>

        <aside class="receipt" aria-live="polite">
          <h2>Ваш чек</h2>
          <ul class="receipt__list" id="receipt-list"></ul>
          <div class="receipt__promo">
            <input type="text" id="promo" placeholder="Промокод" autocomplete="off" maxlength="30" aria-label="Промокод">
            <button class="btn btn--small btn--outline" type="button" id="promo-apply">Применить</button>
          </div>
          <p class="receipt__note" id="promo-note" hidden></p>
          <dl class="receipt__sums" id="receipt-sums"></dl>
        </aside>
      </div>`;

    const form = $("#order-form");
    const errorBox = $("#order-error");
    let promo = "";
    let busy = false;

    const payload = () => ({
      items: cart.map(({ id, qty }) => ({ id, qty })),
      delivery: form.delivery.value,
      promo,
    });

    function showError(msg) {
      errorBox.textContent = msg;
      errorBox.hidden = !msg;
    }

    async function post(url, data) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Не удалось связаться с сервером");
      return json;
    }

    async function recalc() {
      try {
        const q = await post("/api/orders/quote", payload());
        // цены в корзине могли устареть — берём актуальные с сервера
        cart = q.items.map(({ id, name, price, qty }) => ({ id, name, price, qty }));
        renderCart();
        $("#receipt-list").innerHTML = q.items
          .map((l) => `<li><span>${esc(l.name)} × ${l.qty}</span><b>${fmt(l.price * l.qty)}</b></li>`)
          .join("");
        const rows = [["Товары", fmt(q.subtotal)]];
        if (q.discount) rows.push([`Скидка ${esc(q.promo)}`, "−" + fmt(q.discount)]);
        rows.push(["Доставка", q.deliveryCost ? fmt(q.deliveryCost) : "Бесплатно"]);
        rows.push(["Итого", fmt(q.total)]);
        $("#receipt-sums").innerHTML = rows
          .map(([k, v], i) => `<div${i === rows.length - 1 ? ' class="is-total"' : ""}><dt>${k}</dt><dd>${v}</dd></div>`)
          .join("");
        return true;
      } catch (err) {
        showError(err.message);
        return false;
      }
    }

    $("#promo-apply").addEventListener("click", async () => {
      const prev = promo;
      promo = $("#promo").value.trim();
      const note = $("#promo-note");
      showError("");
      if (!(await recalc())) {
        promo = prev;
        await recalc();
        return;
      }
      note.hidden = !promo;
      note.textContent = promo ? `Промокод ${promo.toUpperCase()} применён` : "";
    });

    form.addEventListener("change", (e) => {
      if (e.target.name !== "delivery") return;
      $("#address-wrap").hidden = form.delivery.value === "pickup";
      recalc();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (busy) return;
      showError("");
      const f = new FormData(form);
      const courier = f.get("delivery") === "courier";
      if (String(f.get("name")).trim().length < 2) return showError("Укажите имя");
      if (String(f.get("phone")).replace(/\D/g, "").length < 10) return showError("Укажите телефон в формате +7 900 000-00-00");
      if (courier && String(f.get("address")).trim().length < 5) return showError("Укажите адрес доставки");

      busy = true;
      const btn = $("#order-submit");
      btn.disabled = true;
      btn.textContent = "Отправляем...";
      try {
        const order = await post("/api/orders", {
          ...payload(),
          name: f.get("name"),
          phone: f.get("phone"),
          email: f.get("email"),
          address: f.get("address"),
          comment: f.get("comment"),
        });
        cart = [];
        renderCart();
        box.innerHTML = `
          <div class="thanks">
            <p class="thanks__emoji" aria-hidden="true">🎉</p>
            <h2>Заказ № ${order.id} принят!</h2>
            <p>Сумма: <b>${fmt(order.total)}</b>. Мы позвоним вам по телефону в ближайшее время, чтобы подтвердить детали.</p>
            <a class="btn" href="catalog.html">Вернуться в каталог</a>
          </div>`;
        scrollTo({ top: 0, behavior: "smooth" });
      } catch (err) {
        showError(err.message);
        btn.disabled = false;
        btn.textContent = "Подтвердить заказ";
        busy = false;
      }
    });

    recalc();
  },

  contacts() {
    $("#contact-form").addEventListener("submit", (e) => {
      e.preventDefault();
      e.target.reset();
      showToast("Сообщение отправлено. Мы скоро свяжемся с вами!");
    });
  },
};

/* ---------- Загрузка каталога с сервера ---------- */
// Какие блоки страницы заполняются данными каталога (в первом показываем статус)
const DATA_PAGES = {
  home: ["#featured", "#home-categories", "#room"],
  catalog: ["#products"],
  product: ["#product"],
};

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

async function loadCatalog() {
  const [{ items }, cats] = await Promise.all([fetchJSON("/api/products"), fetchJSON("/api/categories")]);
  PRODUCTS = items;
  CATEGORIES = Object.fromEntries(cats.map((c) => [c.id, c.name]));
}

async function startPage() {
  const page = document.body.dataset.page;
  const targets = DATA_PAGES[page];

  if (!targets) {
    pages[page]?.();
    initReveal();
    return;
  }

  targets.forEach((sel, i) => {
    $(sel).innerHTML = i === 0 ? '<p class="status">Загрузка...</p>' : "";
  });

  try {
    await loadCatalog();
  } catch (err) {
    console.error(err);
    $(targets[0]).innerHTML = `
      <div class="status status--error">
        <p>Не удалось загрузить товары. Проверьте, что сервер запущен, и попробуйте ещё раз.</p>
        <button class="btn btn--small" data-retry>Повторить</button>
      </div>`;
    return;
  }

  targets.forEach((sel) => ($(sel).innerHTML = ""));
  pages[page]();
  initReveal();
}

/* ---------- Старт ---------- */
renderLayout();
bindGlobalEvents();
renderCart();
enhancePage();
document.addEventListener("click", (e) => e.target.closest("[data-retry]") && startPage());
if (document.body.dataset.page === "home") $("#hero-sofa").innerHTML = realisticSVG({ id: "1", category: "sofa" });
startPage();
