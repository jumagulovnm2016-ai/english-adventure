// Сквозной тест юнита 2: юнит 1 проходится быстро, затем площадка и зоопарк — все 12 новых квестов,
// двери на площадку и в зоопарк, дождь, задания-картинки для действий/частей тела, звёзды и навыки.
// Запуск: npm run build && node tests/e2e/unit2.mjs
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SHOTS = join(ROOT, 'tests/e2e/screenshots');
mkdirSync(SHOTS, { recursive: true });
const PORT = 4196;
const URL = `http://localhost:${PORT}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
await sleep(2500);
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});

let failed = 0;
const results = [];
async function check(name, fn) {
  const t = Date.now();
  try { await fn(); results.push(`✓ ${name} (${((Date.now() - t) / 1000).toFixed(0)} с)`); }
  catch (e) {
    failed++;
    const ui = await page.evaluate(() => ({
      open: ['quest-intro', 'dialogue', 'task', 'reward', 'toast'].filter((id) => !document.getElementById(id).hidden),
      dlg: document.getElementById('dlg-en').textContent, task: window.__tasks.lastView?.correctId,
      q: window.__quests.debugState().step, w: window.__game.scene.getScene('world').debugState?.().location,
    })).catch(() => ({}));
    results.push(`✗ ${name}: ${e.message.split('\n')[0]} | ${JSON.stringify(ui)}`);
    // закрыть всё, что осталось открытым, чтобы следующие проверки не падали каскадом
    await page.keyboard.press('Escape').catch(() => {});
  }
}
const assert = (c, m) => { if (!c) throw new Error(m); };

const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.setViewport({ width: 1280, height: 800 });
await page.goto(URL, { waitUntil: 'networkidle0' });

const visible = (id) => page.$eval(`#${id}`, (el) => !el.hidden);
const qs = () => page.evaluate(() => window.__quests.debugState());
const world = () => page.evaluate(() => window.__game.scene.getScene('world').debugState());
const waitFor = (fn, arg, timeout = 15000) => page.waitForFunction(fn, { timeout }, arg);

async function tapTarget(kind, id, attempt = 0) {
  const p = await page.evaluate((kind, id) => {
    const s = window.__game.scene.getScene('world');
    const t = s.targetPosition(kind, id);
    if (!t) return null;
    const r = window.__game.canvas.getBoundingClientRect();
    const sc = s.worldToScreen(t.x, t.y);
    const x = r.left + sc.x, y = r.top + sc.y;
    // цель закрыта плашкой интерфейса (задание, кнопки) — как и ребёнок, подойдём ближе
    const el = document.elementFromPoint(x, y);
    const covered = el !== window.__game.canvas;
    return { x, y, w: innerWidth, h: innerHeight, covered, by: el?.id || el?.className };
  }, kind, id);
  if (!p) throw new Error(`нет цели ${kind}:${id} в ${(await world()).location}`);
  // цель за краем экрана: камера всё равно вернётся к герою — ставим героя поближе (само касание проверено отдельно)
  if (attempt < 3 && (p.covered || p.x < 10 || p.y < 10 || p.x > p.w - 10 || p.y > p.h - 10)) {
    if (attempt === 2) console.log(`  (цель ${id} закрыта: ${p.by})`);
    await page.evaluate((kind, id) => {
      const s = window.__game.scene.getScene('world');
      const t = s.targetPosition(kind, id);
      const g = s.grid;
      const c = g.nearestWalkable(g.cellOf({ x: t.x, y: t.y + 40 }), { x: t.x, y: t.y + 40 });
      s.pos = g.feetOf(c);
    }, kind, id);
    await sleep(400);
    return tapTarget(kind, id, attempt + 1);
  }
  await page.mouse.click(p.x, p.y);
}

/** Переместиться в локацию «по-быстрому» (двери проверяются отдельно настоящей ходьбой). */
async function goTo(loc) {
  if ((await world()).location === loc) return;
  await page.evaluate((loc) => { const m = window.__maps[loc]; window.__travel({ tx: 0, ty: 0, to: loc, spawn: m.spawn }); }, loc);
  await waitFor((loc) => window.__game.scene.getScene('world')?.debugState?.().location === loc && window.__game.scene.getScene('world').debugState().companion !== undefined, loc);
  await sleep(500);
}

