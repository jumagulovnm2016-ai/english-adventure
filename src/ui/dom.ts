export function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Нет элемента #${id}`);
  return el;
}

/** Модальное окно: открыть/закрыть, Esc, клик по фону, кнопки [data-close], возврат фокуса. */
export class Modal {
  private lastFocus: Element | null = null;
  private onCloseCb: (() => void) | null = null;
  constructor(readonly el: HTMLElement) {
    el.addEventListener('click', (e) => { if (e.target === el) this.close(); });
    el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => this.close()));
    document.addEventListener('keydown', (e) => {
      if (this.isOpen() && (e.key === 'Escape' || e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'у')) {
        e.preventDefault();
        this.close();
      }
    });
  }
  isOpen() { return !this.el.hidden; }
  open(onClose?: () => void) {
    this.lastFocus = document.activeElement;
    this.onCloseCb = onClose ?? null;
    this.el.hidden = false;
    const first = this.el.querySelector<HTMLElement>('[data-autofocus]') ?? this.el.querySelector<HTMLElement>('.btn-primary') ?? this.el.querySelector<HTMLElement>('button');
    first?.focus({ preventScroll: true });
  }
  close() {
    if (!this.isOpen()) return;
    this.el.hidden = true;
    (this.lastFocus as HTMLElement | null)?.focus?.({ preventScroll: true });
    const cb = this.onCloseCb; this.onCloseCb = null; cb?.();
  }
}

export const isTouch = () => matchMedia('(pointer: coarse)').matches;
