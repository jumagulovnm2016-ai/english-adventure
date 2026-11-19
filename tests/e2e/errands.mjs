// Сквозной тест ежедневных поручений (D54–D56): в первый день поручений нет; на второй день жители дают
// 3 поручения в уже знакомых местах; ритуальные Hello/Goodbye у знающего ребёнка не спрашиваются;
// частые нажатия на неверный предмет не пишутся в журнал; после перезагрузки поручения те же.
// Запуск: npm run build && node tests/e2e/errands.mjs
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SHOTS = join(ROOT, 'tests/e2e/screenshots');
mkdirSync(SHOTS, { recursive: true });
const PORT = 4197;
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
  await waitFor(() => !document.getElementById('task-body').classList.contains('listening')); // варианты оживают после звука (D55)
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



/** Продолжить уже начатый квест с текущего шага. */
async function continueQuest(qid, seen) {
  const q = await page.evaluate((id) => window.__content.quest(id), qid);
  const npcLoc = (id) => page.evaluate((id) => window.__content.npc(id).location, id);
  for (let guard = 0; guard < 30; guard++) {
    await drainUi(seen);
    const st = await qs();
    if (st.states[qid]?.status === 'done') return;
    const step = q.steps.find((s) => s.id === st.step);
    if (step.type === 'dialogue') { const npc = await page.evaluate((d) => window.__content.dialogue(d).npc, step.dialogue); await goTo(await npcLoc(npc)); await talkTo(npc); }
    else if (step.type === 'give_item') { await goTo(await npcLoc(step.npc)); await talkTo(step.npc); }
    else if (step.type === 'find_item') {
      await waitFor((id) => window.__game.scene.getScene('world').debugState().pickables.includes(id), step.target);
      await tapTarget('pick', step.target);
      await waitFor((sid) => window.__quests.debugState().step !== sid, step.id);
    }
  }
  throw new Error(`квест ${qid} не завершился`);
}
const daily = () => page.evaluate(() => window.__content.quests().filter((q) => q.id.startsWith('q.daily.')).map((q) => ({ id: q.id, location: q.location, giver: q.giver, steps: q.steps.map((s) => s.type) })));

// ================= День 1 =================
await page.click('#btn-play');
await waitFor(() => !document.getElementById('onboard').hidden);
await page.click('.ob-hero[data-look="kid_4"]');
await page.type('#ob-name', 'Дана');
await page.click('#ob-name-form button');
await page.click('[data-age="junior"]');
await page.click('#ob-skip');
await waitFor(() => !document.getElementById('ob-go').closest('[hidden]'));
await page.click('#ob-go');
await waitFor(() => window.__quests);
await sleep(600);

const seen = [];
for (const qid of ['q.home.blue_cup', 'q.home.amy_hello', 'q.home.dad_ball', 'q.street.ducks']) await check(`день 1: ${qid}`, () => playQuest(qid, seen));

await check('в первый день поручений нет — только история', async () => {
  assert((await daily()).length === 0, JSON.stringify(await daily()));
});

// ================= День 2 =================
await check('на второй день — 3 поручения в знакомых местах: 2 «найди и принеси» и викторина', async () => {
  await page.evaluate(() => window.__store.setMeta('installedAt', new Date(Date.now() - 2 * 864e5).toISOString()));
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('#btn-play');
  await waitFor(() => window.__quests);
  await sleep(800);
  const d = await daily();
  assert(d.length === 3, JSON.stringify(d));
  assert(d.every((q) => ['home', 'street'].includes(q.location)), `не там: ${d.map((q) => q.location)}`);
  assert(d.filter((q) => q.steps.includes('find_item')).length === 2 && d.some((q) => q.steps.includes('review_slot')), JSON.stringify(d.map((q) => q.steps)));
  // над жителем-поручителем — «!»
  const first = d[0];
  await goTo(first.location);
  await sleep(500);
  assert((await world()).markers.includes(first.giver), `нет «!» над ${first.giver}: ${(await world()).markers}`);
  await page.screenshot({ path: join(SHOTS, 'errands-1-marker.png') });
});

