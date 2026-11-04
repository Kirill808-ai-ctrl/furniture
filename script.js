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

/* ---------- Иконки: единый набор вместо эмодзи ---------- */
const ICONS = {
  heart: '<path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5c0 6.1-8 11-8 11z"/>',
  compare: '<path d="M4 8h13M13 4l4 4-4 4M20 16H7M11 12l-4 4 4 4"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  truck: '<path d="M2.5 6.5h11v10h-11zM13.5 9.5h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V6z"/><path d="M8.5 12l2.4 2.4 4.6-4.6"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  leaf: '<path d="M5 19c0-8 5-13 15-14 0 10-5 15-13 15z"/><path d="M5 19c3-5 6-8 10-10"/>',
  sofa: '<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 12.5a2 2 0 0 1 4 0V14h10v-1.5a2 2 0 0 1 4 0V17H3z"/><path d="M6 17v2M18 17v2"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  zoom: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.5-4.5M11 8v6M8 11h6"/>',
  arrowL: '<path d="M15 5l-7 7 7 7"/>',
  arrowR: '<path d="M9 5l7 7-7 7"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  handshake: '<path d="M3 11l4-4 4 2 3-2 7 6-4 4-3-1-2 2-3-1-2 2z"/>',
  heartfill: '<path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5c0 6.1-8 11-8 11z"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  party: '<path d="M4 20l4-11 7 7z"/><path d="M13 5v2M18 8h2M17 12l2 1M10 3l1 2"/>',
};

const icon = (name, cls = "") =>
  `<svg class="icon${cls ? " " + cls : ""}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] ?? ""}</svg>`;

// Статичные страницы пишут <span data-icon="truck"></span> — иконка подставляется здесь
function initIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => {
    el.innerHTML = icon(el.dataset.icon);
    el.removeAttribute("data-icon");
  });
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
          <button class="hbtn" id="theme-toggle" type="button" aria-label="Тёмная тема" title="Тёмная тема">${icon("moon","icon--moon")}${icon("sun","icon--sun")}</button>
          <a class="hbtn" href="wishlist.html" aria-label="Избранное">${icon("heart")}<span class="hbtn__count is-empty" id="wish-count">0</span></a>
          <a class="hbtn hbtn--cmp" href="compare.html" aria-label="Сравнение">${icon("compare")}<span class="hbtn__count is-empty" id="cmp-count">0</span></a>
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
    <div class="qv" id="qv" hidden role="dialog" aria-modal="true" aria-label="Быстрый просмотр">
      <div class="qv__box" id="qv-box"></div>
    </div>
    <div class="cmpbar" id="cmpbar" hidden></div>
    <div class="toast" id="toast"></div>`
  );
  initIcons();
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

let cmp = [];
try {
  cmp = JSON.parse(localStorage.getItem("cmp")) || [];
} catch {
  cmp = [];
}

// Заглушки на время загрузки: сетка не «прыгает», когда приходят данные
function skeletonCards(n = 8) {
  return Array.from({ length: n }, () => `
    <article class="product skel" aria-hidden="true">
      <div class="product__media skel__block"></div>
      <div class="product__body">
        <span class="skel__line skel__line--s"></span>
        <span class="skel__line"></span>
        <span class="skel__line skel__line--m"></span>
        <span class="skel__line skel__line--btn"></span>
      </div>
    </article>`).join("");
}

const SKELETONS = {
  home: () => skeletonCards(4),
  catalog: () => skeletonCards(8),
  wishlist: () => skeletonCards(4),
  product: () => '<div class="skel-detail" aria-hidden="true"><div class="skel__block"></div><div><span class="skel__line skel__line--s"></span><span class="skel__line skel__line--h"></span><span class="skel__line"></span><span class="skel__line skel__line--m"></span><span class="skel__line skel__line--btn"></span></div></div>',
};

function productCard(p) {
  const [, bg] = pairFor(p);
  const badge = p.badge ? `<span class="product__badge${p.oldPrice ? " product__badge--sale" : ""}">${p.badge}</span>` : "";
  const on = wish.includes(p.id);
  const material = p.specs["Материал"].split(",")[0];
  return `
    <article class="product">
      <div class="product__media" style="--bg:${bg}">
        ${badge}
        <div class="card-tools">
          <button class="wish${on ? " is-on" : ""}" data-wish="${p.id}" aria-pressed="${on}" aria-label="В избранное" title="В избранное">${icon("heart")}</button>
          <button class="tool${cmp.includes(p.id) ? " is-on" : ""}" data-compare="${p.id}" aria-pressed="${cmp.includes(p.id)}" aria-label="Сравнить" title="Сравнить">${icon("compare")}</button>
          <button class="tool" data-quick="${p.id}" aria-label="Быстрый просмотр" title="Быстрый просмотр">${icon("eye")}</button>
        </div>
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
  if (badge.textContent !== String(count)) {
    badge.classList.remove("bump");
    void badge.offsetWidth;
    badge.classList.add("bump");
  }
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
  updateCounts();
  showToast(on ? "Добавлено в избранное" : "Удалено из избранного");
  if (document.body.dataset.page === "wishlist" && !on) pages.wishlist();
}

