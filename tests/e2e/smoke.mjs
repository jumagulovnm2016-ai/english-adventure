// Сквозная проверка этапа 1 в настоящем Chrome: запуск, ходьба, стены, касание, карточки, настройки, сохранение.
// Запуск: npm run build && npm run test:e2e   (CHROME=/путь/к/chrome при необходимости)
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SHOTS = join(ROOT, 'tests/e2e/screenshots');
mkdirSync(SHOTS, { recursive: true });
const PORT = 4187;
const URL = `http://localhost:${PORT}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Первый запуск: выбрать героя, имя, режим и пропустить проверку (если экран появился). */
async function passOnboarding(page, { age = 'junior', tap = false } = {}) {
  const click = (sel) => (tap ? page.tap(sel) : page.click(sel));
  try { await page.waitForFunction(() => !document.getElementById('onboard').hidden || window.__quests, { timeout: 5000 }); } catch { return; }
  if (await page.$eval('#onboard', (e) => e.hidden)) return;
  await click('.ob-hero[data-look="kid_2"]');
  await click('#ob-name-form button');
  await click(`[data-age="${age}"]`);
  await click('#ob-skip');
  await click('#ob-go');
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
await sleep(2500);

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});

let failed = 0;
const results = [];
async function check(name, fn) {
  try { await fn(); results.push(`✓ ${name}`); }
  catch (e) { failed++; results.push(`✗ ${name}: ${e.message}`); }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

async function openGame(page, { viewport }) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewport(viewport);
  await page.goto(URL, { waitUntil: 'networkidle0' });
  return errors;
}
const state = (page) => page.evaluate(() => window.__game.scene.getScene('world').debugState());
const waitWorld = (page) => page.waitForFunction(() => window.__game?.scene.getScene('world')?.debugState, { timeout: 8000 });
/** Экранные координаты точки мира. */
const toScreen = (page, x, y) => page.evaluate((x, y) => {
  const sc = window.__game.scene.getScene('world').worldToScreen(x, y);
  const r = window.__game.canvas.getBoundingClientRect();
  return { x: r.left + sc.x, y: r.top + sc.y };
}, x, y);
async function hold(page, key, ms) { await page.keyboard.down(key); await sleep(ms); await page.keyboard.up(key); await sleep(80); }
const visible = (page, sel) => page.$eval(sel, (el) => !el.hidden);
const T = 16;

// ---------------- ПК ----------------
{
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const errors = await openGame(page, { viewport: { width: 1280, height: 800 } });

  await check('стартовый экран, кнопка «Играть»', async () => {
    const txt = await page.$eval('#btn-play', (b) => b.textContent);
    assert(txt.includes('Играть'), `текст кнопки: ${txt}`);
    await page.screenshot({ path: join(SHOTS, 'desktop-1-start.png') });
  });

  await page.click('#btn-play');
  await passOnboarding(page);
  await waitWorld(page);
  await sleep(600);

  await check('мир запустился, герой на месте появления', async () => {
    const s = await state(page);
    assert(Math.abs(s.x - (9 * T + 8)) < 1 && Math.abs(s.y - (11 * T + 10)) < 1, `позиция ${s.x},${s.y}`);
    await page.screenshot({ path: join(SHOTS, 'desktop-2-world.png') });
  });

  await check('ходьба клавишами (стрелка влево)', async () => {
    const a = await state(page);
    await hold(page, 'ArrowLeft', 500);
    const b = await state(page);
    assert(b.x < a.x - 15, `x было ${a.x}, стало ${b.x}`);
    assert(b.facing === 'left', `смотрит ${b.facing}`);
  });

  await check('WASD тоже работает', async () => {
    const a = await state(page);
    await hold(page, 'KeyD', 400);
    const b = await state(page);
    assert(b.x > a.x + 10, `x было ${a.x}, стало ${b.x}`);
  });

  await check('стена не пускает (долго идём вверх)', async () => {
    await hold(page, 'ArrowUp', 3500);
    const s = await state(page);
    // верхний ряд пола — 2-й (y от 32 до 48); ноги не выше 32 + 5
    assert(s.y >= 2 * T + 5 - 0.01, `ноги заехали в стену: y=${s.y}`);
  });

  await check('касание книги: герой идёт к ней и открывается карточка «green book» / «зелёная книга»', async () => {
    const p = await toScreen(page, 10 * T + 8, 5 * T - 6);
    await page.mouse.click(p.x, p.y);
    await page.waitForFunction(() => !document.getElementById('card').hidden, { timeout: 10000 });
    const en = await page.$eval('#card-en', (e) => e.textContent);
    const ru = await page.$eval('#card-ru', (e) => e.textContent);
    assert(en === 'green book' && ru === 'зелёная книга', `«${en}» / «${ru}»`);
    const chips = await page.$$eval('#card-words .chip .en', (els) => els.map((e) => e.textContent));
    assert(chips.join(',') === 'green,book', `слова: ${chips}`);
    await sleep(350);
    await page.screenshot({ path: join(SHOTS, 'desktop-3-card-book.png') });
  });

  await check('пока карточка открыта, герой не ходит', async () => {
    const a = await state(page);
    await hold(page, 'ArrowDown', 400);
    const b = await state(page);
    assert(a.y === b.y, 'герой сдвинулся под открытой карточкой');
  });

  await check('Esc закрывает карточку', async () => {
    await page.keyboard.press('Escape');
    await sleep(100);
    assert(!(await visible(page, '#card')), 'карточка не закрылась');
  });

  await check('кнопка «Посмотреть» видна рядом с предметом', async () => {
    const s = await state(page);
    assert(s.nearby === 'item:it.book_green', `рядом: ${s.nearby}`);
    assert(await visible(page, '#btn-action'), 'кнопки нет');
    const label = await page.$eval('#btn-action span', (e) => e.textContent);
    assert(label === 'Посмотреть', label);
  });

  await check('клавиша E открывает и закрывает карточку', async () => {
    await sleep(300);
    await page.keyboard.press('KeyE');
    await sleep(150);
    assert(await visible(page, '#card'), 'не открылась');
    await page.keyboard.press('KeyE');
    await sleep(150);
    assert(!(await visible(page, '#card')), 'не закрылась');
  });

  await check('касание пола: герой идёт в точку', async () => {
    const target = { x: 16 * T + 8, y: 9 * T + 10 };
    const p = await toScreen(page, target.x, target.y - 4);
    await page.mouse.click(p.x, p.y);
    await page.waitForFunction(() => !window.__game.scene.getScene('world').debugState().walking, { timeout: 10000 });
    const s = await state(page);
    assert(Math.hypot(s.x - target.x, s.y - target.y) < 12, `пришёл в ${s.x},${s.y}`);
  });

  await check('настройки: крупный интерфейс применяется', async () => {
    await page.click('#btn-settings');
    await sleep(150);
    assert(await visible(page, '#settings'), 'настройки не открылись');
    await page.click('#settings .seg[data-setting="uiScale"] button[data-value="1.25"]');
    await page.click('#settings .seg[data-setting="accent"] button[data-value="us"]');
    const scale = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim());
    assert(scale === '1.25', `--ui-scale = ${scale}`);
    await page.screenshot({ path: join(SHOTS, 'desktop-4-settings.png') });
    await page.keyboard.press('Escape'); await sleep(100);
  });

  let before;
  await check('позиция сохраняется и восстанавливается после перезагрузки', async () => {
    before = await state(page);
    await sleep(5600); // автосохранение раз в 5 секунд
    await page.reload({ waitUntil: 'networkidle0' });
    const txt = await page.$eval('#btn-play', (b) => b.textContent);
    assert(txt.includes('Продолжить'), `кнопка: ${txt}`);
    await page.click('#btn-play');
    await waitWorld(page);
    await sleep(300);
    const after = await state(page);
    assert(Math.hypot(after.x - before.x, after.y - before.y) < 1, `было ${before.x},${before.y}, стало ${after.x},${after.y}`);
  });

  await check('настройки сохранились после перезагрузки', async () => {
    const scale = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim());
    assert(scale === '1.25', `--ui-scale = ${scale}`);
  });

  await check('нет ошибок в консоли', async () => { assert(errors.length === 0, errors.join(' | ')); });
  await ctx.close();
}

// ---------------- Телефон ----------------
{
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.emulate({
    viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.tap('#btn-play');
  await passOnboarding(page, { tap: true });
  await waitWorld(page);
  await sleep(600);

  await check('телефон: подсказка для касаний', async () => {
    const help = await page.$eval('#help', (e) => e.textContent);
    assert(help.includes('Нажми на пол'), help);
    await page.screenshot({ path: join(SHOTS, 'phone-1-world.png') });
  });

  await check('телефон: касание пола двигает героя', async () => {
    const a = await state(page);
    const p = await toScreen(page, 5 * T + 8, 9 * T + 6);
    await page.touchscreen.tap(p.x, p.y);
    await sleep(2500);
    const b = await state(page);
    assert(Math.hypot(b.x - a.x, b.y - a.y) > 20, `сдвиг ${a.x},${a.y} → ${b.x},${b.y}`);
  });

  await check('телефон: касание книги открывает карточку', async () => {
    // на вертикальном экране видно ~8 клеток — сначала подходим ближе
    const near = await toScreen(page, 8 * T + 8, 7 * T + 6);
    await page.touchscreen.tap(near.x, near.y);
    await page.waitForFunction(() => !window.__game.scene.getScene('world').debugState().walking, { timeout: 10000 });
    await sleep(400);
    const p = await toScreen(page, 10 * T + 8, 5 * T - 6);
    await page.touchscreen.tap(p.x, p.y);
    await page.waitForFunction(() => !document.getElementById('card').hidden, { timeout: 10000 });
    await sleep(350);
    await page.screenshot({ path: join(SHOTS, 'phone-2-card.png') });
    await page.tap('#card [data-close]');
    await sleep(150);
    assert(!(await visible(page, '#card')), 'не закрылась кнопкой ✕');
  });

  await check('телефон: кнопка «Посмотреть» крупная (≥ 48 px)', async () => {
    const r = await page.$eval('#btn-action', (b) => { b.hidden = false; return { w: b.offsetWidth, h: b.offsetHeight }; }); // offset* — без учёта анимации появления
    assert(r.w >= 48 && r.h >= 48, `${r.w}×${r.h}`);
  });

  await check('телефон: нет ошибок', async () => { assert(errors.length === 0, errors.join(' | ')); });
  await ctx.close();
}

await browser.close();
server.kill();
console.log(results.join('\n'));
console.log(failed ? `\n${failed} проверок не прошли` : `\nВсе ${results.length} проверок прошли`);
process.exit(failed ? 1 : 0);
