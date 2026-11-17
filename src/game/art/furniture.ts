// Мебель и крупные объекты комнаты.
import { Px } from './pixels';

function rug() {
  const p = new Px(64, 48);
  p.rect(0, 0, 64, 48, 'R');
  p.rect(2, 2, 60, 44, 'r');
  p.rect(5, 5, 54, 38, 'R');
  p.rect(6, 6, 52, 36, 'r');
  // ромбы
  for (const [cx, cy] of [[20, 24], [32, 24], [44, 24]]) {
    for (let d = 0; d <= 5; d++) { p.px(cx - d, cy - 5 + d, 'y'); p.px(cx + d, cy - 5 + d, 'y'); p.px(cx - d, cy + 5 - d, 'y'); p.px(cx + d, cy + 5 - d, 'y'); }
  }
  for (let x = 1; x < 64; x += 3) { p.px(x, 0, 'y'); p.px(x, 47, 'y'); }
  return p;
}

function table() {
  const p = new Px(32, 26);
  p.rect(1, 2, 30, 12, 'w');       // столешница
  p.hline(1, 2, 30, 'n');           // скатерть-полоска
  p.rect(1, 3, 30, 1, 'N');
  p.rect(1, 13, 30, 3, 'W');        // кромка
  p.rect(3, 16, 3, 9, 'v'); p.rect(26, 16, 3, 9, 'v'); // ножки
  return p.outline();
}

function counter() {
  const p = new Px(48, 28);
  p.rect(0, 4, 48, 6, 'N');         // столешница
  p.hline(0, 4, 48, 'n');
  p.rect(0, 10, 48, 17, 'W');       // шкафчики
  for (const x of [0, 16, 32]) { p.rect(x + 1, 11, 14, 15, 'w'); p.px(x + 12, 18, 'y'); }
  // мойка
  p.rect(4, 5, 10, 4, 'm'); p.rect(5, 6, 8, 2, 'l'); p.rect(8, 1, 2, 4, 'M');
  // плита
  p.rect(33, 5, 13, 4, 'M'); p.rect(35, 6, 3, 2, 'k'); p.rect(41, 6, 3, 2, 'k');
  return p.outline();
}

function fridge() {
  const p = new Px(16, 30);
  p.rect(1, 0, 14, 30, 'N');
  p.rect(2, 1, 12, 9, 'n'); p.rect(2, 11, 12, 18, 'n');
  p.hline(1, 10, 14, 'm');
  p.vline(12, 3, 4, 'M'); p.vline(12, 14, 6, 'M');
  return p.outline();
}

function sofa() {
  const p = new Px(48, 28);
  p.rect(2, 0, 44, 12, 'X');          // спинка
  p.rect(3, 1, 42, 10, 'x');
  p.rect(0, 8, 6, 18, 'X'); p.rect(42, 8, 6, 18, 'X'); // подлокотники
  p.rect(6, 12, 36, 12, 'x');         // сиденье
  p.vline(24, 12, 12, 'X');
  p.hline(6, 12, 36, 'X');
  p.rect(2, 26, 3, 2, 'v'); p.rect(43, 26, 3, 2, 'v');
  return p.outline();
}

function bookshelf() {
  const p = new Px(32, 34);
  p.rect(0, 0, 32, 34, 'v');
  p.rect(2, 2, 28, 30, 'W');
  for (const y of [11, 21]) p.rect(2, y, 28, 2, 'v');
  const colors = ['b', 'e', 'g', 'y', 'x', 'o', 'c', 'B'];
  for (const [row, y0] of [[0, 3], [1, 13], [2, 23]] as const) {
    let x = 3;
    let k = row * 3;
    while (x < 28) {
      const w = 2 + (k % 2);
      const h = 7 - (k % 3 === 0 ? 1 : 0);
      p.rect(x, y0 + (8 - h), w, h, colors[k % colors.length]);
      x += w + (k % 4 === 0 ? 2 : 0);
      k++;
    }
  }
  return p.outline();
}

function plant() {
  const p = new Px(16, 26);
  const leaves: [number, number, number, number][] = [[6, 0, 4, 8], [2, 4, 5, 6], [9, 3, 5, 6], [4, 8, 8, 6], [1, 10, 5, 4], [10, 9, 5, 4]];
  for (const [x, y, w, h] of leaves) p.rect(x, y, w, h, 'g');
  for (const [x, y] of [[7, 2], [3, 6], [11, 5], [6, 11], [9, 10], [2, 11], [12, 10]]) p.px(x, y, 'G');
  p.px(8, 1, 'a'); p.px(4, 5, 'a'); p.px(12, 4, 'a');
  p.rect(4, 15, 8, 10, 'O'); p.rect(3, 15, 10, 2, 'o'); // горшок
  return p.outline();
}

function tv() {
  const p = new Px(32, 26);
  p.rect(0, 14, 32, 12, 'W'); p.rect(1, 15, 30, 10, 'w'); p.vline(16, 15, 10, 'W');
  p.rect(4, 0, 24, 14, 'k'); p.rect(6, 2, 20, 10, 'B'); p.rect(7, 3, 6, 3, 'l');
  return p.outline();
}

export const FURNITURE_ART = { rug, table, counter, fridge, sofa, bookshelf, plant, tv };
export type FurnitureKey = keyof typeof FURNITURE_ART;