const CMP_MAX = 3;
function toggleCompare(id) {
  if (cmp.includes(id)) cmp = cmp.filter((x) => x !== id);
  else if (cmp.length >= CMP_MAX) return showToast(`Сравнивать можно до ${CMP_MAX} товаров`);
  else cmp = [...cmp, id];
  const on = cmp.includes(id);
  document.querySelectorAll(`[data-compare="${id}"]`).forEach((b) => {
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", on);
  });
  try {
    localStorage.setItem("cmp", JSON.stringify(cmp));
  } catch {}
  updateCounts();
  if (document.body.dataset.page === "compare" && !on) pages.compare();
}

function updateCounts() {
  const set = (sel, n) => {
    const el = $(sel);
    if (!el) return;
    el.textContent = n;
    el.classList.toggle("is-empty", n === 0);
  };
  set("#wish-count", wish.length);
  set("#cmp-count", cmp.length);
  renderCmpBar();
}

function renderCmpBar() {
  const bar = $("#cmpbar");
  if (!bar) return;
  const items = cmp.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
  if (document.body.dataset.page === "compare" || items.length === 0) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  bar.innerHTML = `<span class="cmpbar__t">Сравнение: <b>${items.length}</b> из ${CMP_MAX}</span>
    <span class="cmpbar__names">${items.map((p) => `<i>${p.name}</i>`).join("")}</span>
    <button class="btn btn--small btn--outline" data-cmp-clear>Очистить</button>
    <a class="btn btn--small" href="compare.html">Сравнить</a>`;
}

const COMPLEMENTS = {
  sofa: ["table", "shelf", "tv"],
  bed: ["wardrobe", "dresser"],
  table: ["chair", "shelf"],
  chair: ["table"],
  wardrobe: ["bed", "dresser"],
  dresser: ["bed", "wardrobe"],
  shelf: ["sofa", "table"],
  tv: ["sofa", "shelf"],
};

/* ---------- Увеличение изображения ---------- */
function openLightbox(p) {
  const [, bg] = pairFor(p);
  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.setAttribute("role", "dialog");
  lb.setAttribute("aria-modal", "true");
  lb.setAttribute("aria-label", p.name);
  lb.innerHTML = `<button class="qv__close" aria-label="Закрыть">${icon("close")}</button>
    <div class="lightbox__img" style="--bg:${bg}">${productImage(p)}</div>`;
  const close = () => {
    lb.remove();
    document.body.classList.remove("no-scroll");
    document.removeEventListener("keydown", onKey, true);
  };
  const onKey = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  };
  lb.addEventListener("click", (e) => {
    if (e.target === lb || e.target.closest(".qv__close")) close();
  });
  document.addEventListener("keydown", onKey, true);
  document.body.append(lb);
  document.body.classList.add("no-scroll");
  lb.querySelector(".qv__close").focus();
}