/** Ответить на открытое задание правильно. */
async function answer() {
  await waitFor(() => !document.getElementById('task').hidden && window.__tasks.lastView);
  const v = await page.evaluate(() => window.__tasks.lastView);
  if (v.mode === 'listen_choose') await page.click(`#task-body .opt[data-id="${v.correctId}"]`);
  else if (v.mode === 'build_phrase') {
    const used = new Set();
    for (const piece of v.pieces) { const i = v.shuffled.findIndex((p, k) => p === piece && !used.has(k)); used.add(i); await page.click(`#task-body .pieces .piece[data-i="${i}"]`); }
    await page.click('#task-body .task-actions .btn');
  } else { await page.type('#task-body input', v.expected); await page.keyboard.press('Enter'); }
  // задание закрылось — или сразу открылось следующее (повторение из двух вопросов)
  await waitFor((prev) => document.getElementById('task').hidden || JSON.stringify(window.__tasks.lastView) !== prev, JSON.stringify(v));
  return v;
}

/** Касание персонажа: дождаться, пока герой дойдёт и откроется окно (или сменится шаг квеста). */
async function talkTo(npcId) {
  const before = JSON.stringify(await qs());
  await tapTarget('npc', npcId);
  await waitFor((b) => ['quest-intro', 'dialogue', 'task', 'reward'].some((id) => !document.getElementById(id).hidden)
    || JSON.stringify(window.__quests.debugState()) !== b, before, 20000);
}

/** Прокликать открытые окна: начало квеста, реплики, задания, награду. */
async function drainUi(seen) {
  for (let i = 0; i < 80; i++) {
    if (await visible('quest-intro')) { await page.click('#qi-go'); await sleep(150); continue; }
    if (await visible('reward')) { await page.click('#reward [data-close]'); await sleep(200); continue; }
    if (await visible('task')) { const v = await answer(); seen?.push(v); await sleep(200); continue; }
    if (await visible('dialogue')) { await page.click('#dlg-next'); await sleep(120); continue; }
    await sleep(250);
    if (!(await visible('dialogue')) && !(await visible('task')) && !(await visible('quest-intro')) && !(await visible('reward')) && !(await qs()).busy) return;
  }
  throw new Error('окна не закрываются');
}

/** Пройти квест целиком, как ребёнок: подойти, поговорить, найти, отнести, сходить в магазин и т. д. */
async function playQuest(qid, seen) {
  const q = await page.evaluate((id) => window.__content.quest(id), qid);
  const npcLoc = (id) => page.evaluate((id) => window.__content.npc(id).location, id);
  await goTo(await npcLoc(q.giver));
  await talkTo(q.giver);
  await drainUi(seen);
  for (let guard = 0; guard < 30; guard++) {
    const st = await qs();
    if (st.states[qid]?.status === 'done') return;
    assert(st.active === qid, `активен ${st.active}, ожидался ${qid}`);
    const step = q.steps.find((s) => s.id === st.step);
    if (step.type === 'dialogue') {
      const npc = await page.evaluate((d) => window.__content.dialogue(d).npc, step.dialogue);
      await goTo(await npcLoc(npc)); await talkTo(npc);
    } else if (step.type === 'give_item') {
      await goTo(await npcLoc(step.npc)); await talkTo(step.npc);
    } else if (step.type === 'find_item') {
      const loc = await page.evaluate((z) => Object.values(window.__maps).find((m) => m.spots[z]).id, step.zone);
      await goTo(loc);
      await waitFor((id) => window.__game.scene.getScene('world').debugState().pickables.includes(id), step.target);
      await tapTarget('pick', step.target);
      await waitFor((sid) => window.__quests.debugState().step !== sid, step.id);
    } else if (step.type === 'go_to') {
      const loc = await page.evaluate((z) => Object.values(window.__maps).find((m) => m.zones[z]).id, step.zone);
      await goTo(loc);
      await waitFor((sid) => window.__quests.debugState().step !== sid, step.id);
    }
    await drainUi(seen);
  }
  throw new Error(`квест ${qid} не завершился`);
}


