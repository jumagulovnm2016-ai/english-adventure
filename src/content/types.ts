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
export interface Npc { id: string; name_en: string; role_ru: string; name_ru: string; ru_with: string; ru_to: string; location: Location; gender: Gender; sprite: string }

export interface AgeText { junior: string; senior?: string }
export type TaskType = 'auto' | 'listen_choose' | 'build_phrase' | 'say_aloud' | 'type_word';
export interface TaskDef {
  type: TaskType; target: string;
  prompt?: { say?: string; ru_hint?: AgeText };
  options?: string[];
  allowed_types?: Exclude<TaskType, 'auto'>[];
}
export interface DialogueNode {
  speaker: string; say?: string; ru_hint?: AgeText; task?: TaskDef;
  action?: { type: 'give_player_item' | 'take_player_item' | 'emote'; item?: string; emote?: string };
  next?: string; on_correct?: string; on_wrong?: string;
}
export interface DialogueDef { schemaVersion: 1; id: string; npc: string; start: string; nodes: Record<string, DialogueNode> }
export interface StepDef {
  id: string; type: 'dialogue' | 'go_to' | 'find_item' | 'give_item' | 'task' | 'review_slot';
  hint?: { ru: AgeText; say?: string };
  dialogue?: string; location?: Location; zone?: string;
  instruction?: string; target?: string; distractors?: string[];
  npc?: string; item?: string; task?: TaskDef; count?: number; prefer_topics?: string[];
}
export interface QuestDef {
  schemaVersion: 1; id: string; location: Location; order: number; title: AgeText; intro: AgeText; giver: string;
  requires: string[]; introduces: string[]; practices: string[]; steps: StepDef[];
  rewards: { stars: number; decor?: string[] };
}

export interface RawContent {
  vocabulary: { schemaVersion: 1; words: Word[] };
  phrases: { schemaVersion: 1; phrases: Phrase[] };
  items: { schemaVersion: 1; items: Item[] };
  npcs: { schemaVersion: 1; npcs: Npc[] };
  quests?: QuestDef[];
  dialogues?: DialogueDef[];
  canDo?: { schemaVersion: 1; skills: import('../learning/canDo').CanDoSkill[] };
}
