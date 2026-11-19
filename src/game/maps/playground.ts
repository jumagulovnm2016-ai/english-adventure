// Детская площадка (юнит 2): качели, горка, песочница, тележка с мороженым, прудик. 26×18 клеток.
// Вход — с улицы, слева.
import type { MapDef } from './types';

const T = 16;
const W = 26;
const row = (s: string) => { if (s.length !== W) throw new Error(`playground: длина строки ${s.length}`); return s; };
/** Строка травы с заменами: [x, символ, сколько]. */
function line(edge: string, fills: [number, string, number][]) {
  const a = ('X' + 'g'.repeat(W - 2) + 'X').split('');
  for (const [x, ch, n] of fills) for (let i = 0; i < n; i++) a[x + i] = ch;
  a[0] = edge[0]; a[W - 1] = edge[1];
  return row(a.join(''));
}

export const PLAYGROUND: MapDef = {
  id: 'playground',
  tiles: [
    row('X'.repeat(W)),
    line('XX', [[12, 'p', 2]]),
    line('XX', [[2, 's', 9], [12, 'p', 2]]),
    line('XX', [[2, 's', 9], [12, 'p', 2]]),
    line('XX', [[2, 's', 9], [12, 'p', 2]]),
    line('XX', [[2, 's', 9], [12, 'p', 2]]),
    line('XX', [[12, 'p', 2]]),
    line('XX', [[12, 'p', 2]]),
    line('pX', [[1, 'p', 24]]),
    line('XX', [[1, 'p', 24]]),
    line('XX', [[12, 'p', 2]]),
    line('XX', [[12, 'p', 2]]),
    line('XX', [[2, '~', 6], [12, 'p', 2]]),
    line('XX', [[2, '~', 6], [12, 'p', 2]]),
    line('XX', [[2, '~', 6], [12, 'p', 2]]),
    line('XX', [[12, 'p', 2]]),
    line('XX', []),
    row('X'.repeat(W)),
  ],
  furniture: [
    { key: 'swing', tx: 3, ty: 3, tw: 2, th: 1 },
    { key: 'slide', tx: 7, ty: 3, tw: 2, th: 1 },
    { key: 'sandbox', tx: 16, ty: 3, tw: 2, th: 1 },
    { key: 'ice_cream_cart', tx: 19, ty: 11, tw: 2, th: 1 },
    { key: 'tree', tx: 22, ty: 2, tw: 2, th: 1 },
    { key: 'tree', tx: 1, ty: 16, tw: 2, th: 1 },
    { key: 'tree', tx: 22, ty: 15, tw: 2, th: 1 },
    { key: 'tree', tx: 9, ty: 15, tw: 2, th: 1 },
    { key: 'bench', tx: 15, ty: 6, tw: 2, th: 1 },
    { key: 'bench', tx: 15, ty: 14, tw: 2, th: 1 },
    { key: 'flowers', tx: 10, ty: 6, tw: 1, th: 1, walkable: true },
    { key: 'flowers', tx: 18, ty: 7, tw: 1, th: 1, walkable: true },
    { key: 'flowers', tx: 8, ty: 11, tw: 1, th: 1, walkable: true },
    { key: 'flowers', tx: 24, ty: 12, tw: 1, th: 1, walkable: true },
    { key: 'flowers', tx: 19, ty: 4, tw: 1, th: 1, walkable: true },
  ],
  items: [],
  npcs: [
    { npcId: 'npc.mia', tx: 9, ty: 7, dir: 'down' },
    { npcId: 'npc.sam', tx: 21, ty: 12, dir: 'left' },
  ],
  spots: {
    // «найди змея / велосипед» — на траве
    field: [
      { tx: 17, ty: 9, px: 17 * T + 8, py: 10 * T, onFurniture: false },
      { tx: 22, ty: 6, px: 22 * T + 8, py: 7 * T, onFurniture: false },
      { tx: 9, ty: 12, px: 9 * T + 8, py: 13 * T, onFurniture: false },
      { tx: 17, ty: 16, px: 17 * T + 8, py: 17 * T, onFurniture: false },
      { tx: 4, ty: 10, px: 4 * T + 8, py: 11 * T, onFurniture: false },
    ],
    // показать вещи рядом с Мией
    near_mia: [
      { tx: 6, ty: 7, px: 6 * T + 8, py: 8 * T, onFurniture: false },
      { tx: 8, ty: 6, px: 8 * T + 8, py: 7 * T, onFurniture: false },
      { tx: 10, ty: 10, px: 10 * T + 8, py: 11 * T, onFurniture: false },
      { tx: 5, ty: 10, px: 5 * T + 8, py: 11 * T, onFurniture: false },
    ],
  },
  decor: {},
  spawn: { tx: 1, ty: 8, dir: 'right' },
  exits: [
    { tx: 0, ty: 8, to: 'street', spawn: { tx: 26, ty: 11, dir: 'left' } },
  ],
  zones: { playground: { tx: 1, ty: 1, tw: 24, th: 16 } },
  signs: [{ text: 'PLAYGROUND', x: 3 * T, y: 7 * T + 6 }],
  title: { ru: 'Площадка', en: 'Playground' },
};