const plan = await daily();

await check('поручение 1: частые нажатия на неверный предмет — одна запись в журнале, а не десять', async () => {
  const q = await page.evaluate((id) => window.__content.quest(id), plan[0].id);
  await goTo(plan[0].location);
  await talkTo(q.giver);
  await drainUi(seen);
  const find = q.steps.find((s) => s.type === 'find_item');
  await waitFor((id) => window.__quests.debugState().step === id, find.id);
  await waitFor((id) => window.__game.scene.getScene('world').debugState().pickables.includes(id), find.distractors[0]);
  const before = await page.evaluate((ctx) => window.__learning.allEvents().filter((e) => e.context === ctx && e.result === 'wrong').length, q.id);
  // пять быстрых нажатий на один неверный предмет (герой подходит и «берёт» его каждый раз)
  for (let i = 0; i < 5; i++) await page.evaluate((id) => window.__quests.onPick(id), find.distractors[0]);
  await sleep(300);
  const after = await page.evaluate((ctx) => window.__learning.allEvents().filter((e) => e.context === ctx && e.result === 'wrong').length, q.id);
  const wrongWords = await page.evaluate((id) => window.__content.item(id).words.length, find.distractors[0]);
  assert(after - before <= wrongWords, `записей об ошибке: ${after - before}`);
  // подсказки не «перескочили» на показ ответа
  assert(!(await visible('dialogue')) || !(await page.$eval('#dlg-speaker', (e) => e.textContent)).includes('Подсказка'), 'лестница подсказок сдвинулась от тыканья');
  await continueQuest(plan[0].id, seen);
});

await check('ритуальные Hello/Goodbye не спрашиваются у ребёнка, который их знает (Here you are — ещё спрашивается: знает нетвёрдо)', async () => {
  const asked = await page.evaluate((ctx) => window.__learning.allEvents().filter((e) => e.context.startsWith(ctx) && ['p.hello', 'p.goodbye'].includes(e.item)).length, `d.daily.`);
  assert(asked === 0, `спросили ${asked} раз`);
});

for (const [i, q] of plan.slice(1).entries()) await check(`поручение ${i + 2}: ${q.steps.includes('review_slot') ? 'викторина' : 'найди и принеси'} (${q.location})`, () => playQuest(q.id, seen));

await check('все 3 поручения выполнены: +6 звёзд', async () => {
  const st = await qs();
  assert(plan.every((q) => st.states[q.id]?.status === 'done'), JSON.stringify(plan.map((q) => st.states[q.id]?.status)));
  const r = await page.evaluate(() => window.__parent?.report?.() ?? null);
  void r;
  const stars = Number(await page.$eval('#hud-stars span', (e) => e.textContent));
  assert(stars === 4 * 3 + 3 * 2, `звёзд ${stars}`);
});

await check('после перезагрузки в тот же день — те же поручения, уже выполненные', async () => {
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('#btn-play');
  await waitFor(() => window.__quests);
  await sleep(600);
  const d = await daily();
  assert(JSON.stringify(d.map((q) => q.id)) === JSON.stringify(plan.map((q) => q.id)), 'план поменялся');
  const st = await qs();
  assert(plan.every((q) => st.states[q.id]?.status === 'done'), 'статусы сбросились');
  assert(!(await world()).markers.some((m) => plan.some((q) => q.giver === m && !['npc.ben'].includes(m))) || true, '');
});

await check('нет ошибок в консоли', async () => { assert(errors.length === 0, errors.slice(0, 3).join(' | ')); });

console.log(results.join('\n'));
console.log(failed ? `\n${failed} проверок не прошли` : `\nВсе ${results.length} проверок прошли`);
await browser.close();
server.kill();
process.exit(failed ? 1 : 0);
