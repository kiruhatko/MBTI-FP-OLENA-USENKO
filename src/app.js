/* ═════════════ ДЗЕРКАЛО · FP | OLENA USENKO ═════════════
   Фан проходить той самий тест, що й Олена, отримує свій повний результат і порівняння з нею.
   Усе рахується в браузері. Відповіді лежать лише в localStorage цього пристрою; мережевих запитів сторінка не робить
   (CSP default-src 'none' їх і не пропустила б). Ніяких імен, пошти, віку чи акаунтів. */
const ST_KEY = 'fp-dzerkalo.v1';
const app = document.getElementById('app');
const $ = s => document.querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => RM.matches;
const FINE = matchMedia('(hover:hover) and (pointer:fine)');
const VIEWS = ['intro', 'quiz', 'confirm', 'result'];
const blank = () => ({ quick: false, pos: 0, ans: Array(NQ).fill(null), view: 'intro', done: false });
function load() {
  try {
    const x = JSON.parse(lsGet(ST_KEY));
    if (x && x.qh === QH && typeof x.a === 'string' && x.a.length === NQ)
      return { quick: !!x.quick, pos: Math.max(0, x.pos | 0), ans: decA(x.a), view: VIEWS.includes(x.view) ? x.view : 'intro', done: !!x.done };
  } catch (e) { /* пошкоджений стан — почнемо заново */ }
  return null;
}
let S = load() || blank();
const save = () => lsSet(ST_KEY, JSON.stringify({ qh: QH, quick: S.quick, pos: S.pos, a: encA(S.ans), view: S.view, done: S.done }));
const list = () => S.quick ? ORDER.filter(qi => QUICK_SET.has(qi)) : ORDER;
const total = () => list().length;
const answered = () => list().filter(qi => S.ans[qi] != null).length;
const firstGap = () => { const i = list().findIndex(qi => S.ans[qi] == null); return i < 0 ? null : i; };
const borderLim = () => S.quick ? 0.25 : 0.12;      // як у MBTI-source/src/5-result.js
const usedAns = () => S.quick ? S.ans.map((v, i) => QUICK_SET.has(i) ? v : null) : S.ans;
const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };
const uc = s => String(s).toUpperCase();

