/* Админ-панель HomeJoy: вход, заказы, товары (с фото), отзывы. Данные — /api/admin/* */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmt = (n) => Number(n).toLocaleString("ru-RU") + " ₽";
  const when = (s) =>
    new Date(String(s).replace(" ", "T") + "Z").toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const root = $("#admin");
  const state = {
    tab: "orders",
    status: "",
    expFrom: "", // период выгрузки заказов (ГГГГ-ММ-ДД)
    expTo: "",
    products: null, // { categories, maxPhotos, items }
    search: "",
    category: "",
    editing: null, // null | "new" | id товара
  };

  /* ---------- Запросы ---------- */
  async function api(method, path, body) {
    const headers = { "X-Admin-Request": "1" };
    const opts = { method, headers, credentials: "same-origin" };
    if (body instanceof Blob) {
      headers["Content-Type"] = body.type;
      opts.body = body;
    } else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    const res = await fetch("/api/admin" + path, opts);
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== "/login") {
      showLogin();
      throw new Error("Сессия закончилась — войдите снова");
    }
    if (!res.ok) throw new Error(data.error || "Ошибка сервера");
    return data;
  }

  let toastTimer;
  function toast(text) {
    const t = $("#toast");
    t.textContent = text;
    t.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-visible"), 2600);
  }

  const fail = (err) => toast(err.message || "Что-то пошло не так");

  /* ---------- Вход ---------- */
  function showLogin() {
    root.innerHTML = `
      <main class="adm-login">
        <form class="form adm-login__form" id="login-form">
          <h1>Админ-панель</h1>
          <p>HomeJoy · вход для администратора</p>
          <label>Пароль
            <input type="password" name="password" autocomplete="current-password" required autofocus>
          </label>
          <p class="form__error" id="login-error" role="alert" hidden></p>
          <button class="btn" type="submit">Войти</button>
          <a class="adm-login__back" href="/">← На сайт</a>
        </form>
      </main>`;
    $("#login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = $("#login-error");
      err.hidden = true;
      try {
        await api("POST", "/login", { password: e.target.password.value });
        showApp();
      } catch (ex) {
        err.textContent = ex.message;
        err.hidden = false;
      }
    });
  }

  /* ---------- Каркас ---------- */
  const TABS = [
    ["orders", "Заказы"],
    ["products", "Товары"],
    ["reviews", "Отзывы"],
  ];

  async function showApp() {
    root.innerHTML = `
      <header class="adm-bar">
        <div class="container adm-bar__inner">
          <b class="adm-bar__title">HomeJoy · админка</b>
          <div class="adm-bar__btns">
            <a class="btn btn--small btn--light" href="/">На сайт</a>
            <button class="btn btn--small" id="logout">Выйти</button>
          </div>
        </div>
      </header>
      <main class="container adm">
        <div class="adm-stats" id="stats"></div>
        <div class="chips" id="tabs">${TABS.map(([k, n]) => `<button class="chip" data-tab="${k}">${n}</button>`).join("")}</div>
        <section id="tab-body"></section>
      </main>`;

    $("#logout").addEventListener("click", async () => {
      await api("POST", "/logout").catch(() => {});
      showLogin();
    });
    $("#tabs").addEventListener("click", (e) => {
      const b = e.target.closest("[data-tab]");
      if (!b) return;
      state.tab = b.dataset.tab;
      state.editing = null;
      renderTab();
    });

    try {
      await refreshStats();
      renderTab();
    } catch (err) {
      /* 401 уже показал форму входа */
    }
  }

  async function refreshStats() {
    const s = await api("GET", "/stats");
    $("#stats").innerHTML = [
      ["Новые заказы", s.newOrders, "var(--tomato)"],
      ["Выручка", fmt(s.revenue), "var(--butter)"],
      ["Товаров", s.products, "var(--mint)"],
      ["Отзывов", s.reviews, "var(--pink)"],
    ]
      .map(([label, value, bg]) => `<div class="adm-stat" style="--c:${bg}"><span>${label}</span><strong>${esc(value)}</strong></div>`)
      .join("");
  }

  function renderTab() {
    $$("#tabs .chip").forEach((c) => c.classList.toggle("is-active", c.dataset.tab === state.tab));
    const body = $("#tab-body");
    body.innerHTML = '<p class="status">Загрузка...</p>';
    const draw = { orders: drawOrders, products: drawProducts, reviews: drawReviews }[state.tab];
    draw(body).catch((err) => {
      if (!$("#login-form")) body.innerHTML = `<p class="status status--error">${esc(err.message)}</p>`;
    });
  }

  /* ---------- Заказы ---------- */
  // Скачивание CSV: через fetch, чтобы при закончившейся сессии показать ошибку, а не JSON на экране
  async function downloadCsv(kind) {
    const q = new URLSearchParams({ kind });
    if (state.status) q.set("status", state.status);
    if (state.expFrom) q.set("from", state.expFrom);
    if (state.expTo) q.set("to", state.expTo);
    const res = await fetch("/api/admin/orders.csv?" + q, { headers: { "X-Admin-Request": "1" }, credentials: "same-origin" });
    if (res.status === 401) {
      showLogin();
      throw new Error("Сессия закончилась — войдите снова");
    }
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Не удалось сформировать файл");
    const rows = Number(res.headers.get("X-Rows"));
    if (rows === 0) return toast("За выбранный период заказов нет");
    const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") || "")?.[1] || "orders.csv";
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    toast(`Скачано: ${name} (строк: ${rows})`);
  }

  async function drawOrders(body) {
    const data = await api("GET", "/orders" + (state.status ? `?status=${state.status}` : ""));
    const statuses = data.statuses;

    const chips =
      `<button class="chip${state.status === "" ? " is-active" : ""}" data-status="">Все</button>` +
      Object.entries(statuses)
        .map(([k, n]) => `<button class="chip${state.status === k ? " is-active" : ""}" data-status="${k}">${n}</button>`)
        .join("");

    const cards = data.items.length
      ? data.items
          .map((o) => {
            const options = Object.entries(statuses)
              .map(([k, n]) => `<option value="${k}"${k === o.status ? " selected" : ""}>${n}</option>`)
              .join("");
            const lines = o.lines
              .map((l) => `<li><span>${esc(l.name)} × ${l.qty}</span><b>${fmt(l.price * l.qty)}</b></li>`)
              .join("");
            const tel = String(o.phone).replace(/[^\d+]/g, "");
            const payLabel = { cash: "Наличными", card_on_delivery: "Картой при получении", card_online: "Картой онлайн" }[o.paymentMethod] || o.paymentMethod;
            const payBadge = o.paymentStatus === "paid"
              ? `<span class="adm-pay adm-pay--paid">${esc(payLabel)} · оплачено</span>`
              : o.paymentStatus === "failed"
                ? `<span class="adm-pay adm-pay--failed">${esc(payLabel)} · не оплачено</span>`
                : `<span class="adm-pay">${esc(payLabel)} · ожидает</span>${o.paymentMethod !== "card_online" ? `<button class="btn btn--small" type="button" data-mark-paid="${o.id}">Отметить оплаченным</button>` : ""}`;
            return `
              <article class="adm-card adm-order">
                <header class="adm-order__head">
                  <h3>Заказ № ${o.id}</h3>
                  <time>${when(o.createdAt)}</time>
                  ${payBadge}
                  <select class="adm-status" data-order="${o.id}" data-status="${esc(o.status)}" aria-label="Статус заказа ${o.id}">${options}</select>
                </header>
                <div class="adm-order__body">
                  <div class="adm-order__who">
                    <p><b>${esc(o.name)}</b></p>
                    <p><a href="tel:${esc(tel)}">${esc(o.phone)}</a></p>
                    ${o.email ? `<p><a href="mailto:${esc(o.email)}">${esc(o.email)}</a></p>` : ""}
                    <p>${o.delivery === "courier" ? "Курьер: " + esc(o.address) : "Самовывоз"}</p>
                    ${o.comment ? `<p class="adm-order__comment">«${esc(o.comment)}»</p>` : ""}
                  </div>
                  <div>
                    <ul class="adm-order__lines">${lines}</ul>
                    <dl class="adm-order__sums">
                      ${o.discount ? `<div><dt>Скидка ${esc(o.promo)}</dt><dd>−${fmt(o.discount)}</dd></div>` : ""}
                      <div><dt>Доставка</dt><dd>${o.deliveryCost ? fmt(o.deliveryCost) : "Бесплатно"}</dd></div>
                      <div class="is-total"><dt>Итого</dt><dd>${fmt(o.total)}</dd></div>
                    </dl>
                  </div>
                </div>
              </article>`;
          })
          .join("")
      : '<p class="status">Заказов пока нет</p>';

    const exportCard = `
      <div class="adm-card adm-export" id="export">
        <h3>Выгрузка для бухгалтерии</h3>
        <p class="adm-hint">Файл CSV открывается в Excel. Учитывается выбранный ниже статус: <b>${state.status ? esc(statuses[state.status]) : "все заказы"}</b>.</p>
        <div class="adm-export__row">
          <label>С <input type="date" id="exp-from" value="${esc(state.expFrom)}"></label>
          <label>По <input type="date" id="exp-to" value="${esc(state.expTo)}"></label>
          <button class="chip" type="button" data-range="month">Этот месяц</button>
          <button class="chip" type="button" data-range="prev">Прошлый месяц</button>
          <button class="chip" type="button" data-range="all">За всё время</button>
        </div>
        <div class="adm-export__row">
          <button class="btn btn--small" type="button" data-export="orders">⬇ Заказы — одна строка на заказ</button>
          <button class="btn btn--small btn--light" type="button" data-export="items">⬇ Позиции — одна строка на товар</button>
        </div>
      </div>`;

    body.innerHTML = `${exportCard}<div class="chips adm-sub" id="status-chips">${chips}</div><div class="adm-list">${cards}</div>`;

    const exp = $("#export", body);
    const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const setRange = (from, to) => {
      state.expFrom = $("#exp-from", exp).value = from;
      state.expTo = $("#exp-to", exp).value = to;
    };
    exp.addEventListener("change", () => {
      state.expFrom = $("#exp-from", exp).value;
      state.expTo = $("#exp-to", exp).value;
    });
    exp.addEventListener("click", async (e) => {
      const r = e.target.closest("[data-range]");
      const x = e.target.closest("[data-export]");
      const now = new Date();
      if (r) {
        const kind = r.dataset.range;
        if (kind === "all") setRange("", "");
        if (kind === "month") setRange(ymd(new Date(now.getFullYear(), now.getMonth(), 1)), ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
        if (kind === "prev") setRange(ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)), ymd(new Date(now.getFullYear(), now.getMonth(), 0)));
      } else if (x) {
        x.disabled = true;
        try {
          await downloadCsv(x.dataset.export);
        } catch (err) {
          fail(err);
        } finally {
          x.disabled = false;
        }
      }
    });

    $("#status-chips").addEventListener("click", (e) => {
      const b = e.target.closest("[data-status]");
      if (!b) return;
      state.status = b.dataset.status;
      renderTab();
    });
    $(".adm-list", body).addEventListener("change", async (e) => {
      const sel = e.target.closest(".adm-status");
      if (!sel) return;
      try {
        await api("PATCH", `/orders/${sel.dataset.order}`, { status: sel.value });
        sel.dataset.status = sel.value;
        toast(`Заказ № ${sel.dataset.order}: ${statuses[sel.value]}`);
        refreshStats();
      } catch (err) {
        fail(err);
        renderTab();
      }
    });
    $(".adm-list", body).addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-mark-paid]");
      if (!btn) return;
      btn.disabled = true;
      try {
        await api("PATCH", `/orders/${btn.dataset.markPaid}/payment`, {});
        toast(`Заказ № ${btn.dataset.markPaid}: оплата отмечена`);
        renderTab();
      } catch (err) {
        fail(err);
        btn.disabled = false;
      }
    });
  }

  /* ---------- Товары ---------- */
  const SPEC_KEYS = ["Размер", "Материал", "Цвет", "Гарантия"];
  const slotOf = (url) => {
    const m = /\/images\/[^/]*?(?:-(\d+))?\.\w+$/.exec(url);
    return m ? Number(m[1] || 1) : null;
  };

  async function loadProducts() {
    state.products = await api("GET", "/products");
  }

  async function drawProducts(body) {
    await loadProducts();
    if (state.editing) return drawProductForm(body);

    const { categories, items } = state.products;
    const catName = Object.fromEntries(categories.map((c) => [c.id, c.name]));

    body.innerHTML = `
      <div class="adm-toolbar">
        <input type="search" id="p-search" placeholder="Поиск по названию или id…" aria-label="Поиск" value="${esc(state.search)}">
        <select id="p-cat" aria-label="Категория">
          <option value="">Все категории</option>
          ${categories.map((c) => `<option value="${c.id}"${state.category === c.id ? " selected" : ""}>${esc(c.name)}</option>`).join("")}
        </select>
        <button class="btn btn--small" id="p-new">＋ Добавить товар</button>
      </div>
      <div class="adm-table" id="p-table"></div>`;

    const table = $("#p-table");
    function drawRows() {
      const q = state.search.trim().toLowerCase();
      const rows = items.filter(
        (p) => (!state.category || p.category === state.category) && (!q || p.name.toLowerCase().includes(q) || p.id === q)
      );
      table.innerHTML = rows.length
        ? `<div class="adm-row adm-row--head"><span>ID</span><span>Название</span><span>Категория</span><span>Цена</span><span>Рейтинг</span><span></span></div>` +
          rows
            .map(
              (p) => `
          <div class="adm-row">
            <span class="adm-id">#${esc(p.id)}</span>
            <span class="adm-name">${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : ""}<b>${esc(p.name)}</b>${p.badge ? ` <em>${esc(p.badge)}</em>` : ""}</span>
            <span>${esc(catName[p.category] ?? p.category)}</span>
            <span>${fmt(p.price)}${p.oldPrice ? ` <s>${fmt(p.oldPrice)}</s>` : ""}</span>
            <span>${p.rating ? "★ " + String(p.rating).replace(".", ",") + " (" + p.reviews + ")" : "—"}</span>
            <span class="adm-actions">
              <button class="btn btn--small btn--outline" data-edit="${esc(p.id)}">Изменить</button>
              <button class="btn btn--small adm-danger" data-del="${esc(p.id)}" aria-label="Удалить ${esc(p.name)}">Удалить</button>
            </span>
          </div>`
            )
            .join("")
        : '<p class="status">Ничего не найдено</p>';
    }
    drawRows();

    $("#p-search").addEventListener("input", (e) => ((state.search = e.target.value), drawRows()));
    $("#p-cat").addEventListener("change", (e) => ((state.category = e.target.value), drawRows()));
    $("#p-new").addEventListener("click", () => ((state.editing = "new"), renderTab()));
    table.addEventListener("click", async (e) => {
      const edit = e.target.closest("[data-edit]");
      const del = e.target.closest("[data-del]");
      if (edit) {
        state.editing = edit.dataset.edit;
        renderTab();
      } else if (del) {
        const p = items.find((x) => x.id === del.dataset.del);
        if (!confirm(`Удалить «${p.name}»? Отзывы и фото товара тоже будут удалены, это нельзя отменить.`)) return;
        try {
          await api("DELETE", `/products/${p.id}`);
          toast("Товар удалён");
          refreshStats();
          renderTab();
        } catch (err) {
          fail(err);
        }
      }
    });
  }

  function drawProductForm(body) {
    const isNew = state.editing === "new";
    const { categories, items, maxPhotos } = state.products;
    const p = isNew ? { specs: {} } : items.find((x) => x.id === state.editing);
    if (!p) {
      state.editing = null;
      return drawProducts(body);
    }

    const photos = [];
    for (let n = 1; n <= maxPhotos; n++) {
      const url = (p.images ?? []).find((u) => slotOf(u) === n);
      photos.push(`
        <div class="adm-photo" data-slot="${n}">
          <div class="adm-photo__img">${url ? `<img src="${esc(url)}?v=${Date.now()}" alt="Фото ${n}">` : "<span>нет фото</span>"}</div>
          <p>${n === 1 ? "Основное" : "Фото " + n}</p>
          <div class="adm-photo__btns">
            <label class="btn btn--small btn--outline">${url ? "Заменить" : "Загрузить"}
              <input type="file" accept="image/jpeg,image/png,image/webp" data-upload="${n}" hidden>
            </label>
            ${url ? `<button type="button" class="btn btn--small adm-danger" data-rmphoto="${n}">✕</button>` : ""}
          </div>
        </div>`);
    }

    body.innerHTML = `
      <div class="adm-formhead">
        <button class="btn btn--small btn--outline" id="back">← К списку</button>
        <h2>${isNew ? "Новый товар" : `Товар #${esc(p.id)}`}</h2>
      </div>
      <form class="form adm-form" id="product-form" novalidate>
        <div class="adm-form__grid">
          <label class="adm-wide">Название
            <input type="text" name="name" maxlength="120" value="${esc(p.name)}" required>
          </label>
          <label>Категория
            <select name="category" required>
              <option value="">Выберите…</option>
              ${categories.map((c) => `<option value="${c.id}"${p.category === c.id ? " selected" : ""}>${esc(c.name)}</option>`).join("")}
            </select>
          </label>
          <label>Бейдж (необязательно)
            <input type="text" name="badge" maxlength="20" list="badges" value="${esc(p.badge)}" placeholder="Хит, Новинка, −10%">
            <datalist id="badges"><option value="Хит"><option value="Новинка"></datalist>
          </label>
          <label>Цена, ₽
            <input type="number" name="price" min="1" step="1" inputmode="numeric" value="${esc(p.price)}" required>
          </label>
          <label>Старая цена, ₽ (необязательно)
            <input type="number" name="oldPrice" min="1" step="1" inputmode="numeric" value="${esc(p.oldPrice)}">
          </label>
          <label class="adm-wide">Описание
            <textarea name="description" rows="4" maxlength="1000" required>${esc(p.description)}</textarea>
          </label>
          ${SPEC_KEYS.map(
            (k) => `<label>${k}<input type="text" name="spec-${k}" maxlength="100" value="${esc(p.specs?.[k])}" required></label>`
          ).join("")}
        </div>
        <p class="form__error" id="product-error" role="alert" hidden></p>
        <div class="adm-formbtns">
          <button class="btn" type="submit">${isNew ? "Создать товар" : "Сохранить"}</button>
          ${isNew ? "" : `<a class="btn btn--outline" href="product.html?id=${encodeURIComponent(p.id)}" target="_blank" rel="noopener">Открыть на сайте ↗</a>`}
        </div>
      </form>

      ${
        isNew
          ? '<p class="adm-hint">Фото можно загрузить после создания товара. Пока фото нет, на сайте показывается рисунок по категории.</p>'
          : `<h3 class="adm-h3">Фото</h3>
             <p class="adm-hint">JPG, PNG или WebP до 6 МБ, лучше 4:3 на однотонном фоне. Если фото нет, на сайте показывается рисунок.</p>
             <div class="adm-photos" id="photos">${photos.join("")}</div>`
      }`;

    $("#back").addEventListener("click", () => ((state.editing = null), renderTab()));

    const errBox = $("#product-error");
    $("#product-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      errBox.hidden = true;
      const f = e.target;
      const payload = {
        name: f.name.value,
        category: f.category.value,
        badge: f.badge.value,
        price: f.price.value === "" ? null : Number(f.price.value),
        oldPrice: f.oldPrice.value === "" ? null : Number(f.oldPrice.value),
        description: f.description.value,
        specs: Object.fromEntries(SPEC_KEYS.map((k) => [k, f.elements[`spec-${k}`].value])),
      };
      try {
        const saved = isNew ? await api("POST", "/products", payload) : await api("PUT", `/products/${p.id}`, payload);
        toast(isNew ? "Товар создан. Теперь можно загрузить фото." : "Сохранено");
        state.editing = isNew ? saved.id : null;
        refreshStats();
        renderTab();
      } catch (err) {
        errBox.textContent = err.message;
        errBox.hidden = false;
      }
    });

    const photosBox = $("#photos");
    if (photosBox) {
      photosBox.addEventListener("change", async (e) => {
        const input = e.target.closest("[data-upload]");
        const file = input?.files?.[0];
        if (!file) return;
        if (file.size > 6 * 1024 * 1024) return toast("Файл больше 6 МБ");
        try {
          await api("POST", `/products/${p.id}/images/${input.dataset.upload}`, file);
          toast("Фото загружено");
          renderTab();
        } catch (err) {
          fail(err);
        }
      });
      photosBox.addEventListener("click", async (e) => {
        const b = e.target.closest("[data-rmphoto]");
        if (!b) return;
        try {
          await api("DELETE", `/products/${p.id}/images/${b.dataset.rmphoto}`);
          toast("Фото удалено");
          renderTab();
        } catch (err) {
          fail(err);
        }
      });
    }
  }

  /* ---------- Отзывы ---------- */
  async function drawReviews(body) {
    const { items } = await api("GET", "/reviews");
    body.innerHTML = items.length
      ? `<div class="adm-list">${items
          .map(
            (r) => `
        <article class="adm-card adm-review">
          <header>
            <b>${esc(r.name)}</b>
            <span class="adm-stars" aria-label="Оценка ${r.rating} из 5">${"★".repeat(r.rating)}<i>${"★".repeat(5 - r.rating)}</i></span>
            <time>${when(r.createdAt)}</time>
          </header>
          <p class="adm-review__prod">${r.productName ? esc(r.productName) : "Товар удалён"}</p>
          <p>${esc(r.text)}</p>
          <button class="btn btn--small adm-danger" data-delreview="${r.id}">Удалить отзыв</button>
        </article>`
          )
          .join("")}</div>`
      : '<p class="status">Отзывов пока нет</p>';

    $(".adm-list", body)?.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-delreview]");
      if (!b || !confirm("Удалить этот отзыв? Рейтинг товара пересчитается.")) return;
      try {
        await api("DELETE", `/reviews/${b.dataset.delreview}`);
        toast("Отзыв удалён");
        refreshStats();
        renderTab();
      } catch (err) {
        fail(err);
      }
    });
  }

  /* ---------- Старт: если сессия есть — сразу панель ---------- */
  api("GET", "/me")
    .then(showApp)
    .catch(() => {
      if (!$("#login-form")) showLogin();
    });
})();
