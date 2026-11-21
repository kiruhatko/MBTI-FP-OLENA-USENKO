// node tests/shots.mjs — скріни для погодження (test-out/approve/) і og.png (прев'ю посилання в месенджерах).
// Відповіді тут вигадані («фан» з помірним ENFP), щоб показати типовий, а не випадковий результат.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/opt/npm-tools/node_modules/playwright');
const OUT = 'test-out/approve'; fs.mkdirSync(OUT, { recursive: true });
const URL = 'file://' + process.cwd() + '/index.html';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const fan = () => {
  const dir = { EI: 1, SN: -1, TF: -1, JP: -1, AT: -1 }; let s = 5;
  const r = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  return QUESTIONS.map(q => Math.max(-3, Math.min(3, Math.round(dir[q.axis] * q.key * 1.3 + (r() - .5) * 3.2))));
};
const shot = async (p, name, opt) => { await p.screenshot({ path: `${OUT}/${name}.png`, ...(opt || {}) }); };
const to = async (p, sel, wait, block) => { await p.evaluate(([s, bl]) => document.querySelector(s).scrollIntoView({ block: bl || 'start' }), [sel, block]); await p.waitForTimeout(wait || 1600); };

// ── телефон ──
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.goto(URL); await p.waitForTimeout(2200);
  await shot(p, 'a01-intro');
  await to(p, '.mirrors', 2200, 'center'); await shot(p, 'a02-intro-mirrors');
  await to(p, '#privacy', 1500, 'center'); await shot(p, 'a03-privacy');
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
  await p.click('[data-act=start][data-q="0"]'); await p.waitForTimeout(500);
  for (const v of [2, -1, 3]) { const pos = await p.evaluate(() => S.pos); await p.click(`.pt[data-v="${v}"]`); await p.waitForFunction(x => S.pos !== x, pos); }
  await p.click('.pt[data-v="1"]'); await p.waitForTimeout(60);
  await shot(p, 'a04-quiz'); await p.waitForTimeout(700);
  await p.evaluate(`(${fan.toString()})()`).then(a => p.evaluate(a => { S.ans = a; S.view = 'confirm'; save(); render(); }, a));
  await p.waitForTimeout(1200); await shot(p, 'a05-done');
  await p.click('[data-act=finish]'); await p.waitForTimeout(1250); await shot(p, 'a06-scan');
  await p.waitForFunction(() => S.view === 'result' && !document.querySelector('.scan'), null, { timeout: 8000 }); await p.waitForTimeout(1900);
  await shot(p, 'a07-result');
  await to(p, '#vs', 2600); await shot(p, 'a08-vs');
  await p.evaluate(() => window.scrollBy(0, 700)); await p.waitForTimeout(1600); await shot(p, 'a09-vs-axes');
  await p.evaluate(() => window.scrollBy(0, 700)); await p.waitForTimeout(1600); await shot(p, 'a10-vs-axes2');
  await to(p, '#fc', 1700); await shot(p, 'a11-facets');
  await to(p, '#fn', 1700); await shot(p, 'a12-functions');
  await to(p, '#sh', 600); await p.click('[data-act=img]'); await p.waitForSelector('#shout img'); await p.waitForTimeout(900);
  await p.evaluate(() => document.querySelector('#shout img').scrollIntoView({ block: 'center' })); await p.waitForTimeout(900);
  await shot(p, 'a13-share');
  const png = await p.evaluate(async () => (await makeCard()).toDataURL('image/png'));
  fs.writeFileSync(`${OUT}/a14-story-card.png`, Buffer.from(png.split(',')[1], 'base64'));
  await ctx.close();
}
// ── ПК ──
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(URL); await p.waitForTimeout(2200); await shot(p, 'd01-intro');
  await p.evaluate(`(${fan.toString()})()`).then(a => p.evaluate(a => { S.ans = a; S.view = 'result'; S.done = true; save(); render(); }, a));
  await p.waitForTimeout(2000); await shot(p, 'd02-result');
  await to(p, '#vs', 2600); await shot(p, 'd03-vs');
  await ctx.close();
}
// ── og.png 1200×630: шапка, «ДЗЕРКАЛО», питання й дзеркала — без кнопок і твоїх даних ──
{
  const ctx = await b.newContext({ viewport: { width: 1200, height: 630 } });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.addStyleTag({ content: '.cta,.lead,.intro>.kick,.hero .kick,.steps,.priv,.ticker,.foot,.bar{display:none!important}.intro{padding-top:34px}.hero{min-height:520px}.mirrors{max-width:440px}' });
  await p.waitForTimeout(2600);
  await p.screenshot({ path: 'og.png' });
  await ctx.close();
}
await b.close();
console.log('✓ скріни в ' + OUT + ' і og.png');
