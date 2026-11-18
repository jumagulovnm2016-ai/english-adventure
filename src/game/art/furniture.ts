// Мебель и крупные объекты комнаты.
import { Px, hash } from './pixels';

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

// ---------- улица ----------

/** Фасад здания: ширина в клетках, цвет стен, крыши; дверь по центру внизу. */
function building(tw: number, wall: string, wallDark: string, roof: string, roofDark: string, windows: number) {
  const W = tw * 16, H = 80;
  const p = new Px(W, H);
  // крыша
  for (let y = 0; y < 22; y++) { const inset = Math.max(0, 10 - y); p.hline(inset, y, W - inset * 2, y % 4 === 3 ? roofDark : roof); }
  p.hline(0, 22, W, roofDark);
  // стена
  p.rect(2, 23, W - 4, H - 23, wall);
  for (let y = 27; y < H; y += 5) for (let x = (y % 2) * 4 + 2; x < W - 4; x += 9) p.hline(x, y, 6, wallDark);
  // окна
  const doorX = Math.floor(W / 2) - 6;
  const slots = windows;
  for (let i = 0; i < slots; i++) {
    const wx = Math.round(((i + 0.5) / slots) * (W - 4)) - 6 + 2;
    if (wx + 12 > doorX - 2 && wx < doorX + 14) continue;
    p.rect(wx, 34, 12, 12, 'v'); p.rect(wx + 1, 35, 10, 10, 'u'); p.rect(wx + 1, 35, 4, 4, 'U'); p.vline(wx + 6, 35, 10, 'v'); p.hline(wx + 1, 40, 10, 'v');
  }
  // дверь
  p.rect(doorX, H - 22, 12, 22, 'D'); p.rect(doorX + 1, H - 21, 10, 21, 'd'); p.px(doorX + 9, H - 10, 'y');
  return p.outline();
}

function tree() {
  const p = new Px(32, 44);
  p.rect(13, 28, 6, 15, '9'); p.vline(14, 28, 15, '8');
  const blobs: [number, number, number][] = [[16, 12, 11], [8, 20, 8], [24, 20, 8], [16, 22, 9]];
  for (const [cx, cy, r] of blobs) for (let y = 0; y < 44; y++) for (let x = 0; x < 32; x++) if (Math.hypot(x - cx, y - cy) <= r) p.px(x, y, 'g');
  for (let y = 0; y < 44; y++) for (let x = 0; x < 32; x++) if (p.get(x, y) === 'g' && hash(x, y, 7) > 0.8) p.px(x, y, 'G');
  for (const [x, y] of [[12, 6], [10, 15], [20, 9]]) p.px(x, y, 'a');
  return p.outline();
}

function bench() {
  const p = new Px(32, 22);
  p.rect(1, 2, 30, 4, 'w'); p.hline(1, 2, 30, 'W');
  p.rect(1, 9, 30, 4, 'w'); p.hline(1, 12, 30, 'W');
  p.rect(3, 6, 2, 15, 'M'); p.rect(27, 6, 2, 15, 'M');
  return p.outline();
}

function flowers() {
  const p = new Px(16, 16);
  for (const [x, y, c] of [[3, 5, 'e'], [9, 3, 'y'], [12, 9, 'x'], [5, 11, 'n'], [10, 13, 'o']] as const) {
    p.px(x, y - 1, c); p.px(x - 1, y, c); p.px(x + 1, y, c); p.px(x, y + 1, c); p.px(x, y, 'y');
    p.vline(x, y + 2, 2, 'G');
  }
  return p;
}

// ---------- магазин и школа ----------

function shelf() {
  const p = new Px(48, 30);
  p.rect(0, 0, 48, 30, 'v');
  p.rect(2, 2, 44, 26, 'W');
  for (const y of [11, 20]) p.rect(2, y, 44, 2, 'v');
  p.rect(0, 28, 48, 2, 'v');
  // товары на нижних полках (декор)
  for (let x = 4; x < 44; x += 6) { p.rect(x, 22, 4, 6, ['e', 'y', 'n', 'o', 'g', 'b', 'x'][(x / 6) % 7 | 0]); }
  for (let x = 5; x < 44; x += 5) { p.rect(x, 14, 3, 6, ['N', 'y', 'o', 'c'][(x / 5) % 4 | 0]); }
  return p.outline();
}

function shopCounter() {
  const p = new Px(48, 26);
  p.rect(0, 2, 48, 6, 'y'); p.hline(0, 2, 48, '7');
  p.rect(0, 8, 48, 17, 'O'); for (let x = 4; x < 48; x += 8) p.vline(x, 9, 15, 'y');
  // касса
  p.rect(32, 0, 12, 5, 'M'); p.rect(34, 1, 6, 2, 'g');
  return p.outline();
}

function blackboard() {
  const p = new Px(64, 16);
  p.rect(0, 0, 64, 15, 'v');
  p.rect(2, 1, 60, 12, '5');
  // мел: «ABC» и «1 2 3» штрихами
  for (const [x, y] of [[6, 4], [7, 3], [8, 4], [6, 5], [8, 5], [11, 3], [11, 4], [11, 5], [12, 3], [12, 4], [13, 5], [12, 5], [16, 3], [16, 4], [16, 5], [17, 3], [17, 5]]) p.px(x, y, '6');
  for (const x of [30, 36, 42]) { p.vline(x, 3, 4, '6'); }
  p.hline(52, 8, 6, '6');
  p.rect(2, 13, 60, 2, 'W');
  return p;
}

function teacherDesk() {
  const p = new Px(32, 24);
  p.rect(0, 2, 32, 8, 'w'); p.hline(0, 2, 32, 'n');
  p.rect(1, 10, 30, 13, 'W'); p.rect(3, 12, 10, 9, 'w'); p.px(11, 16, 'y');
  p.rect(22, 0, 6, 3, 'g'); // яблоко-кружка
  return p.outline();
}

function desk() {
  const p = new Px(32, 22);
  p.rect(0, 2, 32, 8, 'N'); p.hline(0, 2, 32, 'n');
  p.rect(0, 10, 32, 2, 'M');
  p.rect(2, 12, 2, 9, 'M'); p.rect(28, 12, 2, 9, 'M');
  return p.outline();
}

export const FURNITURE_ART = {
  rug, table, counter, fridge, sofa, bookshelf, plant, tv,
  house: () => building(6, 'p', 'q', '1', '2', 3),
  shop_building: () => building(6, 'l', 'b', 'y', 'O', 3),
  school_building: () => building(7, 'Y', 'Z', '4', '3', 4),
  tree, bench, flowers, shelf, shop_counter: shopCounter, blackboard, teacher_desk: teacherDesk, desk,
};
export type FurnitureKey = keyof typeof FURNITURE_ART;
