/* Анимация «Мастер собирает мебель» на главной.
   Сцена — SVG, всё движение расписано по времени (Web Animations API): мастер быстро перебегает от стороны
   к стороне стеллажа, шуруповёртом вкручивает шурупы, детали влетают на места. Без JS (или при включённом
   «уменьшить движение») остаётся готовая сцена: собранный стеллаж и ликующий мастер. */
(function () {
  const root = document.getElementById("assembly");
  if (!root) return;

  const INK = "#14110f";
  const st = (w = 4) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const WOOD = "#d9a066";
  const BOOK_COLORS = ["#ff5a36", "#2b4bff", "#ffd23f", "#7be0b5", "#ffb3c7", "#9b7bff"];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const r2 = (v) => Math.round(v * 100) / 100;

  /* ---------- Геометрия и расписание ---------- */
  const FLOOR = 322; // линия пола под ногами мастера
  const SHOULDER_X = 33.5;
  const SHOULDER_Y = FLOOR - 118;
  const REACH = 104; // от плеча до кончика бита
  const BC = -80; // сдвиг стеллажа влево: его доски лежат в x = 520…720
  const FACE = { L: 528, R: 712 }; // где вкручиваем шурупы (середина левой/правой боковой доски)
  const FINAL_X = 335; // где мастер празднует
  const EV_DUR = 0.2; // один шуруп
  const RUN_STEP = 0.09; // шаг бега (половина периода)

  // [сторона, высота шурупа, подъём]: подъём > 0 — присел, < 0 — подпрыгнул
  const SEQ = [
    ["L", 240], ["L", 195], ["L", 150],
    ["R", 150], ["R", 195], ["R", 240],
    ["L", 288, 26], ["L", 262, 14],
    ["R", 288, 26], ["R", 262, 14], ["R", 105, -40],
    ["L", 105, -40], ["L", 72, -48],
  ];

  const ev = [];
  let prev = null;
  let cur = 1.3;
  for (const [side, y, lift = 0] of SEQ) {
    if (prev) {
      cur =
        prev.side !== side
          ? prev.t + EV_DUR + 0.47 // рывок на другую сторону стеллажа
          : prev.t + 0.28 + (Math.sign(lift) !== Math.sign(prev.lift) ? 0.06 : 0);
    }
    const sgn = side === "L" ? 1 : -1; // L: стоит слева и смотрит вправо
    const phi = Math.asin(clamp((y - (SHOULDER_Y + lift)) / REACH, -0.88, 0.88)); // наклон руки, вниз — плюс
    const x = FACE[side];
    prev = {
      side, y, lift, sgn, x,
      t: r2(cur),
      X: x - sgn * (REACH * Math.cos(phi) + SHOULDER_X), // где стоит мастер
      rot: (phi * 180) / Math.PI - 90, // поворот руки (0° — висит вниз)
    };
    ev.push(prev);
  }

  const RUN_IN = 0.7;
  const dashes = [];
  for (let i = 0; i < ev.length - 1; i++) {
    const a = ev[i];
    const b = ev[i + 1];
    if (a.side !== b.side) {
      const leave = r2(a.t + EV_DUR + 0.04);
      dashes.push({ from: a, to: b, leave, arrive: r2(leave + 0.25), dir: Math.sign(b.X - a.X) });
    }
  }
  const lastEv = ev[ev.length - 1];
  const leaveF = r2(lastEv.t + EV_DUR + 0.06);
  const arriveF = r2(leaveF + 0.32);
  const cheer = r2(arriveF + 0.16);
  const T = r2(cheer + 1.9);
  const E = (n) => ev[n - 1].t;

  /* ---------- Рисунок сцены ---------- */
  // стопка книг на полке: floor — y верхней грани полки
  const books = (floor, x0, heights, shift = 0) =>
    heights
      .map((h, i) => {
        const x = x0 + i * 13.5;
        return `<rect x="${x}" y="${floor - h}" width="11" height="${h}" rx="2" fill="${BOOK_COLORS[(i + shift) % BOOK_COLORS.length]}" ${st(2.5)}/>`;
      })
      .join("");

  const board = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${WOOD}" ${st()}/>`;

  // детали стеллажа: d — когда начинает лететь, fx/fy/fr — откуда, word — подпись при ударе
  const pieces = [
    { d: 0.6, fx: 0, fy: -220, fr: 6, word: [622, 130, "тук!"],
      inner: `<rect x="616" y="78" width="168" height="208" fill="#ecc98f" ${st(3)}/><path d="M658 80V284M700 80V284M742 80V284" stroke="${INK}" stroke-opacity=".18" stroke-width="2"/>` },
    { d: 0.72, fx: -260, fy: -30, fr: -50, word: [584, 160, "тук-тук"], inner: board(600, 70, 16, 230) },
    { d: E(4) - 0.62, fx: 240, fy: -40, fr: 50, word: [830, 160, "тук!"], inner: board(784, 70, 16, 230) },
    { d: E(7) - 0.62, fx: 200, fy: 90, fr: 20, word: [700, 318, "бум!"], inner: board(600, 286, 200, 14) },
    { d: E(9) - 1.05, fx: 220, fy: -90, fr: -30, word: [830, 226, "клац!"], inner: board(616, 232, 168, 14) },
    { d: E(9) - 0.9, fx: -240, fy: -120, fr: 25, word: [580, 170, "щёлк!"], inner: board(616, 176, 168, 14) },
    { d: E(9) - 0.75, fx: 230, fy: -150, fr: -20, word: [830, 112, "клац!"], inner: board(616, 120, 168, 14) },
    { d: E(9) - 0.6, fx: -200, fy: -200, fr: 15, word: [700, 52, "хоп!"], inner: board(596, 62, 208, 16) },
  ];

  const star = (x, y, s, i) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><g class="spark" data-i="${i}"><path d="M0-18L5-5L18 0L5 5L0 18L-5 5L-18 0L-5-5Z" fill="#ffd23f" ${st(3)}/></g></g>`;

  // эффекты, привязанные ко времени: разметка + функция, которая их запускает
  const fx = [];
  let uid = 0;
  const addFx = (markup, run) => {
    const id = `asm-fx${++uid}`;
    fx.push((q) => run(q(id)));
    return markup(id);
  };

  const wordFx = (t, x, y, text, size = 20) =>
    addFx(
      (id) => `<g transform="translate(${x} ${y})"><text id="${id}" class="word" style="font-size:${size}px" text-anchor="middle">${text}</text></g>`,
      (el) =>
        anim(el, [
          { opacity: 0, transform: "translate(0px, 8px) scale(0.5)" },
          { opacity: 1, transform: "translate(0px, 0px) scale(1.12)", offset: 0.2 },
          { opacity: 1, transform: "translate(0px, -4px) scale(1)", offset: 0.7 },
          { opacity: 0, transform: "translate(0px, -16px) scale(1)" },
        ], { delay: t * 1000, duration: 650 })
    );

  const dustFx = (t, x, dir) =>
    [0, 1, 2]
      .map((i) =>
        addFx(
          (id) => `<g transform="translate(${r2(x - dir * i * 15)} ${FLOOR - 7 - i * 3})"><circle id="${id}" class="dust" r="${9 - i * 1.5}" fill="#fff6e5" ${st(2.5)}/></g>`,
          (el) =>
            anim(el, [
              { opacity: 0, transform: "translate(0px, 0px) scale(0.3)" },
              { opacity: 1, transform: `translate(${-dir * 6}px, -4px) scale(1)`, offset: 0.3 },
              { opacity: 0, transform: `translate(${-dir * 22}px, -14px) scale(1.5)` },
            ], { delay: (t + i * 0.04) * 1000, duration: 420 })
        )
      )
      .join("");

  // эффекты работы шуруповёрта: шуруп, вращающаяся стрелка, стружка, слово
  const WORDS = ["вжжж!", "тррр!", "бзз!", "вжик!", "ррр!"];
  const drillFx = ev
    .map((e, k) => {
      const screw = addFx(
        (id) => `<g transform="translate(${e.x} ${e.y})"><g id="${id}" class="screw"><circle r="4.8" fill="#e4e8ea" ${st(2.2)}/><path d="M-2.7 0H2.7M0 -2.7V2.7" ${st(1.8)}/></g></g>`,
        (el) =>
          anim(el, [
            { opacity: 0, transform: `translate(${-e.sgn * 10}px, 0px) rotate(0deg) scale(1.25)` },
            { opacity: 1, offset: 0.15 },
            { opacity: 1, transform: `translate(0px, 0px) rotate(${e.sgn * 600}deg) scale(1)` },
          ], { delay: e.t * 1000, duration: EV_DUR * 1000, easing: "ease-in" })
      );
      const twist = addFx(
        (id) => `<g transform="translate(${e.x} ${e.y})"><g id="${id}" class="twist"><path d="M12 0A12 12 0 1 1 0 -12" fill="none" ${st(3.2)}/><path d="M-4 -17L1 -12L-4 -7" fill="none" ${st(3.2)}/></g></g>`,
        (el) =>
          anim(el, [
            { opacity: 0, transform: "rotate(0deg) scale(0.6)" },
            { opacity: 1, offset: 0.2 },
            { opacity: 1, offset: 0.8 },
            { opacity: 0, transform: `rotate(${e.sgn * 420}deg) scale(1.1)` },
          ], { delay: (e.t - 0.02) * 1000, duration: (EV_DUR + 0.1) * 1000 })
      );
      const chips = [0, 1, 2, 3, 4, 5]
        .map((i) =>
          addFx(
            (id) => `<g transform="translate(${e.x} ${e.y})"><circle id="${id}" class="chip" r="${2 + (i % 3) * 0.7}" fill="${["#ffd23f", WOOD, "#fff6e5"][i % 3]}" ${st(1.2)}/></g>`,
            (el) => {
              const ang = ((i - 2.5) * 24 * Math.PI) / 180;
              const d = 24 + (i % 3) * 9;
              anim(el, [
                { opacity: 1, transform: "translate(0px, 0px) scale(1)" },
                { opacity: 0, transform: `translate(${r2(-e.sgn * Math.cos(ang) * d)}px, ${r2(Math.sin(ang) * d + 16)}px) scale(0.3)` },
              ], { delay: (e.t + (i % 2) * 0.05) * 1000, duration: 190, iterations: 2, easing: "ease-out", fill: "none" });
            }
          )
        )
        .join("");
      const word = wordFx(e.t, e.x + e.sgn * 40, e.y - 22 - (k % 3) * 6, WORDS[k % WORDS.length], 17);
      return screw + twist + chips + word;
    })
    .join("");

  // облачка пыли: старт, торможение у стеллажа, пробежки
  const dustAll =
    dustFx(0.62, ev[0].X - 20, 1) +
    dashes.map((d) => dustFx(d.leave, d.from.X, d.dir) + dustFx(d.arrive, d.to.X, -d.dir)).join("") +
    dustFx(leaveF, lastEv.X, -1) +
    dustFx(arriveF, FINAL_X, 1);

  const pieceWords = pieces.map((p) => wordFx(p.d + 0.38, p.word[0] + BC, p.word[1], p.word[2], 20)).join("");

  const sceneBack = `
    <defs>
      <pattern id="asm-stripes" width="40" height="8" patternUnits="userSpaceOnUse"><rect width="20" height="8" fill="rgba(255,255,255,.3)"/></pattern>
      <linearGradient id="asm-light" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff3b0" stop-opacity=".6"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/>
      </linearGradient>
    </defs>

    <!-- стены с обоями, молдингом и панелями -->
    <rect width="900" height="302" fill="#bfe9d6"/>
    <rect width="900" height="302" fill="url(#asm-stripes)"/>
    <rect y="206" width="900" height="82" fill="#a7dcc4"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${24 + i * 112}" y="222" width="90" height="52" rx="4" fill="none" stroke="rgba(20,17,15,.3)" stroke-width="2.5"/>`).join("")}
    <rect y="200" width="900" height="10" fill="#fff6e5" ${st(3)}/>
    <rect y="286" width="900" height="16" fill="#fff6e5" ${st(3)}/>

    <!-- пол: доски в разбежку -->
    <rect y="302" width="900" height="78" fill="${WOOD}"/>
    ${[0, 1, 2, 3].map((i) => `<path d="M0 ${320 + i * 20}H900" stroke="rgba(20,17,15,.2)" stroke-width="2"/>`).join("")}
    ${[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4, 5, 6, 7, 8].map((c) => `<path d="M${(c * 110 + (r % 2) * 55 + 20) % 900} ${302 + r * 20}v18" stroke="rgba(20,17,15,.16)" stroke-width="2"/>`).join("")).join("")}
    <path d="M0 302H900" stroke="${INK}" stroke-width="3.5"/>

    <!-- окно со шторами, цветком на подоконнике -->
    <g ${st()}>
      <rect x="70" y="34" width="150" height="120" rx="6" fill="#b9e3ff"/>
      <path d="M70 130Q110 108 150 124T220 114V154H70Z" fill="#7cc99a"/>
      <circle cx="110" cy="70" r="15" fill="#ffd23f"/>
      <path d="M150 68a11 11 0 0 1 12-9a14 14 0 0 1 26 3a9 9 0 0 1 2 18H152a10 10 0 0 1-2-12Z" fill="#fff"/>
      <path d="M145 34V154M70 94H220" fill="none"/>
      <rect x="62" y="154" width="166" height="11" rx="3" fill="${WOOD}"/>
      <path d="M44 26H246" fill="none"/>
      <circle cx="44" cy="26" r="6" fill="#ffd23f"/><circle cx="246" cy="26" r="6" fill="#ffd23f"/>
      <path d="M52 28H96Q100 96 88 154H52Z" fill="#ffb3c7"/>
      <path d="M72 30Q74 96 68 152M84 30Q86 96 80 152" fill="none" stroke-width="2.2" stroke-opacity=".35"/>
      <path d="M238 28H194Q190 96 202 154H238Z" fill="#ffb3c7"/>
      <path d="M218 30Q216 96 222 152M206 30Q204 96 210 152" fill="none" stroke-width="2.2" stroke-opacity=".35"/>
      <rect x="150" y="136" width="26" height="19" rx="3" fill="#ff5a36"/>
      <path d="M163 136C150 128 148 116 152 108C160 112 164 124 163 136C168 122 176 114 184 112C184 122 176 132 163 136Z" fill="#3d8a4f"/>
    </g>

    <!-- картины -->
    <g ${st(3)}>
      <rect x="268" y="48" width="64" height="48" rx="3" fill="#fff"/>
      <rect x="274" y="54" width="52" height="36" fill="#ffd9a0"/>
      <path d="M274 90L292 68L304 80L314 70L326 90Z" fill="#2b4bff"/>
      <circle cx="312" cy="62" r="6" fill="#ff5a36"/>
      <rect x="344" y="42" width="42" height="58" rx="3" fill="#fff"/>
      <rect x="350" y="48" width="30" height="46" fill="#cfc2ff"/>
      <circle cx="365" cy="64" r="9" fill="#ffd23f"/><path d="M350 94Q365 70 380 94Z" fill="#ff5a36"/>
      <circle cx="302" cy="124" r="15" fill="#fff"/><circle cx="302" cy="124" r="9" fill="#7be0b5"/>
    </g>

    <!-- подвесная лампа: тёплый свет и лёгкое раскачивание -->
    <path d="M434 84L376 302H564L506 84Z" fill="url(#asm-light)"/>
    <g transform="translate(470 0)"><g class="lamp">
      <path d="M0 0V50" ${st(3)}/>
      <path d="M-26 52H26L38 84H-38Z" fill="#ffd23f" ${st()}/>
      <ellipse cx="0" cy="86" rx="13" ry="6" fill="#fff9d6" ${st(2.5)}/>
    </g></g>

    <!-- цветок в горшке -->
    <g transform="translate(46 0)"><g class="plant">
      <ellipse cx="-4" cy="238" rx="15" ry="38" transform="rotate(-24 0 284)" fill="#3d8a4f" ${st(3)}/>
      <ellipse cx="6" cy="228" rx="14" ry="42" transform="rotate(14 0 284)" fill="#55a868" ${st(3)}/>
      <ellipse cx="-12" cy="248" rx="11" ry="30" transform="rotate(-58 0 284)" fill="#55a868" ${st(3)}/>
      <ellipse cx="16" cy="250" rx="11" ry="30" transform="rotate(52 0 284)" fill="#3d8a4f" ${st(3)}/>
    </g></g>
    <path d="M22 288H70L62 326H30Z" fill="#c8602f" ${st(3.5)}/>
    <rect x="18" y="280" width="56" height="12" rx="4" fill="#e07a45" ${st(3.5)}/>

    <!-- коробки у стены -->
    <g ${st(3.5)}>
      <rect x="176" y="278" width="88" height="46" rx="3" fill="#c8935a"/>
      <rect x="206" y="278" width="28" height="46" fill="#e2b57d"/>
      <rect x="190" y="242" width="60" height="36" rx="3" fill="#d9a066"/>
      <rect x="210" y="242" width="20" height="36" fill="#e2b57d"/>
      <path d="M186 304h16M246 304h12" fill="none" stroke-width="2.5"/>
    </g>

    <!-- ковёр -->
    <g ${st(3.5)}>
      <rect x="296" y="312" width="330" height="58" rx="12" fill="#ff5a36"/>
      <rect x="308" y="322" width="306" height="38" rx="8" fill="#fff6e5" stroke-width="2.5"/>
      <path d="M320 341H602" stroke-dasharray="14 10" stroke-width="3.5" fill="none"/>
    </g>

    <!-- котик: наблюдает за работой -->
    <g transform="translate(150 354)">
      <g class="cat-tail"><path d="M-16 4Q-34 4 -34 -14" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="M-16 4Q-34 4 -34 -14" fill="none" stroke="#ff9a4a" stroke-width="5.5" stroke-linecap="round"/></g>
      <ellipse cx="0" cy="-4" rx="21" ry="17" fill="#ff9a4a" ${st(3)}/>
      <path d="M-8 -18v8M0 -20v9M8 -18v8" ${st(2.5)}/>
      <circle cx="17" cy="-26" r="13" fill="#ff9a4a" ${st(3)}/>
      <path d="M7 -35L9 -48L17 -38ZM20 -38L27 -48L28 -33Z" fill="#ff9a4a" ${st(3)}/>
      <circle cx="13" cy="-27" r="2" fill="${INK}"/><circle cx="23" cy="-27" r="2" fill="${INK}"/>
      <path d="M17 -22l2 2l2-2Z" fill="#ffb3c7" ${st(1.8)}/>
    </g>

    <!-- ящик с инструментами у стеллажа -->
    <g ${st(3.5)}>
      <rect x="748" y="334" width="62" height="26" rx="4" fill="#ff5a36"/>
      <path d="M766 334V324H792V334" fill="none"/>
      <rect x="774" y="342" width="10" height="7" rx="2" fill="#ffd23f" stroke-width="2.5"/>
    </g>
    <g transform="translate(804 336) rotate(32)" ${st(3)}><rect x="-2.5" y="-34" width="5" height="34" rx="2" fill="#8a5a35"/><rect x="-10" y="-40" width="20" height="9" rx="2" fill="#cfd4d8"/></g>
  `;

  const bookcase = `
    <g class="bookcase" transform="translate(${BC} 0)">
      ${pieces
        .map(
          (p, i) =>
            `<g class="piece" data-i="${i}" style="--fx:${p.fx}px;--fy:${p.fy}px;--fr:${p.fr}deg">${p.inner}</g>`
        )
        .join("")}
      <g class="items">
        <g data-i="0">${books(120, 622, [30, 36, 26, 34, 30, 38, 28, 32, 30, 36, 28, 34])}</g>
        <g data-i="1">
          <rect x="626" y="150" width="26" height="26" rx="4" fill="#ff5a36" ${st(2.5)}/>
          <path d="M639 150C628 138 624 132 622 122C634 124 640 132 639 142C644 130 650 124 660 122C658 132 652 142 639 150Z" fill="#3d8a4f" ${st(2.5)}/>
          <rect x="690" y="166" width="70" height="10" rx="2" fill="#2b4bff" ${st(2.5)}/>
          <rect x="694" y="156" width="62" height="10" rx="2" fill="#ffd23f" ${st(2.5)}/>
          <rect x="692" y="146" width="66" height="10" rx="2" fill="#ff5a36" ${st(2.5)}/>
        </g>
        <g data-i="2">
          <rect x="624" y="198" width="64" height="34" rx="6" fill="#e9c88f" ${st(2.5)}/>
          <path d="M628 208H684M628 218H684" stroke="${INK}" stroke-opacity=".4" stroke-width="2"/>
          <rect x="708" y="206" width="62" height="26" rx="3" fill="#fff" ${st(2.5)}/>
          <rect x="720" y="214" width="38" height="8" rx="2" fill="#ffb3c7"/>
        </g>
        <g data-i="3">${books(286, 622, [30, 26, 34, 30, 36, 28, 32, 30, 34, 28, 30, 32], 3)}</g>
      </g>
    </g>`;

  /* ---------- Мастер ---------- */
  const leg = (cls, x, rot) => `
    <g class="m-leg ${cls}"><g transform="rotate(${rot} ${x + 9} -66)">
      <rect x="${x}" y="-68" width="18" height="62" rx="8" fill="#1d36c2" ${st(3.5)}/>
      <rect x="${x - 5}" y="-12" width="30" height="14" rx="6" fill="${INK}"/>
    </g></g>`;

  const master = `
    <g transform="translate(${FINAL_X} ${FLOOR})">
      <g class="m-route">
        <g class="m-speed" ${st(4)}><path d="M-62 -128H-132M-70 -88H-150M-62 -48H-124M-58 -158H-112" fill="none"/></g>
        <ellipse class="m-shadow" cx="0" cy="3" rx="46" ry="8" fill="rgba(20,17,15,.28)"/>
        <g class="m-hop">
          <g class="m-legs m-legs--stand">${leg("m-leg--a", -26, -8)}${leg("m-leg--b", 8, 8)}</g>
          <g class="m-legs m-legs--run">${leg("m-leg--a", -26, 0)}${leg("m-leg--b", 8, 0)}</g>

          <g class="m-upper">
            <g class="m-arm m-arm--back">
              <rect x="-42" y="-124" width="15" height="52" rx="7.5" fill="#ff5a36" ${st(3)}/>
              <circle cx="-34.5" cy="-68" r="8" fill="#ffcba4" ${st(3)}/>
            </g>
            <rect x="-34" y="-134" width="68" height="78" rx="20" fill="#2b4bff" ${st()}/>
            <rect x="-14" y="-140" width="28" height="12" rx="5" fill="#ff5a36" ${st(3)}/>
            <rect x="-18" y="-112" width="36" height="30" rx="8" fill="#4d68ff" ${st(3)}/>
            <rect x="-36" y="-72" width="72" height="14" rx="5" fill="#ffd23f" ${st(3)}/>
            <rect x="18" y="-60" width="7" height="22" rx="3" fill="#cfd4d8" ${st(2.5)}/>
            <rect x="-24" y="-60" width="7" height="20" rx="2" fill="#8a5a35" ${st(2.5)}/>
            <rect x="-28" y="-64" width="15" height="8" rx="2" fill="#cfd4d8" ${st(2.5)}/>
            <g class="m-head">
              <circle cx="-28" cy="-160" r="6" fill="#ffcba4" ${st(3)}/>
              <circle cx="0" cy="-162" r="30" fill="#ffcba4" ${st()}/>
              <path d="M-31 -166A31 31 0 0 1 31 -166Z" fill="#ffd23f" ${st()}/>
              <rect x="6" y="-171" width="38" height="10" rx="5" fill="#ffd23f" ${st(3)}/>
              <circle cx="-6" cy="-158" r="3.6" fill="${INK}"/><circle cx="14" cy="-158" r="3.6" fill="${INK}"/>
              <circle cx="24" cy="-152" r="5" fill="#f2a98a" ${st(3)}/>
              <path d="M0 -146Q10 -152 22 -146" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
              <path d="M4 -139Q12 -133 20 -139" fill="none" ${st(3)}/>
            </g>
            <g class="m-arm m-arm--front">
              <rect x="26" y="-124" width="15" height="46" rx="7.5" fill="#ff5a36" ${st(3)}/>
              <g class="m-drill">
                <rect x="29" y="-82" width="9" height="16" rx="3" fill="${INK}"/>
                <rect x="22" y="-68" width="23" height="28" rx="6" fill="#ffd23f" ${st(3)}/>
                <rect x="22" y="-56" width="23" height="7" fill="#ff5a36" ${st(2)}/>
                <rect x="27" y="-41" width="13" height="9" rx="2" fill="#cfd4d8" ${st(2.5)}/>
                <rect x="31.5" y="-33" width="4" height="19" rx="1.5" fill="#e4e8ea" ${st(2)}/>
                <path class="m-bit" d="M33.5 -33V-14" stroke="${INK}" stroke-width="3.4" stroke-dasharray="2.5 3.5" fill="none"/>
                <circle cx="33.5" cy="-76" r="8" fill="#ffcba4" ${st(3)}/>
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>`;

  const bubble = `
    <g class="bubble">
      <path d="M270 40H405Q419 40 419 54V82Q419 96 405 96H352L338 120L330 96H270Q256 96 256 82V54Q256 40 270 40Z" fill="#fff" ${st()}/>
      <text x="337" y="76" text-anchor="middle">Готово!</text>
    </g>`;

  const scene = `
  <svg viewBox="0 0 900 380" role="img" aria-label="Мастер быстро собирает стеллаж шуруповёртом">
    ${sceneBack}
    ${bookcase}
    ${master}
    ${dustAll}
    ${drillFx}
    ${pieceWords}
    ${star(502, 56, 1, 0)}${star(740, 50, 0.8, 1)}${star(752, 292, 1.1, 2)}${star(500, 290, 0.7, 3)}
    ${bubble}
  </svg>`;

  root.innerHTML = `
    <div class="assembly__text">
      <span class="eyebrow">Сборка в подарок</span>
      <h2>Мастер соберёт всё за вас</h2>
      <p>Привезём, поднимем на этаж и соберём. Вам останется только расставить книги.</p>
      <div class="assembly__btns">
        <button class="btn btn--light btn--small" type="button" id="assembly-replay">↻ Показать ещё раз</button>
        <a class="btn btn--small" href="catalog.html?cat=shelf">Стеллажи →</a>
      </div>
    </div>
    <div class="assembly__stage">${scene}</div>`;

  const replay = root.querySelector("#assembly-replay");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    replay.hidden = true; // без движения показываем готовую сцену
    return;
  }

  /* ---------- Анимации ---------- */
  const anims = [];
  function anim(el, frames, opts) {
    if (!el) return;
    anims.push(el.animate(frames, { fill: "both", easing: "linear", ...opts }));
  }
  const stop = () => anims.splice(0).forEach((a) => a.cancel());

  // дорожка: [время в с, свойства, плавность до следующей точки]
  function track(el, pts) {
    const list = pts.slice().sort((a, b) => a[0] - b[0]);
    if (list[0][0] > 0) list.unshift([0, list[0][1]]);
    if (list[list.length - 1][0] < T) list.push([T, list[list.length - 1][1]]);
    anim(el, list.map(([t, props, easing]) => ({ offset: clamp(t / T, 0, 1), ...props, ...(easing && { easing }) })), {
      duration: T * 1000,
    });
  }

  // цикл бега: значения чередуются каждые RUN_STEP секунд
  function cycle(pts, a, b, f) {
    const n = Math.max(2, Math.round((b - a) / RUN_STEP));
    for (let k = 0; k <= n; k++) pts.push([a + ((b - a) * k) / n, f(k)]);
  }

  const runs = [{ a: 0, b: RUN_IN }, ...dashes.map((d) => ({ a: d.leave, b: d.arrive })), { a: leaveF, b: arriveF }];

  function buildMaster(q) {
    const route = [];
    const rt = (X, sx) => ({ transform: `translate(${r2(X - FINAL_X)}px, 0px) scale(${sx}, 1)` });
    // вбегает слева, тормозит с проскальзыванием
    route.push([0, rt(-170, 1), "cubic-bezier(.3,.5,.5,1)"], [RUN_IN + 0.06, rt(ev[0].X + 16, 1), "ease-out"], [RUN_IN + 0.2, rt(ev[0].X, 1)]);
    ev.forEach((e) => route.push([e.t - 0.02, rt(e.X, e.sgn)], [e.t + EV_DUR + 0.02, rt(e.X, e.sgn)]));
    dashes.forEach((d) => {
      route.push(
        [d.leave, rt(d.from.X, d.from.sgn), "cubic-bezier(.55,0,.3,1)"],
        [d.leave + 0.05, rt(d.from.X + d.dir * 4, d.dir), "linear"],
        [d.arrive, rt(d.to.X + d.dir * 16, d.dir), "ease-out"],
        [d.arrive + 0.09, rt(d.to.X, d.to.sgn)]
      );
    });
    // финал: отбегает от стеллажа, оборачивается и радуется
    route.push(
      [leaveF, rt(lastEv.X, lastEv.sgn), "cubic-bezier(.55,0,.3,1)"],
      [leaveF + 0.05, rt(lastEv.X - 4, -1), "linear"],
      [arriveF, rt(FINAL_X - 14, -1), "ease-out"],
      [arriveF + 0.1, rt(FINAL_X, 1)]
    );
    track(q(".m-route"), route);

    // прыжки: через них же считается тень
    const hop = [[0, 0]];
    const hopAt = (t, y) => hop.push([t, y]);
    ev.forEach((e) => {
      const y = e.lift < 0 ? e.lift : 0;
      hopAt(e.t - 0.04, y);
      hopAt(e.t + EV_DUR + 0.02, y);
    });
    dashes.forEach((d) => hopAt(d.leave + 0.05, 0));
    hopAt(leaveF + 0.05, 0);
    [0, 0.34].forEach((dt) => {
      hopAt(cheer + dt, 0);
      hopAt(cheer + dt + 0.12, -26);
      hopAt(cheer + dt + 0.28, 0);
    });
    const hopSorted = hop.slice().sort((a, b) => a[0] - b[0]);
    track(q(".m-hop"), hopSorted.map(([t, y]) => [t, { transform: `translate(0px, ${y}px)` }, "ease-in-out"]));
    track(q(".m-shadow"), hopSorted.map(([t, y]) => [t, { transform: `scale(${r2(1 + y / 170)})` }, "ease-in-out"]));

    // корпус: бег с наклоном вперёд, приседания у нижних шурупов
    const U = (y, rot) => ({ transform: `translate(0px, ${y}px) rotate(${rot}deg)` });
    const upper = [[0, U(0, 9)]];
    runs.forEach((w) => {
      cycle(upper, w.a, w.b, (k) => U(k % 2 ? 0 : -7, 9));
      upper.push([w.b + 0.1, U(0, 2)]);
    });
    ev.forEach((e) => upper.push([e.t - 0.04, U(Math.max(e.lift, 0), 3)], [e.t + EV_DUR + 0.02, U(Math.max(e.lift, 0), 3)]));
    upper.push([cheer, U(0, -3), "ease-out"], [cheer + 0.2, U(0, 0)]);
    track(q(".m-upper"), upper);

    // руки: в рывке дрель впереди, а вторая рука машет; у работы целятся под нужным углом
    const front = [[0, { transform: "rotate(-50deg)" }]];
    const back = [[0, { transform: "rotate(50deg)" }]];
    runs.forEach((w) => {
      cycle(front, w.a, w.b, (k) => ({ transform: `rotate(${k % 2 ? -64 : -46}deg)` }));
      cycle(back, w.a, w.b, (k) => ({ transform: `rotate(${k % 2 ? -60 : 60}deg)` }));
    });
    ev.forEach((e) => {
      front.push([e.t - 0.1, { transform: `rotate(${r2(e.rot)}deg)` }], [e.t + EV_DUR + 0.02, { transform: `rotate(${r2(e.rot)}deg)` }]);
      back.push([e.t - 0.1, { transform: `rotate(${r2(e.rot + 16)}deg)` }], [e.t + EV_DUR + 0.02, { transform: `rotate(${r2(e.rot + 16)}deg)` }]);
    });
    front.push([cheer, { transform: "rotate(-150deg)" }, "cubic-bezier(.3,1.7,.5,1)"], [cheer + 0.5, { transform: "rotate(-138deg)" }], [cheer + 0.7, { transform: "rotate(-152deg)" }], [cheer + 0.9, { transform: "rotate(-140deg)" }], [cheer + 1.1, { transform: "rotate(-150deg)" }]);
    back.push([cheer, { transform: "rotate(155deg)" }, "cubic-bezier(.3,1.7,.5,1)"], [cheer + 0.4, { transform: "rotate(138deg)" }], [cheer + 0.6, { transform: "rotate(170deg)" }], [cheer + 0.8, { transform: "rotate(140deg)" }], [cheer + 1.0, { transform: "rotate(168deg)" }], [cheer + 1.2, { transform: "rotate(155deg)" }]);
    track(q(".m-arm--front"), front);
    track(q(".m-arm--back"), back);

    // ноги: в бегу — размашистые шаги, на месте — расставлены (с приседанием)
    const legA = [];
    const legB = [];
    const runVis = [[0, { opacity: 1 }]];
    const standVis = [[0, { opacity: 0, transform: "scale(1, 1)" }]];
    runs.forEach((w) => {
      cycle(legA, w.a, w.b, (k) => ({ transform: `rotate(${k % 2 ? -46 : 46}deg)` }));
      cycle(legB, w.a, w.b, (k) => ({ transform: `rotate(${k % 2 ? 46 : -46}deg)` }));
      if (w.a > 0) runVis.push([w.a - 0.001, { opacity: 0 }], [w.a, { opacity: 1 }]);
      runVis.push([w.b, { opacity: 1 }], [w.b + 0.001, { opacity: 0 }]);
      if (w.a > 0) standVis.push([w.a - 0.001, { opacity: 1, transform: "scale(1, 1)" }], [w.a, { opacity: 0, transform: "scale(1, 1)" }]);
      standVis.push([w.b, { opacity: 0, transform: "scale(1, 1)" }], [w.b + 0.001, { opacity: 1, transform: "scale(1, 1)" }]);
    });
    ev.forEach((e) => {
      const s = e.lift > 0 ? r2((68 - e.lift) / 68) : 1;
      standVis.push([e.t - 0.04, { opacity: 1, transform: `scale(1, ${s})` }], [e.t + EV_DUR + 0.02, { opacity: 1, transform: `scale(1, ${s})` }]);
    });
    track(q(".m-legs--run .m-leg--a"), legA);
    track(q(".m-legs--run .m-leg--b"), legB);
    track(q(".m-legs--run"), runVis.map(([t, p]) => [t, p]));
    track(q(".m-legs--stand"), standVis);

    // линии скорости за спиной на рывках
    const speed = [[0, { opacity: 0, transform: "scale(1, 1)" }]];
    runs.forEach((w) => {
      cycle(speed, w.a + 0.02, w.b - 0.02, (k) => ({ opacity: 1, transform: `scale(${k % 2 ? 0.7 : 1.15}, 1)` }));
      speed.push([w.b, { opacity: 0, transform: "scale(1, 1)" }]);
    });
    track(q(".m-speed"), speed);

    // шуруповёрт: вибрирует и крутит бит
    anim(q(".m-drill"), [{ transform: "translate(-1.3px, -0.8px)" }, { transform: "translate(1.3px, 0.8px)" }], {
      duration: 40, iterations: Math.floor((T * 1000) / 40), direction: "alternate",
    });
    anim(q(".m-bit"), [{ strokeDashoffset: "0px" }, { strokeDashoffset: "-6px" }], { duration: 70, iterations: Math.floor((T * 1000) / 70) });
  }

  function play() {
    stop();
    const q = (sel) => (sel.startsWith(".") || sel.startsWith("#") ? root.querySelector(sel) : null);
    buildMaster(q);

    // детали влетают на места и «встают» со встряской
    root.querySelectorAll(".piece").forEach((el) => {
      const p = pieces[Number(el.dataset.i)];
      const from = `translate(${p.fx}px, ${p.fy}px) rotate(${p.fr}deg) scale(1)`;
      anim(el, [
        { opacity: 0, transform: from, offset: 0, easing: "cubic-bezier(.2,.8,.3,1)" },
        { opacity: 1, offset: 0.2 },
        { opacity: 1, transform: "translate(0px, 0px) rotate(0deg) scale(1)", offset: 0.75 },
        { opacity: 1, transform: "translate(0px, 0px) rotate(0deg) scale(1.05, 0.96)", offset: 0.88 },
        { opacity: 1, transform: "translate(0px, 0px) rotate(0deg) scale(1)", offset: 1 },
      ], { delay: p.d * 1000, duration: 520 });
    });

    // книги и вещи появляются на полках
    const itemsAt = lastEv.t + 0.05;
    root.querySelectorAll(".items > g").forEach((el, i) =>
      anim(el, [
        { opacity: 0, transform: "scale(0)" },
        { opacity: 1, transform: "scale(1.12)", offset: 0.7 },
        { opacity: 1, transform: "scale(1)" },
      ], { delay: (itemsAt + i * 0.14) * 1000, duration: 420, easing: "ease-out" })
    );

    // звёздочки и облачко
    root.querySelectorAll(".spark").forEach((el, i) => {
      const t = (cheer + 0.1 + i * 0.1) * 1000;
      anim(el, [{ opacity: 0, transform: "scale(0)" }, { opacity: 1, transform: "scale(1.2)", offset: 0.7 }, { opacity: 1, transform: "scale(1)" }], { delay: t, duration: 420, easing: "ease-out" });
      anim(el, [{ transform: "rotate(0deg) scale(1)" }, { transform: "rotate(25deg) scale(1.1)" }], { delay: t + 420, duration: 900 + i * 150, iterations: Infinity, direction: "alternate", easing: "ease-in-out", fill: "none" });
    });
    anim(root.querySelector(".bubble"), [
      { opacity: 0, transform: "scale(0)" },
      { opacity: 1, transform: "scale(1.1)", offset: 0.7 },
      { opacity: 1, transform: "scale(1)" },
    ], { delay: (cheer + 0.15) * 1000, duration: 500, easing: "ease-out" });

    // шурупы, стружка, слова, пыль
    fx.forEach((run) => run((id) => root.querySelector("#" + id)));

    // жизнь вокруг: лампа качается, цветок и хвост кота шевелятся
    const sway = (sel, a, dur) =>
      anim(root.querySelector(sel), [{ transform: `rotate(${-a}deg)` }, { transform: `rotate(${a}deg)` }], { duration: dur, iterations: Infinity, direction: "alternate", easing: "ease-in-out", fill: "none" });
    sway(".lamp", 2.2, 1500);
    sway(".plant", 1.8, 2200);
    sway(".cat-tail", 12, 700);

    root.classList.remove("is-armed");
    root.classList.add("is-playing");
  }

  root.classList.add("is-armed");
  replay.addEventListener("click", play);

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        play();
      },
      { threshold: 0.25 }
    );
    io.observe(root);
  } else {
    play();
  }
})();
