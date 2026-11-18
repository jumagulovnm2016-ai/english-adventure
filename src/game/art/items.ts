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

// ---------- животные ----------
function duck() {
  const p = new Px(16, 16);
  p.rect(3, 8, 10, 5, 'y'); p.rect(4, 7, 7, 1, 'y'); p.rect(2, 9, 1, 3, 'y');
  p.rect(9, 3, 5, 5, 'y'); p.px(12, 4, 'i'); p.rect(14, 5, 2, 2, 'o');
  p.hline(5, 10, 4, '7'); p.hline(3, 13, 10, 'O');
  return p.outline();
}
function cat(main: string, dark: string) {
  const p = new Px(16, 16);
  p.rect(3, 8, 9, 5, main); p.rect(2, 12, 2, 2, main); p.rect(10, 12, 2, 2, main); p.rect(5, 12, 2, 2, main);
  p.rect(9, 3, 6, 6, main); p.px(9, 2, main); p.px(14, 2, main); p.px(10, 1, main); p.px(13, 1, main);
  p.px(11, 5, main === 'k' ? 'y' : 'i'); p.px(13, 5, main === 'k' ? 'y' : 'i'); p.px(12, 7, 'e');
  p.vline(1, 5, 4, main); p.px(2, 9, main); p.px(2, 4, dark);
  return p.outline(main === 'k' ? 'M' : 'k');
}
function dog(main: string, dark: string) {
  const p = new Px(16, 16);
  p.rect(2, 7, 10, 5, main); p.rect(3, 12, 2, 3, main); p.rect(9, 12, 2, 3, main);
  p.rect(9, 2, 6, 6, main); p.rect(8, 2, 2, 5, dark); p.rect(14, 6, 2, 2, main);
  p.px(12, 4, main === 'k' ? 'y' : 'i'); p.px(15, 6, 'k'); p.px(13, 8, 'e');
  p.vline(1, 4, 4, main);
  return p.outline(main === 'k' ? 'M' : 'k');
}
function bird() {
  const p = new Px(16, 16);
  p.rect(4, 6, 8, 6, 'b'); p.rect(9, 3, 5, 5, 'b'); p.px(12, 4, 'i'); p.rect(14, 5, 2, 1, 'o');
  p.rect(5, 8, 5, 3, 'l'); p.rect(1, 7, 3, 2, 'B'); p.vline(7, 12, 2, 'o'); p.vline(9, 12, 2, 'o');
  return p.outline();
}
function rabbit() {
  const p = new Px(16, 16);
  p.rect(3, 9, 9, 5, 'n'); p.rect(9, 5, 5, 5, 'n'); p.rect(10, 0, 2, 5, 'n'); p.rect(12, 1, 2, 4, 'n');
  p.px(10, 1, 'r'); p.px(12, 2, 'r'); p.px(12, 7, 'i'); p.px(14, 8, 'r'); p.rect(2, 10, 2, 2, '0');
  return p.outline();
}
function frog() {
  const p = new Px(16, 16);
  p.rect(3, 7, 10, 6, 'g'); p.rect(4, 5, 3, 3, 'g'); p.rect(9, 5, 3, 3, 'g');
  p.px(5, 6, 'i'); p.px(10, 6, 'i'); p.hline(5, 10, 6, 'G'); p.rect(2, 12, 3, 2, 'G'); p.rect(11, 12, 3, 2, 'G');
  return p.outline();
}