/* ───── дрібні графічні штуки: іскри, прибулець, печатка ELLIENS, штрихкод, рвані краї, «колаж» ───── */
function rng(seed) { let a = seed >>> 0 || 1; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const SPK = '<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="currentColor" d="M50 0C53 35 65 47 100 50C65 53 53 65 50 100C47 65 35 53 0 50C35 47 47 35 50 0Z"/></svg>';
const spk = (x, y, sz, cls, d, dl) => `<span class="spk ${cls || ''}" style="left:${x};top:${y};--sz:${sz}px;--d:${d || 3.2}s;--dl:${dl || 0}s">${SPK}</span>`;
const ALIEN_P = '<path d="M50 6C79 6 95 27 93 47C91 67 66 92 50 95C34 92 9 67 7 47C5 27 21 6 50 6Z" fill="none" stroke="currentColor" stroke-width="7" stroke-linejoin="round"/><path d="M24 47C29 37 43 40 46 53C37 59 26 57 24 47Z" fill="currentColor"/><path d="M76 47C71 37 57 40 54 53C63 59 74 57 76 47Z" fill="currentColor"/>';
const ALIEN = `<svg viewBox="0 0 100 100" aria-hidden="true">${ALIEN_P}</svg>`;
let uid = 0;
function stamp(cls, style) {
  const id = 'stp' + (++uid);
  return `<span class="stamp ${cls || ''}" style="${style || ''}"><svg viewBox="0 0 120 120" aria-hidden="true"><defs><path id="${id}" d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1-90 0"/></defs>
    <circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" stroke-width="4.5"/><circle cx="60" cy="60" r="34" fill="none" stroke="currentColor" stroke-width="2"/>
    <text font-family="FP Display" font-weight="900" font-size="20" fill="currentColor"><textPath href="#${id}" textLength="276" lengthAdjust="spacing">ELLIENS ✦ ELLIENS ✦</textPath></text>
    <g transform="translate(39 39) scale(.42)">${ALIEN_P}</g></svg></span>`;
}
function barcode(seed, h) {
  h = h || 44; const r = rng(seed); let x = 0, s = '';
  while (x < 150) { const w = 1 + Math.floor(r() * 3.3); if (r() > .36) s += `<rect x="${x}" width="${w}" height="${h}"/>`; x += w + 1 + Math.floor(r() * 2); }
  return `<svg viewBox="0 0 ${x} ${h}" fill="currentColor" aria-hidden="true">${s}</svg>`;
}
function tornPath(seed, amp, step) {
  const r = rng(seed); const top = [], bot = []; amp = amp || 3.5; step = step || 1.6;
  for (let x = 0; ; x += step + r() * step) {
    const X = Math.min(100, x).toFixed(2);
    top.push(`${X}% ${(r() * amp).toFixed(1)}px`); bot.push(`${X}% calc(100% - ${(r() * amp).toFixed(1)}px)`);
    if (x >= 100) break;
  }
  return `polygon(${top.join(',')},${bot.reverse().join(',')})`;
}
const applyTorn = () => $$('[data-torn]').forEach(el => { el.style.clipPath = tornPath(+el.dataset.torn, +(el.dataset.amp || 3.5)); });
function collage(text, seed, red, go) {
  const r = rng(seed);
  const parts = [...text].map((ch, i) => {
    if (ch === ' ') return '<i style="--c1:transparent">&nbsp;</i>';
    const redFirst = r() < (red == null ? .5 : red), c1 = redFirst ? 'var(--blood)' : 'var(--void)', c2 = redFirst ? 'var(--void)' : 'var(--blood)';
    const st = r() < .3 ? `--c1:${c1};--c2:${c1}` : `--a:${Math.round(70 + r() * 70)}deg;--s:${Math.round(34 + r() * 36)}%;--c1:${c1};--c2:${c2}`;
    return `<i style="--i:${i};--r:${(r() * 14 - 7).toFixed(1)}deg;${st}">${esc(ch)}</i>`;
  }).join('');
  return `<span class="cl${go ? ' go' : ''}" aria-hidden="true">${parts}</span><span class="sr">${esc(text)}</span>`;
}
/* «від руки» овал-дзеркало: точки по еліпсу з тремтінням, кінці трохи заходять один на один */
function ovalPath(cx, cy, rx, ry, rot, seed, jit) {
  const r = rng(seed), n = 34, a0 = r() * 6.283, pts = [], c = Math.cos(rot), s = Math.sin(rot); jit = jit || 5;
  for (let i = 0; i <= n; i++) {
    const a = a0 + i / n * 6.283 * 1.07, j = 1 + (r() - .5) * jit / Math.max(rx, ry);
    const x = Math.cos(a) * rx * j, y = Math.sin(a) * ry * j;
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  const f = v => v.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/* ───── спільні блоки ───── */
const setLabel = t => { $('#phr').textContent = t; };
function privacy() {
  const has = S.ans.some(v => v != null);
  return `<section class="priv rv" id="privacy" aria-labelledby="privt">
    <span class="kick" id="privt">Конфіденційність</span>
    <p class="big">Твої відповіді не залишають твій пристрій. Ми нічого не збираємо.</p>
    <ul>
      <li>Ні реєстрації, ні імен, ні пошти, ні віку — і полів для них тут немає.</li>
      <li>Ні аналітики, ні пікселів, ні сторонніх шрифтів чи запитів у мережу: після завантаження сторінка працює навіть офлайн.</li>
      <li class="ok">Прогрес зберігається лише в пам'яті цього браузера — і стирається однією кнопкою.</li>
      <li class="ok">Від Олени тут лише підсумки її тесту: тип і відсотки за шкалами та гранями. Її відповідей на окремі твердження на сайті немає.</li>
    </ul>
    <p class="fine">Хостинг (GitHub Pages), як і будь-який сайт, бачить сам запит на сторінку. Твоїх відповідей у ньому немає.</p>
    ${has ? '<button class="linkb danger" data-act="erase">Стерти мої відповіді</button>' : '<span class="fine">Зараз на цьому пристрої відповідей немає.</span>'}
  </section>`;
}
function ticker() {
  const one = ['FP | OLENA USENKO', 'ДЗЕРКАЛО', 'ПОРІВНЯЙ СЕБЕ З ОЛЕНОЮ', 'THE ELLIENS', 'ВІДПОВІДІ НЕ ПОКИДАЮТЬ ТВІЙ ПРИСТРІЙ'].map(t => `<span>${t} <b>✦</b></span>`).join('');
  return `<div class="ticker" data-torn="21" data-amp="4" aria-hidden="true"><div>${one}${one}${one}${one}</div></div>`;
}
const footer = () => `<footer class="foot" data-torn="33" data-amp="5">${barcode(7)}
  <div class="h"><a href="https://t.me/olenausenko_fan" target="_blank" rel="noopener noreferrer">TG @OLENAUSENKO_FAN</a><br>
  <a href="https://www.instagram.com/fan_olena.usenko/" target="_blank" rel="noopener noreferrer">IG @FAN_OLENA.USENKO</a></div></footer>`;

/* ───── рендер ───── */
let slotT = null, IO = null, NAVIO = null;
function render(keepScroll) {
  clearInterval(slotT);
  if (!keepScroll) window.scrollTo(0, 0);
  ({ intro: introV, quiz: quizV, confirm: confirmV, result: resultV })[S.view]();
  applyTorn(); observe();
}

function introV() {
  setLabel('MBTI · ІНТЕРАКТИВ');
  const n = answered(), started = S.ans.some(v => v != null) && !S.done;
  const cta = S.done
    ? `<button class="btn primary big" data-act="show">Мій результат<small>ти і Олена · ${S.quick ? 'швидкий тест' : 'повний тест'}</small></button>
       <div class="row2"><button class="linkb" data-act="reset">Пройти заново</button><button class="linkb danger" data-act="erase">Стерти мої відповіді</button></div>`
    : started
    ? `<button class="btn primary big" data-act="resume">Продовжити · ${n} з ${total()}<small>${S.quick ? 'швидкий тест' : 'повний тест'}</small></button>
       <div class="row2"><button class="linkb" data-act="reset">Почати спочатку</button><button class="linkb danger" data-act="erase">Стерти мої відповіді</button></div>`
    : `<button class="btn primary big" data-act="start" data-q="0">Повний тест · ${NQ}<small>12–15 хв · точніше, з гранями характеру</small></button>
       <button class="btn big" data-act="start" data-q="1">Швидкий · ${QUICK.length}<small>5 хв · орієнтовно, лише шкали</small></button>`;
  app.innerHTML = `<section class="intro">
    <div class="hero">
      <div>
        <div class="kick">Тест на характер · той самий, що пройшла Олена</div>
        <h1 class="hero-t">${collage('ДЗЕРКАЛО', 230, .5, true)}</h1>
        <p class="hero-q">Наскільки ви з <em>Оленою Усенко</em> схожі?</p>
        <p class="lead">Олена вже відповіла на всі ${NQ} тверджень. Тепер твоя черга: ті самі твердження, той самий підрахунок — і чесне порівняння за 4 шкалами та 19 гранями характеру.</p>
        <div class="cta">${cta}</div>
      </div>
      <div class="mirrors" aria-hidden="true">
        <svg viewBox="0 0 520 480" style="inset:0;width:100%;height:100%">
          <g class="oval me"><path class="ring" pathLength="1" d="${ovalPath(168, 205, 142, 172, -.12, 3)}"/><path class="ring b" pathLength="1" d="${ovalPath(170, 207, 133, 163, -.09, 4, 9)}"/></g>
          <g class="oval her"><path class="ring" pathLength="1" d="${ovalPath(388, 304, 116, 142, .14, 5)}"/><path class="ring b" pathLength="1" d="${ovalPath(386, 302, 108, 134, .1, 6, 9)}"/></g>
          <g class="arrow2"><path pathLength="1" d="M258 74C306 30 372 46 404 128"/><path pathLength="1" d="M392 104L404 130L414 102"/><path pathLength="1" d="M256 98L254 70L282 66"/></g>
        </svg>
        <div class="mtxt" style="left:32.5%;top:42.5%"><small>Твій тип</small><b>ТИ?</b><span class="slots">${CORE.map(ax => `<span class="slot">${ax.a.k}</span>`).join('')}</span></div>
        <div class="mtxt her" style="left:74.5%;top:63%"><small>Олена</small><b>????</b><span class="sub">після тесту</span></div>
        ${spk('4%', '4%', 30, '', 3.4)}${spk('88%', '6%', 22, 'k', 2.8, .6)}${spk('56%', '86%', 26, '', 3, 1.1)}${spk('2%', '78%', 18, 'k', 3.6, .3)}
        ${stamp('slam', 'right:0;bottom:-2%;--sz:clamp(80px,25cqw,132px);--dl:1.3s')}
      </div>
    </div>
    <div class="bar" data-torn="11"><i class="seg" style="--x:58%;--w:22%"></i></div>
    <ol class="steps">
      <li class="rv"><b>Олена вже пройшла</b><span>Повну версію — ${NQ} тверджень. На сайті лише її підсумки: тип і відсотки, без відповідей.</span></li>
      <li class="rv"><b>Твоя черга</b><span>Оцінюй кожне твердження від −3 до +3 — так, як є зазвичай, а не як «правильно».</span></li>
      <li class="rv"><b>Порівняння</b><span>Близькість у відсотках, шкала за шкалою, і грані, де ви найбільш схожі й найбільш різні.</span></li>
    </ol>
    ${privacy()}
  </section>${ticker()}${footer()}`;
  startSlots(); tilt($('.mirrors'));
}
function startSlots() {
  const el = $$('.mirrors .slot'); if (!el.length || reduced()) return;
  slotT = setInterval(() => {
    const i = Math.floor(Math.random() * 4), ax = CORE[i], s = el[i];
    s.textContent = s.textContent === ax.a.k ? ax.b.k : ax.a.k;
    s.classList.remove('flip'); void s.offsetWidth; s.classList.add('flip');
  }, 620);
}
function tilt(el) {
  if (!el || !FINE.matches || reduced()) return;
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    el.style.transform = `perspective(1000px) rotateY(${(x * 9).toFixed(2)}deg) rotateX(${(-y * 9).toFixed(2)}deg)`;
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
}

/* ───── тест: оболонка лишається, міняється лише картка — тож смужка прогресу й прибулець їдуть плавно ───── */
let busy = false;
function quizV() {
  if (!$('.quiz')) {
    app.innerHTML = `<section class="quiz">
      <div class="qmeta"><span id="qm-l"></span><span class="n" id="qm-n"></span></div>
      <div class="prog" aria-hidden="true"><div class="bar" data-torn="5" data-amp="2.5"><i class="fill" id="pf"></i></div><span class="rider" id="pr">${ALIEN}</span></div>
      <div id="qslot"></div>
      <div class="qnav"><button class="btn ghost" data-act="prev" id="bprev">← Назад</button><button class="btn ghost" data-act="next" id="bnext">Далі →</button></div>
      ${FINE.matches ? '<p class="keys">Клавіші 1–7 — відповідь · ← назад</p>' : ''}
      <p class="fine center-t">Відповіді лишаються лише на цьому пристрої · <button class="linkb" data-act="home">пауза</button></p>
    </section>`;
  }
  drawCard();
}
function drawCard(mile) {
  const L = list(), qi = L[S.pos], q = QUESTIONS[qi], cur = S.ans[qi], n = answered(), T = L.length, pct = n / T * 100;
  setLabel(`${S.quick ? 'ШВИДКИЙ' : 'ПОВНИЙ'} ТЕСТ · ${Math.round(pct)}%`);
  $('#qm-l').textContent = S.quick ? 'Швидкий тест · орієнтовно' : 'Повний тест';
  $('#qm-n').textContent = `${S.pos + 1} / ${T}`;
  $('#pf').style.width = pct + '%'; $('#pr').style.left = pct + '%';
  $('#qslot').innerHTML = `<div class="qcard in" role="group" aria-label="Твердження ${S.pos + 1} з ${T}">
      ${mile ? `<span class="milestone">${mile}</span>` : ''}
      <span class="no" aria-hidden="true">${S.pos + 1}</span>
      <div class="kick">Наскільки це про тебе?</div>
      <div class="qtext">${esc(q.self)}</div>
      ${S.pos === 0 && n === 0 ? '<p class="hint">−3 — зовсім не про мене · 0 — нейтрально · +3 — точно про мене</p>' : ''}
      <div class="scale" role="radiogroup" aria-label="Оцінка від −3 до +3">
        ${SCALE.map(v => `<button class="pt ${v < 0 ? 'neg' : v > 0 ? 'pos' : 'zero'}${cur === v ? ' sel' : ''}" data-act="ans" data-v="${v}" data-l="${sgn(v)}" role="radio" aria-checked="${cur === v}" aria-label="${SCALE_LABEL[v]}"></button>`).join('')}
      </div>
      <div class="scale-cap"><span>Зовсім ні</span><span>Цілком так</span></div>
    </div>`;
  $('#bprev').disabled = S.pos === 0;
  $('#bnext').style.visibility = cur != null && S.pos < T - 1 ? 'visible' : 'hidden';
}
function answer(v) {
  if (busy || S.view !== 'quiz') return;
  const L = list(), qi = L[S.pos], before = answered();
  S.ans[qi] = v; save();
  $$('.pt').forEach(b => { const on = +b.dataset.v === v; b.classList.toggle('sel', on); b.setAttribute('aria-checked', on); if (on) b.classList.add('stamp-in'); });
  const b = $(`.pt[data-v="${v}"]`);
  if (b && Math.abs(v) === 3) { const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 6); }
  const T = L.length, after = answered(), q4 = x => Math.floor(x / T * 4);
  const mile = q4(after) > q4(before) && after < T ? ['', 'Чверть ✦', 'Півдороги ✦', 'Фінішна пряма ✦'][q4(after)] : '';
  busy = true;
  setTimeout(() => {
    const c = $('.qcard'); if (c) c.classList.add('out');
    setTimeout(() => { busy = false; advance(mile); }, reduced() ? 0 : 170);
  }, reduced() ? 0 : 150);
}
function advance(mile) {
  if (S.pos < total() - 1) { S.pos++; save(); drawCard(mile); return; }
  const g = firstGap();
  if (g == null) { S.view = 'confirm'; save(); render(); }
  else { S.pos = g; save(); drawCard(); }
}

function confirmV() {
  setLabel('ГОТОВО');
  app.innerHTML = `<section class="done">
    <div class="kick">Усі ${total()} ${plural(total(), 'відповідь', 'відповіді', 'відповідей')} є</div>
    <h1 class="hero-t">${collage('ГОТОВО', 41, .45, true)}</h1>
    <p class="lead" style="margin:0 auto 22px">Можна ще раз переглянути відповіді або одразу подивитись у дзеркало: твій тип і наскільки ви з Оленою схожі.</p>
    <div class="cta" style="margin:0 auto"><button class="btn primary big" data-act="finish">Показати результат</button>
      <button class="btn ghost" data-act="back-to-quiz">← До тверджень</button></div>
  </section>`;
}

/* ───── «сканування» перед результатом: літери крутяться й зупиняються на твоєму типі ───── */
function runScan(cb) {
  if (reduced()) { cb(); return; }
  const code = typeOf(score(usedAns())).code;
  const o = document.createElement('div'); o.className = 'scan'; o.setAttribute('role', 'status');
  o.innerHTML = `<div class="box"><svg viewBox="0 0 300 366" preserveAspectRatio="none" aria-hidden="true"><path class="ring" pathLength="1" d="${ovalPath(150, 183, 136, 168, 0, 9)}"/></svg>
    <div class="line"></div><div class="code">${code.split('').map(() => '<span class="slot">?</span>').join('')}</div><div class="cap">Дивимось у дзеркало…<br>натисни, щоб пропустити</div></div>`;
  document.body.appendChild(o);
  const slots = $$('.slot', o); let k = 0, done = false;
  const iv = setInterval(() => slots.forEach((s, i) => { if (!s.classList.contains('lock')) s.textContent = (k + i) % 2 ? CORE[i].a.k : CORE[i].b.k; }), 70);
  const tick = setInterval(() => k++, 70);
  const timers = code.split('').map((ch, i) => setTimeout(() => { slots[i].textContent = ch; slots[i].classList.add('lock'); }, 650 + i * 260));
  const end = () => {
    if (done) return; done = true;
    clearInterval(iv); clearInterval(tick); timers.forEach(clearTimeout); clearTimeout(tEnd);
    cb(); o.classList.add('bye'); setTimeout(() => o.remove(), 600);
  };
  const tEnd = setTimeout(end, 650 + 4 * 260 + 420);
  o.addEventListener('click', end);
}

/* ───── результат ───── */
let RES = null;
const duo = (me, her, ax) => {
  const lab = (p, a) => { const first = p > 50; return `${first ? a.a.k : a.b.k} ${first ? p : 100 - p}%`; };
  return `<div class="duo">
    <div class="who">Ти<div class="tr"><i style="--w:${me}%"></i></div><b>${ax ? lab(me, ax) : me + '%'}</b></div>
    <div class="who red">Олена<div class="tr her"><i style="--w:${her}%"></i></div><b>${ax ? lab(her, ax) : her + '%'}</b></div></div>`;
};
function resultV() {
  setLabel(S.quick ? 'РЕЗУЛЬТАТ · ОРІЄНТОВНО' : 'РЕЗУЛЬТАТ');
  const ans = usedAns(), sc = score(ans), t = typeOf(sc), info = TYPES[t.code], g = GROUPS[groupOf(t.code)];
  const alts = altTypes(sc, borderLim());
  const ok = refValid(), cmp = ok ? compareWith(sc, S.quick, ans) : null;
  RES = { t, info, sc, cmp };
  const flaps = CORE.map(ax => { const po = pole(ax, sc.ax[ax.id]); return `<div class="flap"><span class="l">${po.p.k}</span><small>${po.p.name}</small><em>${po.pct}%</em></div>`; }).join('');
  const at = pole(AXES[4], sc.ax.AT);

  const vs = !ok ? `<section class="sec" id="vs"><div class="kick tag r">Ти і Олена</div><p class="lead">Порівняння недоступне: версія тесту не збігається з еталоном Олени.</p></section>` : `
  <section class="sec" id="vs">
    <div class="kick tag r">Ти і Олена${S.quick ? ' · орієнтовно' : ''}</div>
    <div class="vs">
      <div class="closebox" data-on="count">
        <svg class="mir" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true"><path class="ring" pathLength="1" d="${ovalPath(200, 150, 186, 136, -.05, 12)}"/><path class="ring b" pathLength="1" d="${ovalPath(202, 152, 176, 128, -.02, 13, 10)}"/></svg>
        ${spk('6%', '8%', 28)}${spk('86%', '14%', 20, 'k', 2.7, .5)}${spk('80%', '78%', 24, '', 3.3, 1)}
        <div><div class="cnum"><span id="cn">${reduced() ? cmp.closeness : 0}</span><span class="pc">%</span></div>
        <div class="ccap">Близькість з Оленою${S.quick ? '<br>швидкий тест — орієнтовно' : ''}</div></div>
      </div>
      <div>
        <p class="lvl">${cmp.level.t}</p>
        <p class="lead">${cmp.level.d}</p>
        <div class="codes rv" aria-label="Літери типу: ти ${t.code}, Олена ${REF.type}">
          <div class="c"><small>Ти</small><b>${cmp.letters.map(l => `<i class="${l.same ? 'm' : ''}">${l.me}</i>`).join('')}</b></div>
          <span class="x">↔</span>
          <div class="c her"><small>Олена</small><b>${cmp.letters.map(l => `<i class="${l.same ? 'm' : ''}${l.near ? ' nr' : ''}">${l.her}</i>`).join('')}</b></div>
        </div>
        <p class="how">Літера показує лише, по який бік від 50 % ти опинився на шкалі. ${nearText()} Тому головне тут — відсотки й близькість, а не збіг літер.</p>
        <div class="rv" style="margin-top:18px">
          ${cmp.axes.map(a => `<div class="axrow">
            <div class="top"><span class="t">${a.ax.title}</span><span class="d">різниця ${a.d} п.п.</span></div>
            <div class="poles"><span><b>${a.ax.a.k}</b> ${a.ax.a.name}</span><span>${a.ax.b.name} <b>${a.ax.b.k}</b></span></div>
            ${duo(a.me, a.her, a.ax)}
            ${a.near ? '<span class="near">у Олени майже порівну</span>' : ''}${a.core ? '' : '<p class="at-note">Ця шкала (-A/-T) не входить у близькість — лише 4 основні.</p>'}
          </div>`).join('')}
          <p class="how">Як рахуємо: близькість = 100 − середня різниця у відсотках за чотирма шкалами (E/I, S/N, T/F, J/P). 100 % — ваші відсотки збігаються на всіх чотирьох.</p>
        </div>
      </div>
    </div>
  </section>
  <section class="sec" id="fc">
    <div class="kick tag">Грані характеру</div>
    <h2 class="sec-t">Де ви схожі, <span class="red">а де ні</span></h2>
    ${cmp.facets ? `
      <h3>Найбільш схожі</h3><div class="fgrid">${cmp.facets.same.map(x => facetCard(x, 'same')).join('')}</div>
      <h3 style="margin-top:26px">Найбільш різні</h3><div class="fgrid">${cmp.facets.diff.map(x => facetCard(x, 'diff')).join('')}</div>`
    : `<p class="lead">Грані показуємо лише після повного тесту: у швидкому на кожну грань припадає 1–2 твердження, і порівнювати їх було б нечесно.</p>
      <button class="btn primary" data-act="full">Дорахувати повний тест<small>твої ${QUICK.length} відповідей збережуться</small></button>`}
    ${cmp.stmts ? `<div class="rv" style="margin-top:28px"><p class="lvl">Ви однаково відповіли на ${cmp.stmts.n} з ${cmp.stmts.total}</p>
      <p class="fine">«Однаково» — різниця не більше 1 бала. Ось де ви найбільш схожі:</p>
      ${cmp.stmts.top.map(r => `<div class="stm"><p>${esc(r.q.self)}</p><span class="fine">Ти: ${SCALE_LABEL[r.a]} · Олена: ${SCALE_LABEL[r.b]}</span></div>`).join('')}</div>` : ''}
  </section>`;

  const axes = AXES.map(ax => {
    const p = pctOf(sc.ax[ax.id]), domA = p > 50, dp = domA ? p : 100 - p, dom = domA ? ax.a : ax.b;
    const strength = dp < 55 ? 'майже порівну' : dp < 65 ? 'помірно' : dp < 78 ? 'виразно' : 'яскраво виражено';
    return `<div class="axcard rv">
      <div class="axhead"><span class="kick">${ax.title}</span><span class="fine">${ax.hint}</span></div>
      <div class="axhead big"><span class="${domA ? 'win' : ''}">${ax.a.k} · ${ax.a.name} ${p}%</span><span class="${domA ? '' : 'win'}">${100 - p}% ${ax.b.name} · ${ax.b.k}</span></div>
      <div class="track"><i style="--w:${p}%"></i></div>
      <p class="fine"><b>${dom.name}</b> — ${strength} (${dp}%).${sc.n[ax.id] < 3 ? ' <i>Мало даних для цієї шкали.</i>' : ''}</p></div>`;
  }).join('');
  const border = CORE.filter(ax => Math.abs(sc.ax[ax.id]) < borderLim())
    .map(ax => `<li>${ax.a.name} / ${ax.b.name}: ${pctOf(sc.ax[ax.id])}% / ${100 - pctOf(sc.ax[ax.id])}%</li>`);
  const facets = S.quick
    ? `<p class="lead">Грані доступні в повному тесті (${NQ} тверджень): у швидкому на кожну грань припадає лише 1–2 твердження, тож показувати їх було б ненадійно.</p>`
    : AXES.map(ax => `<div class="fgroup rv"><h4>${ax.title} · ${ax.a.k}/${ax.b.k}</h4>` +
        FACETS.filter(f => f.axis === ax.id).map(f => { const p = pctOf(sc.fc[f.id]);
          return `<div class="facet"><div class="axhead"><span class="${p > 50 ? 'win' : ''}">${f.a}</span><span class="nm">${f.name}</span><span class="${p < 50 ? 'win' : ''}">${f.b}</span></div>
            <div class="track thin"><i style="--w:${p}%"></i></div><div class="fine center-t">${p}% / ${100 - p}%</div></div>`; }).join('') + '</div>').join('');
  const fns = STACK[t.code].split(' ').map((f, i) => `<div class="fn rv"><small>${STACK_ROLES[i][0]} · ${STACK_ROLES[i][1]}</small><div class="code">${f}</div><b>${FN[f].n}</b><p class="fine">${FN[f].d}</p></div>`).join('');

  app.innerHTML = `<section class="res">
    <nav class="rnav" aria-label="Розділи результату">
      <a href="#me">Твій тип</a>${ok ? '<a href="#vs">Ти і Олена</a><a href="#fc">Грані</a>' : ''}<a href="#ax">Шкали</a>${S.quick ? '' : '<a href="#fl">Усі грані</a>'}<a href="#fn">Функції</a><a href="#ds">Опис</a><a href="#sh">Поділитися</a>
    </nav>
    <section class="sec" id="me">
      <div class="kick tag">Твій результат · ${S.quick ? 'швидкий тест' : 'повний тест'}</div>
      <div class="r-hero">
        <div class="flaps" aria-label="Тип ${t.full}">${flaps}<div class="flap sfx"><span class="l">-${at.p.k}</span><small>${at.p.name}</small><em>${at.pct}%</em></div></div>
        <div style="position:relative">
          <h1 class="tname">${collage(info.n, 77, .55, true)}</h1>
          <p class="lead">${info.tag}</p>
          <div class="chips"><span class="chip k">${t.full}</span><span class="chip">${g.n}</span>
            ${S.quick ? '<span class="chip warn">⚡ орієнтовно</span>' : ''}
            ${alts.length ? `<span class="chip">Може бути також: ${alts.join(' · ')}</span>` : ''}</div>
          ${stamp('slam', 'right:-6px;top:-34px;--sz:clamp(86px,20vw,124px);--dl:1.6s')}
        </div>
      </div>
    </section>
    ${vs}
    <section class="sec" id="ax"><div class="kick tag">Твої шкали</div><h2 class="sec-t">П'ять шкал</h2>${axes}
      ${border.length ? `<div class="rv" style="margin-top:18px"><h3>Де тип може змінитись</h3><p class="fine">Тут ти майже посередині: залежно від ситуації чи настрою тип може «гойдатися».</p><ul class="facts">${border.map(x => x).join('')}</ul></div>` : ''}
    </section>
    ${S.quick ? '' : `<section class="sec" id="fl"><div class="kick tag">Твої грані</div><h2 class="sec-t">Усі 19 граней</h2><p class="fine">Дрібніші шкали всередині кожної осі.</p>${facets}</section>`}
    <section class="sec" id="fn"><div class="kick tag">Модель</div><h2 class="sec-t">Когнітивні функції</h2>
      <p class="fine" style="margin-bottom:14px">За теорією MBTI типовий «стек» для ${t.code}: від найсильнішої функції до найслабшої. Це модель, а не вимір.</p><div class="fns">${fns}</div></section>
    <section class="sec" id="ds"><div class="kick tag">${t.code}</div><h2 class="sec-t">${info.n}</h2><p class="desc rv">${info.d}</p>
      <div class="two rv"><div><h3>Сильні сторони</h3><ul class="facts">${info.pro.map(x => `<li>${x}</li>`).join('')}</ul></div>
        <div><h3>На що звернути увагу</h3><ul class="facts">${info.con.map(x => `<li>${x}</li>`).join('')}</ul></div></div>
      <h3>Як цей тип поводиться в дружбі</h3><p class="desc rv">${info.fr}</p></section>
    <section class="sec" id="sh"><div class="kick tag r">Поділитися</div><h2 class="sec-t">Покажи результат</h2>
      <div class="share">
        <div class="btns"><button class="btn primary" data-act="img">Картинка для сторіз</button><button class="btn" data-act="copy">Скопіювати текст</button></div>
        <div id="shout"></div>
        <p class="note">Картинка малюється тут, на твоєму пристрої, і нікуди не завантажується. На ній лише твій тип і близькість з Оленою — її відсотків там немає.</p>
      </div>
      <div class="cta" style="margin-top:28px">
        ${S.quick ? `<button class="btn primary" data-act="full">Пройти повний тест<small>твої ${QUICK.length} відповідей збережуться</small></button>` : ''}
        <div class="row2"><button class="linkb" data-act="reset">Пройти заново</button><button class="linkb danger" data-act="erase">Стерти мої відповіді</button></div>
      </div>
    </section>
    ${privacy()}
  </section>${ticker()}${footer()}`;
  spinFlaps(); navSpy();
}
function nearText() {
  const near = CORE.filter(ax => herNear(ax.id));
  if (!near.length) return '';
  return `У Олени ${near.map(ax => `${ax.a.k}/${ax.b.k} — ${REF.axes[ax.id].pct_first}/${100 - REF.axes[ax.id].pct_first}`).join(' і ')}: це майже порівну, тож на ${near.length > 1 ? 'цих шкалах' : 'цій шкалі'} збіг чи розбіжність літер мало що означає.`;
}
function facetCard(x, kind) {
  return `<div class="fc ${kind} rv"><span class="delta">${kind === 'same' ? '≈' : 'Δ'}${x.d}</span><h4>${x.f.name}</h4>
    <div class="ps"><span>← ${x.f.a}</span><span>${x.f.b} →</span></div>${duo(x.me, x.her)}</div>`;
}
function spinFlaps() {
  if (reduced()) return;
  $$('.flap').forEach((el, i) => {
    const L = el.querySelector('.l'), fin = L.textContent, ax = AXES[Math.min(i, 4)], sfx = i === 4;
    el.classList.add('spin'); let k = 0;
    const iv = setInterval(() => { L.textContent = (sfx ? '-' : '') + (k++ % 2 ? ax.a.k : ax.b.k); }, 70);
    setTimeout(() => { clearInterval(iv); L.textContent = fin; el.classList.remove('spin'); el.classList.add('locked'); }, 480 + i * 210);
  });
}
function navSpy() {
  NAVIO && NAVIO.disconnect();
  const links = $$('.rnav a'); if (!links.length || !('IntersectionObserver' in window)) return;
  NAVIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
    const on = links.find(a => a.classList.contains('on')), nav = $('.rnav');   // гортаємо лише саму смужку, не сторінку
    if (on && nav) nav.scrollTo({ left: on.offsetLeft - nav.clientWidth / 2 + on.clientWidth / 2, behavior: reduced() ? 'auto' : 'smooth' });
  }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(a => { const s = document.getElementById(a.getAttribute('href').slice(1)); s && NAVIO.observe(s); });
}

/* ───── поява під час прокручування, лічильник близькості ───── */
const ON = {
  count(el) {
    const tgt = RES && RES.cmp ? RES.cmp.closeness : 0, n = $('#cn'); if (!n) return;
    if (reduced()) { n.textContent = tgt; return; }
    const t0 = performance.now(), dur = 1500;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      n.textContent = Math.round(tgt * e);
      if (p < 1) requestAnimationFrame(step);
      else { const r = n.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 14); }
    };
    requestAnimationFrame(step);
  },
};
function observe() {
  IO && IO.disconnect();
  const els = $$('.rv, [data-on]');
  if (!('IntersectionObserver' in window)) { els.forEach(el => { el.classList.add('vis'); const f = ON[el.dataset.on]; f && f(el); }); return; }
  IO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('vis'); IO.unobserve(e.target);
    const f = ON[e.target.dataset.on]; f && f(e.target);
  }), { threshold: .15, rootMargin: '0px 0px -5% 0px' });
  els.forEach(el => IO.observe(el));
}
function burst(x, y, n) {
  if (reduced()) return;
  const fx = $('#fx');
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, d = 45 + Math.random() * 95, s = document.createElement('span');
    s.className = 'burst'; s.innerHTML = SPK;
    s.style.left = x - 9 + 'px'; s.style.top = y - 9 + 'px';
    s.style.setProperty('--dx', (Math.cos(a) * d).toFixed(0) + 'px'); s.style.setProperty('--dy', (Math.sin(a) * d).toFixed(0) + 'px');
    if (i % 3 === 0) s.style.color = '#111';
    fx.appendChild(s); setTimeout(() => s.remove(), 950);
  }
}
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2700); }

