import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildReport } from '../src/parent/report';
import { buildSave, parseSave } from '../src/parent/saveFile';
import { PlaytimeTracker, dayKey } from '../src/app/playtime';
import { LearningService, MemoryLearningRepo } from '../src/learning/learningService';
import { openStore } from '../src/storage/db';
import { fixedClock } from '../src/core/clock';
import { loadContent } from '../src/content/load';

const content = loadContent();
const t0 = new Date('2026-11-20T09:00:00Z');
const DAY = 864e5;

async function playedChild() {
  const clock = fixedClock(t0);
  const ls = await LearningService.create(new MemoryLearningRepo(), clock);
  await ls.introduce(['w.blue', 'w.cup', 'p.hello']);
  // путает blue и green дважды
  for (let i = 0; i < 2; i++) await ls.record({ item: 'w.blue', mode: 'listen_choose', result: 'wrong', hinted: false, firstTry: true, context: 'q.home.blue_cup', chosen: 'w.green' });
  await ls.record({ item: 'w.cup', mode: 'listen_choose', result: 'correct', hinted: false, firstTry: true, context: 'q.home.blue_cup' });
  await ls.markFamiliar(['w.red']);
  return { ls, clock };
}

describe('Отчёт для родителя', () => {
  it('слова по статусам, сложные слова, путаница, квесты, время', async () => {
    const { ls, clock } = await playedChild();
    const quests = new Map([['q.home.blue_cup', { status: 'done' as const, step: null, stars: 3, completedAt: t0.toISOString() }]]);
    const today = dayKey(clock.now());
    const r = buildReport({ content, learning: ls, quests, playtime: new Map([[today, 25 * 60]]), now: clock.now(), micEnabled: false });
    expect(r.summary).toMatchObject({ questsDone: 1, questsTotal: 12, stars: 3, familiar: 1 });
    expect(r.words.learning.map((w) => w.en).sort()).toEqual(['Hello!', 'blue', 'cup']);
    expect(r.words.familiar[0]).toMatchObject({ en: 'red', ru: 'красный' });
    expect(r.hard.map((w) => w.en)).toEqual(['blue']);
    expect(r.confusions[0]).toMatchObject({ a: 'blue', b: 'green', aRu: 'синий', count: 2 });
    expect(r.days).toHaveLength(14);
    expect(r.days[13]).toEqual({ day: today, minutes: 25 });
    expect(r.summary.minutesWeek).toBe(25);
    expect(r.skills).toHaveLength(content.skills.length);
    expect(r.skills.find((s) => s.id === 'cd.colours')!.status).toBe('in_progress');
    expect(r.skills.find((s) => s.id === 'cd.animals')!.status).toBe('not_started');
  });
  it('пустой отчёт для нового игрока', async () => {
    const ls = await LearningService.create(new MemoryLearningRepo(), fixedClock(t0));
    const r = buildReport({ content, learning: ls, quests: new Map(), playtime: new Map(), now: t0, micEnabled: false });
    expect(r.summary).toMatchObject({ questsDone: 0, learned: 0, learning: 0, minutesWeek: 0, daysPlayed14: 0 });
    expect(r.skills.every((s) => s.status === 'not_started')).toBe(true);
  });
});

describe('Файл прогресса', () => {
  it('выгрузка проходит схему и загружается обратно без потерь', async () => {
    const clock = fixedClock(t0);
    const store = await openStore(clock);
    await store.clearAll();
    const ls = await LearningService.create(store.learning, clock);
    await ls.introduce(['w.blue']);
    await ls.record({ item: 'w.blue', mode: 'listen_choose', result: 'correct', hinted: false, firstTry: true, context: 'q.home.blue_cup' });
    await store.saveQuest('q.home.blue_cup', { status: 'done', step: null, stars: 3, completedAt: t0.toISOString() });
    await store.saveWorld({ location: 'street', x: 100, y: 90, inventory: ['it.cake'], roomDecor: [] });
    await store.addPlaytime('2026-11-20', 600);
    await store.setMeta('installedAt', t0.toISOString());
    await store.setMeta('placement', { doneAt: t0.toISOString(), known: 5, total: 30, skipped: false });
    await store.setMeta('parentPin', 'секрет');
    const save = buildSave(await store.dumpAll(), ls.canDo(content.skills, false), clock.now());
    const text = JSON.stringify(save);
    expect(text).not.toContain('секрет'); // PIN родителя не попадает в файл
    const parsed = parseSave(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    await store.loadAll(parsed.dump);
    const d = await store.dumpAll();
    expect(d.items.get('w.blue')?.box).toBe(1);
    expect(d.events).toHaveLength(1);
    expect(d.quests.get('q.home.blue_cup')?.status).toBe('done');
    expect(d.world?.location).toBe('street');
    expect(d.playtime.get('2026-11-20')).toBe(600);
    expect(d.meta.onboarded).toBe(true);
  });
  it('чужой, повреждённый и слишком новый файл — понятные ошибки', () => {
    expect(parseSave('не json')).toMatchObject({ ok: false, error: expect.stringContaining('не читается') });
    expect(parseSave('{"format":"other"}')).toMatchObject({ ok: false, error: expect.stringContaining('не файл прогресса') });
    const good = JSON.parse(readFileSync('tests/fixtures/save.example.json', 'utf8'));
    expect(parseSave(JSON.stringify(good)).ok).toBe(true);
    expect(parseSave(JSON.stringify({ ...good, schemaVersion: 99 }))).toMatchObject({ ok: false, error: expect.stringContaining('новой версией') });
    const broken = { ...good, profile: { ...good.profile, ageMode: 'baby' } };
    expect(parseSave(JSON.stringify(broken))).toMatchObject({ ok: false, error: expect.stringContaining('повреждён') });
  });
});

describe('Время игры и лимит', () => {
  it('считает по дням, срабатывает на лимите, «ещё 15 минут» продлевает, новый день — с нуля', async () => {
    const clock = fixedClock(new Date('2026-11-20T08:00:00'));
    const store = new Map<string, number>();
    let limitHits = 0;
    let extra = 0;
    const tr = new PlaytimeTracker({
      clock, initialToday: 0, limitMin: () => 30, extraMin: () => extra, onLimit: () => limitHits++,
      add: async (d, s) => { const v = (store.get(d) ?? 0) + s; store.set(d, v); return v; },
    });
    for (let i = 0; i < 29; i++) await tr.tick(60);
    expect(limitHits).toBe(0);
    await tr.tick(60);
    expect(limitHits).toBe(1);
    expect(tr.isLimited()).toBe(true);
    await tr.tick(5);
    expect(limitHits).toBe(1); // не повторяется каждую секунду
    extra = 15; tr.check();
    expect(tr.isLimited()).toBe(false);
    for (let i = 0; i < 15; i++) await tr.tick(60);
    expect(limitHits).toBe(2);
    clock.advance(DAY);
    await tr.tick(10);
    expect(tr.todaySeconds()).toBe(10);
    expect(tr.isLimited()).toBe(false);
  });
  it('без лимита не срабатывает никогда', async () => {
    let hits = 0;
    const tr = new PlaytimeTracker({ clock: fixedClock(t0), initialToday: 0, limitMin: () => null, extraMin: () => 0, onLimit: () => hits++, add: async (_d, s) => s * 1000 });
    await tr.tick(60);
    expect(hits).toBe(0);
  });
});