// ---------- еда ----------
function apple() {
  const p = new Px(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot((x - 7.5) * 1.05, y - 9) <= 5.5) p.px(x, y, 'e');
  p.rect(5, 6, 2, 2, 'n'); p.vline(8, 2, 3, '9'); p.rect(9, 2, 3, 2, 'g');
  return p.outline();
}
function apples3() {
  const p = new Px(16, 16);
  const a = (cx: number, cy: number) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= 3) p.px(x, y, d > 2.2 && x + y > cx + cy ? 'E' : 'e');
      else if (d <= 3.7 && p.get(x, y) === '.') p.px(x, y, 'k'); // свой контур у каждого яблока
    }
    p.px(Math.round(cx) - 1, Math.round(cy) - 1, 'n'); p.px(Math.round(cx), Math.round(cy) - 4, '9');
  };
  a(4, 11.5); a(11.5, 11.5); a(7.5, 5.5);
  return p;
}
function banana() {
  const p = new Px(16, 16);
  for (let x = 2; x < 14; x++) { const y = 10 - Math.round(Math.sin(((x - 2) / 11) * Math.PI) * 5); p.rect(x, y, 1, 3, 'y'); p.px(x, y + 3, 'O'); }
  p.px(13, 9, '9'); p.px(2, 10, '9');
  return p.outline();
}
function orangeFruit() {
  const p = new Px(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - 7.5, y - 9) <= 5.5) p.px(x, y, 'o');
  for (const [x, y] of [[6, 7], [9, 10], [7, 12], [10, 7]]) p.px(x, y, 'O');
  p.rect(5, 6, 2, 1, '7'); p.rect(7, 3, 3, 1, 'g');
  return p.outline();
}
function milk() {
  const p = new Px(16, 16);
  p.rect(4, 4, 8, 11, 'n'); p.rect(5, 1, 6, 3, 'n'); p.hline(5, 1, 6, 'b');
  p.rect(4, 8, 8, 4, 'l'); p.rect(6, 9, 4, 2, 'b');
  return p.outline();
}
function bread() {
  const p = new Px(16, 16);
  p.rect(2, 7, 12, 7, 'O'); p.rect(3, 5, 10, 2, 'O'); p.rect(4, 4, 8, 1, 'O');
  for (const x of [5, 8, 11]) { p.px(x, 6, '7'); p.px(x - 1, 7, '7'); }
  p.hline(2, 13, 12, '9');
  return p.outline();
}
function egg() {
  const p = new Px(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot((x - 7.5) * 1.25, y - 9) <= 5.5) p.px(x, y, 'n');
  p.px(6, 6, 'N'); p.rect(9, 11, 2, 2, '0');
  return p.outline();
}

// ---------- школьные вещи ----------
function pencil(main: string, dark: string) {
  const p = new Px(16, 16);
  for (let i = 0; i < 10; i++) { p.px(3 + i, 12 - i, main); p.px(4 + i, 12 - i, main); p.px(3 + i, 13 - i, dark); }
  p.px(13, 2, 'z'); p.px(14, 1, 'z'); p.px(14, 2, 'z'); p.px(15, 0, 'k');
  p.px(2, 13, 'r'); p.px(3, 13, 'r'); p.px(2, 14, 'r');
  return p.outline();
}
function pen(main: string) {
  const p = new Px(16, 16);
  for (let i = 0; i < 10; i++) { p.px(3 + i, 12 - i, 'M'); p.px(4 + i, 12 - i, main); p.px(3 + i, 13 - i, 'M'); }
  p.px(14, 1, 'k'); p.px(13, 2, 'M'); p.rect(3, 11, 2, 2, main);
  return p.outline();
}
function ruler(main: string, dark: string) {
  const p = new Px(16, 16);
  p.rect(1, 6, 14, 5, main);
  for (let x = 2; x < 15; x += 2) p.vline(x, 6, x % 4 === 0 ? 3 : 2, dark);
  return p.outline();
}

export const ITEM_ART = {
  duck, cat_black: () => cat('k', 'M'), cat_white: () => cat('n', '0'),
  dog_black: () => dog('k', 'M'), dog_brown: () => dog('8', '9'),
  bird_blue: bird, rabbit_white: rabbit, frog_green: frog,
  apple_red: apple, apples_three: apples3, banana, orange_fruit: orangeFruit, milk, bread, egg,
  pencil_red: () => pencil('e', 'E'), pencil_blue: () => pencil('b', 'B'), pen_red: () => pen('e'),
  ruler_green: () => ruler('g', 'G'),
  book_blue: () => book('b', 'B'), book_yellow: () => book('y', 'O'),
  cup_blue: () => cup('b', 'B', 'l'),
  cup_red: () => cup('e', 'E', 'o'),
  cup_green: () => cup('g', 'G', 'a'),
  plate_blue: () => plate('b', 'B', 'l'),
  ball_red: () => ball('e', 'E'),
  ball_blue: () => ball('b', 'B'),
  book_green: () => book('g', 'G'),
  book_red: () => book('e', 'E'),
  cake,
  lamp_blue: () => lamp('b', 'B'),
};
export type ItemArtKey = keyof typeof ITEM_ART;
