// Сквозной тест этапа 4: родительский экран сверяется с тем, что ребёнок реально делал в игре.
// Проверка взрослого, PIN, лимит времени, выгрузка файла (и его проверка по схеме), сброс, загрузка.
// Запуск: npm run build && node tests/e2e/parent.mjs
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SHOTS = join(ROOT, 'tests/e2e/screenshots');
const DL = '/tmp/ea-downloads';
mkdirSync(SHOTS, { recursive: true });
rmSync(DL, { recursive: true, force: true }); mkdirSync(DL, { recursive: true });
const PORT = 4194;
const URL = `http://localhost:${PORT}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
await sleep(2500);
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });

let failed = 0;
const results = [];
const page = await browser.newPage();
async function check(name, fn) {
  try { await fn(); results.push(`✓ ${name}`); }
  catch (e) {
    failed++;
    const ui = await page.evaluate(() => ['quest-intro', 'dialogue', 'task', 'reward', 'gate', 'parent', 'limit', 'onboard'].filter((id) => !document.getElementById(id)?.hidden)).catch(() => []);
    results.push(`✗ ${name}: ${e.message.split('\n')[0]} | открыто: ${ui}`);
  }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.setViewport({ width: 1280, height: 800 });
// разрешение на скачивание — на уровне браузера (иначе headless Chrome молча отменяет загрузку)
const cdp = await browser.target().createCDPSession();
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL, eventsEnabled: true });

const visible = (id) => page.$eval(`#${id}`, (el) => !el.hidden);
const waitFor = (fn, arg, timeout = 15000) => page.waitForFunction(fn, { timeout }, arg);
const qs = () => page.evaluate(() => window.__quests.debugState());

async function tapTarget(kind, id) {
  const p = await page.evaluate((kind, id) => {
    const s = window.__game.scene.getScene('world'); const t = s.targetPosition(kind, id);
    const r = window.__game.canvas.getBoundingClientRect(); const sc = s.worldToScreen(t.x, t.y);
    return { x: r.left + sc.x, y: r.top + sc.y };
  }, kind, id);
  await page.mouse.click(p.x, p.y);
}
async function answerRight() {
  await waitFor(() => !document.getElementById('task').hidden && window.__tasks.lastView);
  const v = await page.evaluate(() => window.__tasks.lastView);
  await page.click(`#task-body .opt[data-id="${v.correctId}"]`);
  await waitFor((prev) => document.getElementById('task').hidden || JSON.stringify(window.__tasks.lastView) !== prev, JSON.stringify(v));
}
async function drainUi() {
  for (let i = 0; i < 60; i++) {
    if (await visible('quest-intro')) { await page.click('#qi-go'); await sleep(150); continue; }
    if (await visible('reward')) { await page.click('#reward [data-close]'); await sleep(200); continue; }
    if (await visible('task')) { await answerRight(); await sleep(200); continue; }
    if (await visible('dialogue')) { await page.click('#dlg-next'); await sleep(120); continue; }
    await sleep(250);
    if (!(await visible('dialogue')) && !(await visible('task')) && !(await visible('quest-intro')) && !(await qs()).busy) return;
  }
}
/** Пройти «родительскую проверку»: решить пример или ввести PIN. */
async function passGate(pin) {
  await waitFor(() => !document.getElementById('gate').hidden);
  const q = await page.$eval('#gate-question', (e) => e.textContent);
  const m = q.match(/(\d+) × (\d+)/);
  await page.type('#gate-input', pin ?? String(Number(m[1]) * Number(m[2])));
  await page.click('#gate-form button');
}
async function openParentFromSettings(pin) {
  await page.click('#btn-settings');
  await page.click('#btn-parent');
  await passGate(pin);
  await waitFor(() => !document.getElementById('parent').hidden);
}
const closeParent = async () => { await page.click('#parent-close'); await sleep(200); };

// ================= Игра с ошибками =================
await page.goto(URL, { waitUntil: 'networkidle0' });
await page.click('#btn-play');
await waitFor(() => !document.getElementById('onboard').hidden);
await page.click('.ob-hero[data-look="kid_1"]');
await page.type('#ob-name', 'Тимур');
await page.click('#ob-name-form button');
await page.click('[data-age="junior"]');
await page.click('#ob-skip');
await page.click('#ob-go');
await waitFor(() => window.__quests);
await sleep(600);

