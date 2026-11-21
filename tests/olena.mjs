// node tests/olena.mjs <сирий JSON Олени поза репо>
// Автотест: проходить повний тест у браузері «відповідями Олени», клацаючи по кнопках, як звичайний фан.
// Очікування: тип ENTP-A і близькість 100 %. Сирий файл лише читається звідти, де лежить, — у репо він не потрапляє.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/opt/npm-tools/node_modules/playwright');
const raw = process.argv[2];
if (!raw) { console.error('використання: node tests/olena.mjs <шлях до сирого JSON поза репо>'); process.exit(2); }
const abs = fs.realpathSync(raw), root = process.cwd();
if (abs.startsWith(root + path.sep)) { console.error('✗ сирий файл лежить усередині репо — винеси його назовні'); process.exit(1); }
const ans = Array(91).fill(null);
for (const a of JSON.parse(fs.readFileSync(abs, 'utf8')).answers) ans[a.id] = a.value;

const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
const net = []; ctx.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) net.push(r.url()); });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + root + '/index.html');
await p.click('[data-act=start][data-q="0"]');
while (await p.evaluate(() => S.view === 'quiz')) {
  const { pos, qi } = await p.evaluate(() => ({ pos: S.pos, qi: list()[S.pos] }));
  await p.click(`.pt[data-v="${ans[qi]}"]`);
  await p.waitForFunction(x => S.view !== 'quiz' || S.pos !== x, pos);
}
await p.click('[data-act=finish]');
await p.waitForFunction(() => S.view === 'result');
await p.waitForTimeout(300);
const r = await p.evaluate(() => ({
  full: document.querySelector('.chip.k').textContent,
  closeness: document.getElementById('cn').textContent,
  level: document.querySelector('.lvl').textContent,
  diffs: [...document.querySelectorAll('.axrow .d')].map(e => e.textContent),
}));
await b.close();
assert.equal(r.full, 'ENTP-A');
assert.equal(r.closeness, '100');
assert.ok(r.diffs.every(d => d === 'різниця 0 п.п.'), 'не всі шкали збіглися: ' + r.diffs.join(', '));
assert.deepEqual(net, []); assert.deepEqual(errs, []);
console.log(`✓ відповідями Олени: ${r.full}, близькість ${r.closeness}% («${r.level}»), різниця на всіх 5 шкалах 0 п.п., мережевих запитів 0`);
