import { describe, it, expect } from 'vitest';
import { LeitnerScheduler, BOX_DAYS } from '../src/learning/scheduler';
import { NEW_STATE, type ItemState, type LearnEvent } from '../src/learning/types';
import { matchTyped, matchSpoken, matchPieces, normalize, levenshtein } from '../src/learning/matcher';
import { selectMode } from '../src/learning/modeSelector';
import { buildOptions, shuffle } from '../src/learning/options';
import { confusionPairs } from '../src/learning/confusion';
import { evaluateCanDo, localDay, type CanDoSkill } from '../src/learning/canDo';
import { LearningService, MemoryLearningRepo } from '../src/learning/learningService';
import { fixedClock } from '../src/core/clock';
import { loadContent } from '../src/content/load';

const DAY = 864e5;
const t0 = new Date('2026-11-20T09:00:00Z');
const at = (days: number) => new Date(t0.getTime() + days * DAY);
const S = new LeitnerScheduler();
const ok = { result: 'correct' as const, hinted: false, firstTry: true };
const bad = { result: 'wrong' as const, hinted: false, firstTry: true };

describe('Лестница Лейтнера', () => {
  it('знакомство: learning, коробка 0, повторить сразу', () => {
    const s = S.introduce({ ...NEW_STATE }, t0);
    expect(s.status).toBe('learning');
    expect(s.box).toBe(0);
    expect(S.isDue(s, t0)).toBe(true);
  });
  it('верный ответ продвигает и назначает срок', () => {
    let s = S.introduce({ ...NEW_STATE }, t0);
    s = S.record(s, ok, t0);
    expect(s.box).toBe(1);
    expect(new Date(s.due!).getTime() - t0.getTime()).toBe(BOX_DAYS[1] * DAY);
    expect(S.isDue(s, t0)).toBe(false);
  });
  it('нельзя выучить за один вечер: повторные верные ответы до срока не продвигают', () => {
    let s = S.introduce({ ...NEW_STATE }, t0);
    for (let i = 0; i < 10; i++) s = S.record(s, ok, new Date(t0.getTime() + i * 60000));
    expect(s.box).toBe(1);
    expect(s.correct).toBe(10);
  });
  it('доходит до «выучено» примерно через неделю регулярных повторений', () => {
    let s = S.introduce({ ...NEW_STATE }, t0);
    let d = 0;
    s = S.record(s, ok, at(d));
    while (s.status !== 'learned') { d += BOX_DAYS[s.box]; s = S.record(s, ok, at(d)); }
    expect(s.box).toBe(4);
    expect(d).toBe(1 + 2 + 4);
  });
  it('ошибка с первой попытки — снова в коробку 0; выученное возвращается в learning', () => {
    let s: ItemState = { ...NEW_STATE, status: 'learned', box: 4, due: t0.toISOString(), firstSeen: t0.toISOString(), lastSeen: null };
    s = S.record(s, bad, t0);
    expect(s.box).toBe(0);
    expect(s.status).toBe('learning');
  });
  it('ответ с подсказкой не продвигает', () => {
    let s = S.introduce({ ...NEW_STATE }, t0);
    s = S.record(s, { result: 'correct', hinted: true, firstTry: false }, t0);
    expect(s.box).toBe(0);
  });
  it('«не уверен» ничего не меняет, кроме даты', () => {
    const s0 = S.introduce({ ...NEW_STATE }, t0);
    const s = S.record(s0, { result: 'unsure', hinted: false, firstTry: true }, at(1));
    expect(s.box).toBe(0); expect(s.correct).toBe(0); expect(s.wrong).toBe(0);
  });
  it('новый элемент без знакомства — не к повторению', () => {
    expect(S.isDue({ ...NEW_STATE }, t0)).toBe(false);
  });
});

