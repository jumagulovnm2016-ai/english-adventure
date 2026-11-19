import type { CanDoSkill } from '../learning/canDo';
import type { DialogueDef, Item, Npc, Phrase, QuestDef, RawContent, Word } from './types';

/** Индексы контента. Только чтение. Не зависит от Phaser и DOM. */
export class ContentRegistry {
  private words = new Map<string, Word>();
  private phrases = new Map<string, Phrase>();
  private items = new Map<string, Item>();
  private npcs = new Map<string, Npc>();
  private questsById = new Map<string, QuestDef>();
  private dialoguesById = new Map<string, DialogueDef>();
  readonly skills: CanDoSkill[];

  constructor(raw: RawContent) {
    for (const w of raw.vocabulary.words) this.words.set(w.id, w);
    for (const p of raw.phrases.phrases) this.phrases.set(p.id, p);
    for (const i of raw.items.items) this.items.set(i.id, i);
    for (const n of raw.npcs.npcs) this.npcs.set(n.id, n);
    for (const q of raw.quests ?? []) this.questsById.set(q.id, q);
    for (const d of raw.dialogues ?? []) this.dialoguesById.set(d.id, d);
    this.skills = [...(raw.canDo?.skills ?? [])].sort((a, b) => a.order - b.order);
  }

  quest(id: string): QuestDef {
    const q = this.questsById.get(id);
    if (!q) throw new Error(`Нет квеста ${id}`);
    return q;
  }
  quests(): QuestDef[] { return [...this.questsById.values()].sort((a, b) => a.location.localeCompare(b.location) || a.order - b.order); }
  dialogue(id: string): DialogueDef {
    const d = this.dialoguesById.get(id);
    if (!d) throw new Error(`Нет диалога ${id}`);
    return d;
  }
  isWord(id: string) { return id.startsWith('w.'); }
  /** Слово или фраза: английский текст и перевод. */
  learnable(id: string): { id: string; en: string; ru: string; accept?: string[]; pieces?: string[]; topic?: string } {
    if (id.startsWith('w.')) { const w = this.word(id); return { id, en: w.en, ru: w.ru, accept: w.accept, topic: w.topic }; }
    const p = this.phrase(id); return { id, en: p.en, ru: p.ru, accept: p.accept, pieces: p.pieces };
  }
  wordsByTopic(topic: string): Word[] { return [...this.words.values()].filter((w) => w.topic === topic); }
  productivePhrases(): Phrase[] { return [...this.phrases.values()].filter((p) => p.role === 'productive'); }
  topicOf(id: string): string | undefined { return id.startsWith('w.') ? this.words.get(id)?.topic : undefined; }

  word(id: string): Word {
    const w = this.words.get(id);
    if (!w) throw new Error(`Нет слова ${id}`);
    return w;
  }
  phrase(id: string): Phrase {
    const p = this.phrases.get(id);
    if (!p) throw new Error(`Нет фразы ${id}`);
    return p;
  }
  item(id: string): Item {
    const i = this.items.get(id);
    if (!i) throw new Error(`Нет предмета ${id}`);
    return i;
  }
  npc(id: string): Npc {
    const n = this.npcs.get(id);
    if (!n) throw new Error(`Нет персонажа ${id}`);
    return n;
  }
  hasItem(id: string): boolean { return this.items.has(id); }
  hasPhrase(id: string): boolean { return this.phrases.has(id); }

  /** Квесты, диалоги и фразы, созданные в игре (ежедневные поручения, D56). Старые с тем же префиксом убираются. */
  setDynamic(prefix: { quest: string; dialogue: string; phrase: string }, add: { quests: QuestDef[]; dialogues: DialogueDef[]; phrases: Phrase[] }) {
    for (const k of [...this.questsById.keys()]) if (k.startsWith(prefix.quest)) this.questsById.delete(k);
    for (const k of [...this.dialoguesById.keys()]) if (k.startsWith(prefix.dialogue)) this.dialoguesById.delete(k);
    for (const k of [...this.phrases.keys()]) if (k.startsWith(prefix.phrase)) this.phrases.delete(k);
    for (const p of add.phrases) this.phrases.set(p.id, p);
    for (const d of add.dialogues) this.dialoguesById.set(d.id, d);
    for (const q of add.quests) this.questsById.set(q.id, q);
  }
  npcsIn(location: string): Npc[] { return [...this.npcs.values()].filter((n) => n.location === location); }

  /** Слова предмета в естественном английском порядке: прилагательные перед существительным. */
  itemWords(itemId: string): Word[] {
    const order = (w: Word) => (w.pos === 'adjective' ? 0 : w.pos === 'number' ? -1 : 1);
    return this.item(itemId).words.map((id) => this.word(id)).sort((a, b) => order(a) - order(b));
  }

  /** Английское название предмета: «blue cup». */
  itemNameEn(itemId: string): string {
    const it = this.item(itemId);
    if (it.name_en) return it.name_en;
    return this.itemWords(itemId).map((w) => w.en).join(' ');
  }

  /** Русское название: «синяя чашка» — согласование рода делается по простому словарю окончаний. */
  itemNameRu(itemId: string): string {
    const it = this.item(itemId);
    if (it.name_ru) return it.name_ru;
    const words = this.itemWords(itemId);
    const noun = words.find((w) => w.pos === 'noun');
    return words.map((w) => (w.pos === 'adjective' && noun ? agreeAdjective(w.ru, noun.ru) : w.ru)).join(' ');
  }
}

/** Согласует прилагательное (в словаре — мужской род) с существительным по его окончанию. */
export function agreeAdjective(adjMasc: string, noun: string): string {
  const n = noun.split(/[ ,]/)[0];
  const feminine = /[ая]$/.test(n) || /ь$/.test(n) && FEMININE_SOFT.has(n);
  const neuter = /[оеё]$/.test(n);
  if (!feminine && !neuter) return adjMasc;
  const m = adjMasc.match(/^(.*?)(ый|ий|ой)$/);
  if (!m) return adjMasc;
  const [, stem, end] = m;
  const soft = end === 'ий' && !/[кгхжшчщ]$/.test(stem);
  if (feminine) return stem + (soft ? 'яя' : 'ая');
  return stem + (soft ? 'ее' : 'ое');
}
const FEMININE_SOFT = new Set(['тетрадь', 'дверь', 'мышь', 'лошадь', 'кровать']);
