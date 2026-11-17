// Отложенное сохранение: не чаще раза в intervalMs, плюс принудительное flush() при сворачивании страницы.
export class AutoSaver<T> {
  private pending: T | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastSaved = -Infinity; // ещё ни разу не сохраняли — первое сохранение сразу

  constructor(
    private save: (v: T) => Promise<void>,
    private intervalMs = 5000,
    private now: () => number = () => Date.now(),
  ) {}

  update(v: T) {
    this.pending = v;
    if (this.timer) return;
    const wait = Math.max(0, this.lastSaved + this.intervalMs - this.now());
    this.timer = setTimeout(() => { this.timer = null; void this.flush(); }, wait);
  }

  async flush() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.pending === null) return;
    const v = this.pending;
    this.pending = null;
    this.lastSaved = this.now();
    try { await this.save(v); } catch (e) { console.warn('Не удалось сохранить', e); }
  }
}