describe('Проверка ответов', () => {
  it('нормализация', () => {
    expect(normalize("  It’s  BLUE! ")).toBe("it's blue");
    expect(levenshtein('yellow', 'yelow')).toBe(1);
  });
  it('ввод слова: одна опечатка в длинном слове допустима, в коротком — нет', () => {
    expect(matchTyped('yelow', 'yellow')).toBe('correct');
    expect(matchTyped('Blue ', 'blue')).toBe('correct');
    expect(matchTyped('bleu', 'blue')).toBe('correct');
    expect(matchTyped('red', 'rad')).toBe('wrong');
    expect(matchTyped('green', 'blue')).toBe('wrong');
    expect(matchTyped('', 'blue')).toBe('unsure');
  });
  it('голос: точное совпадение, вариант в составе фразы, путаница, неуверенность', () => {
    expect(matchSpoken([{ text: 'Blue' }], 'blue')).toBe('correct');
    expect(matchSpoken([{ text: "it's blue" }], 'blue')).toBe('correct');
    expect(matchSpoken([{ text: 'free' }], 'three', ['three', 'free', 'tree'])).toBe('correct');
    expect(matchSpoken([{ text: 'green', confidence: 0.9 }], 'blue', [], ['green', 'red'])).toBe('wrong');
    expect(matchSpoken([{ text: 'green', confidence: 0.3 }], 'blue', [], ['green'])).toBe('unsure');
    expect(matchSpoken([{ text: 'bloo' }], 'blue')).toBe('unsure');
    expect(matchSpoken([], 'blue')).toBe('unsure');
    // «bluebell» не равно «blue»: совпадение только по целым словам
    expect(matchSpoken([{ text: 'bluebell' }], 'blue')).toBe('unsure');
  });
  it('сборка фразы', () => {
    expect(matchPieces(['My', 'name', 'is'], ['My', 'name', 'is'])).toBe('correct');
    expect(matchPieces(['name', 'My', 'is'], ['My', 'name', 'is'])).toBe('wrong');
    expect(matchPieces(['My', 'name'], ['My', 'name', 'is'])).toBe('wrong');
  });
});

describe('Выбор режима ответа', () => {
  const base = { ageMode: 'junior' as const, canListen: false, hasPieces: true, isWord: false };
  const st = (box: number): ItemState => ({ ...NEW_STATE, status: 'learning', box });
  it('новое — послушай и выбери', () => expect(selectMode({ ...NEW_STATE }, 'auto', undefined, base)).toBe('listen_choose'));
  it('коробка 2 — собери фразу', () => expect(selectMode(st(2), 'auto', undefined, base)).toBe('build_phrase'));
  it('коробка 3 без микрофона — собери, с проверенным микрофоном — скажи', () => {
    expect(selectMode(st(3), 'auto', undefined, base)).toBe('build_phrase');
    expect(selectMode(st(3), 'auto', undefined, { ...base, canListen: true })).toBe('say_aloud');
  });
  it('ввод слова — только старшим и только для слов', () => {
    expect(selectMode(st(3), 'auto', undefined, { ...base, isWord: true, hasPieces: false })).toBe('listen_choose');
    expect(selectMode(st(3), 'auto', undefined, { ...base, ageMode: 'senior', isWord: true, hasPieces: false })).toBe('type_word');
  });
  it('явно заданный, но невозможный режим заменяется на «послушай и выбери»', () => {
    expect(selectMode(st(0), 'say_aloud', undefined, base)).toBe('listen_choose');
    expect(selectMode(st(0), 'build_phrase', undefined, { ...base, hasPieces: false })).toBe('listen_choose');
  });
  it('allowed_types ограничивает', () => {
    expect(selectMode(st(2), 'auto', ['listen_choose', 'say_aloud'], base)).toBe('listen_choose');
  });
});

