// Интервальное повторение: лестница Лейтнера (D9). Спрятана за интерфейсом — позже можно заменить на FSRS.
import { NEW_STATE, type ItemState, type Result } from './types';

const DAY = 24 * 60 * 60 * 1000;
/** Через сколько дней показать снова в каждой коробке. Коробка 0 — «ещё учим», показываем в этой же сессии. */
export const BOX_DAYS = [0, 1, 2, 4, 7, 14];
export const LEARNED_BOX = 4;
export const MAX_BOX = BOX_DAYS.length - 1;

export interface Scheduler {
  /** Ребёнок впервые встретил элемент (знакомство в квесте). */
  introduce(s: ItemState, now: Date): ItemState;
  /** Итог задания по элементу. firstTry — результат первой попытки, hinted — ответ получен с подсказкой. */
  record(s: ItemState, r: { result: Result; hinted: boolean; firstTry: boolean }, now: Date): ItemState;
  isDue(s: ItemState, now: Date): boolean;
}

export class LeitnerScheduler implements Scheduler {
  introduce(s: ItemState, now: Date): ItemState {
    if (s.status !== 'new') return s;
    const iso = now.toISOString();
    return { ...s, status: 'learning', box: 0, due: iso, firstSeen: s.firstSeen ?? iso, lastSeen: iso };
  }

  record(prev: ItemState, r: { result: Result; hinted: boolean; firstTry: boolean }, now: Date): ItemState {
    const iso = now.toISOString();
    let s: ItemState = { ...(prev.status === 'new' ? this.introduce(prev, now) : prev), lastSeen: iso, firstSeen: prev.firstSeen ?? iso };
    if (r.result === 'unsure') return s; // плохой микрофон не наказывает и не продвигает
    if (r.result === 'wrong') {
      s = { ...s, wrong: s.wrong + 1 };
      if (!r.firstTry) return s; // в лестницу идёт только первая попытка задания
      return { ...s, box: 0, due: iso, status: s.status === 'familiar_pending' || s.status === 'learned' ? 'learning' : s.status };
    }
    s = { ...s, correct: s.correct + 1 };
    if (r.hinted || !r.firstTry) return s; // с подсказкой или со второй попытки — не продвигаем
    // продвигаем не чаще, чем подошёл срок: нельзя «выучить» за один вечер
    if (s.due && now.getTime() < new Date(s.due).getTime()) return s;
    const box = Math.min(MAX_BOX, s.box + 1);
    const status = s.status === 'familiar_pending' ? 'familiar_pending' : box >= LEARNED_BOX ? 'learned' : 'learning';
    return { ...s, box, status, due: new Date(now.getTime() + BOX_DAYS[box] * DAY).toISOString() };
  }

  isDue(s: ItemState, now: Date): boolean {
    if (s.status === 'new' || !s.due) return false;
    return new Date(s.due).getTime() <= now.getTime();
  }
}

export const freshState = (): ItemState => ({ ...NEW_STATE });
