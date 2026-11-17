// Простая «пиксельная кисть»: рисуем спрайты кодом, получаем массив строк для Phaser textures.generate.
// Своя графика вместо скачанной: нет вопросов с лицензией, стиль единый. См. DECISIONS D18.

export const PALETTE: Record<string, string> = {
  k: '#2b2232', // контур
  i: '#1d1a24', // глаза
  w: '#c9905a', W: '#a5703f', v: '#7a4b2a', // дерево
  t: '#ece7da', T: '#cfc6b2',               // кафель
  p: '#f3dcbc', q: '#e0bf97', Q: '#8c6a52', P: '#6e4f3c', // стены
  r: '#c9524e', R: '#93393a', y: '#ecc75e', // ковёр
  b: '#3f80d4', B: '#2a5ea8', l: '#9cc8ff', // синий
  g: '#4cae55', G: '#2e7d36', a: '#9be08f', // зелёный
  e: '#e2473f', E: '#a8302b',               // красный
  o: '#f39c3c', O: '#c4741f',               // оранжевый
  n: '#ffffff', N: '#dcdce6', m: '#9a9aaa', M: '#6c6c7c', // белый/серый
  s: '#f3c9a1', S: '#d9a47e',               // кожа
  h: '#5a3a22', H: '#3d2716',               // волосы
  c: '#2fa3a3', C: '#1f7a7a',               // футболка
  j: '#3a4690', J: '#28306a',               // штаны
  f: '#3a2b2b',                             // обувь
  x: '#7d5cb5', X: '#5a3f88',               // диван
  u: '#a8dcff', U: '#d9f1ff',               // окно
  d: '#8a5a33', D: '#5f3b1f',               // дверь
  z: '#f6e7c8',                             // крем/торт
};

export class Px {
  readonly rows: string[][];
  constructor(readonly w: number, readonly h: number) {
    this.rows = Array.from({ length: h }, () => Array(w).fill('.'));
  }
  px(x: number, y: number, c: string) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.rows[y][x] = c;
  }
  get(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.rows[y][x] : '.'; }
  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, c);
  }
  hline(x: number, y: number, len: number, c: string) { this.rect(x, y, len, 1, c); }
  vline(x: number, y: number, len: number, c: string) { this.rect(x, y, 1, len, c); }
  /** Обвести все непрозрачные пиксели контуром снаружи. */
  outline(c = 'k') {
    const marks: [number, number][] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y) !== '.') continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const n = this.get(x + dx, y + dy); return n !== '.' && n !== c; })) marks.push([x, y]);
    }
    for (const [x, y] of marks) this.px(x, y, c);
    return this;
  }
  flipX() {
    const p = new Px(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) p.px(this.w - 1 - x, y, this.get(x, y));
    return p;
  }
  data(): string[] { return this.rows.map((r) => r.join('')); }
}

/** Детерминированный «шум» для фактуры (одинаковый при каждом запуске). */
export function hash(x: number, y: number, seed = 1): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
