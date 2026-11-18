// Этап 5: производительность на «слабом телефоне».
// Chrome с замедлением процессора в 4 и 6 раз, экран телефона; меряем загрузку, FPS при ходьбе по самой
// большой карте (улица, с Пипом и персонажами), память. Без видеокарты (как в этом тесте) рисование идёт
// программно — цифры заведомо хуже, чем на реальном телефоне с GPU.
// Запуск: npm run build && node tests/e2e/perf.mjs
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statSync, readdirSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = 4197;
const URL = `http://localhost:${PORT}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
await sleep(2500);
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--js-flags=--expose-gc'] });

const rows = [];
let failed = 0;
const MIN_FPS = Number(process.env.MIN_FPS ?? 24);

async function measure({ name, throttle, viewport }) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.emulate({ viewport, userAgent: viewport.isMobile ? 'Mozilla/5.0 (Linux; Android 10) Mobile' : 'Mozilla/5.0' });
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForSelector('#btn-play');
  const tStart = Date.now() - t0;
  await page.click('#btn-play');
  await page.waitForFunction(() => !document.getElementById('onboard').hidden);
  await page.click('.ob-hero'); await page.click('#ob-name-form button'); await page.click('[data-age="junior"]'); await page.click('#ob-skip');
  const t1 = Date.now();
  await page.click('#ob-go');
  await page.waitForFunction(() => window.__game?.scene.getScene('world')?.debugState, { timeout: 60000 });
  const tWorld = Date.now() - t1;
  // на улицу — самая большая карта
  await page.evaluate(() => { const m = window.__maps.street; window.__travel({ tx: 0, ty: 0, to: 'street', spawn: { tx: 13, ty: 9, dir: 'down' } }); void m; });
  await page.waitForFunction(() => window.__game.scene.getScene('world').debugState?.().location === 'street', { timeout: 30000 });
  await sleep(1500);
  // FPS за 6 секунд ходьбы туда-обратно
  const fpsP = page.evaluate(() => new Promise((res) => {
    let n = 0; const t = performance.now(); const times = [];
    let last = t;
    const f = (now) => { n++; times.push(now - last); last = now; if (now - t < 6000) requestAnimationFrame(f); else {
      times.sort((a, b) => a - b);
      res({ fps: n / ((now - t) / 1000), p95: times[Math.floor(times.length * 0.95)] });
    } };
    requestAnimationFrame(f);
  }));
  for (const k of ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp']) { await page.keyboard.down(k); await sleep(1400); await page.keyboard.up(k); }
  const { fps, p95 } = await fpsP;
  const heap = await page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null));
  rows.push({ name, throttle, start: tStart, world: tWorld, fps: Math.round(fps), p95: Math.round(p95), heap });
  if (fps < MIN_FPS) { failed++; rows[rows.length - 1].fail = true; }
  await ctx.close();
}

const phone = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
await measure({ name: 'ПК, без замедления', throttle: 1, viewport: { width: 1280, height: 800 } });
await measure({ name: 'Средний телефон (×4)', throttle: 4, viewport: phone });
await measure({ name: 'Слабый телефон (×6)', throttle: 6, viewport: phone });

const js = readdirSync(join(ROOT, 'dist/assets')).filter((f) => f.endsWith('.js')).reduce((s, f) => s + statSync(join(ROOT, 'dist/assets', f)).size, 0);
await browser.close();
server.kill();

console.log(`Размер JS: ${(js / 1048576).toFixed(2)} МБ (без сжатия)`);
console.log('Устройство                 | старт, мс | мир, мс | FPS | 95% кадров ≤, мс | память JS, МБ');
for (const r of rows) console.log(`${r.fail ? '✗' : '✓'} ${r.name.padEnd(24)} | ${String(r.start).padStart(9)} | ${String(r.world).padStart(7)} | ${String(r.fps).padStart(3)} | ${String(r.p95).padStart(16)} | ${r.heap ?? '—'}`);
console.log(failed ? `\nFPS ниже ${MIN_FPS} в ${failed} случаях` : `\nВезде FPS ≥ ${MIN_FPS}`);
process.exit(failed ? 1 : 0);
