// Зоопарк (юнит 2): девять вольеров вдоль двух дорожек. 30×20 клеток. Вход — сверху, с улицы.
import type { MapDef, Furniture } from './types';
import type { FurnitureKey } from '../art/furniture';

const T = 16;
const W = 30;
const row = (s: string) => { if (s.length !== W) throw new Error(`zoo: длина строки ${s.length}`); return s; };

// сначала — трава с дорожками, потом в вольерах свой пол (песок, вода)
const grid: string[][] = Array.from({ length: 20 }, (_, y) => Array.from({ length: W }, (_, x) =>
  (y === 0 || y === 19 || x === 0 || x === W - 1 ? 'X' : 'g')));
const fill = (x: number, y: number, w: number, h: number, ch: string) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j][i] = ch; };
fill(14, 0, 2, 19, 'p');            // главная дорожка сверху вниз (вход на 14–15, 0)
fill(1, 7, 28, 2, 'p');             // поперечная дорожка
fill(1, 2, 6, 4, 's');              // лев — песок
fill(8, 2, 5, 4, 's');              // тигр
fill(24, 2, 5, 4, 's');             // жираф и зебра — саванна
fill(17, 10, 6, 4, 's'); fill(18, 11, 3, 2, '~'); // пингвины: берег и бассейн
fill(24, 10, 5, 4, '~'); fill(24, 13, 5, 1, 's'); // бегемот и крокодил: вода
fill(9, 15, 4, 4, 's');             // змея

const pen = (key: FurnitureKey, tx: number, ty: number, tw: number, th: number): Furniture => ({ key, tx, ty, tw, th });
/** Зверь в вольере: занимает клетки внутри ограды (они и так закрыты). */
const beast = (kind: string, tx: number, ty: number, tw = 2): Furniture => ({ key: `zoo_${kind}` as FurnitureKey, tx, ty, tw, th: 1 });

export const ZOO: MapDef = {
  id: 'zoo',
  tiles: grid.map((r) => row(r.join(''))),
  furniture: [
    pen('pen_6x4', 1, 2, 6, 4), beast('lion', 3, 4),
    pen('pen_5x4', 8, 2, 5, 4), beast('tiger', 9, 4),
    pen('pen_6x4', 17, 2, 6, 4), beast('elephant', 18, 4, 3),
    pen('pen_5x4', 24, 2, 5, 4), beast('giraffe', 24, 4), beast('zebra', 26, 4),
    pen('pen_6x4', 1, 10, 6, 4), beast('monkey', 2, 12), beast('parrot', 4, 11),
    pen('pen_5x4', 8, 10, 5, 4), beast('bear', 9, 12),
    pen('pen_6x4', 17, 10, 6, 4), beast('penguin', 17, 12, 1), beast('penguin', 21, 12, 1),
    pen('pen_5x4', 24, 10, 5, 4), beast('hippo', 24, 12), beast('crocodile', 26, 12),
    pen('pen_4x4', 9, 15, 4, 4), beast('snake', 10, 17),
    { key: 'tree', tx: 4, ty: 15, tw: 2, th: 1 },
    { key: 'tree', tx: 25, ty: 16, tw: 2, th: 1 },
    { key: 'bench', tx: 17, ty: 16, tw: 2, th: 1 },
    { key: 'ice_cream_cart', tx: 21, ty: 16, tw: 2, th: 1 },
    { key: 'flowers', tx: 7, ty: 6, tw: 1, th: 1, walkable: true },
    { key: 'flowers', tx: 23, ty: 6, tw: 1, th: 1, walkable: true },
    { key: 'flowers', tx: 2, ty: 17, tw: 1, th: 1, walkable: true },
  ],
  items: [],
  npcs: [
    { npcId: 'npc.kate', tx: 13, ty: 6, dir: 'down' },
    { npcId: 'npc.leo', tx: 19, ty: 15, dir: 'down' },
  ],
  spots: {
    // сбежавшая обезьянка и другие «гости» на дорожках
    zoo_paths: [
      { tx: 6, ty: 16, px: 6 * T + 8, py: 17 * T, onFurniture: false },
      { tx: 16, ty: 13, px: 16 * T + 8, py: 14 * T, onFurniture: false },
      { tx: 27, ty: 15, px: 27 * T + 8, py: 16 * T, onFurniture: false },
      { tx: 2, ty: 8, px: 2 * T + 8, py: 9 * T, onFurniture: false },
      { tx: 23, ty: 8, px: 23 * T + 8, py: 9 * T, onFurniture: false },
    ],
    near_kate: [
      { tx: 11, ty: 7, px: 11 * T + 8, py: 8 * T, onFurniture: false },
      { tx: 16, ty: 6, px: 16 * T + 8, py: 7 * T, onFurniture: false },
      { tx: 17, ty: 8, px: 17 * T + 8, py: 9 * T, onFurniture: false },
    ],
  },
  decor: {},
  spawn: { tx: 14, ty: 1, dir: 'down' },
  exits: [
    { tx: 14, ty: 0, to: 'street', spawn: { tx: 13, ty: 18, dir: 'up' } },
    { tx: 15, ty: 0, to: 'street', spawn: { tx: 14, ty: 18, dir: 'up' } },
  ],
  zones: { zoo: { tx: 1, ty: 1, tw: 28, th: 18 } },
  // таблички с названиями зверей не ставим: иначе вопрос «What's this?» решается чтением вывески
  signs: [{ text: 'ZOO', x: 15 * T, y: 1 * T + 4 }],
  title: { ru: 'Зоопарк', en: 'Zoo' },
};
