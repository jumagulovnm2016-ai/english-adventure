// Этап 5: установка как приложение и работа без интернета.
// 1) все запросы игры — только к своему адресу; 2) манифест и иконки на месте;
// 3) после первой загрузки игра открывается и играется в режиме «без сети», прогресс сохраняется.
// Запуск: npm run build && node tests/e2e/offline.mjs
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = 4196;
const ORIGIN = `http://localhost:${PORT}`;
const URL = `${ORIGIN}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
await sleep(2500);
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });

let failed = 0;
const results = [];
async function check(name, fn) { try { await fn(); results.push(`✓ ${name}`); } catch (e) { failed++; results.push(`✗ ${name}: ${e.message.split('\n')[0]}`); } }
const assert = (c, m) => { if (!c) throw new Error(m); };

const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const requests = [];
page.on('request', (r) => requests.push(r.url()));
await page.setViewport({ width: 1280, height: 800 });
const waitFor = (fn, arg, timeout = 15000) => page.waitForFunction(fn, { timeout }, arg);

await page.goto(URL, { waitUntil: 'networkidle0' });

await check('манифест: название, иконки 192 и 512, маскируемая; всё отдаётся', async () => {
  const href = await page.$eval('link[rel="manifest"]', (l) => l.href);
  const m = await page.evaluate(async (h) => (await fetch(h)).json(), href);
  assert(m.name.includes('English Adventure') && m.display === 'standalone' && m.lang === 'ru', JSON.stringify(m).slice(0, 120));
  const sizes = m.icons.map((i) => `${i.sizes}${i.purpose ? ':' + i.purpose : ''}`);
  assert(sizes.includes('192x192') && sizes.includes('512x512') && sizes.includes('512x512:maskable'), sizes.join());
  for (const i of m.icons) {
    const st = await page.evaluate(async (u) => (await fetch(new URL(u, location.href))).status, i.src);
    assert(st === 200, `${i.src}: ${st}`);
  }
  const apple = await page.$eval('link[rel="apple-touch-icon"]', (l) => l.href);
  assert((await page.evaluate(async (u) => (await fetch(u)).status, apple)) === 200, 'нет иконки для iPhone');
});

await check('сервис-воркер установлен, игра сохранена на устройстве (надпись на стартовом экране)', async () => {
  await waitFor(() => !document.getElementById('offline-note').hidden, null, 20000);
  const ctrl = await page.evaluate(async () => { await navigator.serviceWorker.ready; return !!navigator.serviceWorker.controller || (await navigator.serviceWorker.getRegistration())?.active?.state; });
  assert(ctrl, 'нет активного сервис-воркера');
});

await check('игра обращается только к своему адресу — никаких внешних запросов', async () => {
  await page.click('#btn-play');
  await waitFor(() => !document.getElementById('onboard').hidden);
  await page.click('.ob-hero'); await page.click('#ob-name-form button'); await page.click('[data-age="junior"]');
  await page.click('#ob-check');
  for (let i = 0; i < 30; i++) { await page.click('#ob-dunno'); await sleep(40); }
  await page.click('#ob-go');
  await waitFor(() => window.__quests);
  // поговорить с мамой — диалог, задание, звук
  const pt = await page.evaluate(() => { const s = window.__game.scene.getScene('world'); const t = s.targetPosition('npc', 'npc.mum'); const r = window.__game.canvas.getBoundingClientRect(); const sc = s.worldToScreen(t.x, t.y); return { x: r.left + sc.x, y: r.top + sc.y }; });
  await page.mouse.click(pt.x, pt.y);
  await waitFor(() => !document.getElementById('quest-intro').hidden, null, 20000);
  await page.click('#qi-go');
  await sleep(1500);
  const foreign = requests.filter((u) => !u.startsWith(ORIGIN) && !u.startsWith('data:') && !u.startsWith('blob:'));
  assert(foreign.length === 0, `внешние запросы: ${foreign.slice(0, 3)}`);
});

await check('без интернета: игра открывается, продолжает с того же места и играется', async () => {
  await sleep(5500); // автосохранение
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitFor(() => document.getElementById('btn-play'));
  const txt = await page.$eval('#btn-play', (b) => b.textContent);
  assert(txt.includes('Продолжить'), `кнопка: ${txt}`);
  await page.click('#btn-play');
  await waitFor(() => window.__quests && window.__game.scene.getScene('world')?.debugState);
  await sleep(500);
  const q = await page.evaluate(() => window.__quests.debugState());
  assert(q.active === 'q.home.blue_cup', `квест: ${JSON.stringify(q.active)}`);
  // ходим и разговариваем без сети
  await page.keyboard.down('ArrowRight'); await sleep(400); await page.keyboard.up('ArrowRight');
  const pt = await page.evaluate(() => { const s = window.__game.scene.getScene('world'); const t = s.targetPosition('npc', 'npc.mum'); const r = window.__game.canvas.getBoundingClientRect(); const sc = s.worldToScreen(t.x, t.y); return { x: r.left + sc.x, y: r.top + sc.y }; });
  await page.mouse.click(pt.x, pt.y);
  await waitFor(() => !document.getElementById('dialogue').hidden || !document.getElementById('task').hidden, null, 20000);
});

await check('без интернета: родительский экран и отчёт работают', async () => {
  await page.keyboard.press('Escape');
  await page.evaluate(() => { for (const id of ['dialogue', 'task']) document.getElementById(id).hidden = true; });
  await page.click('#btn-settings');
  await page.click('#btn-parent');
  await waitFor(() => !document.getElementById('gate').hidden);
  const q = await page.$eval('#gate-question', (e) => e.textContent); const m = q.match(/(\d+) × (\d+)/);
  await page.type('#gate-input', String(Number(m[1]) * Number(m[2]))); await page.click('#gate-form button');
  await waitFor(() => !document.getElementById('parent').hidden);
  const stats = await page.$$eval('#parent-summary .stat', (els) => els.length);
  assert(stats === 5, `сводка: ${stats}`);
  await page.setOfflineMode(false);
});

await check('нет ошибок в консоли', async () => assert(errors.length === 0, errors.slice(0, 3).join(' | ')));

await browser.close();
server.kill();
console.log(results.join('\n'));
console.log(failed ? `\n${failed} проверок не прошли` : `\nВсе ${results.length} проверок прошли`);
process.exit(failed ? 1 : 0);
