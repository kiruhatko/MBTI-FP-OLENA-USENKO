/* ═════════════ ТИ І ОЛЕНА ═════════════
   Порівняння з еталоном Олени. REF — це reference.json, який build.py вшиває в сторінку
   (лише тип, назва типу й відсотки шкал і граней; без її відповідей, часу, браузера тощо).
   Близькість = 100 − середня |різниця відсотків першого полюса| за 4 шкалами (E/I, S/N, T/F, J/P). */
const CORE = AXES.slice(0, 4);
const NEAR_PCT = 55;              // домінанта < 55 % — «майже порівну», як і в самому результаті
const refValid = () => !!(REF && REF.test && REF.test.question_set_hash === QH && REF.test.question_count === NQ &&
  CORE.every(ax => REF.axes && REF.axes[ax.id]) && FACETS.every(f => REF.facets && REF.facets[f.id]));
const herNear = id => REF.axes[id].dominant_pct < NEAR_PCT;

/* рівні близькості: діапазон тут вузький (з Оленою можна розійтись максимум на ~57 п.п.),
   тож пороги стоять вище, ніж здається на перший погляд */
const LEVELS = [
  { min: 95, t: 'Майже дзеркало', d: 'На всіх чотирьох шкалах ви з Оленою стоїте майже в одній точці.' },
  { min: 86, t: 'Дуже схожі', d: 'Розбіжності є, але невеликі: загалом ваші характери влаштовані дуже схоже.' },
  { min: 76, t: 'Схожі', d: 'Спільного більше, ніж відмінного, хоча на якійсь зі шкал ви помітно розходитесь.' },
  { min: 64, t: 'Є спільне', d: 'На кількох шкалах ви з Оленою стоїте по-різному — нижче видно, на яких саме.' },
  { min: 0, t: 'Різні', d: 'Майже на кожній шкалі ви на різних боках. Це не «краще» чи «гірше» — просто інший характер.' },
];
const levelOf = c => LEVELS.find(l => c >= l.min);

function compareWith(sc, quick, ans) {
  const axes = AXES.map(ax => {
    const me = pctOf(sc.ax[ax.id]), her = REF.axes[ax.id].pct_first;
    return { ax, me, her, d: Math.abs(me - her), near: herNear(ax.id), core: ax.id !== 'AT' };
  });
  const core = axes.filter(a => a.core);
  const closeness = Math.round(100 - core.reduce((s, a) => s + a.d, 0) / core.length);
  const code = typeOf(sc).code;
  const letters = CORE.map((ax, i) => ({ ax, me: code[i], her: REF.type[i], same: code[i] === REF.type[i], near: herNear(ax.id) }));
  let facets = null, stmts = null;
  if (!quick) {
    const all = FACETS.map((f, i) => { const me = pctOf(sc.fc[f.id]), her = REF.facets[f.id].pct_first; return { f, i, me, her, d: Math.abs(me - her) }; });
    facets = {
      same: all.slice().sort((x, y) => x.d - y.d || x.i - y.i).slice(0, 3),
      diff: all.slice().sort((x, y) => y.d - x.d || x.i - y.i).slice(0, 3),
    };
    // відповіді по твердженнях з'являються лише тоді, коли Олена погодилась і їх додали в reference.json
    if (Array.isArray(REF.answers) && REF.answers.length === NQ) stmts = sameAnswers(ans);
  }
  return { axes, core, closeness, level: levelOf(closeness), letters, facets, stmts, quick };
}

function sameAnswers(ans) {
  let n = 0, total = 0; const rows = [];
  QUESTIONS.forEach((q, i) => {
    const a = ans[i], b = REF.answers[i];
    if (a == null || a === SKIP || b == null) return;
    total++;
    const d = Math.abs(a - b);
    if (d <= 1) n++;
    if (d <= 1 && a !== 0 && Math.sign(a) === Math.sign(b)) rows.push({ q, a, b, d, s: Math.abs(a) + Math.abs(b) });
  });
  rows.sort((x, y) => x.d - y.d || y.s - x.s || x.q.id - y.q.id);
  return { n, total, top: rows.slice(0, 3) };
}
