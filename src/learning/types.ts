// Типы учебного ядра. Соответствуют schemas/save.schema.json (items, events, canDo).
export type Kind = 'comprehension' | 'production' | 'spoken';
export type Mode = 'listen_choose' | 'build_phrase' | 'say_aloud' | 'type_word' | 'find_item' | 'placement';
export type TaskMode = 'listen_choose' | 'build_phrase' | 'say_aloud' | 'type_word';
export type Result = 'correct' | 'wrong' | 'unsure';
export type Status = 'new' | 'familiar_pending' | 'learning' | 'learned';

export interface ItemState {
  status: Status;
  box: number;            // 0..5
  due: string | null;     // ISO
  firstSeen: string | null;
  lastSeen: string | null;
  correct: number;
  wrong: number;
}

export interface LearnEvent {
  t: string;              // ISO
  item: string;           // w.* или p.*
  kind: Kind;
  mode: Mode;
  result: Result;
  hinted: boolean;
  chosen?: string;
  context: string;        // id квеста/диалога, review.<локация>, placement
}

export const KIND_OF_MODE: Record<Mode, Kind> = {
  listen_choose: 'comprehension',
  find_item: 'comprehension',
  placement: 'comprehension',
  build_phrase: 'production',
  type_word: 'production',
  say_aloud: 'spoken',
};

export const NEW_STATE: ItemState = { status: 'new', box: 0, due: null, firstSeen: null, lastSeen: null, correct: 0, wrong: 0 };