// ================= Подготовка: быстрый старт и юнит 1 =================
await page.click('#btn-play');
await waitFor(() => !document.getElementById('onboard').hidden);
await page.click('.ob-hero[data-look="kid_2"]');
await page.type('#ob-name', 'Аля');
await page.click('#ob-name-form button');
await page.click('[data-age="junior"]');
await page.click('#ob-skip');
await waitFor(() => !document.getElementById('ob-go').closest('[hidden]'));
await page.click('#ob-go');
await waitFor(() => window.__quests);
await sleep(600);

const UNIT1 = [
  'q.home.blue_cup', 'q.home.amy_hello', 'q.home.dad_ball',
  'q.street.ducks', 'q.street.lost_cat',
];
const seen = [];
for (const qid of UNIT1) await check(`юнит 1: ${qid}`, () => playQuest(qid, seen));

await check('на площадку пока нельзя: дверь с улицы закрыта до квеста Бена про зверей', async () => {
  await goTo('street');
  await page.evaluate(() => { const s = window.__game.scene.getScene('world'); s.pos = { x: 26 * 16 + 8, y: 11 * 16 + 10 }; });
  await page.keyboard.down('ArrowRight'); await sleep(700); await page.keyboard.up('ArrowRight');
  await waitFor(() => !document.getElementById('toast').hidden);
  const t = await page.$eval('#toast', (e) => e.textContent);
  assert(t.includes('🔒') && t.includes('Площадка'), t);
  assert((await world()).location === 'street', 'всё-таки прошёл');
});

await check('юнит 1: q.street.animals', () => playQuest('q.street.animals', seen));

await check('дверь открылась: герой сам уходит с улицы на площадку', async () => {
  await goTo('street');
  await page.evaluate(() => { const s = window.__game.scene.getScene('world'); s.pos = { x: 26 * 16 + 8, y: 11 * 16 + 10 }; });
  await page.keyboard.down('ArrowRight'); await sleep(900); await page.keyboard.up('ArrowRight');
  await waitFor(() => window.__game.scene.getScene('world').debugState?.().location === 'playground');
  await sleep(700);
  const w = await world();
  assert(w.npcs.includes('npc.mia') && w.markers.includes('npc.mia'), `на площадке: ${w.npcs} / ${w.markers}`);
  assert((await page.$eval('#hud-place-en', (e) => e.textContent)) === 'Playground', 'шапка');
  await page.screenshot({ path: join(SHOTS, 'unit2-1-playground.png') });
});

// ================= Площадка =================
const PLAY = ['q.play.mia', 'q.play.actions', 'q.play.kite', 'q.play.ice_cream', 'q.play.bike', 'q.play.things'];
for (const qid of PLAY.slice(0, 2)) await check(`площадка: ${qid}`, () => playQuest(qid, seen));

await check('действия — задания-картинки без подписей (понимание на слух)', async () => {
  const acts = seen.filter((v) => ['w.run', 'w.jump', 'w.climb', 'w.dance', 'w.sing', 'w.swim'].includes(v.correctId) && v.mode === 'listen_choose');
  assert(acts.length >= 5, `заданий на действия: ${acts.length}`);
  const noPic = await page.evaluate(() => ['w.run', 'w.jump', 'w.swim', 'w.fly', 'w.climb', 'w.sing', 'w.dance', 'w.ride', 'w.sunny', 'w.rainy', 'w.hot', 'w.cold',
    'w.head', 'w.eyes', 'w.ears', 'w.nose', 'w.mouth', 'w.legs', 'w.tail', 'w.neck', 'w.big', 'w.small', 'w.long', 'w.swing', 'w.slide', 'w.tree', 'w.flower',
    'w.kite', 'w.bike', 'w.ice_cream', 'w.lion', 'w.tiger', 'w.elephant', 'w.monkey', 'w.giraffe', 'w.zebra', 'w.bear', 'w.snake', 'w.penguin', 'w.hippo', 'w.crocodile', 'w.parrot']
    .filter((id) => window.__visual(id) === 'text'));
  assert(noPic.length === 0, `без картинки: ${noPic}`);
});

