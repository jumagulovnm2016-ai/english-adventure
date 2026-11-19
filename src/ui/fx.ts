// Праздничные эффекты интерфейса. Без картинок: цветные кусочки — это span с CSS-анимацией.
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const COLORS = ['#ffd23f', '#ff6f91', '#3dae4a', '#2f7de1', '#ff8a1f', '#9b6ce0'];

/** Конфетти из центра элемента (верный ответ). */
export function confetti(from: Element | null, n = 18) {
  if (!from || reduced()) return;
  const r = from.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'confetti';
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const d = 50 + Math.random() * 70;
    s.style.left = `${cx}px`; s.style.top = `${cy}px`;
    s.style.background = COLORS[i % COLORS.length];
    s.style.setProperty('--dx', `${Math.cos(a) * d}px`);
    s.style.setProperty('--dy', `${Math.sin(a) * d - 30}px`);
    s.style.setProperty('--rot', `${Math.round(Math.random() * 720 - 360)}deg`);
    if (i % 3 === 0) s.style.borderRadius = '50%';
    document.body.append(s);
    setTimeout(() => s.remove(), 1000);
  }
}

/** «Подпрыгнуть» элементу (счётчик звёзд). */
export function bump(el: Element | null) {
  if (!el || reduced()) return;
  el.classList.remove('bump');
  void (el as HTMLElement).offsetWidth; // перезапуск анимации
  el.classList.add('bump');
}
