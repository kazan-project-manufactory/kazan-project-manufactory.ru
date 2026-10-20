// Скриншоты одного экрана с ожиданием шрифтов: PW=<node_modules/playwright> node shots.mjs <url> <w>x<h>=<file> ...
// Попутно печатает: кегль заголовка, низ кнопки, горизонтальный скролл, ошибки консоли.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');
const [url, ...specs] = process.argv.slice(2);
const browser = await chromium.launch();
for (const spec of specs) {
  const [size, file] = spec.split('=');
  const [w, h] = size.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errs = [];
  page.on('console', m => m.type() === 'error' && errs.push(m.text()));
  page.on('pageerror', e => errs.push(String(e)));
  // общий локальный сервер однопоточный и под нагрузкой — при сбросе соединения перезагружаем до 4 раз
  for (let i = 0; i < 4; i++) {
    errs.length = 0;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    if (await page.evaluate(() => document.fonts.check('16px ANS') && document.fonts.check('16px Onest'))) break;
  }
  const info = await page.evaluate(() => {
    const t = document.querySelector('.hero__title'), c = document.querySelector('.hero__cta');
    const cs = getComputedStyle(t);
    return { font: cs.fontSize, lines: Math.round(t.getBoundingClientRect().height / parseFloat(cs.lineHeight)),
      titleW: Math.round(t.scrollWidth), colW: Math.round(t.clientWidth),
      ctaBottom: Math.round(c.getBoundingClientRect().bottom),
      hscroll: document.documentElement.scrollWidth > innerWidth, ans: document.fonts.check('16px ANS') };
  });
  await page.screenshot({ path: file });
  console.log(`${size}: ${JSON.stringify(info)}${errs.length ? ' ERR ' + errs.join(' | ') : ''}`);
  await page.close();
}
await browser.close();