await check('ребёнок проходит квест «синяя чашка», дважды ошибаясь в выборе', async () => {
  await tapTarget('npc', 'npc.mum');
  await waitFor(() => !document.getElementById('quest-intro').hidden, null, 20000);
  await drainUi();
  await waitFor(() => window.__quests.debugState().step === 'find_cup');
  await sleep(300);
  const idle = () => waitFor(() => !window.__game.scene.getScene('world').debugState().walking, null, 20000);
  await tapTarget('pick', 'it.cup_red');          // путает blue ↔ red
  await waitFor(() => window.__learning.allEvents().filter((e) => e.mode === 'find_item').length >= 2, null, 20000);
  await idle(); await sleep(600);
  await tapTarget('pick', 'it.plate_blue');       // путает cup ↔ plate
  await waitFor(() => window.__learning.allEvents().filter((e) => e.mode === 'find_item').length >= 4, null, 20000);
  await drainUi();                                 // подсказка
  await idle();
  await tapTarget('pick', 'it.cup_blue');
  await waitFor(() => window.__quests.debugState().step === 'give_cup', null, 20000);
  await tapTarget('npc', 'npc.mum');
  await waitFor(() => !document.getElementById('dialogue').hidden || !document.getElementById('task').hidden, null, 20000);
  await drainUi();
  assert((await qs()).states['q.home.blue_cup']?.status === 'done', 'квест не завершён');
});

// ================= Вход для взрослых =================
await check('вход для взрослых: неверный ответ не пускает, верный — пускает', async () => {
  await page.click('#btn-settings');
  await page.click('#btn-parent');
  await waitFor(() => !document.getElementById('gate').hidden);
  await page.type('#gate-input', '1');
  await page.click('#gate-form button');
  await sleep(150);
  assert((await page.$eval('#gate-error', (e) => e.textContent)).includes('Неверно'), 'нет сообщения об ошибке');
  assert(!(await visible('parent')), 'пустило с неверным ответом');
  await page.$eval('#gate-input', (i) => (i.value = ''));
  await passGate();
  await waitFor(() => !document.getElementById('parent').hidden);
});

await check('сводка совпадает с игрой: 1 из 12 заданий, слова в изучении', async () => {
  const stats = await page.$$eval('#parent-summary .stat', (els) => els.map((e) => e.textContent));
  assert(stats[0].includes('1 / 12'), stats[0]);
  const learning = await page.evaluate(() => [...window.__learning.allStates().values()].filter((s) => s.status === 'learning').length);
  assert(stats[3].startsWith(String(learning)), `на экране «${stats[3]}», в данных ${learning}`);
  await page.screenshot({ path: join(SHOTS, 'parent-1-skills.png') });
});

await check('навыки: 10 штук, ни один не «подтверждён» после одного дня, цвета — «учится»', async () => {
  const skills = await page.$$eval('#parent-skills .skill', (els) => els.map((e) => ({ cls: e.className, t: e.querySelector('summary').textContent })));
  assert(skills.length === 10, `навыков ${skills.length}`);
  assert(!skills.some((s) => s.cls.includes('confirmed')), 'что-то подтверждено за один день');
  const colours = skills.find((s) => s.t.includes('цвета'));
  assert(colours.cls.includes('in_progress'), colours.cls);
  const animals = skills.find((s) => s.t.includes('животных'));
  assert(animals.cls.includes('not_started'), animals.cls);
});

await check('слова и путаница совпадают с ошибками ребёнка', async () => {
  await page.click('.parent-tabs [data-tab="words"]');
  const conf = await page.$eval('#parent-confusions', (e) => e.textContent);
  assert(conf.includes('blue ↔ red') && conf.includes('cup ↔ plate'), conf);
  const words = await page.$$eval('#parent-words td.en', (els) => els.map((e) => e.textContent));
  for (const w of ['blue', 'cup', 'find', 'Hello!']) assert(words.includes(w), `нет «${w}» среди ${words}`);
  // счётчики ошибок — как в журнале
  const row = await page.$$eval('#parent-words tr', (rows) => rows.map((r) => r.textContent).find((t) => t.startsWith('blue')));
  const st = await page.evaluate(() => window.__learning.allStates().get('w.blue'));
  assert(row.endsWith(`${st.correct} / ${st.wrong}`), `строка «${row}», в данных ${st.correct}/${st.wrong}`);
  await page.screenshot({ path: join(SHOTS, 'parent-2-words.png') });
});

