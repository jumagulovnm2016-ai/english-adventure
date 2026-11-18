// Учёт времени игры по дням и дневной лимит, который задаёт родитель.
import type { Clock } from '../core/clock';
import { localDay } from '../learning/canDo';

export const dayKey = (d: Date) => localDay(d.toISOString(), d.getTimezoneOffset());

export interface PlaytimeDeps {
  clock: Clock;
  add: (day: string, seconds: number) => Promise<number>;
  initialToday: number;
  limitMin: () => number | null;
  /** Сколько минут родитель добавил сегодня («ещё 15 минут»). */
  extraMin: (day: string) => number;
  onLimit: () => void;
}

export class PlaytimeTracker {
  private today: string;
  private seconds: number;
  private limited = false;

  constructor(private d: PlaytimeDeps) {
    this.today = dayKey(d.clock.now());
    this.seconds = d.initialToday;
  }

  /** Добавить прошедшее время игры (вызывается раз в несколько секунд, только когда страница видна). */
  async tick(sec: number) {
    const day = dayKey(this.d.clock.now());
    if (day !== this.today) { this.today = day; this.seconds = 0; this.limited = false; }
    this.seconds = await this.d.add(day, sec);
    this.check();
  }

  /** Проверить лимит (и после изменения настроек). */
  check() {
    const limit = this.limitSeconds();
    const over = limit !== null && this.seconds >= limit;
    if (over && !this.limited) { this.limited = true; this.d.onLimit(); }
    if (!over) this.limited = false;
  }

  isLimited() { return this.limited; }
  todaySeconds() { return this.seconds; }
  limitSeconds(): number | null {
    const l = this.d.limitMin();
    return l === null ? null : (l + this.d.extraMin(this.today)) * 60;
  }
  todayKey() { return this.today; }
}