/* ---------- Быстрый просмотр ---------- */
let qvOpener = null;
function openQuick(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return;
  qvOpener = document.activeElement;
  const on = wish.includes(p.id);
  $("#qv-box").innerHTML = `
    <button class="qv__close" data-qv-close aria-label="Закрыть">${icon("close")}</button>
    <div class="qv__media" style="--bg:${pairFor(p)[1]}"><div class="product__img">${productImage(p)}</div></div>
    <div class="qv__info">
      <p class="product__cat">${CATEGORIES[p.category]}</p>
      <h2>${p.name}</h2>
      ${ratingHTML(p)}
      <p class="qv__price">${priceHTML(p)}</p>
      <dl class="qv__specs">${["Размер", "Материал", "Цвет"].filter((k) => p.specs[k]).map((k) => `<div><dt>${k}</dt><dd>${p.specs[k]}</dd></div>`).join("")}</dl>
      <div class="qv__actions">
        <button class="btn" data-add="${p.id}">В корзину</button>
        <button class="btn btn--outline wish-btn${on ? " is-on" : ""}" data-wish="${p.id}" aria-pressed="${on}">${icon("heart")} Избранное</button>
      </div>
      <a class="link-btn" href="product.html?id=${p.id}">Подробнее о товаре →</a>
    </div>`;
  $("#qv").hidden = false;
  document.body.classList.add("no-scroll");
  $("[data-qv-close]").focus();
}

function closeQuick() {
  if ($("#qv").hidden) return;
  $("#qv").hidden = true;
  document.body.classList.remove("no-scroll");
  qvOpener?.focus?.();
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
    const c = e.target.closest("[data-compare]");
    if (c) toggleCompare(c.dataset.compare);
    const q = e.target.closest("[data-quick]");
    if (q) openQuick(q.dataset.quick);
    if (e.target.closest("[data-qv-close]") || e.target.id === "qv") closeQuick();
    if (e.target.closest("[data-cmp-clear]")) {
      cmp = [];
      try {
        localStorage.setItem("cmp", "[]");
      } catch {}
      document.querySelectorAll("[data-compare]").forEach((b) => {
        b.classList.remove("is-on");
        b.setAttribute("aria-pressed", "false");
      });
      updateCounts();
      if (document.body.dataset.page === "compare") pages.compare();
    }
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
    closeQuick();
    closeCart();
    setNav(false);
  });

  $("#theme-toggle").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme !== "dark";
    if (dark) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {}
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
// Спокойные «архитектурные» цвета стен и натуральные материалы пола
const WALLS = [
  ["Молочный", "#E9E3D6"],
  ["Светло-серый", "#CFCFCB"],
  ["Шалфей", "#AEBBA5"],
  ["Песок", "#D4BF9C"],
  ["Глина", "#BE8670"],
  ["Графит", "#4D525A"],
];
const FLOORS = [
  ["Дуб", "#C49A66"],
  ["Орех", "#7B5436"],
  ["Светлый ясень", "#D9C6A6"],
  ["Бетон", "#9E9B95"],
];
// категория и подпись
const SLOTS = [
  ["wardrobe", "Шкаф"],
  ["bed", "Кровать"],
  ["sofa", "Диван"],
  ["table", "Стол"],
  ["chair", "Стул"],
];

// Расстановка как в настоящей комнате: шкаф, диван и кровать стоят у задней стены,
// стол со стулом — ближе к зрителю (поэтому крупнее и ниже). cx — центр, base — линия пола под предметом.
const ROOM_LAYOUT = {
  wardrobe: { cx: 172, base: 342, persp: 1 },
  sofa: { cx: 470, base: 344, persp: 1 },
  bed: { cx: 782, base: 342, persp: 1 },
  table: { cx: 330, base: 470, persp: 1.12 },
  chair: { cx: 508, base: 478, persp: 1.12 },
};
// Размеры по умолчанию (ширина, высота, см) — если в характеристиках товара их не удалось прочитать
const DEFAULT_CM = { sofa: [210, 85], bed: [160, 100], table: [140, 75], chair: [45, 90], wardrobe: [170, 220] };
// Границы рисунков в их системе координат [x0, y0, x1, y1] (без тени); рисунки повторяются с шагом 10 id
const ROOM_BOX = {
  1: [44, 82, 356, 268], 2: [20, 88, 382, 268], 3: [40, 58, 360, 268], 4: [52, 88, 348, 266], 5: [26, 86, 374, 268],
  6: [28, 96, 372, 268], 7: [126, 36, 274, 268], 8: [64, 40, 336, 268], 9: [70, 28, 330, 262], 10: [58, 20, 342, 264],
};
const PX_CM = 1.3; // пикселей сцены в одном сантиметре
const FLOOR_Y = 332; // где пол встречается со стеной

// по умолчанию комната обставлена целиком — как в готовом интерьере
const room = { wall: WALLS[0][1], floor: FLOORS[0][1], items: { wardrobe: "9", bed: "3", sofa: "1", table: "5", chair: "7" } };
let lastChanged = null;