await check('время: сегодняшние минуты на графике', async () => {
  await page.evaluate(() => window.__tracker.tick(600)); // +10 минут
  await closeParent();
  await page.click('#btn-settings'); await page.click('#btn-parent'); await passGate();
  await waitFor(() => !document.getElementById('parent').hidden);
  await page.click('.parent-tabs [data-tab="time"]');
  const bars = await page.$$eval('#parent-days .day', (els) => els.map((e) => e.getAttribute('title')));
  assert(bars.length === 14, `столбиков ${bars.length}`);
  const today = bars[13];
  assert(/: 1\d мин$/.test(today), `сегодня: ${today}`);
  await page.screenshot({ path: join(SHOTS, 'parent-3-time.png') });
});

await check('лимит 15 минут: игра останавливается, «ещё 15 минут» — только взрослому', async () => {
  await page.click('.parent-tabs [data-tab="settings"]');
  await page.click('#parent-limit button[data-value="15"]');
  await closeParent();
  await page.evaluate(() => window.__tracker.tick(300)); // всего > 15 мин
  await waitFor(() => !document.getElementById('limit').hidden);
  await page.screenshot({ path: join(SHOTS, 'parent-4-limit.png') });
  // ребёнок не может уйти: управление заблокировано
  const before = await page.evaluate(() => window.__game.scene.getScene('world').debugState());
  await page.keyboard.down('ArrowLeft'); await sleep(400); await page.keyboard.up('ArrowLeft');
  const after = await page.evaluate(() => window.__game.scene.getScene('world').debugState());
  assert(before.x === after.x, 'герой ходит при лимите');
  await page.click('#limit-more');
  await passGate();
  await waitFor(() => document.getElementById('limit').hidden);
});

await check('PIN: после установки пример не принимается, только PIN', async () => {
  await openParentFromSettings();
  await page.click('.parent-tabs [data-tab="settings"]');
  await page.type('#parent-pin', '4821');
  await page.click('#parent-pin-form button');
  await waitFor(() => document.getElementById('parent-pin-state').textContent.includes('сохранён'));
  await closeParent();
  await page.click('#btn-settings'); await page.click('#btn-parent');
  await waitFor(() => !document.getElementById('gate').hidden);
  assert((await page.$eval('#gate-question', (e) => e.textContent)).includes('PIN'), 'не просит PIN');
  await page.type('#gate-input', '1111'); await page.click('#gate-form button'); await sleep(150);
  assert(!(await visible('parent')), 'пустило с неверным PIN');
  await page.$eval('#gate-input', (i) => (i.value = ''));
  await page.type('#gate-input', '4821'); await page.click('#gate-form button');
  await waitFor(() => !document.getElementById('parent').hidden);
});

let savedFile = null;
await check('выгрузка: файл скачивается, проходит схему, без PIN, с выполненным квестом', async () => {
  await page.click('.parent-tabs [data-tab="settings"]');
  await page.click('#parent-export');
  for (let i = 0; i < 40 && !readdirSync(DL).some((f) => f.endsWith('.json')); i++) await sleep(250);
  const f = readdirSync(DL).find((x) => x.endsWith('.json'));
  assert(f && f.includes('Timur'), `файл: ${f}; сообщение: ${await page.$eval('#parent-file-msg', (e) => e.textContent)}; в папке: ${readdirSync(DL)}`);
  savedFile = join(DL, f);
  const text = readFileSync(savedFile, 'utf8');
  const data = JSON.parse(text);
  const ajv = new Ajv2020({ allErrors: true, strict: false }); addFormats(ajv);
  for (const s of readdirSync(join(ROOT, 'schemas'))) ajv.addSchema(JSON.parse(readFileSync(join(ROOT, 'schemas', s), 'utf8')));
  const v = ajv.getSchema('https://english-adventure.local/schemas/save.schema.json');
  assert(v(data), JSON.stringify(v.errors?.slice(0, 2)));
  assert(data.quests['q.home.blue_cup'].status === 'done', 'нет квеста');
  assert(data.profile.name === 'Тимур', 'нет имени');
  assert(!text.includes('parentPin') && !text.includes('4821'), 'PIN в файле');
  assert(data.events.length >= 8, `событий ${data.events.length}`);
  assert(data.profile.settings.dailyLimitMin === 15, 'лимит не попал в файл');
});