describe('Варианты ответа', () => {
  const c = loadContent();
  it('содержат правильный, без повторов, нужного количества', () => {
    for (let seed = 1; seed < 20; seed++) {
      const o = buildOptions(c, 'w.blue', undefined, 3, seed);
      expect(o).toContain('w.blue');
      expect(new Set(o).size).toBe(3);
      expect(o.every((id) => c.word(id).topic === 'colours')).toBe(true);
    }
  });
  it('первыми берутся «путаемые»', () => {
    const o = buildOptions(c, 'w.blue', undefined, 2, 3);
    expect(o.sort()).toEqual(['w.blue', 'w.green']);
  });
  it('для фраз — другие фразы, которые ребёнок говорит сам', () => {
    const o = buildOptions(c, 'p.hello', undefined, 3, 5);
    expect(o).toContain('p.hello');
    expect(o.every((id) => c.phrase(id).role === 'productive')).toBe(true);
  });
  it('перемешивание детерминировано и не теряет элементы', () => {
    expect(shuffle([1, 2, 3, 4], 9)).toEqual(shuffle([1, 2, 3, 4], 9));
    expect(shuffle([1, 2, 3, 4], 9).sort()).toEqual([1, 2, 3, 4]);
  });
});

const ev = (p: Partial<LearnEvent> & { item: string; t: string }): LearnEvent =>
  ({ kind: 'comprehension', mode: 'listen_choose', result: 'correct', hinted: false, context: 'q.home.a', ...p });

describe('Путаница', () => {
  it('пары считаются без учёта порядка и сортируются', () => {
    const p = confusionPairs([
      ev({ item: 'w.blue', chosen: 'w.green', result: 'wrong', t: '1' }),
      ev({ item: 'w.green', chosen: 'w.blue', result: 'wrong', t: '2' }),
      ev({ item: 'w.red', chosen: 'w.pink', result: 'wrong', t: '3' }),
      ev({ item: 'w.red', t: '4' }),
    ]);
    expect(p[0]).toEqual({ a: 'w.blue', b: 'w.green', count: 2 });
    expect(p).toHaveLength(2);
  });
});

