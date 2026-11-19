import { describe, it, expect } from 'vitest';
import { HelpLadder } from '../src/quests/helpLadder';
import { DialogueRunner } from '../src/quests/dialogueRunner';
import { QuestRunner, questForNpc, questStatus, type QuestState } from '../src/quests/questRunner';
import { loadContent } from '../src/content/load';

describe('Лестница помощи', () => {
  it('верно с первой попытки', () => {
    const l = new HelpLadder();
    expect(l.attemptInfo()).toEqual({ firstTry: true, hinted: false });
    expect(l.answer('correct')).toEqual({ kind: 'done', branch: 'correct' });
  });
  it('ошибка → ещё попытка → верно: ветка «верно», но уже не первая попытка', () => {
    const l = new HelpLadder();
    expect(l.answer('wrong').kind).toBe('retry');
    expect(l.attemptInfo()).toEqual({ firstTry: false, hinted: false });
    expect(l.answer('correct')).toEqual({ kind: 'done', branch: 'correct' });
  });
  it('две ошибки → подсказка, дальше ответы «с подсказкой»', () => {
    const l = new HelpLadder();
    l.answer('wrong');
    expect(l.answer('wrong').kind).toBe('hint');
    expect(l.attemptInfo().hinted).toBe(true);
  });
  it('три ошибки → показ ответа; повторил правильно → ветка «ошибка»; застрять нельзя', () => {
    const l = new HelpLadder();
    l.answer('wrong'); l.answer('wrong');
    expect(l.answer('wrong').kind).toBe('model');
    expect(l.answer('wrong').kind).toBe('model'); // ждём, пока повторит
    expect(l.answer('correct')).toEqual({ kind: 'done', branch: 'wrong' });
  });
  it('«не уверен» не тратит попытки; два раза подряд — смена режима', () => {
    const l = new HelpLadder();
    expect(l.answer('unsure').kind).toBe('retry');
    expect(l.attemptInfo().firstTry).toBe(true);
    expect(l.answer('unsure').kind).toBe('fallback');
  });
});

describe('Диалоги', () => {
  const c = loadContent();
  it('проход диалога «синяя чашка» по веткам', () => {
    const d = new DialogueRunner(c.dialogue('d.home.mum_blue_cup_end'));
    expect(d.currentId).toBe('praise');
    d.advance();
    expect(d.currentId).toBe('ask_colour');
    expect(() => d.advance()).toThrow(/нужен итог/);
    d.advance('wrong');
    expect(d.currentId).toBe('model_answer');
    d.advance(); d.advance(); // cake → thanks
    expect(d.current()?.task?.target).toBe('p.thank_you');
    d.advance('correct'); d.advance(); d.advance('correct');
    expect(d.ended).toBe(true);
  });
  it('каждый диалог из контента проходится до конца по любым веткам', () => {
    for (const q of c.quests()) for (const s of q.steps) {
      if (s.type !== 'dialogue') continue;
      for (const branch of ['correct', 'wrong'] as const) {
        const d = new DialogueRunner(c.dialogue(s.dialogue!));
        let guard = 0;
        while (!d.ended && guard++ < 100) d.advance(d.current()!.task ? branch : undefined);
        expect(d.ended, `${s.dialogue} (${branch})`).toBe(true);
      }
    }
  });
});

describe('Квесты', () => {
  const c = loadContent();
  const qs = c.quests();
  const states = new Map<string, QuestState>();
  it('в начале доступен только первый квест каждого персонажа без требований', () => {
    for (const q of qs) expect(questStatus(q, states)).toBe(q.requires.length ? 'locked' : 'available');
  });
  it('знающему ребёнку площадка открыта без квеста Бена (снятое требование, D50)', () => {
    const mia = c.quest('q.play.mia');
    expect(questStatus(mia, new Map())).toBe('locked');
    expect(questStatus(mia, new Map(), new Set(['q.street.animals']))).toBe('available');
    expect(questForNpc('npc.mia', qs, new Map(), new Set(['q.street.animals']))?.id).toBe('q.play.mia');
  });
  it('цепочка открывается после выполнения', () => {
    const first = qs.find((q) => q.requires.length === 0)!;
    states.set(first.id, { status: 'done', step: null, stars: 3, completedAt: 'x' });
    const opened = qs.filter((q) => q.requires.includes(first.id));
    for (const q of opened) if (q.requires.every((r) => states.get(r)?.status === 'done')) expect(questStatus(q, states)).toBe('available');
  });
  it('у персонажа сначала активный квест, потом доступный', () => {
    const q = qs[0];
    const st = new Map<string, QuestState>([[q.id, { status: 'active', step: q.steps[1].id, stars: 0, completedAt: null }]]);
    expect(questForNpc(q.giver, qs, st)?.id).toBe(q.id);
  });
  it('восстановление: «отдать» без предмета в руках → назад к «найди»', () => {
    const q = c.quest('q.home.blue_cup');
    const r = new QuestRunner(q, 'give_cup');
    r.resume([]);
    expect(r.step?.id).toBe('find_cup');
    const r2 = new QuestRunner(q, 'give_cup');
    r2.resume(['it.cup_blue']);
    expect(r2.step?.id).toBe('give_cup');
  });
  it('шаги идут по порядку и квест заканчивается', () => {
    const r = new QuestRunner(c.quest('q.home.blue_cup'));
    const ids: string[] = [];
    while (!r.finished) { ids.push(r.step!.id); r.next(); }
    expect(ids).toEqual(c.quest('q.home.blue_cup').steps.map((s) => s.id));
  });
});