await check('сброс: только после слова СБРОС; игра начинается заново', async () => {
  await page.type('#parent-reset', 'да'); await page.click('#parent-reset-form button'); await sleep(300);
  assert(await visible('parent'), 'сбросило без подтверждения');
  await page.$eval('#parent-reset', (i) => (i.value = ''));
  await page.type('#parent-reset', 'сброс');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('#parent-reset-form button')]);
  const txt = await page.$eval('#btn-play', (b) => b.textContent);
  assert(txt.includes('Играть'), txt);
});

await check('загрузка файла: прогресс, имя и выполненный квест вернулись', async () => {
  await page.click('#btn-parent-start');
  await passGate();             // после сброса PIN нет — снова пример
  await waitFor(() => !document.getElementById('parent').hidden);
  await page.click('.parent-tabs [data-tab="settings"]');
  const input = await page.$('#parent-import');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }), input.uploadFile(savedFile)]);
  const note = await page.$eval('#start-notes', (e) => e.textContent);
  assert(note.includes('Тимур'), note);
  await page.click('#btn-play');
  await waitFor(() => window.__quests);
  await sleep(500);
  // лимит 15 минут и сегодняшние 15+ минут тоже восстановились из файла — игра сразу просит отдохнуть
  assert(await visible('limit'), 'лимит не восстановился из файла');
  await page.click('#limit-more');
  await passGate();
  await waitFor(() => document.getElementById('limit').hidden);
  assert(!(await visible('onboard')), 'снова выбор героя');
  assert((await qs()).states['q.home.blue_cup']?.status === 'done', 'квест не восстановлен');
  assert((await page.$eval('#hud-stars span', (e) => e.textContent)) === '3', 'звёзды');
});

await check('загрузка чужого файла — понятная ошибка, прогресс не тронут', async () => {
  await openParentFromSettings();
  await page.click('.parent-tabs [data-tab="settings"]');
  const bad = '/tmp/ea-bad.json';
  (await import('node:fs')).writeFileSync(bad, '{"hello":"world"}');
  await (await page.$('#parent-import')).uploadFile(bad);
  await waitFor(() => document.getElementById('parent-file-msg').textContent.includes('Не получилось'));
  assert((await qs()).states['q.home.blue_cup']?.status === 'done', 'прогресс пострадал');
  await closeParent();
});

await check('нет ошибок в консоли', async () => assert(errors.length === 0, errors.slice(0, 3).join(' | ')));

// ---------------- Телефон ----------------
{
  const ctx = await browser.createBrowserContext();
  const p2 = await ctx.newPage();
  await p2.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' });
  await p2.goto(URL, { waitUntil: 'networkidle0' });
  await check('телефон: родительский экран читается, вкладки крупные', async () => {
    await p2.tap('#btn-parent-start');
    await p2.waitForFunction(() => !document.getElementById('gate').hidden);
    const q = await p2.$eval('#gate-question', (e) => e.textContent); const m = q.match(/(\d+) × (\d+)/);
    await p2.type('#gate-input', String(Number(m[1]) * Number(m[2]))); await p2.tap('#gate-form button');
    await p2.waitForFunction(() => !document.getElementById('parent').hidden);
    const tab = await p2.$eval('.parent-tabs button', (b) => b.offsetHeight);
    assert(tab >= 44, `вкладка ${tab}px`);
    const overflow = await p2.evaluate(() => document.getElementById('parent').scrollWidth > innerWidth + 1);
    assert(!overflow, 'горизонтальная прокрутка');
    await p2.screenshot({ path: join(SHOTS, 'parent-phone.png') });
  });
  await ctx.close();
}

await browser.close();
server.kill();
console.log(results.join('\n'));
console.log(failed ? `\n${failed} проверок не прошли` : `\nВсе ${results.length} проверок прошли`);
process.exit(failed ? 1 : 0);