describe('Навыки «умеет»', () => {
  const greet: CanDoSkill = { id: 'cd.g', order: 1, title_ru: '', explain_ru: '', rule: { type: 'uses_in_contexts', items: ['p.hello', 'p.goodbye'], kinds: ['production', 'spoken'], min_successes: 3, min_distinct_contexts: 3, min_distinct_days: 2, min_spoken: 1 } };
  const prod = (item: string, t: string, context: string, extra: Partial<LearnEvent> = {}) => ev({ item, t, context, kind: 'production', mode: 'build_phrase', ...extra });

  it('нет событий — не начато', () => {
    expect(evaluateCanDo(greet, [], true).status).toBe('not_started');
  });
  it('только узнаёт фразу (а навык — сказать самому) — «в процессе», но не подтверждено', () => {
    const r = evaluateCanDo(greet, [ev({ item: 'p.hello', t: '2026-11-20T09:00:00Z' })], false);
    expect(r.status).toBe('in_progress');
    expect(r.progress).toBeLessThan(0.1);
  });
  it('подтверждается, когда все условия выполнены (без микрофона — без голоса)', () => {
    const evs = [prod('p.hello', '2026-11-20T09:00:00Z', 'a'), prod('p.goodbye', '2026-11-20T09:10:00Z', 'b'), prod('p.hello', '2026-11-21T09:00:00Z', 'c')];
    const off = evaluateCanDo(greet, evs, false, 0);
    expect(off.status).toBe('confirmed');
    expect(off.withoutVoice).toBe(true);
    expect(off.confirmedAt).toBe('2026-11-21T09:00:00Z');
    // с микрофоном нужен хотя бы один ответ голосом
    expect(evaluateCanDo(greet, evs, true, 0).status).toBe('in_progress');
  });
  it('один день — не подтверждено, даже если ситуаций много', () => {
    const evs = ['a', 'b', 'c', 'd'].map((c, i) => prod('p.hello', `2026-11-20T0${i}:00:00Z`, c));
    const r = evaluateCanDo(greet, evs, false, 0);
    expect(r.status).toBe('in_progress');
    expect(r.progress).toBeGreaterThan(0.4);
  });
  it('ответы с подсказкой и входная проверка не засчитываются', () => {
    const evs = [prod('p.hello', '2026-11-20T09:00:00Z', 'a', { hinted: true }), prod('p.hello', '2026-11-21T09:00:00Z', 'placement'), prod('p.hello', '2026-11-22T09:00:00Z', 'c', { hinted: true })];
    expect(evaluateCanDo(greet, evs, false, 0).status).not.toBe('confirmed');
  });

  const colours: CanDoSkill = { id: 'cd.c', order: 2, title_ru: '', explain_ru: '', rule: { type: 'accuracy_after_delay', items: ['w.red', 'w.blue', 'w.green'], kinds: ['comprehension'], min_correct_items: 2, min_days_since_first_seen: 2 } };
  it('цвета: важна последняя попытка спустя 2 дня', () => {
    const evs = [
      ev({ item: 'w.red', t: '2026-11-20T09:00:00Z' }), ev({ item: 'w.blue', t: '2026-11-20T09:00:00Z' }),
      ev({ item: 'w.red', t: '2026-11-21T09:00:00Z' }), ev({ item: 'w.blue', t: '2026-11-21T09:00:00Z' }), // рано — не считается
    ];
    expect(evaluateCanDo(colours, evs, false).status).toBe('in_progress');
    evs.push(ev({ item: 'w.red', t: '2026-11-22T10:00:00Z' }), ev({ item: 'w.blue', t: '2026-11-22T10:05:00Z', result: 'wrong' }));
    expect(evaluateCanDo(colours, evs, false).status).toBe('in_progress');
    evs.push(ev({ item: 'w.blue', t: '2026-11-23T10:00:00Z' }));
    const r = evaluateCanDo(colours, evs, false);
    expect(r.status).toBe('confirmed');
    expect(r.confirmedAt).toBe('2026-11-23T10:00:00Z');
  });

  const nums: CanDoSkill = { id: 'cd.n', order: 3, title_ru: '', explain_ru: '', rule: { type: 'streak', items: ['w.one', 'w.two', 'w.three'], kinds: ['comprehension'], consecutive_correct: 3, min_distinct_contexts: 2 } };
  it('серия: ошибка сбрасывает, «не уверен» — нет', () => {
    const evs = [
      ev({ item: 'w.one', t: '1', context: 'a' }), ev({ item: 'w.two', t: '2', context: 'a' }), ev({ item: 'w.three', t: '3', context: 'a', result: 'wrong' }),
      ev({ item: 'w.one', t: '4', context: 'a' }), ev({ item: 'w.two', t: '5', context: 'b', result: 'unsure' }), ev({ item: 'w.two', t: '6', context: 'b' }),
    ];
    expect(evaluateCanDo(nums, evs, false).status).toBe('in_progress');
    evs.push(ev({ item: 'w.three', t: '7', context: 'b' }));
    expect(evaluateCanDo(nums, evs, false).status).toBe('confirmed');
  });
  it('день считается по часовому поясу устройства (Бишкек, UTC+6)', () => {
    expect(localDay('2026-11-20T20:00:00Z', -360)).toBe('2026-11-21');
    expect(localDay('2026-11-20T17:00:00Z', -360)).toBe('2026-11-20');
  });
});