const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixColor = (h, other, t) => {
  const a = hexRGB(h);
  const b = hexRGB(other);
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("");
};
const isDarkColor = (h) => {
  const [r, g, b] = hexRGB(h);
  return 0.299 * r + 0.587 * g + 0.114 * b < 120;
};
const rnd = (v) => Math.round(v * 10) / 10;

// ширина и высота предмета в сантиметрах из характеристик («210 × 95 × 85 см»)
function sizeCm(p, cat) {
  const [dw, dh] = DEFAULT_CM[cat];
  const parts = String(p.specs?.["Размер"] ?? "").replace(",", ".").split("×").map((s) => parseFloat(s));
  const ok = (v, a, b) => Number.isFinite(v) && v >= a && v <= b;
  return [ok(parts[0], 20, 500) ? parts[0] : dw, ok(parts[2], 30, 300) ? parts[2] : dh];
}

// Предмет в масштабе по реальным размерам, стоящий на своей линии пола
function placeProduct(p, cat) {
  const L = ROOM_LAYOUT[cat];
  const real = !!REAL_DRAW[p.id];
  const box = (real && ROOM_BOX[((Number(p.id) - 1) % 10) + 1]) || [10, 14, 190, 140];
  const [vx, vy, vw, vh] = real ? [10, 8, 380, 285] : [0, 0, 200, 150];
  const [cw, ch] = sizeCm(p, cat);
  const s = Math.sqrt(((cw * PX_CM) / (box[2] - box[0])) * ((ch * PX_CM) / (box[3] - box[1]))) * L.persp;
  const x = L.cx - ((box[0] + box[2]) / 2 - vx) * s;
  const y = L.base - (box[3] - vy) * s;
  const attrs = `x="${rnd(x)}" y="${rnd(y)}" width="${rnd(vw * s)}" height="${rnd(vh * s)}"`;
  return real
    ? realisticSVG(p, attrs)
    : `<svg ${attrs} viewBox="0 0 200 150">${furnitureInner(cat, pairFor(p)[0])}</svg>`;
}

function roomSlot(cat, label, dark) {
  const p = PRODUCTS.find((q) => q.id === room.items[cat]);
  if (p) return `<g class="slot" data-slot="${cat}"><g class="${lastChanged === cat ? "pop" : ""}">${placeProduct(p, cat)}</g></g>`;

  // пустое место: контур предмета в натуральную величину
  const L = ROOM_LAYOUT[cat];
  const [w, h] = DEFAULT_CM[cat].map((v) => v * PX_CM * L.persp);
  const x = L.cx - w / 2;
  const y = L.base - h;
  return `<g class="slot slot--empty${dark ? " slot--dark" : ""}" data-slot="${cat}">
    <rect x="${rnd(x)}" y="${rnd(y)}" width="${rnd(w)}" height="${rnd(h)}" rx="8"/>
    <text class="ghost-plus" x="${rnd(L.cx)}" y="${rnd(y + h / 2 - 4)}" text-anchor="middle">+</text>
    <text class="ghost-label" x="${rnd(L.cx)}" y="${rnd(y + h / 2 + 20)}" text-anchor="middle">${label}</text>
  </g>`;
}