/* ───── поділитися: текст або картинка, намальована тут же на canvas ───── */
const siteURL = () => location.origin + location.pathname;
function shareText() {
  const { t, info, cmp } = RES;
  return `Мій тип за «Дзеркалом»: ${t.full} — ${info.n}.\n` +
    (cmp ? `Близькість з Оленою Усенко за характером: ${cmp.closeness}%${S.quick ? ' (швидкий тест, орієнтовно)' : ''}.\n` : '') +
    `\nПройди тест: ${siteURL()}`;
}
let shot = null;
async function makeCard() {
  const { t, info, cmp } = RES, W = 1080, H = 1920;
  try { await Promise.all(['900 300px "FP Display"', '800 100px "FP Display"', '600 30px "FP Mono"', '400 30px "FP Mono"'].map(f => document.fonts.load(f))); } catch (e) { /* шрифти вбудовані — це запасний шлях */ }
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), r = rng(cmp ? cmp.closeness * 31 + 7 : 7);
  x.fillStyle = '#F3F1EC'; x.fillRect(0, 0, W, H);
  // зерно паперу
  const g = document.createElement('canvas'); g.width = g.height = 160; const gx = g.getContext('2d'), id = gx.createImageData(160, 160);
  for (let i = 0; i < id.data.length; i += 4) { const v = r() < .5 ? 0 : 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = Math.floor(r() * 16); }
  gx.putImageData(id, 0, 0); x.fillStyle = x.createPattern(g, 'repeat'); x.fillRect(0, 0, W, H);
  const ink = '#111111', red = '#B8212D', paper = '#F3F1EC', M = 70;
  const txt = (s, X, Y, font, col, al) => { x.font = font; x.fillStyle = col; x.textAlign = al || 'left'; x.textBaseline = 'alphabetic'; x.fillText(s, X, Y); };
  const torn = (X, Y, w, h, col, seed) => {
    const q = rng(seed); x.beginPath(); x.moveTo(X, Y + q() * 6);
    for (let k = 0; k <= w; k += 14 + q() * 10) x.lineTo(X + Math.min(k, w), Y + q() * 7);
    for (let k = w; k >= 0; k -= 14 + q() * 10) x.lineTo(X + Math.max(k, 0), Y + h - q() * 7);
    x.closePath(); x.fillStyle = col; x.fill();
  };
  const star = (cx, cy, s, col) => {
    x.save(); x.translate(cx, cy); x.scale(s / 100, s / 100); x.translate(-50, -50);
    x.fillStyle = col; x.fill(new Path2D('M50 0C53 35 65 47 100 50C65 53 53 65 50 100C47 65 35 53 0 50C35 47 47 35 50 0Z')); x.restore();
  };
  // шапка як у постах
  txt('— FP | ДЗЕРКАЛО', M, 112, '600 30px "FP Mono"', ink);
  txt('MBTI · ІНТЕРАКТИВ', W - M, 112, '600 30px "FP Mono"', ink, 'right');
  x.fillStyle = ink; x.fillRect(M, 132, W - 2 * M, 5);
  txt('БЛИЗЬКІСТЬ З ОЛЕНОЮ УСЕНКО', W / 2, 262, '600 34px "FP Mono"', ink, 'center');
  txt('ЗА ХАРАКТЕРОМ', W / 2, 308, '600 34px "FP Mono"', ink, 'center');
  // велика цифра — «колажем» з червоного й чорного
  const num = cmp ? String(cmp.closeness) : '—';
  x.font = '900 600px "FP Display"'; const wn = x.measureText(num).width; x.font = '900 250px "FP Display"'; const wp = x.measureText('%').width;
  let X0 = (W - wn - wp - 10) / 2; const BY = 900;
  x.font = '900 600px "FP Display"';
  [...num].forEach((ch, i) => {
    const w = x.measureText(ch).width, a = .6 + r() * 1.2, sp = .35 + r() * .35;
    const gr = x.createLinearGradient(X0, BY - 430, X0 + Math.cos(a) * w, BY - 430 + Math.sin(a) * 430);
    const c1 = i % 2 ? ink : red, c2 = i % 2 ? red : ink;
    gr.addColorStop(0, c1); gr.addColorStop(sp, c1); gr.addColorStop(sp, c2); gr.addColorStop(1, c2);
    x.fillStyle = gr; x.textAlign = 'left'; x.fillText(ch, X0, BY); X0 += w;
  });
  txt('%', X0 + 10, BY - 205, '900 250px "FP Display"', red);
  // овал-дзеркало від руки довкола цифри
  x.lineCap = 'round';
  x.lineWidth = 8; x.strokeStyle = ink; x.stroke(new Path2D(ovalPath(540, 690, 455, 330, -.04, 21, 10)));
  x.lineWidth = 3.5; x.strokeStyle = red; x.stroke(new Path2D(ovalPath(546, 694, 436, 314, -.01, 22, 14)));
  star(150, 440, 70, red); star(950, 980, 54, ink); star(990, 470, 34, red);
  // рівень + планка з червоним відрізком на місці близькості
  if (cmp) txt(uc(cmp.level.t), W / 2, 1150, '900 128px "FP Display"', ink, 'center');
  torn(M, 1196, W - 2 * M, 30, ink, 5);
  if (cmp) { const sx = M + (W - 2 * M) * cmp.closeness / 100; x.fillStyle = red; x.fillRect(Math.max(M, sx - 70), 1201, 140, 21); }
  txt('МІЙ ТИП', W / 2, 1320, '600 34px "FP Mono"', ink, 'center');
  txt(t.full, W / 2, 1530, '900 250px "FP Display"', ink, 'center');
  txt(uc(info.n), W / 2, 1636, '800 104px "FP Display"', red, 'center');
  if (S.quick) { x.fillStyle = red; x.fillRect(W / 2 - 250, 1668, 500, 50); txt('ШВИДКИЙ ТЕСТ · ОРІЄНТОВНО', W / 2, 1704, '600 28px "FP Mono"', paper, 'center'); }
  // футер: штрихкод + адреса
  torn(50, 1744, W - 100, 132, ink, 9);
  const q = rng(3); let bx = 92;
  x.fillStyle = paper; while (bx < 330) { const w = 2 + Math.floor(q() * 7); if (q() > .36) x.fillRect(bx, 1774, w, 72); bx += w + 2 + Math.floor(q() * 4); }
  const host = (location.host ? location.host + location.pathname.replace(/\/index\.html$/, '/') : 'kiruhatko.github.io/MBTI-FP-OLENA-USENKO/').replace(/\/$/, '');
  txt('ПРОЙДИ ТЕСТ:', W - 92, 1792, '600 26px "FP Mono"', paper, 'right');
  txt(host.length > 44 ? host.slice(0, 43) + '…' : host, W - 92, 1828, '400 24px "FP Mono"', paper, 'right');
  txt('TG @OLENAUSENKO_FAN', W - 92, 1860, '600 24px "FP Mono"', '#ff9aa2', 'right');
  return c;
}
async function doImage() {
  const out = $('#shout'); out.innerHTML = '<p class="note">Малюємо…</p>';
  const c = await makeCard();
  c.toBlob(b => {
    if (!b) { out.innerHTML = '<p class="note">Не вдалося намалювати картинку на цьому пристрої.</p>'; return; }
    if (shot) URL.revokeObjectURL(shot.url);
    const file = new File([b], 'fp-dzerkalo.png', { type: 'image/png' });
    shot = { url: URL.createObjectURL(b), file };
    let canFile = false; try { canFile = !!(navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) { /* ні */ }
    out.innerHTML = `<img src="${shot.url}" alt="Картинка з твоїм типом і близькістю з Оленою" width="1080" height="1920">
      <div class="btns" style="margin-top:16px">${canFile ? '<button class="btn primary" data-act="sharefile">Поділитися картинкою</button>' : ''}<a class="btn" href="${shot.url}" download="fp-dzerkalo.png">Зберегти картинку</a></div>`;
  }, 'image/png');
}

/* ───── дії ───── */
function eraseAll() {
  try { Object.keys(localStorage).filter(k => k.startsWith('fp-dzerkalo')).forEach(k => localStorage.removeItem(k)); } catch (e) { /* приватний режим */ }
  lsDel(ST_KEY);
  if (shot) { URL.revokeObjectURL(shot.url); shot = null; }
  S = blank(); RES = null; render(); toast('Стерто з цього пристрою ✓');
}
const ACT = {
  start(el) { S = blank(); S.quick = el.dataset.q === '1'; S.view = 'quiz'; save(); render(); },
  resume() { const g = firstGap(); S.view = g == null ? 'confirm' : 'quiz'; if (g != null) S.pos = g; save(); render(); },
  show() { S.view = 'result'; save(); render(); },
  reset() { if (!confirm('Пройти тест заново? Поточні відповіді буде стерто з цього пристрою.')) return; S = blank(); save(); render(); },
  erase() { if (!confirm('Стерти всі твої відповіді з цього пристрою? Це не можна скасувати.')) return; eraseAll(); },
  ans(el) { answer(+el.dataset.v); },
  prev() { if (busy || S.pos === 0) return; S.pos--; save(); drawCard(); },
  next() { if (busy) return; const qi = list()[S.pos]; if (S.ans[qi] == null) return; advance(); },
  home() { if (S.view === 'quiz' || S.view === 'confirm') { S.view = 'intro'; save(); } else if (S.view !== 'intro') { S.view = 'intro'; save(); } render(); },
  'back-to-quiz'() { S.view = 'quiz'; S.pos = total() - 1; save(); render(); },
  finish() { S.done = true; S.view = 'result'; save(); runScan(() => render()); },
  full() { S.quick = false; S.done = false; const g = firstGap(); S.pos = g == null ? 0 : g; S.view = g == null ? 'confirm' : 'quiz'; save(); render(); },
  img() { doImage(); },
  async sharefile() { try { await navigator.share({ files: [shot.file], text: shareText() }); } catch (e) { /* скасовано */ } },
  async copy() {
    try { await navigator.clipboard.writeText(shareText()); toast('Текст скопійовано ✓'); }
    catch (e) { $('#shout').innerHTML = '<textarea readonly class="code" aria-label="Текст результату">' + esc(shareText()) + '</textarea>'; }
  },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const f = ACT[el.dataset.act]; if (!f) return;
  if (el.tagName === 'A') e.preventDefault();
  f(el);
});
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (S.view === 'quiz') {
    if (e.key >= '1' && e.key <= '7') answer(+e.key - 4);
    else if (e.key === 'ArrowLeft') ACT.prev();
    else if (e.key === 'ArrowRight') ACT.next();
  } else if (S.view === 'confirm' && e.key === 'Enter') ACT.finish();
});
RM.addEventListener && RM.addEventListener('change', () => render(true));
render();
