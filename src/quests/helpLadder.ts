// «Лестница помощи» для одного задания (docs/ARCHITECTURE.md §4):
// 1-я ошибка → попробуй ещё; 2-я → подсказка; 3-я → правильный ответ звучит, ребёнок повторяет и идёт дальше.
// «Не уверен» (плохо слышно) не считается попыткой; после двух подряд — переходим на «послушай и выбери».
import type { Result } from '../learning/types';

export type LadderStep =
  | { kind: 'done'; branch: 'correct' | 'wrong' }   // задание завершено, ветка диалога
  | { kind: 'retry' }                              // ещё попытка
  | { kind: 'hint' }                               // показать подсказку, дальше ответы считаются «с подсказкой»
  | { kind: 'model' }                              // показать правильный ответ и попросить повторить
  | { kind: 'fallback' };                          // голос не распознаётся — сменить режим

export interface AttemptInfo { firstTry: boolean; hinted: boolean }

export class HelpLadder {
  private wrongs = 0;
  private unsure = 0;
  private attempts = 0;
  private hintShown = false;
  private modelShown = false;

  /** Сведения для записи события ПЕРЕД обработкой ответа. */
  attemptInfo(): AttemptInfo { return { firstTry: this.attempts === 0, hinted: this.hintShown || this.modelShown }; }

  answer(result: Result): LadderStep {
    if (result === 'unsure') {
      this.unsure++;
      return this.unsure >= 2 ? { kind: 'fallback' } : { kind: 'retry' };
    }
    this.attempts++;
    this.unsure = 0;
    if (this.modelShown) {
      // после показа ответа ждём, пока ребёнок повторит правильно; ветка — «ошибка»
      return result === 'correct' ? { kind: 'done', branch: 'wrong' } : { kind: 'model' };
    }
    if (result === 'correct') return { kind: 'done', branch: 'correct' };
    this.wrongs++;
    if (this.wrongs === 1) return { kind: 'retry' };
    if (this.wrongs === 2) { this.hintShown = true; return { kind: 'hint' }; }
    this.modelShown = true;
    return { kind: 'model' };
  }
}
