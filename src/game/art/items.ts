// Предметы 16×16 (названия спрайтов совпадают с полем sprite в content/items.json).
import { Px } from './pixels';

function cup(main: string, dark: string, light: string) {
  const p = new Px(16, 16);
  p.rect(3, 5, 8, 9, main);
  p.rect(3, 13, 8, 1, dark);
  p.vline(10, 5, 9, dark);
  p.rect(4, 5, 2, 6, light);
  p.hline(3, 4, 8, dark);        // край
  p.rect(4, 4, 6, 1, 'v');       // чай внутри
  // ручка
  p.vline(12, 7, 4, main); p.px(11, 7, main); p.px(11, 10, main);
  // пар
  p.px(5, 1, 'N'); p.px(6, 2, 'N'); p.px(8, 0, 'N'); p.px(8, 2, 'N');
  return p.outline();
}

function plate(main: string, dark: string, light: string) {
  const p = new Px(16, 16);
  p.rect(1, 8, 14, 5, main);
  p.rect(2, 7, 12, 1, main); p.rect(2, 13, 12, 1, dark);
  p.rect(4, 9, 8, 3, light);
  p.rect(5, 10, 6, 1, 'n');
  return p.outline();
}

function ball(main: string, dark: string) {
  const p = new Px(16, 16);
  const cx = 7.5, cy = 8.5, r = 6;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d <= r) p.px(x, y, d > r - 1.2 && x + y > 16 ? dark : main);
  }
  // полоска и блик
  for (let x = 2; x < 14; x++) p.px(x, 8 + Math.round(Math.sin((x - 2) / 3) * 1.2), 'n');
  p.rect(4, 4, 2, 2, 'n');
  return p.outline();
}

function book(main: string, dark: string) {
  const p = new Px(16, 16);
  p.rect(2, 3, 12, 10, main);
  p.vline(2, 3, 10, dark); p.vline(3, 3, 10, dark);
  p.rect(4, 12, 10, 2, 'n'); p.hline(4, 13, 10, 'N'); // страницы
  p.rect(6, 5, 6, 2, 'y');                             // наклейка
  return p.outline();
}

function cake() {
  const p = new Px(16, 16);
  p.rect(2, 8, 12, 6, 'o');
  p.rect(2, 7, 12, 2, 'z');
  p.px(3, 9, 'z'); p.px(6, 10, 'z'); p.px(10, 9, 'z'); p.px(13, 9, 'z');
  p.rect(1, 14, 14, 1, 'N');
  p.rect(7, 4, 2, 3, 'e'); p.px(8, 3, 'G');           // вишенка
  return p.outline();
}

function lamp(main: string, dark: string) {
  const p = new Px(16, 16);
  p.rect(4, 2, 8, 6, main); p.hline(3, 7, 10, dark); p.hline(5, 1, 6, main);
  p.vline(7, 8, 5, 'M'); p.vline(8, 8, 5, 'M');
  p.rect(4, 13, 8, 2, 'M');
  return p.outline();
}

export const ITEM_ART = {
  cup_blue: () => cup('b', 'B', 'l'),
  cup_red: () => cup('e', 'E', 'o'),
  cup_green: () => cup('g', 'G', 'a'),
  plate_blue: () => plate('b', 'B', 'l'),
  ball_red: () => ball('e', 'E'),
  book_green: () => book('g', 'G'),
  cake,
  lamp_blue: () => lamp('b', 'B'),
};
export type ItemArtKey = keyof typeof ITEM_ART;
