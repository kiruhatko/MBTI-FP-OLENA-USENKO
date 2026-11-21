// node tests/e2e.mjs — проходить повний і швидкий тест у Chrome (телефон і ПК), робить скріни в test-out/,
// і перевіряє головне: жодного мережевого запиту, жодного порушення CSP, жодної помилки JS,
// результат рахується тим самим кодом, а «Стерти мої відповіді» справді все стирає.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/opt/npm-tools/node_modules/playwright');
const OUT = 'test-out'; fs.mkdirSync(OUT, { recursive: true });
const URL = 'file://' + process.cwd() + '/index.html';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });

const net = [], errs = [], csp = [];
async function ctxFor(kind) {
  const ctx = await b.newContext(kind === 'phone'
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  ctx.on('request', r => { const u = r.url(); if (!/^(file|data|blob):/.test(u)) net.push(u); });
  await ctx.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI)); });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('dialog', d => d.accept());
  return { ctx, p };
}
let seed = 11; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
async function run(p, quick, shotAt) {
  await p.click(`[data-act=start][data-q="${quick ? 1 : 0}"]`);
  let k = 0;
  while (await p.evaluate(() => S.view === 'quiz')) {
    const pos = await p.evaluate(() => S.pos);
    if (shotAt && k === shotAt) { await p.waitForTimeout(450); await p.screenshot({ path: `${OUT}/${p.viewportSize().width > 800 ? 'd-quiz' : (quick ? '2-quiz-quick' : '3-quiz')}.png` }); }
    await p.click(`.pt[data-v="${Math.floor(rnd() * 7) - 3}"]`);
    await p.waitForFunction(x => S.view !== 'quiz' || S.pos !== x, pos);
    k++;
  }
  assert.equal(await p.evaluate(() => S.view), 'confirm');
  return k;
}
async function check(p) {
  const c = await p.evaluate(() => window.__csp);
  csp.push(...c);
}

// ── телефон: повний тест ──
{
  const { ctx, p } = await ctxFor('phone');
  await p.goto(URL); await p.waitForTimeout(1600);
  await p.screenshot({ path: `${OUT}/1-intro.png` });
  await p.screenshot({ path: `${OUT}/1-intro-full.png`, fullPage: true });
  const n = await run(p, false, 7);
  assert.equal(n, 91);
  await p.screenshot({ path: `${OUT}/4-confirm.png` });
  await p.click('[data-act=finish]');
  await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/5-scan.png` });
  await p.waitForFunction(() => S.view === 'result' && !document.querySelector('.scan'), null, { timeout: 8000 });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/6-result-top.png` });
  await p.evaluate(() => document.getElementById('vs').scrollIntoView()); await p.waitForTimeout(2200);
  await p.screenshot({ path: `${OUT}/7-vs.png` });
  await p.evaluate(() => window.scrollBy(0, 640)); await p.waitForTimeout(1400);
  await p.screenshot({ path: `${OUT}/8-vs-axes.png` });
  await p.evaluate(() => document.getElementById('fc').scrollIntoView()); await p.waitForTimeout(1400);
  await p.screenshot({ path: `${OUT}/9-facets.png` });
  // результат збігається з підрахунком core.js, близькість — з формулою
  const r = await p.evaluate(() => {
    const sc = score(S.ans), t = typeOf(sc), c = compareWith(sc, false, S.ans);
    const manual = Math.round(100 - ['EI', 'SN', 'TF', 'JP'].reduce((s, k) => s + Math.abs(pctOf(sc.ax[k]) - REF.axes[k].pct_first), 0) / 4);
    return { full: t.full, shown: document.querySelector('.chip.k').textContent, cl: c.closeness, manual, cn: document.getElementById('cn').textContent, stmts: c.stmts };
  });
  assert.equal(r.shown, r.full); assert.equal(r.cl, r.manual); assert.equal(+r.cn, r.cl); assert.equal(r.stmts, null);
  await p.screenshot({ path: `${OUT}/r-full-page.png`, fullPage: true });
  // картинка для сторіз — малюється локально
  await p.evaluate(() => document.getElementById('sh').scrollIntoView());
  await p.click('[data-act=img]'); await p.waitForSelector('#shout img', { timeout: 8000 }); await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/10-share.png` });
  const png = await p.evaluate(async () => (await makeCard()).toDataURL('image/png'));
  fs.writeFileSync(`${OUT}/share-card.png`, Buffer.from(png.split(',')[1], 'base64'));
  await p.evaluate(() => document.getElementById('privacy').scrollIntoView({ block: 'center' })); await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/11-privacy.png` });
  // перезавантаження: результат відновлюється з localStorage
  await p.reload(); await p.waitForTimeout(800);
  assert.equal(await p.evaluate(() => S.view), 'result');
  // «Стерти мої відповіді» — у localStorage не лишається нічого нашого
  await p.click('[data-act=erase]'); await p.waitForTimeout(400);
  const left = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('fp-dzerkalo')).length);
  assert.equal(left, 0); assert.equal(await p.evaluate(() => S.view), 'intro');
  await check(p); await ctx.close();
}
// ── телефон: швидкий тест ──
{
  const { ctx, p } = await ctxFor('phone');
  await p.goto(URL); await p.waitForTimeout(600);
  const n = await run(p, true, 1);
  assert.equal(n, 30);
  await p.click('[data-act=finish]');
  await p.waitForFunction(() => S.view === 'result' && !document.querySelector('.scan'), null, { timeout: 8000 });
  const q = await p.evaluate(() => ({ facets: compareWith(score(usedAns()), true, usedAns()).facets, warn: !!document.querySelector('.chip.warn'), fl: !!document.getElementById('fl') }));
  assert.equal(q.facets, null); assert.ok(q.warn); assert.ok(!q.fl);
  await p.evaluate(() => document.getElementById('vs').scrollIntoView()); await p.waitForTimeout(2000);
  await p.screenshot({ path: `${OUT}/12-quick-vs.png` });
  await check(p); await ctx.close();
}
// ── ПК ──
{
  const { ctx, p } = await ctxFor('desk');
  await p.goto(URL); await p.waitForTimeout(1800);
  await p.screenshot({ path: `${OUT}/d1-intro.png` });
  await run(p, false, 3);
  await p.click('[data-act=finish]');
  await p.waitForFunction(() => S.view === 'result' && !document.querySelector('.scan'), null, { timeout: 8000 });
  await p.waitForTimeout(1300); await p.screenshot({ path: `${OUT}/d2-result.png` });
  await p.evaluate(() => document.getElementById('vs').scrollIntoView()); await p.waitForTimeout(2200);
  await p.screenshot({ path: `${OUT}/d3-vs.png` });
  await check(p); await ctx.close();
}
await b.close();
assert.deepEqual(net, [], 'мережеві запити: ' + net.join(', '));
assert.deepEqual(csp, [], 'порушення CSP: ' + csp.join(', '));
assert.deepEqual(errs, [], 'помилки JS: ' + errs.join(' | '));
console.log('✓ e2e: повний і швидкий тест, телефон і ПК · мережевих запитів 0 · порушень CSP 0 · помилок 0 · скріни в test-out/');