for (const qid of PLAY.slice(2, 4)) await check(`площадка: ${qid}`, () => playQuest(qid, seen));

await check('площадка: q.play.bike — и во время разговора пошёл дождь', async () => {
  // слушаем: была ли сцена с дождём
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('world');
    const orig = s.setWeather.bind(s);
    window.__rainSeen = false;
    s.setWeather = (w) => { if (w === 'rain') { window.__rainSeen = true; setTimeout(() => {}, 0); } return orig(w); };
  });
  const q = await page.evaluate(() => window.__content.quest('q.play.bike'));
  void q;
  // снимок дождя: перехватываем момент, когда открыт вопрос про погоду
  const shot = (async () => {
    await page.waitForFunction(() => window.__rainSeen && !document.getElementById('task').hidden, { timeout: 120000 });
    await sleep(700);
    await page.screenshot({ path: join(SHOTS, 'unit2-2-rain.png') });
  })();
  await playQuest('q.play.bike', seen);
  await shot.catch(() => {});
  assert(await page.evaluate(() => window.__rainSeen), 'дождя не было');
});

await check('площадка: q.play.things', () => playQuest('q.play.things', seen));

// ================= Зоопарк =================
await check('в зоопарк ведёт дорожка вниз с улицы', async () => {
  await goTo('street');
  await page.evaluate(() => { const s = window.__game.scene.getScene('world'); s.pos = { x: 13 * 16 + 8, y: 18 * 16 + 10 }; });
  await page.keyboard.down('ArrowDown'); await sleep(900); await page.keyboard.up('ArrowDown');
  await waitFor(() => window.__game.scene.getScene('world').debugState?.().location === 'zoo');
  await sleep(700);
  const w = await world();
  assert(w.npcs.includes('npc.kate') && w.markers.includes('npc.kate'), `в зоопарке: ${w.npcs} / ${w.markers}`);
  await page.screenshot({ path: join(SHOTS, 'unit2-3-zoo.png') });
});

const ZOO = ['q.zoo.welcome', 'q.zoo.big_small', 'q.zoo.monkey', 'q.zoo.leo_body', 'q.zoo.leo_animals', 'q.zoo.bananas'];
for (const qid of ZOO) await check(`зоопарк: ${qid}`, () => playQuest(qid, seen));

await check('игра Лео «Touch your …» — картинки частей тела, на слух', async () => {
  const t = seen.filter((v) => String(v.correctId).startsWith('p.touch_your_'));
  assert(t.length === 6, `заданий: ${t.length}`);
  assert(t.every((v) => v.mode === 'listen_choose' && !v.showText), JSON.stringify(t.map((v) => [v.mode, v.showText])));
  await page.screenshot({ path: join(SHOTS, 'unit2-4-after-zoo.png') });
});

await check('юнит 2 пройден: 18 квестов (6 + 12), 54 звезды', async () => {
  const st = await qs();
  const all = [...UNIT1, 'q.street.animals', ...PLAY, ...ZOO];
  const done = all.filter((q) => st.states[q]?.status === 'done');
  assert(done.length === 18, `выполнено ${done.length}: не хватает ${all.filter((q) => !done.includes(q))}`);
  assert((await page.$eval('#hud-stars span', (e) => e.textContent)) === '54', 'звёзды');
});

await check('новые навыки начали копиться', async () => {
  const r = await page.evaluate(() => Object.fromEntries([...window.__learning.canDo(window.__content.skills, false).entries()].map(([k, v]) => [k, v.status])));
  for (const id of ['cd.actions', 'cd.i_can', 'cd.weather', 'cd.zoo_animals', 'cd.body', 'cd.describe']) assert(r[id] && r[id] !== 'not_started', `${id}: ${r[id]}`);
});

await check('нет ошибок в консоли', async () => { assert(errors.length === 0, errors.slice(0, 3).join(' | ')); });

console.log(results.join('\n'));
console.log(failed ? `\n${failed} проверок не прошли` : `\nВсе ${results.length} проверок прошли`);
await browser.close();
server.kill();
process.exit(failed ? 1 : 0);
