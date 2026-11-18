// Сквозной тест этапа 2: полное прохождение трёх квестов дома в настоящем Chrome —
// с ошибками, подсказкой и показом ответа, поиском предмета, повторением, наградами и сохранением.
// Запуск: npm run build && node tests/e2e/quests.mjs
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SHOTS = join(ROOT, 'tests/e2e/screenshots');
mkdirSync(SHOTS, { recursive: true });
const PORT = 4188;
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
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});

let failed = 0;
const results = [];
async function check(name, fn) {
  try { await fn(); results.push(`✓ ${name}`); }
  catch (e) { failed++; results.push(`✗ ${name}: ${e.message}`); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };

const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.setViewport({ width: 1280, height: 800 });
await page.goto(URL, { waitUntil: 'networkidle0' });

const visible = (id) => page.$eval(`#${id}`, (el) => !el.hidden);
const quests = () => page.evaluate(() => window.__quests.debugState());
const world = () => page.evaluate(() => window.__game.scene.getScene('world').debugState());
const events = () => page.evaluate(() => window.__learning.allEvents());
const view = () => page.evaluate(() => window.__tasks.lastView);
const waitFor = (fn, arg, timeout = 10000) => page.waitForFunction(fn, { timeout }, arg);

async function tapTarget(kind, id, attempt = 0) {
  const p = await page.evaluate((kind, id) => {
    const s = window.__game.scene.getScene('world');
    const t = s.targetPosition(kind, id);
    if (!t) return null;
    const r = window.__game.canvas.getBoundingClientRect();
    const sc = s.worldToScreen(t.x, t.y);
    const x = r.left + sc.x, y = r.top + sc.y;
    return { x, y, covered: document.elementFromPoint(x, y) !== window.__game.canvas };
  }, kind, id);
  if (!p) throw new Error(`нет цели ${kind}:${id}`);
  // цель под плашкой задания или кнопкой — ждём, пока камера сдвинется (герой идёт), и пробуем ещё раз
  if (p.covered && attempt < 6) { await sleep(500); return tapTarget(kind, id, attempt + 1); }
  if (p.covered && attempt === 6) {
    // всё ещё закрыта — ставим героя ниже цели, камера едет за ним
    await page.evaluate((kind, id) => {
      const s = window.__game.scene.getScene('world'); const t = s.targetPosition(kind, id); const g = s.grid;
      const c = g.nearestWalkable(g.cellOf({ x: t.x, y: t.y + 40 }), { x: t.x, y: t.y + 40 }); s.pos = g.feetOf(c);
    }, kind, id);
    await sleep(500);
    return tapTarget(kind, id, 7);
  }
  await page.mouse.click(p.x, p.y);
}

/** Ответить на текущее задание: правильно или выбрать конкретный неправильный вариант. */
async function answer(correct = true) {
  await waitFor(() => !document.getElementById('task').hidden && window.__tasks.lastView);
  const v = await view();
  if (v.mode === 'listen_choose') {
    const id = correct ? v.correctId : v.options.find((o) => o.id !== v.correctId).id;
    await page.click(`#task-body .opt[data-id="${id}"]`);
  } else if (v.mode === 'build_phrase') {
    const order = correct ? v.pieces : [...v.pieces].reverse();
    const used = new Set();
    for (const piece of order) {
      const idx = v.shuffled.findIndex((p, i) => p === piece && !used.has(i));
      used.add(idx);
      await page.click(`#task-body .pieces .piece[data-i="${idx}"]`);
    }
    await page.click('#task-body .task-actions .btn');
  } else if (v.mode === 'type_word') {
    await page.type('#task-body input', correct ? v.expected : 'zzz');
    await page.keyboard.press('Enter');
  }
  await sleep(250);
  return v;
}

/** Пройти диалог: «Дальше» на репликах, правильные ответы на задания — пока открыт диалог/задание. */
async function playThrough({ stopWhen } = {}) {
  for (let i = 0; i < 60; i++) {
    if (stopWhen && (await stopWhen())) return;
    if (await visible('quest-intro')) { await page.click('#qi-go'); await sleep(250); continue; }
    if (await visible('reward')) return;
    if (await visible('task')) { await answer(true); await sleep(1200); continue; }
    if (await visible('dialogue')) { await page.click('#dlg-next'); await sleep(200); continue; }
    await sleep(300);
    if (!(await visible('dialogue')) && !(await visible('task')) && !(await visible('quest-intro'))) return;
  }
  throw new Error('диалог не закончился');
}

await page.click('#btn-play');
await passOnboarding(page);
await waitFor(() => window.__quests);
await sleep(600);

// ---------------- Квест 1: синяя чашка ----------------
await check('в начале: только мама с «!», Эми и папы ещё нет... папа есть, но без квеста', async () => {
  const w = await world();
  assert(w.markers.includes('npc.mum'), `маркеры: ${w.markers}`);
  assert(!w.npcs.includes('npc.amy'), 'Эми уже пришла');
  assert(!w.markers.includes('npc.dad'), 'у папы «!» раньше времени');
  const goal = await page.$eval('#quest-text', (e) => e.textContent);
  assert(goal.includes('с мамой'), `цель: ${goal}`);
});

await check('касание мамы → окно квеста → мама здоровается', async () => {
  await tapTarget('npc', 'npc.mum');
  await waitFor(() => !document.getElementById('quest-intro').hidden);
  const title = await page.$eval('#qi-title', (e) => e.textContent);
  assert(title === 'Синяя чашка для мамы', title);
  await page.click('#qi-go');
  await waitFor(() => !document.getElementById('dialogue').hidden);
  assert((await page.$eval('#dlg-en', (e) => e.textContent)) === 'Hello, sweetie!', 'не та реплика');
  await page.screenshot({ path: join(SHOTS, 'q1-1-dialogue.png') });
  await page.click('#dlg-next');
});

await check('задание «поздоровайся»: ошибка → ещё попытка → подсказка → показ ответа → дальше', async () => {
  const v = await answer(false);
  assert(v.mode === 'listen_choose' && v.correctId === 'p.hello', JSON.stringify(v.correctId));
  assert((await page.$eval('#task-feedback', (e) => e.textContent)).includes('ещё раз'), 'нет «попробуй ещё раз»');
  // вторая ошибка — другой неверный вариант
  const other = v.options.filter((o) => o.id !== v.correctId)[1].id;
  await page.click(`#task-body .opt[data-id="${other}"]`); await sleep(250);
  assert(await visible('task-hint'), 'нет подсказки после второй ошибки');
  await page.screenshot({ path: join(SHOTS, 'q1-2-hint.png') });
  // третья «ошибка» невозможна по уже отключённым кнопкам — нажимаем снова первый неверный через JS-клик
  await page.$eval(`#task-body .opt[data-id="${v.options.find((o) => o.id !== v.correctId).id}"]`, (b) => { b.disabled = false; b.click(); });
  await sleep(250);
  const hint = await page.$eval('#task-hint', (e) => e.textContent);
  assert(hint.includes('Правильно: Hello!'), `показ ответа: ${hint}`);
  assert(await page.$eval(`#task-body .opt[data-id="p.hello"]`, (b) => b.classList.contains('model')), 'правильный вариант не подсвечен');
  await page.click('#task-body .opt[data-id="p.hello"]');
  await waitFor(() => document.getElementById('task').hidden);
  const ev = (await events()).filter((e) => e.item === 'p.hello');
  assert(ev.length === 4, `событий: ${ev.length}`);
  assert(ev[0].result === 'wrong' && ev[0].hinted === false && ev[0].chosen, 'первая ошибка записана неверно');
  assert(ev[3].result === 'correct' && ev[3].hinted === true, 'ответ после показа должен быть «с подсказкой»');
});

await check('мама просит найти синюю чашку → на кухне 4 похожих предмета', async () => {
  await waitFor(() => document.getElementById('dlg-en').textContent === 'Find the blue cup, please.');
  await page.click('#dlg-next');
  await waitFor(() => window.__quests.debugState().step === 'find_cup');
  await sleep(300);
  const w = await world();
  assert(w.pickables.sort().join() === 'it.cup_blue,it.cup_green,it.cup_red,it.plate_blue', `предметы: ${w.pickables}`);
  const goal = await page.$eval('#quest-text', (e) => e.textContent);
  assert(goal.includes('Найди'), goal);
  await page.screenshot({ path: join(SHOTS, 'q1-3-find.png') });
});

await check('взял синюю тарелку — ошибка только по слову «cup», красную чашку — только по «blue»', async () => {
  await tapTarget('pick', 'it.plate_blue');
  await waitFor(() => window.__learning.allEvents().filter((e) => e.mode === 'find_item').length >= 2, null, 12000);
  let ev = (await events()).filter((e) => e.mode === 'find_item');
  assert(ev.find((e) => e.item === 'w.cup')?.result === 'wrong' && ev.find((e) => e.item === 'w.cup').chosen === 'w.plate', 'cup');
  assert(ev.find((e) => e.item === 'w.blue')?.result === 'correct', 'blue');
  await waitFor(() => !document.getElementById('toast').hidden);
  await tapTarget('pick', 'it.cup_red');
  await waitFor(() => window.__learning.allEvents().filter((e) => e.mode === 'find_item').length >= 4, null, 12000);
  ev = (await events()).filter((e) => e.mode === 'find_item').slice(2);
  assert(ev.find((e) => e.item === 'w.blue')?.result === 'wrong' && ev.find((e) => e.item === 'w.blue').chosen === 'w.red', 'blue/red');
});

await check('после двух ошибок — подсказка; затем взял синюю чашку — она в руках', async () => {
  await waitFor(() => !document.getElementById('dialogue').hidden);
  const who = await page.$eval('#dlg-speaker', (e) => e.textContent);
  assert(who.includes('Подсказка'), who);
  await page.click('#dlg-next');
  await sleep(300);
  await tapTarget('pick', 'it.cup_blue');
  await waitFor(() => window.__quests.debugState().step === 'give_cup', null, 12000);
  const q = await quests();
  assert(q.inventory.includes('it.cup_blue'), `в руках: ${q.inventory}`);
  assert((await world()).pickables.length === 0, 'остальные предметы не убрались');
  const goal = await page.$eval('#quest-text', (e) => e.textContent);
  assert(goal.includes('маме'), goal);
});

await check('отдал маме → вопрос про цвет, пирожное, спасибо, до свидания → награда', async () => {
  await tapTarget('npc', 'npc.mum');
  await playThrough();
  await waitFor(() => !document.getElementById('reward').hidden);
  const stars = await page.$eval('#rw-stars', (e) => e.textContent);
  assert(stars === '⭐⭐⭐', stars);
  const words = await page.$$eval('#rw-words .chip .en', (els) => els.map((e) => e.textContent));
  assert(words.includes('blue') && words.includes('cup'), `слова: ${words}`);
  assert((await page.$eval('#rw-extra', (e) => e.textContent)).includes('синяя лампа'), 'нет сообщения об украшении');
  await page.screenshot({ path: join(SHOTS, 'q1-4-reward.png') });
  await page.click('#reward [data-close]');
  await sleep(400);
  const q = await quests();
  assert(q.states['q.home.blue_cup'].status === 'done', 'квест не завершён');
  assert(!q.inventory.includes('it.cup_blue') && q.inventory.includes('it.cake'), `инвентарь: ${q.inventory}`);
  assert((await page.$eval('#hud-stars span', (e) => e.textContent)) === '3', 'звёзды');
});

await check('после квеста пришла Эми с «!», у мамы «!» больше нет', async () => {
  const w = await world();
  assert(w.npcs.includes('npc.amy') && w.markers.includes('npc.amy'), `npcs ${w.npcs}, markers ${w.markers}`);
  assert(!w.markers.includes('npc.mum'), 'мама всё ещё с «!»');
});

// ---------------- Квест 2: Эми ----------------
await check('знакомство с Эми: «собери фразу» My name is …, повторение в конце', async () => {
  // «как будто прошло несколько дней»: фраза уже знакома — игра должна дать собрать её
  await page.evaluate(() => window.__learning.debugSet('p.my_name_is', { status: 'learning', box: 2, due: new Date(Date.now() - 1000).toISOString() }));
  await tapTarget('npc', 'npc.amy');
  let sawBuild = false;
  for (let i = 0; i < 40; i++) {
    if (await visible('reward')) break;
    if (await visible('quest-intro')) { await page.click('#qi-go'); await sleep(250); continue; }
    if (await visible('task')) {
      const v = await view();
      if (v?.mode === 'build_phrase') {
        sawBuild = true;
        assert(v.pieces.join(' ') === 'My name is', v.pieces.join(' '));
        await page.screenshot({ path: join(SHOTS, 'q2-1-build.png') });
      }
      await answer(true); await sleep(1300); continue;
    }
    if (await visible('dialogue')) { await page.click('#dlg-next'); await sleep(200); continue; }
    await sleep(400);
  }
  assert(sawBuild, 'не было задания «собери фразу»');
  await waitFor(() => !document.getElementById('reward').hidden);
  await page.click('#reward [data-close]');
  await sleep(300);
  const ev = await events();
  assert(ev.some((e) => e.context.startsWith('review.')), 'не было повторения');
  assert(ev.some((e) => e.item === 'p.my_name_is' && e.mode === 'build_phrase' && e.result === 'correct'), 'нет события сборки');
  assert((await quests()).states['q.home.amy_hello'].status === 'done', 'квест 2 не завершён');
});

// ---------------- Квест 3: папин мяч ----------------
await check('папа: найди красный мяч среди синего мяча, красной книги, зелёной чашки', async () => {
  const w0 = await world();
  assert(w0.markers.includes('npc.dad'), `маркеры: ${w0.markers}`);
  await tapTarget('npc', 'npc.dad');
  await playThrough({ stopWhen: async () => (await quests()).step === 'find_ball' });
  await waitFor(() => window.__quests.debugState().step === 'find_ball');
  await sleep(300);
  const w = await world();
  assert(w.pickables.sort().join() === 'it.ball_blue,it.ball_red,it.book_red,it.cup_green', `${w.pickables}`);
  await page.screenshot({ path: join(SHOTS, 'q3-1-find.png') });
  await tapTarget('pick', 'it.ball_red');
  await waitFor(() => window.__quests.debugState().step === 'give_ball', null, 15000);
});

await check('отдал папе со словами «Here you are» → награда, 9 звёзд', async () => {
  await tapTarget('npc', 'npc.dad');
  await waitFor(() => !document.getElementById('task').hidden);
  assert((await view()).correctId === 'p.here_you_are', 'первым должно быть «Here you are»');
  await playThrough();
  await waitFor(() => !document.getElementById('reward').hidden);
  await page.click('#reward [data-close]');
  await sleep(300);
  assert((await page.$eval('#hud-stars span', (e) => e.textContent)) === '9', 'звёзд не 9');
  assert(!(await quests()).inventory.includes('it.ball_red'), 'мяч остался в руках');
});

await check('дома всё сделано — цель зовёт на улицу к Бену', async () => {
  const goal = await page.$eval('#quest-text', (e) => e.textContent);
  assert(goal.includes('с Беном') && goal.includes('STREET'), goal);
});

await check('прогресс сохраняется: после перезагрузки 9 звёзд, Эми на месте, лампа стоит, журнал цел', async () => {
  const before = (await events()).length;
  await sleep(500);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('#btn-play');
  await waitFor(() => window.__quests);
  await sleep(600);
  assert((await page.$eval('#hud-stars span', (e) => e.textContent)) === '9', 'звёзды');
  const w = await world();
  assert(w.npcs.includes('npc.amy'), 'Эми пропала');
  const after = (await events()).length;
  assert(after === before, `событий было ${before}, стало ${after}`);
  const hasLamp = await page.evaluate(() => !!window.__game.scene.getScene('world').children.getByName('decor_it.decor_blue_lamp'));
  assert(hasLamp, 'нет лампы');
  await page.screenshot({ path: join(SHOTS, 'q-final-room.png') });
});

await check('нет ошибок в консоли', async () => assert(errors.length === 0, errors.join(' | ')));

// ---------------- Продолжение квеста после перезагрузки ----------------
const ctx = await browser.createBrowserContext();
const p2 = await ctx.newPage();
const errs2 = [];
p2.on('pageerror', (e) => errs2.push(e.message));
await p2.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await p2.goto(URL, { waitUntil: 'networkidle0' });
await check('телефон: квест начинается касанием, задание помещается на экран', async () => {
  await p2.tap('#btn-play');
  await passOnboarding(p2, { tap: true });
  await p2.waitForFunction(() => window.__quests, { timeout: 8000 });
  await sleep(600);
  const pt = await p2.evaluate(() => {
    const s = window.__game.scene.getScene('world'); const t = s.targetPosition('npc', 'npc.mum');
    const r = window.__game.canvas.getBoundingClientRect(); const sc = s.worldToScreen(t.x, t.y);
    return { x: r.left + sc.x, y: r.top + sc.y };
  });
  await p2.touchscreen.tap(pt.x, pt.y);
  await p2.waitForFunction(() => !document.getElementById('quest-intro').hidden, { timeout: 10000 });
  await p2.tap('#qi-go'); await sleep(300);
  await p2.tap('#dlg-next');
  await p2.waitForFunction(() => !document.getElementById('task').hidden, { timeout: 8000 });
  await sleep(400);
  const r = await p2.$eval('#task .task-box', (b) => { const r = b.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, w: r.width }; });
  assert(r.top >= 0 && r.bottom <= 844 && r.w <= 390, JSON.stringify(r));
  const opt = await p2.$eval('#task-body .opt', (b) => b.getBoundingClientRect().height);
  assert(opt >= 48, `высота варианта ${opt}`);
  await p2.screenshot({ path: join(SHOTS, 'phone-task.png') });
});
await check('телефон: квест продолжается после перезагрузки посреди «найди»', async () => {
  const v = await p2.evaluate(() => window.__tasks.lastView);
  await p2.tap(`#task-body .opt[data-id="${v.correctId}"]`);
  await p2.waitForFunction(() => document.getElementById('dlg-en')?.textContent === 'Find the blue cup, please.', { timeout: 10000 });
  await p2.tap('#dlg-next');
  await p2.waitForFunction(() => window.__quests.debugState().step === 'find_cup', { timeout: 8000 });
  await sleep(300);
  await p2.reload({ waitUntil: 'networkidle0' });
  await p2.tap('#btn-play');
  await p2.waitForFunction(() => window.__quests, { timeout: 8000 });
  await sleep(600);
  const q = await p2.evaluate(() => window.__quests.debugState());
  const w = await p2.evaluate(() => window.__game.scene.getScene('world').debugState());
  assert(q.active === 'q.home.blue_cup' && q.step === 'find_cup', JSON.stringify(q));
  assert(w.pickables.length === 4, `предметы после перезагрузки: ${w.pickables}`);
  assert(errs2.length === 0, errs2.join(' | '));
});
await ctx.close();

await browser.close();
server.kill();
console.log(results.join('\n'));
console.log(failed ? `\n${failed} проверок не прошли` : `\nВсе ${results.length} проверок прошли`);
process.exit(failed ? 1 : 0);
