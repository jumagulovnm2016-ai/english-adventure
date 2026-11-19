// Ежедневные поручения (D56): каждый день жители дают 3 коротких задания, собранных из слов,
// которые пора повторить. Это бесконечный контент без ручного написания квестов и регулярное
// интервальное повторение. Поручения — обычные квесты (тот же движок), но созданные в игре.
// Модуль чистый: не знает про Phaser, DOM и хранилище.
import type { ContentRegistry } from '../content/registry';
import type { DialogueDef, Location, Phrase, QuestDef } from '../content/types';

export interface ErrandPlan {
  date: string;
  quests: QuestDef[];
  dialogues: DialogueDef[];
  phrases: Phrase[];
}

/** Где в каждой локации раскладывать предметы и какие предметы там уместны. */
export const ERRAND_PLACES: Record<Location, { zone: string; items: string[] }> = {
  home: { zone: 'living', items: ['it.cup_blue', 'it.cup_red', 'it.cup_green', 'it.plate_blue', 'it.ball_red', 'it.ball_blue', 'it.book_green', 'it.book_red'] },
  street: { zone: 'park', items: ['it.cat_black', 'it.cat_white', 'it.dog_black', 'it.dog_brown', 'it.bird_blue', 'it.rabbit_white', 'it.frog_green'] },
  shop: { zone: 'shelves', items: ['it.apple_red', 'it.banana', 'it.orange_fruit', 'it.milk', 'it.bread', 'it.egg', 'it.apples_three'] },
  school: { zone: 'desks', items: ['it.pencil_red', 'it.pencil_blue', 'it.pen_red', 'it.ruler_green', 'it.book_blue', 'it.book_yellow'] },
  playground: { zone: 'field', items: ['it.kite_red', 'it.kite_blue', 'it.kite_yellow', 'it.bike_red', 'it.bike_blue', 'it.ball_red', 'it.ball_blue'] },
  zoo: { zone: 'zoo_paths', items: ['it.monkey', 'it.parrot', 'it.penguin', 'it.snake', 'it.bananas_three', 'it.banana'] },
};

export const ERRANDS_PER_DAY = 3;
export const isErrand = (questId: string) => questId.startsWith('q.daily.');

/** Детерминированный генератор случайных чисел (один и тот же день → один и тот же план). */
function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}

export interface PlanArgs {
  date: string;
  content: ContentRegistry;
  /** Локации, где ребёнок уже бывал (выполнен хотя бы один квест). */
  visited: Location[];
  /** Что пора повторить — по убыванию срочности. */
  due: string[];
  /** Предметы, которые сейчас у ребёнка в руках/в рюкзаке — их не прячем. */
  inventory: string[];
  /** Жители, у которых сейчас есть свой сюжетный квест: поручение у них ждало бы своей очереди. */
  busyNpcs?: string[];
}

