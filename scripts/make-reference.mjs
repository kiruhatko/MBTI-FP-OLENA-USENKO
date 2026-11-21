// node scripts/make-reference.mjs <сирий JSON Олени> [--with-answers]
//
// Робить reference.json — єдине, що з результату Олени потрапляє в репо.
// • Сирий файл має лежати ПОЗА репо: якщо шлях усередині репо, скрипт зупиняється.
// • Результат перераховується тим самим кодом, що на сайті (src/data.js + src/core.js),
//   і звіряється з тим, що записано в сирому файлі; QH має бути 8547.
// • У reference.json потрапляють лише: тип, ідентичність, назва типу, відсотки шкал і граней.
//   Ні session (час, браузер, часовий пояс), ні time_sec, ні changes, ні integrity, ні текстів тверджень.
// • Відповіді по окремих твердженнях — лише з прапорцем --with-answers і лише за згодою Олени.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const rawPath = args.find(a => !a.startsWith('--'));
const withAnswers = args.includes('--with-answers');
const die = (m, code = 1) => { console.error('✗ ' + m); process.exit(code); };
if (!rawPath) die('використання: node scripts/make-reference.mjs <шлях до сирого JSON поза репо> [--with-answers]', 2);

const abs = fs.realpathSync(path.resolve(rawPath));
if (abs === ROOT || abs.startsWith(ROOT + path.sep)) die('сирий файл лежить усередині репо — перенеси його в іншу папку, він не має потрапити в git.');
const raw = JSON.parse(fs.readFileSync(abs, 'utf8'));

// підрахунок — тим самим кодом, що на сайті
const ctx = vm.createContext({});
vm.runInContext(
  fs.readFileSync(path.join(ROOT, 'src/data.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(ROOT, 'src/core.js'), 'utf8') + '\n' +
  ';globalThis.K = { QH, NQ, QUESTIONS, AXES, FACETS, TYPES, score, pctOf, typeOf };', ctx);
const { QH, NQ, QUESTIONS, AXES, FACETS, TYPES, score, pctOf, typeOf } = ctx.K;

if (raw.schema !== 'mirror-mbti.reference/1') die('невідома схема: ' + raw.schema);
if (QH !== 8547) die(`QH коду = ${QH}, очікувалось 8547: твердження чи підрахунок змінено`);
if (raw.test?.question_set_hash !== QH) die(`QH у файлі = ${raw.test?.question_set_hash}, у коді = ${QH}: порівняння було б некоректним`);
if (raw.test?.question_count !== NQ) die('кількість тверджень не збігається');

const ans = Array(NQ).fill(null);
for (const a of raw.answers || []) {
  if (!Number.isInteger(a.id) || a.id < 0 || a.id >= NQ) die('поганий id твердження: ' + a.id);
  if (!Number.isInteger(a.value) || a.value < -3 || a.value > 3) die('погане значення для #' + a.id);
  if (ans[a.id] != null) die('повтор id ' + a.id);
  const q = QUESTIONS[a.id];
  if (a.text !== q.self || a.key !== q.key || a.axis !== q.axis || a.facet !== q.facet) die('твердження #' + a.id + ' не збігається з src/data.js');
  ans[a.id] = a.value;
}
if (ans.some(v => v == null)) die('не всі 91 відповідь на місці');

const sc = score(ans), t = typeOf(sc), r = raw.result;
if (t.full !== r.full || t.code !== r.type || t.id !== r.identity) die(`тип не збігся: код дає ${t.full}, у файлі ${r.full}`);
if (TYPES[t.code].n !== r.type_name) die('назва типу не збіглася');

const axes = {}, facets = {};
for (const ax of AXES) {
  const p = pctOf(sc.ax[ax.id]), first = p > 50;
  if (p !== r.axes[ax.id].pct_first) die('шкала ' + ax.id + ' не збіглася');
  axes[ax.id] = { pct_first: p, dominant: first ? ax.a.k : ax.b.k, dominant_pct: first ? p : 100 - p };
}
for (const f of FACETS) {
  const p = pctOf(sc.fc[f.id]);
  if (p !== r.facets[f.id].pct_first) die('грань ' + f.id + ' не збіглася');
  facets[f.id] = { pct_first: p };
}

const ref = {
  schema: 'fp-mirror.olena/1',
  test: { name: 'Дзеркало MBTI', question_count: NQ, question_set_hash: QH },
  type: t.code,
  identity: t.id,
  full: t.full,
  type_name: TYPES[t.code].n,
  axes,
  facets,
};
if (withAnswers) ref.answers = ans;           // лише −3…+3 за номером твердження: без часу, порядку й текстів

const out = path.join(ROOT, 'reference.json');
fs.writeFileSync(out, JSON.stringify(ref, null, 2) + '\n');
console.log(`✓ reference.json: ${t.full} (${TYPES[t.code].n}), QH ${QH}, шкал ${AXES.length}, граней ${FACETS.length}, ` +
  `відповіді по твердженнях: ${withAnswers ? 'ТАК' : 'немає'}`);
