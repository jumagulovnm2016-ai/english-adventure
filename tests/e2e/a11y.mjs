// Этап 5: доступность. Аудит axe-core на всех экранах (WCAG 2.1 A/AA) + проверки вручную:
// размер кнопок, управление с клавиатуры, масштаб интерфейса.
// Запуск: npm run build && node tests/e2e/a11y.mjs
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const AXE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const PORT = 4198;
const URL = `http://localhost:${PORT}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
await sleep(2500);
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto(URL, { waitUntil: 'networkidle0' });
const waitFor = (fn, arg, timeout = 15000) => page.waitForFunction(fn, { timeout }, arg);

let failed = 0;
const results = [];
const assert = (c, m) => { if (!c) throw new Error(m); };
async function check(name, fn) { try { await fn(); results.push(`✓ ${name}`); } catch (e) { failed++; results.push(`✗ ${name}: ${e.message}`); } }

/** Аудит видимой части страницы. Холст игры исключаем: это картинка, её доступность — через кнопки и озвучку. */
async function audit(screen) {
  await sleep(450); // дождаться окончания анимации появления окна (иначе цвета меряются «полупрозрачными»)
  await page.evaluate(AXE);
  const r = await page.evaluate(async () => {
    const res = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      exclude: [['#game']],
      resultTypes: ['violations'],
    });
    return res.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, target: v.nodes.slice(0, 2).map((x) => x.target.join(' ')), why: v.nodes[0]?.failureSummary?.split('\n').slice(1, 2).join(' ') }));
  });
  const bad = r.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  await check(`axe: ${screen}`, async () => assert(bad.length === 0, bad.map((v) => `${v.id} ×${v.n} (${v.target.join(', ')}) — ${v.why ?? v.help}`).join(' || ')));
  return r;
}

await audit('стартовый экран');

await page.click('#btn-play');
await waitFor(() => !document.getElementById('onboard').hidden);
await audit('выбор героя');
await check('выбор героя с клавиатуры: Tab → Enter', async () => {
  await page.keyboard.press('Tab');
  const f = await page.evaluate(() => document.activeElement?.className);
  assert(String(f).includes('ob-hero'), `фокус на: ${f}`);
  await page.keyboard.press('Enter');
  await waitFor(() => !document.getElementById('ob-step-name').hidden);
});
await page.keyboard.type('Аня'); await page.keyboard.press('Enter');
await waitFor(() => !document.getElementById('ob-step-age').hidden);
await audit('выбор режима');
await page.click('[data-age="junior"]');
await page.click('#ob-check');
await waitFor(() => document.querySelectorAll('#ob-options .opt').length === 3);
await audit('входная проверка');
await page.click('#ob-skip').catch(() => {});
for (let i = 0; i < 30; i++) { if (await page.$eval('#ob-step-check', (e) => e.hidden)) break; await page.click('#ob-dunno'); await sleep(30); }
await page.click('#ob-go');
await waitFor(() => window.__quests);
await sleep(600);
await audit('игра: шапка и кнопки');

await check('игра с клавиатуры: дойти до мамы, начать квест, ответить на задание', async () => {
  // мама — слева сверху от точки появления; идём стрелками
  for (let i = 0; i < 40; i++) {
    const s = await page.evaluate(() => window.__game.scene.getScene('world').debugState());
    if (s.nearby === 'npc:npc.mum') break;
    const mum = { x: 5 * 16 + 8, y: 5 * 16 + 10 };
    const k = Math.abs(s.x - mum.x) > 14 ? (s.x > mum.x ? 'ArrowLeft' : 'ArrowRight') : (s.y > mum.y ? 'ArrowUp' : 'ArrowDown');
    await page.keyboard.down(k); await sleep(250); await page.keyboard.up(k);
  }
  await page.keyboard.press('KeyE');
  await waitFor(() => !document.getElementById('quest-intro').hidden);
  await audit('окно начала квеста');
  await page.keyboard.press('Enter');
  await waitFor(() => !document.getElementById('dialogue').hidden);
  await sleep(200);
  await audit('диалог');
  await page.keyboard.press('Enter');
  await waitFor(() => !document.getElementById('task').hidden);
  await sleep(300);
  await audit('задание «выбери»');
  // фокус внутри задания, ответ клавишами
  const v = await page.evaluate(() => window.__tasks.lastView);
  for (let i = 0; i < 12; i++) {
    const id = await page.evaluate(() => document.activeElement?.dataset?.id);
    if (id === v.correctId) break;
    await page.keyboard.press('Tab');
  }
  await page.keyboard.press('Enter');
  await waitFor(() => document.getElementById('task').hidden);
});

await check('все кнопки игры — не меньше 48×48 px (как в задании MVP)', async () => {
  const small = await page.evaluate(() => [...document.querySelectorAll('button, .chip, label.btn')]
    .filter((b) => b.offsetParent !== null)
    .map((b) => ({ t: (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 20), w: b.offsetWidth, h: b.offsetHeight }))
    .filter((b) => b.w < 48 || b.h < 48));
  assert(small.length === 0, JSON.stringify(small));
});

await page.keyboard.press('Escape');
await page.evaluate(() => { document.getElementById('dialogue').hidden = true; });
await page.click('#btn-settings');
await sleep(200);
await audit('настройки');
await check('«Очень крупный» интерфейс: всё помещается по ширине', async () => {
  await page.click('#settings .seg[data-setting="uiScale"] button[data-value="1.5"]');
  const over = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || [...document.querySelectorAll('#settings .modal-box')].some((b) => b.getBoundingClientRect().right > innerWidth));
  assert(!over, 'вылезает за экран');
  await page.click('#settings .seg[data-setting="uiScale"] button[data-value="1"]');
});
await page.click('#btn-parent');
await waitFor(() => !document.getElementById('gate').hidden);
await audit('проверка взрослого');
const q = await page.$eval('#gate-question', (e) => e.textContent); const m = q.match(/(\d+) × (\d+)/);
await page.type('#gate-input', String(Number(m[1]) * Number(m[2]))); await page.keyboard.press('Enter');
await waitFor(() => !document.getElementById('parent').hidden);
await audit('родители: что умеет');
await page.click('.parent-tabs [data-tab="words"]'); await audit('родители: слова');
await page.click('.parent-tabs [data-tab="time"]'); await audit('родители: время');
await page.click('.parent-tabs [data-tab="settings"]'); await audit('родители: настройки');
await page.click('#parent-limit button[data-value="15"]');
await page.click('#parent-close');
await page.evaluate(() => window.__tracker.tick(1000));
await waitFor(() => !document.getElementById('limit').hidden);
await audit('экран «На сегодня всё»');

await browser.close();
server.kill();
console.log(results.join('\n'));
console.log(failed ? `\n${failed} проверок не прошли` : `\nВсе ${results.length} проверок прошли`);
process.exit(failed ? 1 : 0);
