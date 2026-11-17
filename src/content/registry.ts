import type { Item, Npc, Phrase, RawContent, Word } from './types';

/** Индексы контента. Только чтение. Не зависит от Phaser и DOM. */
export class ContentRegistry {
  private words = new Map<string, Word>();
  private phrases = new Map<string, Phrase>();
  private items = new Map<string, Item>();
  private npcs = new Map<string, Npc>();

  constructor(raw: RawContent) {
    for (const w of raw.vocabulary.words) this.words.set(w.id, w);
    for (const p of raw.phrases.phrases) this.phrases.set(p.id, p);
    for (const i of raw.items.items) this.items.set(i.id, i);
    for (const n of raw.npcs.npcs) this.npcs.set(n.id, n);
  }

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

  /** Слова предмета в естественном английском порядке: прилагательные перед существительным. */
  itemWords(itemId: string): Word[] {
    const order = (w: Word) => (w.pos === 'adjective' ? 0 : w.pos === 'number' ? -1 : 1);
    return this.item(itemId).words.map((id) => this.word(id)).sort((a, b) => order(a) - order(b));
  }

  /** Английское название предмета: «blue cup». */
  itemNameEn(itemId: string): string {
    return this.itemWords(itemId).map((w) => w.en).join(' ');
  }

  /** Русское название: «синяя чашка» — согласование рода делается по простому словарю окончаний. */
  itemNameRu(itemId: string): string {
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