describe('LearningService', () => {
  it('знакомство, ответы, журнал, повторение, сохранение в хранилище', async () => {
    const clock = fixedClock(t0);
    const repo = new MemoryLearningRepo();
    const ls = await LearningService.create(repo, clock);
    await ls.introduce(['w.blue', 'w.cup']);
    expect(ls.state('w.blue').status).toBe('learning');
    await ls.record({ item: 'w.blue', mode: 'listen_choose', result: 'correct', hinted: false, firstTry: true, context: 'q.home.blue_cup' });
    expect(ls.state('w.blue').box).toBe(1);
    expect(ls.dueForReview(5)).toEqual(['w.cup']);
    clock.advance(DAY + 1);
    expect(ls.dueForReview(5).sort()).toEqual(['w.blue', 'w.cup']);
    // сохранилось: новый сервис из того же хранилища видит то же самое
    const ls2 = await LearningService.create(repo, clock);
    expect(ls2.state('w.blue').box).toBe(1);
    expect(ls2.allEvents()).toHaveLength(1);
  });
  it('выбор не того предмета: ошибка только по слову, которое перепутали', async () => {
    const ls = await LearningService.create(new MemoryLearningRepo(), fixedClock(t0));
    const c = loadContent();
    await ls.recordFind({ targetWords: ['w.blue', 'w.cup'], chosenWords: ['w.red', 'w.cup'], posOf: (w) => c.word(w).pos, context: 'q', firstTry: true, hinted: false });
    const evs = ls.allEvents();
    expect(evs.find((e) => e.item === 'w.blue')).toMatchObject({ result: 'wrong', chosen: 'w.red', mode: 'find_item', kind: 'comprehension' });
    expect(evs.find((e) => e.item === 'w.cup')).toMatchObject({ result: 'correct' });
    expect(ls.confusions()[0]).toEqual({ a: 'w.blue', b: 'w.red', count: 1 });
    // предмет того же цвета, но другой: ошибка по существительному
    await ls.recordFind({ targetWords: ['w.blue', 'w.cup'], chosenWords: ['w.blue', 'w.plate'], posOf: (w) => c.word(w).pos, context: 'q', firstTry: false, hinted: false });
    expect(ls.allEvents().slice(-2).find((e) => e.item === 'w.cup')).toMatchObject({ result: 'wrong', chosen: 'w.plate' });
  });
  it('навыки по реальному контенту считаются', async () => {
    const ls = await LearningService.create(new MemoryLearningRepo(), fixedClock(t0));
    const c = loadContent();
    const r = ls.canDo(c.skills, false);
    expect(r.size).toBe(c.skills.length);
    expect([...r.values()].every((x) => x.status === 'not_started')).toBe(true);
  });
});

describe('Входная проверка: «знакомые» слова', () => {
  it('знакомое — коробка 2, проверка через день; затем выучивается повторениями', async () => {
    const clock = fixedClock(t0);
    const ls = await LearningService.create(new MemoryLearningRepo(), clock);
    await ls.markFamiliar(['w.red', 'w.blue']);
    expect(ls.state('w.red')).toMatchObject({ status: 'familiar_pending', box: 2 });
    expect(ls.dueForReview(5)).toEqual([]);
    // квест «знакомит» — для знакомого слова ничего не меняется
    await ls.introduce(['w.red']);
    expect(ls.state('w.red').status).toBe('familiar_pending');
    clock.advance(DAY);
    expect(ls.dueForReview(5).sort()).toEqual(['w.blue', 'w.red']);
    await ls.record({ item: 'w.red', mode: 'listen_choose', result: 'correct', hinted: false, firstTry: true, context: 'review.home' });
    expect(ls.state('w.red')).toMatchObject({ status: 'familiar_pending', box: 3 });
    clock.advance(4 * DAY);
    await ls.record({ item: 'w.red', mode: 'listen_choose', result: 'correct', hinted: false, firstTry: true, context: 'review.street' });
    expect(ls.state('w.red')).toMatchObject({ status: 'learned', box: 4 });
    // ошибка в знакомом — обычное обучение с нуля
    await ls.record({ item: 'w.blue', mode: 'listen_choose', result: 'wrong', hinted: false, firstTry: true, context: 'review.home', chosen: 'w.green' });
    expect(ls.state('w.blue')).toMatchObject({ status: 'learning', box: 0 });
  });
  it('событие проверки записывается, но не меняет состояние', async () => {
    const ls = await LearningService.create(new MemoryLearningRepo(), fixedClock(t0));
    await ls.logOnly({ t: t0.toISOString(), item: 'w.cat', kind: 'comprehension', mode: 'placement', result: 'correct', hinted: false, context: 'placement' });
    expect(ls.allEvents()).toHaveLength(1);
    expect(ls.state('w.cat').status).toBe('new');
  });
});
