// Фасад учебного ядра: состояние слов/фраз, журнал событий, повторение, навыки.
// Не знает о Phaser и DOM. Хранение — через LearningRepo (IndexedDB в игре, память в тестах).
import type { Clock } from '../core/clock';
import { KIND_OF_MODE, NEW_STATE, type ItemState, type LearnEvent, type Mode, type Result } from './types';
import { LeitnerScheduler, type Scheduler } from './scheduler';
import { pickForReview } from './reviewPicker';
import { confusionPairs } from './confusion';
import { evaluateCanDo, type CanDoResult, type CanDoSkill } from './canDo';

export interface LearningRepo {
  loadStates(): Promise<Map<string, ItemState>>;
  saveState(id: string, s: ItemState): Promise<void>;
  loadEvents(): Promise<LearnEvent[]>;
  appendEvent(e: LearnEvent): Promise<void>;
}

export const MAX_EVENTS = 20000;

export class MemoryLearningRepo implements LearningRepo {
  states = new Map<string, ItemState>();
  events: LearnEvent[] = [];
  async loadStates() { return new Map(this.states); }
  async saveState(id: string, s: ItemState) { this.states.set(id, s); }
  async loadEvents() { return [...this.events]; }
  async appendEvent(e: LearnEvent) { this.events.push(e); if (this.events.length > MAX_EVENTS) this.events.shift(); }
}

export interface RecordArgs {
  item: string;
  mode: Mode;
  result: Result;
  hinted: boolean;
  firstTry: boolean;
  context: string;
  chosen?: string;
}

export class LearningService {
  private states = new Map<string, ItemState>();
  private events: LearnEvent[] = [];
  readonly scheduler: Scheduler;

  private constructor(private repo: LearningRepo, private clock: Clock, scheduler?: Scheduler) {
    this.scheduler = scheduler ?? new LeitnerScheduler();
  }

  static async create(repo: LearningRepo, clock: Clock, scheduler?: Scheduler) {
    const s = new LearningService(repo, clock, scheduler);
    s.states = await repo.loadStates();
    s.events = await repo.loadEvents();
    return s;
  }

  state(id: string): ItemState { return this.states.get(id) ?? { ...NEW_STATE }; }
  allStates(): Map<string, ItemState> { return new Map(this.states); }
  allEvents(): LearnEvent[] { return [...this.events]; }

  private async put(id: string, s: ItemState) {
    this.states.set(id, s);
    await this.repo.saveState(id, s);
  }

  /** Знакомство с новыми элементами (начало квеста). */
  async introduce(ids: string[]) {
    const now = this.clock.now();
    for (const id of ids) {
      const prev = this.state(id);
      const next = this.scheduler.introduce(prev, now);
      if (next !== prev) await this.put(id, next);
    }
  }

  /** Записать событие без изменения состояния (входная проверка — не обучение). */
  async logOnly(e: LearnEvent) {
    this.events.push(e);
    if (this.events.length > MAX_EVENTS) this.events.shift();
    await this.repo.appendEvent(e);
  }

  /** Входная проверка: узнанное помечается «знакомо, нужно подтверждение» — коробка 2, проверим через день. */
  async markFamiliar(ids: string[]) {
    const now = this.clock.now();
    for (const id of ids) {
      const prev = this.state(id);
      if (prev.status !== 'new') continue;
      await this.put(id, { ...prev, status: 'familiar_pending', box: 2, firstSeen: now.toISOString(), lastSeen: now.toISOString(), due: new Date(now.getTime() + 864e5).toISOString() });
    }
  }

  /** Итог одной попытки задания по одному элементу. */
  async record(a: RecordArgs) {
    const now = this.clock.now();
    const e: LearnEvent = {
      t: now.toISOString(), item: a.item, kind: KIND_OF_MODE[a.mode], mode: a.mode,
      result: a.result, hinted: a.hinted, context: a.context, ...(a.chosen && a.chosen !== a.item ? { chosen: a.chosen } : {}),
    };
    this.events.push(e);
    if (this.events.length > MAX_EVENTS) this.events.shift();
    await this.repo.appendEvent(e);
    await this.put(a.item, this.scheduler.record(this.state(a.item), a, now));
  }

  /**
   * Выбор предмета в задании «найди»: по каждому слову нужного предмета — отдельное событие.
   * Взял красную чашку вместо синей → ошибка по blue (выбран red), верно по cup.
   */
  async recordFind(args: { targetWords: string[]; chosenWords: string[]; posOf: (w: string) => string; context: string; firstTry: boolean; hinted: boolean }) {
    for (const w of args.targetWords) {
      const ok = args.chosenWords.includes(w);
      const chosen = ok ? undefined : args.chosenWords.find((c) => args.posOf(c) === args.posOf(w));
      await this.record({ item: w, mode: 'find_item', result: ok ? 'correct' : 'wrong', hinted: args.hinted, firstTry: args.firstTry, context: args.context, chosen });
    }
  }

  dueForReview(count: number, opts: { exclude?: string[]; topicOf?: (id: string) => string | undefined; preferTopics?: string[] } = {}) {
    return pickForReview(this.scheduler, { states: this.states, events: this.events, now: this.clock.now(), count, ...opts });
  }

  /** Только для автотестов: задать состояние элемента (например, «изучено два дня назад»). */
  async debugSet(id: string, patch: Partial<ItemState>) { await this.put(id, { ...this.state(id), ...patch }); }

  confusions() { return confusionPairs(this.events); }

  canDo(skills: CanDoSkill[], micEnabled: boolean): Map<string, CanDoResult> {
    return new Map(skills.map((s) => [s.id, evaluateCanDo(s, this.events, micEnabled)]));
  }
}
