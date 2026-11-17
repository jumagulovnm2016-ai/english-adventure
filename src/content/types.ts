// Типы контента. Соответствуют schemas/*.schema.json (источник правды — схемы).
export type Location = 'home' | 'street' | 'shop' | 'school';
export type Accent = 'us' | 'uk';
export type Gender = 'f' | 'm';

export interface Word {
  id: string; en: string; ru: string; topic: string; pos: string; level: 'preA1';
  image: string; accept?: string[]; confusable?: string[];
}
export interface Phrase {
  id: string; en: string; ru: string; level: 'preA1'; role: 'productive' | 'receptive';
  words: string[]; pieces?: string[]; accept?: string[]; why_ru?: string;
}
export interface Item { id: string; words: string[]; sprite: string; pickable: boolean }
export interface Npc { id: string; name_en: string; role_ru: string; location: Location; gender: Gender; sprite: string }

export interface RawContent {
  vocabulary: { schemaVersion: 1; words: Word[] };
  phrases: { schemaVersion: 1; phrases: Phrase[] };
  items: { schemaVersion: 1; items: Item[] };
  npcs: { schemaVersion: 1; npcs: Npc[] };
}
