// Состояние квестов: какие доступны, на каком шаге активный, восстановление после перезагрузки.
import type { QuestDef, StepDef } from '../content/types';

export type QuestStatus = 'locked' | 'available' | 'active' | 'done';
export interface QuestState { status: QuestStatus; step: string | null; stars: number; completedAt: string | null }

/** waived — требования, которые считаются выполненными без прохождения (ребёнок уже знает материал, D50). */
export function questStatus(q: QuestDef, states: Map<string, QuestState>, waived: ReadonlySet<string> = NONE): QuestStatus {
  const s = states.get(q.id);
  if (s?.status === 'done' || s?.status === 'active') return s.status;
  return q.requires.every((r) => states.get(r)?.status === 'done' || waived.has(r)) ? 'available' : 'locked';
}
const NONE: ReadonlySet<string> = new Set();

/** Квест, который можно взять у этого персонажа сейчас (активный — в приоритете). */
export function questForNpc(npcId: string, quests: QuestDef[], states: Map<string, QuestState>, waived: ReadonlySet<string> = NONE): QuestDef | null {
  const mine = quests.filter((q) => q.giver === npcId).sort((a, b) => a.order - b.order);
  return mine.find((q) => questStatus(q, states, waived) === 'active') ?? mine.find((q) => questStatus(q, states, waived) === 'available') ?? null;
}

export class QuestRunner {
  private index: number;

  constructor(readonly def: QuestDef, stepId: string | null = null) {
    const i = stepId ? def.steps.findIndex((s) => s.id === stepId) : 0;
    this.index = i < 0 ? 0 : i;
  }

  get step(): StepDef | null { return this.def.steps[this.index] ?? null; }
  get stepIndex() { return this.index; }
  get finished() { return this.index >= this.def.steps.length; }

  next() { if (!this.finished) this.index++; }

  /**
   * После перезагрузки: если надо отдать предмет, а его нет в руках (например, страница закрылась
   * до сохранения) — возвращаемся к шагу, где его нужно найти.
   */
  resume(inventory: string[]) {
    const s = this.step;
    if (s?.type === 'give_item' && s.item && !inventory.includes(s.item)) {
      const back = this.def.steps.slice(0, this.index).map((x, i) => [x, i] as const).reverse()
        .find(([x]) => x.type === 'find_item' && x.target === s.item);
      if (back) this.index = back[1];
    }
    // шаг «повторение» после перезагрузки пропускаем — он необязательный
    while (this.step?.type === 'review_slot' && this.index > 0) this.index++;
  }
}
