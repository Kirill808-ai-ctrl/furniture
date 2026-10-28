/* Реалистичные изображения товаров: SVG с градиентами, тенями и фактурой дерева и ткани.
   Если для товара есть настоящее фото (images/<id>.jpg), сайт покажет его — см. productImage() в script.js.
   Используются глобальные shade(), furnitureSVG() и pairFor() из script.js (вызываются уже после загрузки). */

const rr = (x, y, w, h, r = 0) =>
  `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;

const poly = (...pts) => "M" + pts.map(([x, y]) => `${x} ${y}`).join("L") + "Z";

/* Каждая функция рисует один товар в системе координат 400×300 (пол на y≈268).
   k — набор помощников: grad(), path(), lite(), dark(), shadow(), rr(), poly(). */
const DRAWERS = {
  // Диван «Комфорт» — серая рогожка, деревянные ножки
  1: (k, o = {}) => {
    const base = o.base ?? "#8b929c";
    const leg = k.grad(...(o.leg ?? ["#b98a56", "#7a4f2a"]), "h");
    const armL = k.grad(shade(base, -0.22), shade(base, 0.12), "h");
    const armR = k.grad(shade(base, 0.12), shade(base, -0.22), "h");
    return (
      k.shadow(200, 165) +
      [64, 104, 286, 326].map((x) => `<path d="${rr(x, 238, 10, 30, 3)}" fill="${leg}"/>`).join("") +
      k.path(rr(66, 82, 268, 104, 28), k.grad(shade(base, 0.1), shade(base, -0.25)), "fab") +
      k.path(rr(84, 90, 116, 86, 20), k.grad(shade(base, 0.2), shade(base, -0.08)), "fab") +
      k.path(rr(200, 90, 116, 86, 20), k.grad(shade(base, 0.2), shade(base, -0.08)), "fab") +
      k.lite(rr(92, 94, 100, 10, 5), 0.25) +
      k.lite(rr(208, 94, 100, 10, 5), 0.25) +
      k.path(rr(58, 198, 284, 42, 12), k.grad(shade(base, -0.05), shade(base, -0.35)), "fab") +
      k.path(rr(92, 168, 108, 48, 14), k.grad(shade(base, 0.25), shade(base, -0.02)), "fab") +
      k.path(rr(200, 168, 108, 48, 14), k.grad(shade(base, 0.25), shade(base, -0.02)), "fab") +
      k.lite(rr(100, 172, 92, 9, 4), 0.3) +
      k.lite(rr(208, 172, 92, 9, 4), 0.3) +
      `<path d="M200 172V214" stroke="#000" stroke-opacity=".28" stroke-width="1.6"/>` +
      k.path(rr(44, 126, 50, 118, 24), armL, "fab") +
      k.path(rr(306, 126, 50, 118, 24), armR, "fab") +
      k.lite(rr(52, 130, 20, 40, 10), 0.18) +
      `<g transform="rotate(-12 118 148)">` +
      k.path(rr(94, 122, 58, 56, 14), k.grad(...(o.pillow ?? ["#f0be4f", "#c98b1f"])), "fab") +
      k.lite(rr(98, 126, 28, 8, 4), 0.35) +
      `</g>`
    );
  },

  // Диван угловой «Уют» — бежевый велюр, золотистые ножки
  2: (k, o = {}) => {
    const base = o.base ?? "#d8c2a0";
    const leg = k.grad(...(o.leg ?? ["#f0d98a", "#a98228"]), "h");
    const sheen = (c1, c2) => k.grad(shade(base, c1), shade(base, c2), "d");
    return (
      k.shadow(200, 175) +
      [48, 88, 306, 346].map((x) => `<path d="${rr(x, 244, 8, 24, 2)}" fill="${leg}"/>`).join("") +
      k.path(rr(32, 88, 336, 96, 30), sheen(0.25, -0.2), "fab") +
      k.path(rr(20, 128, 46, 116, 22), k.grad(shade(base, -0.2), shade(base, 0.15), "h"), "fab") +
      k.path(rr(346, 150, 36, 94, 18), k.grad(shade(base, 0.15), shade(base, -0.25), "h"), "fab") +
      k.path(rr(44, 200, 310, 44, 12), k.grad(shade(base, -0.08), shade(base, -0.4)), "fab") +
      k.path(rr(64, 170, 96, 48, 16), sheen(0.3, -0.05), "fab") +
      k.path(rr(160, 170, 96, 48, 16), sheen(0.3, -0.05), "fab") +
      k.path(rr(256, 182, 100, 62, 18), sheen(0.32, -0.02), "fab") +
      k.lite(poly([270, 186], [344, 186], [352, 196], [262, 196]), 0.3) +
      `<path d="M160 174V216M256 186V240" stroke="#000" stroke-opacity=".22" stroke-width="1.5"/>` +
      k.path(rr(76, 130, 76, 36, 18), k.grad(...(o.pillow1 ?? ["#d98a55", "#a85a2a"])), "fab") +
      k.lite(rr(84, 134, 56, 7, 3), 0.35) +
      `<g transform="rotate(10 300 148)">` +
      k.path(rr(272, 120, 56, 56, 14), k.grad(...(o.pillow2 ?? ["#4f8f8a", "#2d5e5b"])), "fab") +
      k.lite(rr(278, 124, 28, 8, 4), 0.3) +
      `</g>`
    );
  },

  // Кровать «Сон» — дуб и мягкое изголовье
  3: (k, o = {}) => {
    const oak = k.grad(...(o.oak ?? ["#d6a468", "#a8733a"]), "h");
    const oakV = k.grad(...(o.oak ?? ["#d6a468", "#a8733a"]));
    const buttons = [88, 128, 168, 208, 248, 288, 322]
      .flatMap((x) => [96, 126, 156].map((y) => `<circle cx="${x}" cy="${y}" r="3" fill="#4a3d33" fill-opacity=".55"/>`))
      .join("");
    return (
      k.shadow(200, 175) +
      [54, 334].map((x) => `<path d="${rr(x, 240, 12, 28, 3)}" fill="${oak}"/>`).join("") +
      k.path(rr(50, 58, 300, 134, 14), oakV, "woodv") +
      k.path(rr(62, 70, 276, 110, 10), k.grad(...(o.head ?? ["#9a8977", "#76665a"])), "fab") +
      buttons +
      k.lite(rr(66, 74, 268, 12, 6), 0.18) +
      k.path(rr(50, 168, 300, 50, 14), k.grad("#f6f0e6", "#ddd2c0")) +
      k.path(rr(80, 138, 96, 48, 20), k.grad("#ffffff", "#ddd3c3")) +
      k.path(rr(224, 138, 96, 48, 20), k.grad("#ffffff", "#ddd3c3")) +
      k.path(rr(162, 150, 76, 38, 16), k.grad(...(o.pil ?? ["#d2bea4", "#a98f6e"])), "fab") +
      k.path(rr(44, 186, 312, 56, 12), k.grad("#fbf6ee", "#e4dac9")) +
      k.dark(rr(44, 200, 312, 3, 1), 0.07) +
      k.path(rr(44, 214, 312, 30, 8), k.grad(...(o.throw ?? ["#b5c5b0", "#8ea58a"])), "fab") +
      [60, 100, 140, 180, 220, 260, 300]
        .map((x) => `<path d="${rr(x, 216, 14, 26, 0)}" fill="#fff" fill-opacity=".14"/>`)
        .join("") +
      k.path(rr(40, 238, 320, 26, 6), oakV, "wood") +
      k.lite(rr(44, 241, 312, 4, 2), 0.25)
    );
  },

  // Кровать детская «Лесная» — сосна, ящики для игрушек
  4: (k, o = {}) => {
    const pine = k.grad(...(o.wood ?? ["#ecc995", "#cf9f64"]));
    const pineH = k.grad(...(o.wood ?? ["#ecc995", "#cf9f64"]), "h");
    const star = (x, y, s = 1) =>
      `<path transform="translate(${x} ${y}) scale(${s})" d="M0-8L2.4-2.5L8-2.2L3.6 1.6L5 7.5L0 4.3L-5 7.5L-3.6 1.6L-8-2.2L-2.4-2.5Z" fill="#fff" fill-opacity=".55"/>`;
    const slats = [86, 108, 130, 152, 174, 196, 218, 240, 262, 284, 306]
      .map((x) => `<path d="M${x} 112V188" stroke="#7a4f2a" stroke-opacity=".28" stroke-width="1.6"/>`)
      .join("");
    return (
      k.shadow(200, 165) +
      k.path(rr(64, 96, 272, 100, 14), pine, "woodv") +
      slats +
      k.path(rr(58, 88, 284, 16, 8), pineH, "wood") +
      k.path(rr(60, 172, 280, 48, 14), k.grad("#ffffff", "#e6ddd0")) +
      k.path(rr(92, 146, 84, 40, 18), k.grad("#fffaf0", "#e8dfcf")) +
      k.path(rr(54, 188, 292, 50, 14), k.grad(...(o.blanket ?? ["#9fd3c7", "#62ad9c"])), "fab") +
      star(110, 212, 1.1) +
      star(170, 205, 0.8) +
      star(230, 214, 1) +
      star(290, 206, 0.9) +
      `<path d="M58 202H342" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-dasharray="6 5"/>` +
      k.path(rr(52, 232, 296, 34, 6), pineH, "wood") +
      k.path(rr(62, 238, 130, 22, 4), k.grad(...(o.drawer ?? ["#f3d6a8", "#d9ac72"])), "woodv") +
      k.path(rr(208, 238, 130, 22, 4), k.grad(...(o.drawer ?? ["#f3d6a8", "#d9ac72"])), "woodv") +
      `<circle cx="127" cy="249" r="4" fill="#d9573a"/><circle cx="273" cy="249" r="4" fill="#3a72d9"/>` +
      k.lite(rr(56, 235, 288, 3, 1), 0.3)
    );
  },

  // Стол обеденный «Семейный» — шпон ореха
  5: (k, o = {}) => {
    const wood = k.grad(...(o.wood ?? ["#b57a45", "#7b4a2a"]));
    const edge = k.grad(...(o.edge ?? ["#6a3f22", "#4a2914"]));
    const legs = k.grad(...(o.legs ?? ["#8a5530", "#4f2c16"]), "h");
    return (
      k.shadow(200, 180) +
      `<path d="${rr(96, 198, 10, 50, 2)}" fill="${k.grad(...(o.apron ?? ["#6a3f22", "#3d2210"]))}"/>` +
      `<path d="${rr(294, 198, 10, 50, 2)}" fill="${k.grad(...(o.apron ?? ["#6a3f22", "#3d2210"]))}"/>` +
      k.path(rr(58, 206, 284, 16, 2), edge, "wood") +
      `<path d="${rr(44, 208, 18, 60, 4)}" fill="${legs}"/>` +
      `<path d="${rr(338, 208, 18, 60, 4)}" fill="${legs}"/>` +
      k.path(poly([86, 140], [314, 140], [374, 198], [26, 198]), wood, "wood") +
      k.lite(poly([86, 140], [190, 140], [150, 198], [26, 198]), 0.1) +
      k.path(rr(26, 198, 348, 12, 3), edge, "wood") +
      k.lite(rr(30, 200, 340, 3, 1), 0.25) +
      `<ellipse cx="132" cy="172" rx="30" ry="8" fill="#000" fill-opacity=".18"/>` +
      `<ellipse cx="132" cy="169" rx="28" ry="7.5" fill="#fbfaf7"/><ellipse cx="132" cy="168.5" rx="18" ry="4.5" fill="#e9e5dc"/>` +
      `<ellipse cx="268" cy="172" rx="30" ry="8" fill="#000" fill-opacity=".18"/>` +
      `<ellipse cx="268" cy="169" rx="28" ry="7.5" fill="#fbfaf7"/><ellipse cx="268" cy="168.5" rx="18" ry="4.5" fill="#e9e5dc"/>` +
      `<ellipse cx="200" cy="168" rx="12" ry="4" fill="#000" fill-opacity=".2"/>` +
      k.path(rr(193, 128, 14, 38, 6), k.grad("#8fd0c8", "#4f9a92")) +
      `<path d="M200 130C190 112 178 108 172 100C186 100 196 108 200 120C204 108 214 100 228 100C222 108 210 112 200 130Z" fill="#3d8a4f"/>` +
      `<path d="M200 130C200 110 202 98 210 86C214 100 208 114 200 130Z" fill="#58a868"/>`
    );
  },

  // Стол письменный «Офис» — белый и дуб, монитор
  6: (k, o = {}) => {
    const oak = k.grad(...(o.top ?? ["#e0b57c", "#b98a52"]));
    const oakEdge = k.grad(...(o.edge ?? ["#b98a52", "#8f6736"]));
    const white = k.grad(...(o.body ?? ["#ffffff", "#e3dfd6"]));
    return (
      k.shadow(200, 180) +
      `<path d="${rr(334, 198, 10, 70, 2)}" fill="${k.grad(...(o.legA ?? ["#f1eee7", "#cfcac0"]), "h")}"/>` +
      `<path d="${rr(284, 198, 10, 70, 2)}" fill="${k.grad(...(o.legB ?? ["#e4e0d6", "#bdb8ac"]), "h")}"/>` +
      k.path(rr(44, 200, 102, 68, 3), white) +
      [208, 230, 252]
        .map(
          (y, i) =>
            `<path d="${rr(50, y, 90, i === 2 ? 12 : 18, 2)}" fill="${k.grad(...(o.face ?? ["#fbfaf6", "#e6e2d8"]))}" stroke="#000" stroke-opacity=".12"/>` +
            `<path d="${rr(82, y + (i === 2 ? 4 : 7), 26, 3, 1.5)}" fill="${oakEdge}"/>`
        )
        .join("") +
      k.path(poly([78, 144], [322, 144], [372, 192], [28, 192]), oak, "wood") +
      k.lite(poly([78, 144], [170, 144], [130, 192], [28, 192]), 0.12) +
      k.path(rr(28, 192, 344, 10, 3), oakEdge, "wood") +
      `<path d="${rr(222, 164, 10, 16, 2)}" fill="#2b2d33"/>` +
      `<path d="${poly([200, 172], [254, 172], [248, 164], [206, 164])}" fill="#3a3d45"/>` +
      `<path d="${rr(176, 96, 102, 68, 5)}" fill="#1c1e23"/>` +
      `<path d="${rr(181, 101, 92, 56, 2)}" fill="${k.grad("#7db5ee", "#2d4f8f", "d")}"/>` +
      k.lite(poly([181, 101], [222, 101], [196, 157], [181, 157]), 0.18) +
      `<path d="${rr(96, 154, 54, 8, 1)}" fill="#c4553a"/><path d="${rr(100, 146, 48, 8, 1)}" fill="#2f6f9a"/><path d="${rr(98, 138, 50, 8, 1)}" fill="#e3b341"/>`
    );
  },

  // Стул «Классик» — бук и мягкая обивка
  7: (k, o = {}) => {
    const wood = k.grad(...(o.wood ?? ["#cf9a5f", "#9b6a38"]), "h");
    const woodV = k.grad(...(o.woodV ?? ["#d6a468", "#a26f3b"]));
    const fab = o.fab ?? "#d9c7a8";
    return (
      k.shadow(200, 110) +
      `<path d="${rr(158, 206, 9, 50, 3)}" fill="${k.grad(...(o.back ?? ["#8c5f33", "#5f3d1f"]), "h")}"/>` +
      `<path d="${rr(233, 206, 9, 50, 3)}" fill="${k.grad(...(o.back ?? ["#8c5f33", "#5f3d1f"]), "h")}"/>` +
      `<path d="${rr(140, 36, 12, 160, 5)}" fill="${wood}"/>` +
      `<path d="${rr(248, 36, 12, 160, 5)}" fill="${wood}"/>` +
      k.path("M132 46Q200 26 268 46V68Q200 50 132 68Z", woodV, "wood") +
      k.path(rr(156, 72, 88, 66, 12), k.grad(shade(fab, 0.15), shade(fab, -0.12)), "fab") +
      k.lite(rr(162, 76, 76, 8, 4), 0.3) +
      `<path d="${rr(152, 136, 96, 8, 3)}" fill="${woodV}"/>` +
      k.path(poly([140, 158], [260, 158], [274, 178], [126, 178]), k.grad(shade(fab, 0.25), shade(fab, 0.02)), "fab") +
      k.path(rr(126, 178, 148, 22, 9), k.grad(shade(fab, 0.02), shade(fab, -0.3)), "fab") +
      k.path(rr(136, 200, 128, 12, 3), woodV, "wood") +
      `<path d="${rr(134, 208, 15, 60, 4)}" fill="${wood}"/>` +
      `<path d="${rr(251, 208, 15, 60, 4)}" fill="${wood}"/>` +
      k.lite(rr(137, 212, 4, 44, 2), 0.25) +
      k.lite(rr(254, 212, 4, 44, 2), 0.25)
    );
  },

  // Кресло «Релакс» — зелёный велюр
  8: (k, o = {}) => {
    const base = o.base ?? "#1f6b50";
    const leg = k.grad(...(o.leg ?? ["#b98a56", "#6f4524"]), "h");
    const sheen = (a, b) => k.grad(shade(base, a), shade(base, b), "d");
    const tufts = [
      [150, 104], [200, 98], [250, 104],
      [150, 142], [200, 136], [250, 142],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="#000" fill-opacity=".4"/>`)
      .join("");
    return (
      k.shadow(200, 150) +
      `<path d="${rr(128, 238, 8, 30, 3)}" fill="${leg}"/><path d="${rr(264, 238, 8, 30, 3)}" fill="${leg}"/>` +
      `<path d="${rr(90, 236, 10, 32, 3)}" fill="${leg}"/><path d="${rr(300, 236, 10, 32, 3)}" fill="${leg}"/>` +
      k.path(rr(96, 40, 208, 176, 58), sheen(0.22, -0.28), "fab") +
      k.path(rr(118, 62, 164, 124, 42), sheen(0.32, -0.08), "fab") +
      tufts +
      `<path d="M150 104L200 98L250 104M150 142L200 136L250 142M150 104L150 142M200 98L200 136M250 104L250 142" stroke="#000" stroke-opacity=".18" stroke-width="1.4" fill="none"/>` +
      k.lite(rr(130, 68, 100, 10, 5), 0.2) +
      k.path(rr(104, 196, 192, 44, 14), k.grad(shade(base, -0.05), shade(base, -0.4)), "fab") +
      k.path(rr(64, 118, 58, 124, 26), k.grad(shade(base, -0.3), shade(base, 0.18), "h"), "fab") +
      k.path(rr(278, 118, 58, 124, 26), k.grad(shade(base, 0.18), shade(base, -0.3), "h"), "fab") +
      k.lite(rr(72, 124, 18, 44, 9), 0.18) +
      k.path(rr(120, 174, 160, 48, 18), sheen(0.3, -0.05), "fab") +
      k.lite(rr(130, 178, 140, 9, 4), 0.28) +
      `<path d="M200 178V220" stroke="#000" stroke-opacity=".22" stroke-width="1.5"/>`
    );
  },

  // Шкаф-купе «Простор» — дуб сонома, зеркальная дверь
  9: (k, o = {}) => {
    const oak = k.grad(...(o.oak ?? ["#d2ad7e", "#a98259"]));
    const alu = k.grad("#cfd4d8", "#8e959b");
    return (
      k.shadow(200, 150) +
      k.path(rr(78, 250, 244, 12, 2), k.grad("#8a6a48", "#5e4630"), "wood") +
      k.path(rr(70, 28, 260, 224, 4), oak, "woodv") +
      `<path d="${rr(70, 28, 260, 8, 2)}" fill="${alu}"/><path d="${rr(70, 242, 260, 8, 2)}" fill="${alu}"/>` +
      k.path(rr(76, 40, 128, 200, 2), k.grad(...(o.door ?? ["#dab98d", "#b38b5f"]), "h"), "woodv") +
      [100, 130, 160]
        .map((x) => `<path d="M${x} 44V236" stroke="#6a4a2a" stroke-opacity=".22" stroke-width="2"/>`)
        .join("") +
      k.lite(rr(78, 42, 8, 196, 2), 0.18) +
      `<path d="${rr(196, 40, 128, 200, 2)}" fill="${k.grad("#e6eef3", "#9fb4c1", "d")}" stroke="${alu}" stroke-width="5"/>` +
      k.lite(poly([226, 44], [262, 44], [214, 236], [198, 236]), 0.4) +
      k.lite(poly([280, 44], [296, 44], [262, 236], [250, 236]), 0.25) +
      `<path d="M200 150Q250 120 320 90" stroke="#fff" stroke-opacity=".25" stroke-width="2" fill="none"/>` +
      k.dark(rr(196, 40, 7, 200, 1), 0.28) +
      `<path d="${rr(186, 118, 4, 56, 2)}" fill="#3b3b3b"/><path d="${rr(210, 118, 4, 56, 2)}" fill="#5a6a74"/>`
    );
  },

  // Шкаф распашной «Классика» — тёмный орех, латунные ручки
  10: (k, o = {}) => {
    const walnut = k.grad(...(o.walnut ?? ["#7a4f2e", "#4a2b17"]));
    const brass = k.grad(...(o.brass ?? ["#f0d27a", "#a67c2b"]), "h");
    const door = (x) =>
      k.path(rr(x, 50, 80, 196, 2), k.grad(...(o.door ?? ["#6f4628", "#4d2e1a"])), "woodv") +
      `<path d="${rr(x + 9, 60, 62, 108, 2)}" fill="${k.grad(...(o.inset ?? ["#573419", "#6b4325"]))}" stroke="#000" stroke-opacity=".4" stroke-width="1.6"/>` +
      k.lite(rr(x + 9, 60, 62, 3, 1), 0.22) +
      `<path d="${rr(x + 9, 178, 62, 58, 2)}" fill="${k.grad(...(o.inset ?? ["#573419", "#6b4325"]))}" stroke="#000" stroke-opacity=".4" stroke-width="1.6"/>` +
      k.lite(rr(x + 9, 178, 62, 3, 1), 0.22);
    return (
      k.shadow(200, 155) +
      k.path(rr(70, 250, 260, 14, 2), k.grad(...(o.plinth ?? ["#4a2b17", "#2f1a0d"])), "wood") +
      k.path(rr(70, 40, 260, 212, 3), walnut, "woodv") +
      door(76) +
      door(160) +
      door(244) +
      k.path(rr(58, 20, 284, 18, 3), k.grad(...(o.crown ?? ["#8a5a35", "#4f2f19"])), "wood") +
      k.path(rr(64, 36, 272, 9, 2), k.grad(...(o.crownIn ?? ["#5a351c", "#3a2111"]))) +
      k.lite(rr(60, 22, 280, 3, 1), 0.3) +
      `<path d="${rr(145, 128, 5, 32, 2.5)}" fill="${brass}"/><path d="${rr(168, 128, 5, 32, 2.5)}" fill="${brass}"/>` +
      `<path d="${rr(228, 128, 5, 32, 2.5)}" fill="${brass}"/><path d="${rr(252, 128, 5, 32, 2.5)}" fill="${brass}"/>` +
      k.dark(rr(156, 50, 4, 196, 1), 0.35) +
      k.dark(rr(240, 50, 4, 196, 1), 0.35)
    );
  },

  // Комод на ножках: 4 ящика, декор сверху. Опции: top, body, front, leg, handle, decor
  chest: (k, o = {}) => {
    const top = k.grad(...(o.top ?? ["#e0b57c", "#b98a52"]));
    const body = k.grad(...(o.body ?? ["#d6a468", "#a8733a"]));
    const front = k.grad(...(o.front ?? ["#dcae74", "#b88448"]));
    const leg = k.grad(...(o.leg ?? ["#9b6a38", "#6a4423"]), "h");
    const handle = k.grad(...(o.handle ?? ["#f0d27a", "#a67c2b"]), "h");
    const drawers = [108, 143, 178, 213]
      .map(
        (y) =>
          k.path(rr(98, y, 204, 29, 3), front, "wood") +
          k.lite(rr(100, y + 1, 200, 3, 1.5), 0.25) +
          k.dark(rr(98, y + 25, 204, 4, 2), 0.14) +
          `<path d="${rr(186, y + 11, 28, 6, 3)}" fill="${handle}"/>`
      )
      .join("");
    const decor =
      o.decor === false
        ? ""
        : `<path d="${rr(112, 62, 26, 22, 4)}" fill="${k.grad("#d98a55", "#a85a2a")}"/>` +
          `<path d="M125 64C112 50 106 46 100 38C114 38 122 48 125 58C128 46 136 38 150 38C144 46 138 52 125 64Z" fill="#3d8a4f"/>` +
          `<path d="M125 64C125 48 128 38 136 28C140 42 134 54 125 64Z" fill="#58a868"/>` +
          `<path d="${rr(236, 50, 48, 34, 2)}" fill="#3a2a1c"/><path d="${rr(241, 55, 38, 24, 1)}" fill="${k.grad("#bfe3f5", "#7fb4d6")}"/>` +
          `<path d="M241 79L254 66L262 73L268 68L279 79Z" fill="#4f8f6a"/>`;
    return (
      k.shadow(200, 150) +
      [96, 292].map((x) => `<path d="${rr(x, 240, 12, 28, 3)}" fill="${leg}"/>`).join("") +
      k.path(rr(88, 100, 224, 146, 4), body, "wood") +
      drawers +
      k.path(rr(78, 84, 244, 18, 4), top, "wood") +
      k.lite(rr(82, 86, 236, 3, 1.5), 0.3) +
      decor
    );
  },

  // Прикроватная тумба: 2 ящика, лампа и книги сверху. Опции те же, что у комода
  nightstand: (k, o = {}) => {
    const top = k.grad(...(o.top ?? ["#e0b57c", "#b98a52"]));
    const body = k.grad(...(o.body ?? ["#d6a468", "#a8733a"]));
    const front = k.grad(...(o.front ?? ["#dcae74", "#b88448"]));
    const leg = k.grad(...(o.leg ?? ["#9b6a38", "#6a4423"]), "h");
    const handle = k.grad(...(o.handle ?? ["#f0d27a", "#a67c2b"]), "h");
    const drawers = [132, 186]
      .map(
        (y) =>
          k.path(rr(138, y, 124, 48, 3), front, "wood") +
          k.lite(rr(140, y + 1, 120, 3, 1.5), 0.25) +
          `<circle cx="200" cy="${y + 24}" r="5" fill="${handle}"/>`
      )
      .join("");
    return (
      k.shadow(200, 120) +
      [130, 258].map((x) => `<path d="${rr(x, 236, 12, 32, 3)}" fill="${leg}"/>`).join("") +
      k.path(rr(130, 124, 140, 116, 4), body, "wood") +
      drawers +
      k.path(rr(120, 110, 160, 16, 4), top, "wood") +
      k.lite(rr(124, 112, 152, 3, 1.5), 0.3) +
      `<path d="${rr(146, 101, 52, 9, 1)}" fill="#c4553a"/><path d="${rr(150, 92, 44, 9, 1)}" fill="#2f6f9a"/><path d="${rr(148, 83, 48, 9, 1)}" fill="#e3b341"/>` +
      `<ellipse cx="236" cy="109" rx="15" ry="3.5" fill="#000" fill-opacity=".2"/>` +
      `<path d="${rr(222, 104, 28, 6, 3)}" fill="${k.grad("#e8d28a", "#a98228", "h")}"/>` +
      `<path d="${rr(233, 78, 6, 28, 3)}" fill="${k.grad("#e8d28a", "#a98228", "h")}"/>` +
      `<path d="${poly([214, 50], [258, 50], [270, 80], [202, 80])}" fill="${k.grad("#fff3cf", "#e6c477")}"/>` +
      k.lite(poly([218, 52], [232, 52], [226, 78], [212, 78]), 0.35)
    );
  },

  // Высокий стеллаж: 4 полки, книги, растение, корзины. Опции: frame, shelf, back, items
  bookcase: (k, o = {}) => {
    const frame = k.grad(...(o.frame ?? ["#d6a468", "#a8733a"]), "h");
    const shelf = k.grad(...(o.shelf ?? ["#e0b57c", "#b98a52"]));
    const back = k.grad(...(o.back ?? ["#a67a4a", "#8a5f35"]));
    const book = (x, floor, w, h, c) =>
      `<path d="${rr(x, floor - h, w, h, 1.5)}" fill="${c}"/>` + k.lite(rr(x + 1, floor - h + 1, w - 2, 2, 1), 0.28);
    const cols = ["#c4553a", "#2f6f9a", "#e3b341", "#4f8f6a", "#8a5ca8", "#e8e2d4", "#d9784a"];
    const row = (floor, x0, heights) => {
      let x = x0;
      return heights
        .map((h, i) => {
          const w = 9 + ((i * 5) % 7);
          const s = book(x, floor, w, h, cols[i % cols.length]);
          x += w + 1;
          return s;
        })
        .join("");
    };
    const items =
      o.items === false
        ? ""
        : row(92, 128, [40, 34, 42, 36, 44, 32, 40, 38, 36, 42, 34]) +
          `<path d="${rr(134, 130, 28, 22, 4)}" fill="${k.grad("#d98a55", "#a85a2a")}"/>` +
          `<path d="M148 132C136 118 130 112 124 102C138 102 146 112 148 124C152 110 160 102 174 102C168 110 162 118 148 132Z" fill="#3d8a4f"/>` +
          `<path d="M148 132C148 116 150 106 158 96C162 110 156 122 148 132Z" fill="#58a868"/>` +
          book(190, 152, 62, 9, "#2f6f9a") + book(194, 143, 54, 9, "#e3b341") + book(192, 134, 58, 9, "#c4553a") +
          `<path d="${rr(130, 178, 60, 34, 6)}" fill="${k.grad("#d6b37a", "#a98250")}"/>` +
          `<path d="M134 186H186M134 195H186M134 204H186" stroke="#6a4a2a" stroke-opacity=".35" stroke-width="1.6"/>` +
          `<path d="${rr(212, 186, 56, 26, 3)}" fill="${k.grad("#f1ede4", "#cfc8b8")}"/>` + k.lite(rr(214, 188, 52, 4, 2), 0.4) +
          row(252, 128, [34, 38, 30, 36, 40, 32, 36, 38, 30, 34, 38]);
    return (
      k.shadow(200, 130) +
      `<path d="${rr(122, 36, 156, 216)}" fill="${back}"/>` +
      [92, 152, 212].map((y) => k.path(rr(122, y, 156, 10, 1), shelf, "wood") + k.lite(rr(122, y, 156, 2, 1), 0.3)).join("") +
      items +
      k.path(rr(110, 30, 12, 236, 2), frame, "woodv") +
      k.path(rr(278, 30, 12, 236, 2), frame, "woodv") +
      k.path(rr(104, 22, 192, 14, 3), shelf, "wood") +
      k.lite(rr(106, 24, 188, 3, 1.5), 0.3) +
      k.path(rr(108, 252, 184, 14, 2), frame, "wood")
    );
  },

  // ТВ-тумба с телевизором: 2 дверцы и открытая секция. Опции: top, body, front, leg, handle, tv
  tvstand: (k, o = {}) => {
    const top = k.grad(...(o.top ?? ["#e0b57c", "#b98a52"]));
    const body = k.grad(...(o.body ?? ["#d6a468", "#a8733a"]));
    const front = k.grad(...(o.front ?? ["#dcae74", "#b88448"]));
    const leg = k.grad(...(o.leg ?? ["#9b6a38", "#6a4423"]), "h");
    const handle = k.grad(...(o.handle ?? ["#f0d27a", "#a67c2b"]), "h");
    const tv =
      o.tv === false
        ? ""
        : `<path d="${rr(104, 56, 192, 106, 5)}" fill="#15171b"/>` +
          `<path d="${rr(109, 61, 182, 96, 2)}" fill="${k.grad("#7db5ee", "#2d4f8f", "d")}"/>` +
          k.lite(poly([109, 61], [190, 61], [150, 157], [109, 157]), 0.16) +
          `<path d="${poly([186, 162], [214, 162], [220, 172], [180, 172])}" fill="#2b2d33"/>` +
          `<path d="${rr(166, 171, 68, 5, 2)}" fill="#1c1e23"/>`;
    return (
      k.shadow(200, 175) +
      [58, 332].map((x) => `<path d="${rr(x, 244, 10, 24, 3)}" fill="${leg}"/>`).join("") +
      k.path(rr(40, 188, 320, 60, 4), body, "wood") +
      k.path(rr(48, 196, 96, 44, 3), front, "wood") +
      k.lite(rr(50, 197, 92, 3, 1.5), 0.25) +
      `<path d="${rr(132, 208, 5, 18, 2.5)}" fill="${handle}"/>` +
      `<path d="${rr(150, 196, 100, 44, 2)}" fill="${k.grad("#3a2b1f", "#1d1510")}"/>` +
      `<path d="${rr(162, 214, 64, 20, 2)}" fill="#2b2d33"/><circle cx="170" cy="224" r="2.2" fill="#6bd49a"/>` +
      `<path d="${rr(232, 218, 12, 16, 2)}" fill="#e3b341"/>` +
      k.path(rr(256, 196, 96, 44, 3), front, "wood") +
      k.lite(rr(258, 197, 92, 3, 1.5), 0.25) +
      `<path d="${rr(263, 208, 5, 18, 2.5)}" fill="${handle}"/>` +
      k.path(rr(32, 174, 336, 16, 4), top, "wood") +
      k.lite(rr(36, 176, 328, 3, 1.5), 0.3) +
      tv
    );
  },
};