export function planErrands(a: PlanArgs): ErrandPlan {
  const r = rng(a.date);
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const shuffle = <T>(xs: T[]) => xs.map((x) => [r(), x] as const).sort((p, q) => p[0] - q[0]).map(([, x]) => x);
  const c = a.content;
  const due = new Set(a.due);
  const plan: ErrandPlan = { date: a.date, quests: [], dialogues: [], phrases: [] };
  const busy = new Set(a.busyNpcs ?? []);
  const free = (l: Location) => c.npcsIn(l).filter((n) => !busy.has(n.id));
  const places = a.visited.filter((l) => ERRAND_PLACES[l] && free(l).length);
  if (!places.length) return plan;

  // где искать: сначала локации, где больше всего слов «пора повторить»
  const score = (l: Location) => ERRAND_PLACES[l].items.filter((i) => c.hasItem(i)).reduce((s, i) => s + c.item(i).words.filter((w) => due.has(w)).length, 0) + r() * 0.5;
  const findPlaces = [...places].sort((x, y) => score(y) - score(x)).slice(0, 2);
  const usedNpcs = new Set<string>();

  findPlaces.forEach((loc, n) => {
    const pool = ERRAND_PLACES[loc].items.filter((i) => c.hasItem(i) && !a.inventory.includes(i));
    if (pool.length < 4) return;
    const target = [...pool].sort((x, y) => dueScore(y) - dueScore(x) + (r() - 0.5) * 0.8)[0];
    const tWords = c.item(target).words;
    // отвлекающие: сначала похожие (тот же предмет другого цвета или тот же цвет), потом любые
    const similar = shuffle(pool.filter((i) => i !== target && c.item(i).words.some((w) => tWords.includes(w))));
    const other = shuffle(pool.filter((i) => i !== target && !similar.includes(i)));
    const distractors = [...similar, ...other].slice(0, 3);
    const npc = pick(free(loc).filter((x) => !usedNpcs.has(x.id))) ?? pick(free(loc));
    usedNpcs.add(npc.id);
    plan.quests.push(findErrand(a.date, n + 1, loc, npc.id, target, distractors));
  });

  // викторина — у жителя, которого сегодня ещё не просили
  const quizLoc = pick(places);
  const quizNpc = free(quizLoc).find((x) => !usedNpcs.has(x.id)) ?? pick(free(quizLoc));
  plan.quests.push(quizErrand(a.date, plan.quests.length + 1, quizLoc, quizNpc.id));
  return plan;

  function dueScore(itemId: string) { return c.item(itemId).words.filter((w) => due.has(w)).length; }

  function findErrand(date: string, n: number, loc: Location, npcId: string, target: string, distractors: string[]): QuestDef {
    const id = `q.daily.${date}.${n}`;
    const name = c.itemNameEn(target), nameRu = c.itemNameRu(target);
    const hasNumber = c.item(target).words.some((w) => c.word(w).pos === 'number');
    const instr: Phrase = {
      id: `p.daily.${date}.${n}`, level: 'preA1', role: 'receptive',
      en: `Find ${hasNumber ? '' : 'the '}${name}, please.`, ru: `Найди, пожалуйста: ${nameRu}.`,
      words: ['w.find', ...c.item(target).words, 'w.please'].filter((w) => w.startsWith('w.') && safeWord(w)),
    };
    plan.phrases.push(instr);
    const start: DialogueDef = {
      schemaVersion: 1, id: `d.daily.${date}.${n}.start`, npc: npcId, start: 'hi',
      nodes: {
        hi: { speaker: npcId, say: 'p.hi_again', action: { type: 'emote', emote: 'wave' }, next: 'hello' },
        hello: { speaker: 'player', ru_hint: { junior: 'Поздоровайся!' }, task: { type: 'auto', target: 'p.hello' }, on_correct: 'ask', on_wrong: 'ask' },
        ask: { speaker: npcId, say: instr.id, ru_hint: { junior: 'Просьба. Можно переслушать.' }, next: 'end' },
      },
    };
    // в конце — вопрос о найденном: «Какого цвета?» или «Что это?»
    const colour = c.item(target).words.find((w) => c.word(w).topic === 'colours');
    const noun = c.itemWords(target).map((w) => w.id).find((w) => c.word(w).pos === 'noun') ?? tWordsFallback(target);
    const askColour = !!colour && r() < 0.5;
    const qTarget = askColour ? colour! : noun;
    const pool = askColour
      ? c.wordsByTopic('colours').map((w) => w.id)
      : [...new Set([...ERRAND_PLACES[loc].items, ...distractors].filter((i) => c.hasItem(i)).flatMap((i) => c.item(i).words).filter((w) => safeWord(w) && c.word(w).pos === 'noun'))];
    const options = [qTarget, ...shuffle(pool.filter((w) => w !== qTarget)).slice(0, 2)];
    const end: DialogueDef = {
      schemaVersion: 1, id: `d.daily.${date}.${n}.end`, npc: npcId, start: 'give',
      nodes: {
        give: { speaker: 'player', ru_hint: { junior: 'Протяни вещь. Что говорят?' }, task: { type: 'auto', target: 'p.here_you_are' }, on_correct: 'thanks', on_wrong: 'thanks' },
        thanks: { speaker: npcId, say: 'p.thank_you', action: { type: 'take_player_item', item: target }, next: 'q' },
        q: {
          speaker: npcId, say: askColour ? 'p.what_colour_is_it' : 'p.whats_this',
          ru_hint: { junior: askColour ? 'Какого он цвета?' : 'Как это называется?' },
          task: { type: 'auto', target: qTarget, prompt: { say: askColour ? 'p.what_colour_is_it' : 'p.whats_this', picture: target }, options },
          on_correct: 'praise', on_wrong: 'praise',
        },
        praise: { speaker: npcId, say: 'p.yes_well_done', action: { type: 'emote', emote: 'happy' }, next: 'bye' },
        bye: { speaker: npcId, say: 'p.bye_see_you', next: 'bye_back' },
        bye_back: { speaker: 'player', ru_hint: { junior: 'Попрощайся!' }, task: { type: 'auto', target: 'p.goodbye' }, on_correct: 'end', on_wrong: 'end' },
      },
    };
    plan.dialogues.push(start, end);
    const who = c.npc(npcId);
    return {
      schemaVersion: 1, id, location: loc, order: 100 + n,
      title: { junior: `Поручение: ${who.name_ru} просит помочь`, senior: `Поручение дня: ${who.name_ru}` },
      intro: { junior: `${who.name_ru} снова просит о помощи. Подойди — над ${who.gender === 'f' ? 'ней' : 'ним'} «!»`, senior: `${who.name_ru} ждёт тебя с поручением.` },
      giver: npcId, requires: [], introduces: [], practices: [...c.item(target).words.filter(safeWord), qTarget],
      steps: [
        { id: 'talk_start', type: 'dialogue', dialogue: start.id },
        {
          id: 'find', type: 'find_item', zone: ERRAND_PLACES[loc].zone, instruction: instr.id, target, distractors,
          hint: { ru: { junior: `${name} — это ${nameRu}. Поищи!` }, say: instr.id },
        },
        { id: 'give', type: 'give_item', npc: npcId, item: target, hint: { ru: { junior: `Отнеси ${who.ru_to}!` } } },
        { id: 'talk_end', type: 'dialogue', dialogue: end.id },
      ],
      rewards: { stars: 2 },
    };
  }

  function quizErrand(date: string, n: number, loc: Location, npcId: string): QuestDef {
    const id = `q.daily.${date}.${n}`;
    const start: DialogueDef = {
      schemaVersion: 1, id: `d.daily.${date}.${n}.start`, npc: npcId, start: 'hi',
      nodes: {
        hi: { speaker: npcId, say: 'p.hi_again', action: { type: 'emote', emote: 'wave' }, next: 'play' },
        play: { speaker: npcId, say: c.hasPhrase('p.lets_play') ? 'p.lets_play' : 'p.hi_again', ru_hint: { junior: 'Игра: вспомни слова!' }, next: 'end' },
      },
    };
    const end: DialogueDef = {
      schemaVersion: 1, id: `d.daily.${date}.${n}.end`, npc: npcId, start: 'praise',
      nodes: {
        praise: { speaker: npcId, say: 'p.yes_well_done', action: { type: 'emote', emote: 'happy' }, next: 'bye' },
        bye: { speaker: npcId, say: 'p.bye_see_you', next: 'end' },
      },
    };
    plan.dialogues.push(start, end);
    const who = c.npc(npcId);
    return {
      schemaVersion: 1, id, location: loc, order: 100 + n,
      title: { junior: `Поручение: игра с ${who.ru_with.replace(/^с /, '')}`, senior: `Поручение дня: вспомни слова` },
      intro: { junior: `${who.name_ru} хочет поиграть в слова. Подойди — над ${who.gender === 'f' ? 'ней' : 'ним'} «!»`, senior: `${who.name_ru} проверит, что ты помнишь.` },
      giver: npcId, requires: [], introduces: [], practices: [],
      steps: [
        { id: 'talk_start', type: 'dialogue', dialogue: start.id },
        { id: 'review', type: 'review_slot', count: 4 },
        { id: 'talk_end', type: 'dialogue', dialogue: end.id },
      ],
      rewards: { stars: 2 },
    };
  }

  function safeWord(w: string) { try { c.word(w); return true; } catch { return false; } }
  function tWordsFallback(itemId: string) { return c.item(itemId).words[c.item(itemId).words.length - 1]; }
}
