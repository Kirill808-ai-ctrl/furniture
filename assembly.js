/* Анимация «Мастер собирает мебель» на главной.
   Сцена — SVG, движение — CSS (см. блок «Мастер» в style.css). Без включённого JS остаётся готовый стеллаж. */
(function () {
  const root = document.getElementById("assembly");
  if (!root) return;

  const INK = "#14110f";
  const st = (w = 4) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const WOOD = "#d9a066";
  const BOOK_COLORS = ["#ff5a36", "#2b4bff", "#ffd23f", "#7be0b5", "#ffb3c7", "#9b7bff"];

  // стопка книг на полке: floor — y верхней грани полки
  const books = (floor, x0, heights, shift = 0) =>
    heights
      .map((h, i) => {
        const x = x0 + i * 13.5;
        return `<rect x="${x}" y="${floor - h}" width="11" height="${h}" rx="2" fill="${BOOK_COLORS[(i + shift) % BOOK_COLORS.length]}" ${st(2.5)}/>`;
      })
      .join("");

  // деталь стеллажа, которая «прилетает» на место: --fx/--fy/--fr — откуда, --d — когда
  const piece = (d, fx, fy, fr, inner) =>
    `<g class="piece" style="--d:${d}s;--fx:${fx}px;--fy:${fy}px;--fr:${fr}deg">${inner}</g>`;
  const board = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${WOOD}" ${st()}/>`;

  const word = (d, x, y, text) => `<text class="word" style="--d:${d}s" x="${x}" y="${y}" text-anchor="middle">${text}</text>`;
  const star = (d, x, y, s) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><path class="spark" style="--d:${d}s" d="M0-18L5-5L18 0L5 5L0 18L-5 5L-18 0L-5-5Z" fill="#ffd23f" ${st(3)}/></g>`;

  const scene = `
  <svg viewBox="0 0 900 380" role="img" aria-label="Мастер приходит и собирает стеллаж">
    <rect width="900" height="300" fill="#bfe9d6"/>
    <rect y="300" width="900" height="80" fill="#d9a066"/>
    ${[1, 2, 3].map((i) => `<path d="M0 ${300 + i * 20}H900" stroke="rgba(20,17,15,.16)" stroke-width="2"/>`).join("")}
    <rect y="294" width="900" height="10" fill="${INK}"/>

    <g ${st()}>
      <rect x="60" y="40" width="150" height="110" rx="6" fill="#b9e6ff"/>
      <path d="M135 40V150M60 95H210" fill="none"/>
      <circle cx="96" cy="68" r="12" fill="#ffd23f"/>
      <rect x="290" y="60" width="70" height="86" rx="4" fill="#fff"/>
      <rect x="302" y="72" width="46" height="62" fill="#ff5a36"/>
      <path d="M850 0V50" fill="none"/>
      <path d="M826 96l10-46h28l10 46z" fill="#ffd23f"/>
    </g>

    <!-- стеллаж: детали по порядку сборки -->
    <g class="bookcase">
      ${piece(2.9, 0, -220, 6, `<rect x="616" y="78" width="168" height="208" fill="#ecc98f" ${st(3)}/><path d="M658 80V284M700 80V284M742 80V284" stroke="${INK}" stroke-opacity=".18" stroke-width="2"/>`)}
      ${piece(3.5, -260, -30, -50, board(600, 70, 16, 230))}
      ${piece(4.1, 240, -40, 50, board(784, 70, 16, 230))}
      ${piece(4.7, 200, 90, 20, board(600, 286, 200, 14))}
      ${piece(5.2, 220, -90, -30, board(616, 232, 168, 14))}
      ${piece(5.7, -240, -120, 25, board(616, 176, 168, 14))}
      ${piece(6.2, 230, -150, -20, board(616, 120, 168, 14))}
      ${piece(6.7, -200, -200, 15, board(596, 62, 208, 16))}

      <g class="items">
        <g style="--d:7.2s">${books(120, 622, [30, 36, 26, 34, 30, 38, 28, 32, 30, 36, 28, 34])}</g>
        <g style="--d:7.4s">
          <rect x="626" y="150" width="26" height="26" rx="4" fill="#ff5a36" ${st(2.5)}/>
          <path d="M639 150C628 138 624 132 622 122C634 124 640 132 639 142C644 130 650 124 660 122C658 132 652 142 639 150Z" fill="#3d8a4f" ${st(2.5)}/>
          <rect x="690" y="166" width="70" height="10" rx="2" fill="#2b4bff" ${st(2.5)}/>
          <rect x="694" y="156" width="62" height="10" rx="2" fill="#ffd23f" ${st(2.5)}/>
          <rect x="692" y="146" width="66" height="10" rx="2" fill="#ff5a36" ${st(2.5)}/>
        </g>
        <g style="--d:7.6s">
          <rect x="624" y="198" width="64" height="34" rx="6" fill="#e9c88f" ${st(2.5)}/>
          <path d="M628 208H684M628 218H684" stroke="${INK}" stroke-opacity=".4" stroke-width="2"/>
          <rect x="708" y="206" width="62" height="26" rx="3" fill="#fff" ${st(2.5)}/>
          <rect x="720" y="214" width="38" height="8" rx="2" fill="#ffb3c7"/>
        </g>
        <g style="--d:7.8s">${books(286, 622, [30, 26, 34, 30, 36, 28, 32, 30, 34, 28, 30, 32], 3)}</g>
      </g>
    </g>

    ${word(3.4, 570, 112, "тук!")}
    ${word(4.0, 830, 116, "тук-тук")}
    ${word(4.6, 568, 196, "вжж!")}
    ${word(5.2, 832, 206, "клац!")}
    ${word(5.8, 566, 262, "тук!")}
    ${word(6.4, 830, 270, "щёлк!")}
    ${word(7.0, 700, 50, "вжж!")}

    ${star(8.0, 584, 58, 1)}${star(8.1, 818, 52, 0.8)}${star(8.2, 826, 262, 1.1)}${star(8.3, 580, 252, 0.7)}

    <!-- ящик с инструментами: мастер ставит его на пол -->
    <g class="toolbox" transform="translate(365 300)">
      <rect x="-26" y="-30" width="52" height="30" rx="5" fill="#ff5a36" ${st(3.5)}/>
      <path d="M-13 -30V-38H13V-30" fill="none" ${st(3.5)}/>
      <rect x="-6" y="-22" width="12" height="8" rx="2" fill="#ffd23f" ${st(2.5)}/>
    </g>

    <!-- мастер: ноги → корпус → голова → руки -->
    <g transform="translate(500 300)">
      <g class="m-walk">
        <ellipse cx="0" cy="3" rx="46" ry="8" fill="rgba(20,17,15,.28)"/>
        <g class="m-leg m-leg--a">
          <rect x="-26" y="-68" width="18" height="62" rx="8" fill="#1d36c2" ${st(3.5)}/>
          <rect x="-31" y="-12" width="30" height="14" rx="6" fill="${INK}"/>
        </g>
        <g class="m-leg m-leg--b">
          <rect x="8" y="-68" width="18" height="62" rx="8" fill="#1d36c2" ${st(3.5)}/>
          <rect x="3" y="-12" width="30" height="14" rx="6" fill="${INK}"/>
        </g>
        <g class="m-upper">
          <g class="m-arm m-arm--back">
            <rect x="-42" y="-124" width="15" height="56" rx="7.5" fill="#ff5a36" ${st(3)}/>
            <circle cx="-34.5" cy="-66" r="8" fill="#ffcba4" ${st(3)}/>
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
            <rect x="26" y="-124" width="15" height="56" rx="7.5" fill="#ff5a36" ${st(3)}/>
            <rect x="29" y="-62" width="9" height="20" rx="3" fill="#2b4bff" ${st(2.5)}/>
            <rect x="32" y="-44" width="3" height="26" fill="#cfd4d8" ${st(2)}/>
            <circle cx="33.5" cy="-66" r="8" fill="#ffcba4" ${st(3)}/>
          </g>
        </g>
      </g>
    </g>

    <g class="bubble">
      <path d="M440 18H620Q634 18 634 32V60Q634 74 620 74H530L506 98L508 74H440Q426 74 426 60V32Q426 18 440 18Z" fill="#fff" ${st()}/>
      <text x="530" y="55" text-anchor="middle">Готово! 🎉</text>
    </g>
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
    replay.hidden = true; // без движения показываем готовый стеллаж
    return;
  }

  function play() {
    root.classList.remove("is-armed", "is-playing");
    void root.offsetWidth; // перезапуск CSS-анимаций
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