/* Все товары: id → функция рисования. Модели 11–20 — варианты базовых рисунков с другими материалами и цветами. */
const REAL_DRAW = {
  ...Object.fromEntries(Object.entries(DRAWERS).map(([id, fn]) => [id, (k) => fn(k)])),

  // Диван «Лофт» — тёмно-синий велюр, тонкие чёрные ножки
  11: (k) => DRAWERS[1](k, { base: "#35508a", leg: ["#3a3a3f", "#17171a"], pillow: ["#efe2bd", "#cdb77f"] }),
  // Диван угловой «Милан» — терракотовая ткань, хромированные ножки
  12: (k) => DRAWERS[2](k, { base: "#c48a6e", leg: ["#e2e2e6", "#8a8a90"], pillow1: ["#f2e6d0", "#cdb994"], pillow2: ["#5b7396", "#36485f"] }),
  // Кровать «Лофт» — беленый дуб, серое изголовье
  13: (k) => DRAWERS[3](k, { oak: ["#ebe4d6", "#bfb5a2"], head: ["#747a86", "#4d525c"], pil: ["#e6d8c4", "#b9a487"], throw: ["#dcab9e", "#b97a6d"] }),
  // Кровать детская «Облако» — белый каркас, розовое покрывало
  14: (k) => DRAWERS[4](k, { wood: ["#f6f3ec", "#d9d3c5"], blanket: ["#f5b8ca", "#e082a2"], drawer: ["#fcdce6", "#eaabc2"] }),
  // Стол «Лайт» — светлый дуб
  15: (k) => DRAWERS[5](k, { wood: ["#e4c493", "#c19863"], edge: ["#b98c58", "#906839"], legs: ["#d8b47f", "#a97e49"], apron: ["#b98c58", "#906839"] }),
  // Стол компьютерный «Геймер» — графит
  16: (k) =>
    DRAWERS[6](k, {
      top: ["#62656c", "#3e4046"],
      edge: ["#8e9198", "#5f6269"],
      body: ["#4d5057", "#2e3035"],
      legA: ["#575a61", "#35373c"],
      legB: ["#45484e", "#2b2d31"],
      face: ["#5c5f66", "#3d3f44"],
    }),
  // Стул «Скандик» — чёрный каркас, светлая обивка
  17: (k) => DRAWERS[7](k, { wood: ["#3c3c41", "#1e1e21"], woodV: ["#49494f", "#27272b"], fab: "#ece7dd", back: ["#2b2b2f", "#151517"] }),
  // Кресло «Солнце» — горчичный велюр, чёрные ножки
  18: (k) => DRAWERS[8](k, { base: "#c9922e", leg: ["#3a3a3f", "#17171a"] }),
  // Шкаф-купе «Белый» — белый, зеркальная дверь
  19: (k) => DRAWERS[9](k, { oak: ["#f3f1ec", "#cfcbc0"], door: ["#f8f6f1", "#dfdbd0"] }),
  // Шкаф распашной «Лайт» — светлый дуб, хромированные ручки
  20: (k) =>
    DRAWERS[10](k, {
      walnut: ["#dcc8a4", "#b69c72"],
      door: ["#e6d6b7", "#c6ad83"],
      inset: ["#d4bf98", "#e4d3b1"],
      crown: ["#cdb186", "#9f835b"],
      plinth: ["#a98d63", "#80694a"],
      crownIn: ["#bb9f73", "#8f7553"],
      brass: ["#dde2e6", "#8e959b"],
    }),

  /* 21–30: ещё варианты для базовых категорий */
  // Диван «Нордик» — шалфейный зелёный
  21: (k) => DRAWERS[1](k, { base: "#6f9a85", leg: ["#e0b57c", "#a8733a"], pillow: ["#f3e4c3", "#d3b87f"] }),
  // Диван угловой «Сканди» — светло-серый, горчичные подушки
  22: (k) => DRAWERS[2](k, { base: "#bfc2c9", leg: ["#e0b57c", "#a8733a"], pillow1: ["#e3b341", "#b8841f"], pillow2: ["#6f7a8c", "#454e5e"] }),
  // Кровать «Мечта» — тёмный орех, бежевое изголовье
  23: (k) => DRAWERS[3](k, { oak: ["#8a5a35", "#5a3a20"], head: ["#c9b79a", "#a38e6c"], pil: ["#ece3d2", "#c7b697"], throw: ["#8aa6c7", "#5f7da3"] }),
  // Кровать детская «Небо» — голубое покрывало
  24: (k) => DRAWERS[4](k, { wood: ["#f0d9b0", "#d3ad74"], blanket: ["#a9c8f5", "#6f98d9"], drawer: ["#ffffff", "#e3ddd0"] }),
  // Стол «Бруклин» — тёмное дерево
  25: (k) => DRAWERS[5](k, { wood: ["#6a5242", "#3f2f24"], edge: ["#2f241b", "#1d1610"], legs: ["#3a2d23", "#1f1812"], apron: ["#2f241b", "#1d1610"] }),
  // Стол письменный «Белый» — белая столешница, буковые кромки
  26: (k) => DRAWERS[6](k, { top: ["#fbfaf7", "#e1ddd2"], edge: ["#cfa56e", "#9a7440"], body: ["#ffffff", "#e3dfd6"] }),
  // Стул «Бистро» — тёмное дерево и зелёная обивка
  27: (k) => DRAWERS[7](k, { wood: ["#6b4426", "#40260f"], woodV: ["#7a4f2e", "#4a2b17"], fab: "#7a9a6c", back: ["#4f3320", "#2d1b0d"] }),
  // Кресло «Мечтатель» — пыльно-розовый, золотистые ножки
  28: (k) => DRAWERS[8](k, { base: "#d6a0b0", leg: ["#f0d98a", "#a98228"] }),
  // Шкаф-купе «Графит» — тёмный
  29: (k) => DRAWERS[9](k, { oak: ["#5d5f66", "#3b3d43"], door: ["#6c6e76", "#484a52"] }),
  // Шкаф распашной «Прованс» — белый, латунные ручки
  30: (k) =>
    DRAWERS[10](k, {
      walnut: ["#f2f0ea", "#d3cfc3"],
      door: ["#f7f5ef", "#dedacd"],
      inset: ["#e9e5da", "#f6f3ec"],
      crown: ["#e2ded2", "#bfbaa9"],
      plinth: ["#cfcabc", "#a9a493"],
      crownIn: ["#d6d1c3", "#b2ad9c"],
    }),

  /* 31–34: комоды и тумбы */
  31: (k) => DRAWERS.chest(k, {}),
  32: (k) =>
    DRAWERS.chest(k, {
      top: ["#fbfaf6", "#e3dfd6"],
      body: ["#f4f2ec", "#d6d2c6"],
      front: ["#fbfaf6", "#e6e2d8"],
      leg: ["#cfa56e", "#9a7440"],
      handle: ["#2b2d33", "#14161a"],
    }),
  33: (k) =>
    DRAWERS.nightstand(k, {
      top: ["#8a5a35", "#5a3a20"],
      body: ["#7a4f2e", "#4a2b17"],
      front: ["#8a5a35", "#613c22"],
      leg: ["#5a3a20", "#3a2412"],
    }),
  34: (k) =>
    DRAWERS.nightstand(k, {
      top: ["#fbfaf6", "#e3dfd6"],
      body: ["#f4f2ec", "#d6d2c6"],
      front: ["#fbfaf6", "#e6e2d8"],
      leg: ["#cfa56e", "#9a7440"],
      handle: ["#2b2d33", "#14161a"],
    }),

  /* 35–38: стеллажи */
  35: (k) => DRAWERS.bookcase(k, {}),
  36: (k) => DRAWERS.bookcase(k, { frame: ["#f6f4ee", "#d9d5c9"], shelf: ["#fbfaf6", "#e3dfd6"], back: ["#e6e2d6", "#cfcabc"] }),
  37: (k) => DRAWERS.bookcase(k, { frame: ["#3a3a3f", "#17171a"], shelf: ["#d6a468", "#a8733a"], back: ["#e8dcc6", "#d0c2a4"] }),
  38: (k) => DRAWERS.bookcase(k, { frame: ["#ecd3a6", "#caa56c"], shelf: ["#f1dcb4", "#d3b07a"], back: ["#f6efe2", "#e2d6bf"] }),

  /* 39–42: ТВ-тумбы */
  39: (k) => DRAWERS.tvstand(k, {}),
  40: (k) =>
    DRAWERS.tvstand(k, {
      top: ["#fbfaf6", "#e3dfd6"],
      body: ["#f4f2ec", "#d6d2c6"],
      front: ["#fbfaf6", "#e6e2d8"],
      leg: ["#cfa56e", "#9a7440"],
      handle: ["#2b2d33", "#14161a"],
    }),
  41: (k) =>
    DRAWERS.tvstand(k, {
      top: ["#62656c", "#3e4046"],
      body: ["#4d5057", "#2e3035"],
      front: ["#575a61", "#35373c"],
      leg: ["#2b2d31", "#17181a"],
      handle: ["#cfd4d8", "#8e959b"],
    }),
  42: (k) =>
    DRAWERS.tvstand(k, {
      top: ["#8a5a35", "#5a3a20"],
      body: ["#7a4f2e", "#4a2b17"],
      front: ["#f4f2ec", "#d6d2c6"],
      leg: ["#5a3a20", "#3a2412"],
    }),
};

