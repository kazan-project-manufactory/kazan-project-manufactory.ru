// Запуск: PW=<путь к node_modules/playwright> node measure.mjs [query]
// Пример: PW=~/.npm/_npx/<hash>/node_modules/playwright node measure.mjs "ls=0&safe=0.98"
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');
const q = process.argv[2] || '';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', m => m.type() === 'error' && console.error('console:', m.text()));
await page.goto(`http://127.0.0.1:8010/exp/poster-hero-mobile/tools/measure.html?${q}`);
await page.waitForFunction(() => window.__result);
const r = await page.evaluate(() => window.__result);
console.log(`font loaded: ${r.fontOk}; tracking ${r.ls}em; safety ${r.safe}`);
for (const [l, w] of Object.entries(r.w100)) console.log(`  ${l.padEnd(18)} @100px pretext ${w.pretext.toFixed(1)}  dom ${w.dom.toFixed(1)}`);
console.log(`widest: ${r.widestLine} = ${r.emPerLine.toFixed(4)} em`);
console.log('vw   avail  font  fits  free-wrap-lines');
for (const t of r.table) console.log(`${String(t.vw).padEnd(5)}${String(t.avail).padEnd(7)}${String(t.fs).padEnd(6)}${String(t.fits).padEnd(6)}${t.freeLines}`);
await browser.close();