function roomSVG() {
  const dark = isDarkColor(room.wall);
  const label = Object.fromEntries(SLOTS);

  // доски пола сходятся к точке схода (500, 140)
  const planks = [];
  for (let xb = -900; xb <= 1900; xb += 120) planks.push(`M${rnd(500 + (xb - 500) * 0.5333)} ${FLOOR_Y}L${xb} 500`);
  const seams = [346, 368, 398, 438, 488].map((y, i) => `<path d="M0 ${y}H1000" stroke="#000" stroke-opacity=".07" stroke-width="1.5" stroke-dasharray="${150 + i * 40} ${230 + i * 20}" stroke-dashoffset="${i * 90}"/>`).join("");

  // складки штор
  const drape = (x) =>
    `<rect x="${x}" y="34" width="58" height="294" fill="#d9d2c4"/>` +
    [0, 1, 2, 3, 4].map((i) => `<rect x="${x + i * 11.6}" y="34" width="11.6" height="294" fill="${i % 2 ? "#fff" : "#000"}" fill-opacity="${i % 2 ? 0.1 : 0.07}"/>`).join("") +
    `<rect x="${x}" y="34" width="58" height="9" fill="#000" fill-opacity=".14"/><rect x="${x}" y="322" width="58" height="6" fill="#000" fill-opacity=".12"/>`;

  // листья комнатного растения
  const leaves = [-66, -42, -18, 6, 30, 54, 74]
    .map((a, i) => `<g transform="translate(0 -46) rotate(${a})"><ellipse cx="0" cy="-${40 + (i % 3) * 5}" rx="14" ry="${42 + (i % 3) * 5}" fill="${["#4f714a", "#3d5c3a", "#5e8458"][i % 3]}"/><path d="M0 -4V-${76 + (i % 3) * 8}" stroke="#2f4a2d" stroke-opacity=".6" stroke-width="2"/></g>`)
    .join("");

  const back = ["wardrobe", "sofa", "bed"].map((c) => roomSlot(c, label[c], dark)).join("");
  const front = ["table", "chair"].map((c) => roomSlot(c, label[c], dark)).join("");

  return `<svg viewBox="0 0 1000 500" role="img" aria-label="Ваша комната">
    <defs>
      <linearGradient id="rm-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".24"/><stop offset=".2" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
      <radialGradient id="rm-glow" cx="470" cy="120" r="360" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <linearGradient id="rm-vig" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".26"/><stop offset=".22" stop-color="#000" stop-opacity="0"/><stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".26"/></linearGradient>
      <linearGradient id="rm-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".38"/><stop offset=".1" stop-color="#000" stop-opacity=".1"/><stop offset=".55" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".26"/></linearGradient>
      <linearGradient id="rm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9c9e2"/><stop offset="1" stop-color="#eef5f9"/></linearGradient>
      <linearGradient id="rm-cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe6a3" stop-opacity=".34"/><stop offset="1" stop-color="#ffe6a3" stop-opacity="0"/></linearGradient>
      <radialGradient id="rm-lamp"><stop offset="0" stop-color="#ffe2a0" stop-opacity=".45"/><stop offset="1" stop-color="#ffe2a0" stop-opacity="0"/></radialGradient>
      <linearGradient id="rm-pot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1f1d1b"/><stop offset=".45" stop-color="#4a4641"/><stop offset="1" stop-color="#1f1d1b"/></linearGradient>
    </defs>

    <!-- задняя стена: краска, мягкий свет от окна, карниз и плинтус -->
    <rect width="1000" height="${FLOOR_Y}" fill="${room.wall}"/>
    <rect width="1000" height="${FLOOR_Y}" fill="url(#rm-wall)"/>
    <rect width="1000" height="${FLOOR_Y}" fill="url(#rm-glow)"/>
    <rect width="1000" height="${FLOOR_Y}" fill="url(#rm-vig)"/>
    <rect width="1000" height="9" fill="#f6f3ec" fill-opacity=".85"/><rect y="9" width="1000" height="2" fill="#000" fill-opacity=".14"/>
    <rect y="${FLOOR_Y - 18}" width="1000" height="18" fill="#f3f0ea"/>
    <rect y="${FLOOR_Y - 18}" width="1000" height="2" fill="#000" fill-opacity=".14"/>
    <rect y="${FLOOR_Y - 2}" width="1000" height="2" fill="#000" fill-opacity=".28"/>

    <!-- картины над кроватью -->
    <g>
      <rect x="702" y="80" width="96" height="112" fill="#000" fill-opacity=".14"/>
      <rect x="698" y="76" width="96" height="112" fill="#1f1d1b"/><rect x="704" y="82" width="84" height="100" fill="#f3efe7"/>
      <circle cx="746" cy="120" r="23" fill="#c9775a"/><path d="M704 182Q746 138 788 182Z" fill="#b9a98b"/>
      <rect x="816" y="96" width="58" height="78" fill="#000" fill-opacity=".14"/>
      <rect x="812" y="92" width="58" height="78" fill="#1f1d1b"/><rect x="817" y="97" width="48" height="68" fill="#f3efe7"/>
      <rect x="823" y="106" width="36" height="10" fill="#8aa08a"/><rect x="823" y="122" width="36" height="14" fill="#d7c9a9"/><rect x="823" y="142" width="36" height="14" fill="#c9775a"/>
    </g>

    <!-- окно: рама, вид во двор, подоконник -->
    <g>
      <rect x="352" y="46" width="220" height="156" fill="#f4f1ea"/>
      <rect x="361" y="55" width="202" height="138" fill="url(#rm-sky)"/>
      <path d="M361 150Q400 126 440 142T520 134T563 146V193H361Z" fill="#7d9a7a" fill-opacity=".7"/>
      <path d="M361 168Q420 150 480 164T563 160V193H361Z" fill="#5f7d5d" fill-opacity=".8"/>
      <ellipse cx="410" cy="82" rx="30" ry="9" fill="#fff" fill-opacity=".75"/><ellipse cx="520" cy="96" rx="22" ry="7" fill="#fff" fill-opacity=".6"/>
      <rect x="458" y="55" width="8" height="138" fill="#f4f1ea"/><rect x="361" y="120" width="202" height="7" fill="#f4f1ea"/>
      <rect x="352" y="46" width="220" height="156" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1.5"/>
      <rect x="344" y="202" width="236" height="9" fill="#fbf9f4"/><rect x="344" y="211" width="236" height="3" fill="#000" fill-opacity=".14"/>
    </g>
    <!-- шторы в пол и карниз -->
    ${drape(316)}${drape(552)}
    <path d="M298 32H628" stroke="#2a2623" stroke-width="4" stroke-linecap="round"/>
    <circle cx="298" cy="32" r="5.5" fill="#2a2623"/><circle cx="628" cy="32" r="5.5" fill="#2a2623"/>

    <!-- пол: доски в перспективе, контактная тень у стены, пятно света от окна -->
    <rect y="${FLOOR_Y}" width="1000" height="${500 - FLOOR_Y}" fill="${room.floor}"/>
    <path d="${planks.join("")}" stroke="#000" stroke-opacity=".2" stroke-width="1.6" fill="none"/>${seams}
    <rect y="${FLOOR_Y}" width="1000" height="${500 - FLOOR_Y}" fill="url(#rm-floor)"/>
    <path d="M392 ${FLOOR_Y}H580L720 500H462Z" fill="#fff" fill-opacity=".1"/>

    <!-- ковёр под обеденной зоной -->
    <g>
      <path d="M236 398H590L668 496H158Z" fill="#000" fill-opacity=".16"/>
      <path d="M240 394H586L662 490H164Z" fill="${mixColor(room.floor, "#d9d4c8", 0.78)}"/>
      <path d="M258 404H568L632 480H194Z" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="2"/>
      <path d="M276 414H550L602 470H224Z" fill="#000" fill-opacity=".06"/>
    </g>

    ${back}

    <!-- торшер между диваном и кроватью -->
    <g>
      <circle cx="640" cy="136" r="90" fill="url(#rm-lamp)"/>
      <ellipse cx="640" cy="338" rx="22" ry="5" fill="#000" fill-opacity=".3"/>
      <path d="M640 338V150" stroke="#2b2825" stroke-width="3.2"/>
      <path d="M610 152H670L660 106H620Z" fill="#f1e7d0"/><path d="M610 152H670L660 106H620Z" fill="none" stroke="#000" stroke-opacity=".25"/>
    </g>

    <!-- растение в углу -->
    <g transform="translate(934 342) scale(.8)">
      <ellipse cx="0" cy="2" rx="28" ry="6" fill="#000" fill-opacity=".28"/>
      ${leaves}
      <path d="M-24 -48H24L19 0H-19Z" fill="url(#rm-pot)"/>
      <rect x="-26" y="-52" width="52" height="7" rx="2" fill="#2a2724"/>
    </g>

    <!-- лампа над обеденным столом -->
    <g>
      <path d="M296 270H364L440 446H220Z" fill="url(#rm-cone)"/>
      <path d="M330 0V232" stroke="#1f1d1b" stroke-width="2"/>
      <path d="M296 268Q296 234 330 232Q364 234 364 268Z" fill="#232120"/>
      <path d="M306 262Q308 244 330 240" stroke="#fff" stroke-opacity=".18" stroke-width="3" fill="none"/>
      <ellipse cx="330" cy="268" rx="14" ry="5" fill="#ffe8a8"/>
    </g>

    ${front}
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
      <button class="btn btn--light btn--small" id="room-random">Случайный интерьер</button>
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

/* ---------- Недавно смотрели и карусели ---------- */
const RECENT_KEY = "recent";

function readRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY));
    return Array.isArray(list) ? list.map(String) : [];
  } catch {
    return [];
  }
}

function pushRecent(id) {
  try {
    const list = [String(id), ...readRecent().filter((x) => x !== String(id))].slice(0, 12);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* хранилище недоступно — просто не запоминаем */
  }
}

// Горизонтальная лента с кнопками «назад/вперёд»; возвращает функцию обновления кнопок
function initCarousel(id) {
  const track = $("#" + id);
  const btns = [...document.querySelectorAll(`[data-carousel="${id}"]`)];
  const nav = btns[0]?.parentElement;
  const step = () => Math.max(track.clientWidth * 0.8, 280);

  const update = () => {
    const max = track.scrollWidth - track.clientWidth - 2;
    if (nav) nav.hidden = max <= 0; // всё помещается — стрелки не нужны
    btns.forEach((b) => (b.disabled = Number(b.dataset.dir) < 0 ? track.scrollLeft <= 2 : track.scrollLeft >= max));
  };

  btns.forEach((b) =>
    b.addEventListener("click", () => track.scrollBy({ left: Number(b.dataset.dir) * step(), behavior: "smooth" }))
  );
  track.addEventListener("scroll", update, { passive: true });
  track.addEventListener("keydown", (e) => {
    if (e.target !== track || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    e.preventDefault();
    track.scrollBy({ left: (e.key === "ArrowRight" ? 1 : -1) * step(), behavior: "smooth" });
  });
  addEventListener("resize", update);
  update();
  return update;
}

/* ---------- Страницы ---------- */
const pages = {
  home() {
    // «Хиты продаж»: чаще всего оценённые покупателями, с номерами у тройки лидеров
    const hits = [...PRODUCTS]
      .sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0) || (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 10);
    $("#featured").innerHTML = hits.map(productCard).join("");
    $("#featured")
      .querySelectorAll(".product__media")
      .forEach((m, i) => i < 3 && m.insertAdjacentHTML("beforeend", `<span class="hit-rank">№${i + 1}</span>`));
    initCarousel("featured");

    // «Недавно смотрели»: то, что открывали на странице товара
    const updateRecent = initCarousel("recent");
    const drawRecent = () => {
      const list = readRecent()
        .map((id) => PRODUCTS.find((p) => p.id === id))
        .filter(Boolean)
        .slice(0, 8);
      $("#recent-section").hidden = list.length === 0;
      $("#recent").innerHTML = list.map(productCard).join("");
      $("#recent").scrollLeft = 0;
      initReveal();
      updateRecent();
    };
    $("#recent-clear").addEventListener("click", () => {
      try {
        localStorage.removeItem(RECENT_KEY);
      } catch {}
      drawRecent();
    });
    drawRecent();

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
      if (!box.children.length) box.innerHTML = skeletonCards(PAGE_SIZE);
      else box.classList.add("is-loading");

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
        box.classList.remove("is-loading");
        return;
      }
      if (mine !== seq) return; // пришёл устаревший ответ

      state.page = data.page;
      syncUrl();
      box.classList.remove("is-loading");
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

    pushRecent(p.id);
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
          <div class="detail__img${p.image ? " detail__img--photo" : ""}" style="--bg:${bg}">${productImage(p)}<button class="zoom-btn" id="zoom" aria-label="Увеличить изображение">${icon("zoom")}</button></div>
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
            <button class="tool tool--lg${wish.includes(p.id) ? " is-on" : ""}" data-wish="${p.id}" aria-label="В избранное" title="В избранное">${icon("heart")}</button>
            <button class="tool tool--lg${cmp.includes(p.id) ? " is-on" : ""}" data-compare="${p.id}" aria-label="Сравнить" title="Сравнить">${icon("compare")}</button>
          </div>
          <ul class="perks">
            <li>${icon("truck")} Бесплатная доставка от 30 000 ₽</li>
            <li>${icon("shield")} Гарантия ${p.specs["Гарантия"]}</li>
            <li>${icon("undo")} Возврат в течение 14 дней</li>
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

    $("#zoom").addEventListener("click", () => openLightbox(p));
    $(".detail__img").addEventListener("click", (e) => {
      if (e.target.closest("svg, img")) openLightbox(p);
    });

    initReviews(p);

    // «С этим покупают»: по одному товару из дополняющих категорий, ближайшему по цене
    const bundle = (COMPLEMENTS[p.category] || [])
      .map((cat) => PRODUCTS.filter((x) => x.category === cat).sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price))[0])
      .filter(Boolean);
    if (bundle.length) {
      $("#bundle-wrap").hidden = false;
      $("#bundle").innerHTML = bundle.map(productCard).join("");
    }

    // «Похожие»: та же категория, ближайшие по цене, не больше четырёх
    const shown = new Set([p.id, ...bundle.map((x) => x.id)]);
    const related = PRODUCTS.filter((x) => x.category === p.category && !shown.has(x.id))
      .sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price))
      .slice(0, 4);
    if (related.length) {
      $("#related-wrap").hidden = false;
      $("#related").innerHTML = related.map(productCard).join("");
    }
  },

  wishlist() {
    const items = wish.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
    const grid = $("#wish-grid");
    $("#wish-total").textContent = items.length ? `Товаров: ${items.length}` : "";
    if (!items.length) {
      grid.className = "";
      grid.innerHTML = `<div class="empty">${icon("heart")}<h2>Здесь пока пусто</h2><p>Нажимайте на сердечко у понравившихся товаров — они появятся здесь.</p><a class="btn" href="catalog.html">Перейти в каталог</a></div>`;
      return;
    }
    grid.className = "products";
    grid.innerHTML = items.map(productCard).join("");
  },

  compare() {
    const root = $("#cmp-root");
    const items = cmp.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
    if (!items.length) {
      root.innerHTML = `<div class="empty">${icon("compare")}<h2>Нечего сравнивать</h2><p>Отметьте в каталоге до ${CMP_MAX} товаров кнопкой со стрелками — и увидите их характеристики рядом.</p><a class="btn" href="catalog.html">Перейти в каталог</a></div>`;
      return;
    }
    const keys = [...new Set(items.flatMap((p) => Object.keys(p.specs)))];
    const minPrice = Math.min(...items.map((p) => p.price));
    const head = items
      .map(
        (p) => `<th scope="col" class="cmp__prod">
          <button class="cmp__del" data-compare="${p.id}" aria-label="Убрать из сравнения">${icon("close")}</button>
          <a href="product.html?id=${p.id}" class="cmp__img" style="--bg:${pairFor(p)[1]}"><span class="product__img">${productImage(p)}</span></a>
          <a href="product.html?id=${p.id}" class="cmp__name">${p.name}</a>
        </th>`
      )
      .join("");
    const row = (label, cells) => `<tr><th scope="row">${label}</th>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    const rows = [
      row("Цена", items.map((p) => `<b class="${p.price === minPrice && items.length > 1 ? "cmp__best" : ""}">${priceHTML(p)}</b>`)),
      row("Рейтинг", items.map((p) => ratingHTML(p) || "—")),
      row("Категория", items.map((p) => CATEGORIES[p.category])),
      ...keys.map((k) => {
        const vals = items.map((p) => p.specs[k] ?? "—");
        const diff = new Set(vals).size > 1;
        return `<tr${diff ? ' class="is-diff"' : ""}><th scope="row">${k}</th>${vals.map((v) => `<td>${v}</td>`).join("")}</tr>`;
      }),
      row("", items.map((p) => `<button class="btn btn--small" data-add="${p.id}">В корзину</button>`)),
    ].join("");
    const only = $("#cmp-diff")?.checked;
    root.innerHTML = `
      <label class="cmp__only"><input type="checkbox" id="cmp-diff"${only ? " checked" : ""}> Показывать только различия</label>
      <div class="cmp-wrap"><table class="cmp" style="--n:${items.length}"><thead><tr><td></td>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
    root.classList.toggle("only-diff", !!only);
    $("#cmp-diff").addEventListener("change", (e) => root.classList.toggle("only-diff", e.target.checked));
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
            <p class="thanks__emoji" aria-hidden="true">${icon("party")}</p>
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
  wishlist: ["#wish-grid"],
  compare: ["#cmp-root"],
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
    updateCounts();
    initReveal();
    return;
  }

  targets.forEach((sel, i) => {
    $(sel).innerHTML = i === 0 ? (SKELETONS[page]?.() ?? '<p class="status">Загрузка...</p>') : "";
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
  updateCounts();
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