// attrs — дополнительные атрибуты корневого <svg> (например, width/height внутри сцены комнаты)
function realisticSVG(p, attrs = "") {
  const draw = REAL_DRAW[p.id];
  if (!draw) return furnitureSVG(p.category, pairFor(p)[0]);

  const u = `r${p.id}`;
  const defs = [];
  let n = 0;

  const k = {
    rr,
    poly,
    grad(c1, c2, dir = "v") {
      const id = `${u}g${n++}`;
      const [x2, y2] = dir === "v" ? [0, 1] : dir === "h" ? [1, 0] : [1, 1];
      defs.push(
        `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`
      );
      return `url(#${id})`;
    },
    // форма с заливкой и (необязательно) фактурой: fab — ткань, wood/woodv — дерево
    path(d, fill, tex) {
      return `<path d="${d}" fill="${fill}"/>` + (tex ? `<path d="${d}" fill="url(#${u}-${tex})"/>` : "");
    },
    lite: (d, o = 0.15) => `<path d="${d}" fill="#fff" fill-opacity="${o}"/>`,
    dark: (d, o = 0.15) => `<path d="${d}" fill="#000" fill-opacity="${o}"/>`,
    shadow(cx, rx) {
      return `<ellipse cx="${cx}" cy="268" rx="${rx}" ry="12" fill="url(#${u}-sh)"/>`;
    },
  };

  const body = draw(k);

  return `<svg viewBox="10 8 380 285" aria-hidden="true" ${attrs}>
    <defs>
      <radialGradient id="${u}-sh"><stop offset="0" stop-color="#14110f" stop-opacity=".5"/><stop offset="1" stop-color="#14110f" stop-opacity="0"/></radialGradient>
      <pattern id="${u}-fab" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 0L3 3M3 0L0 3" stroke="#000" stroke-opacity=".08" stroke-width=".6"/></pattern>
      <pattern id="${u}-wood" width="90" height="10" patternUnits="userSpaceOnUse"><path d="M0 2Q22 0 45 2T90 2M0 6Q30 9 60 6T90 6M0 9.5Q15 8.5 30 9.5T60 9.5" stroke="#2a1608" stroke-opacity=".16" stroke-width=".9" fill="none"/></pattern>
      <pattern id="${u}-woodv" width="10" height="90" patternUnits="userSpaceOnUse"><path d="M2 0Q0 22 2 45T2 90M6 0Q9 30 6 60T6 90M9.5 0Q8.5 15 9.5 30T9.5 60" stroke="#2a1608" stroke-opacity=".16" stroke-width=".9" fill="none"/></pattern>
      ${defs.join("")}
    </defs>
    ${body}
  </svg>`;
}
