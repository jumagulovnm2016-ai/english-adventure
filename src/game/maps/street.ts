// Улица и парк: дом, магазин и школа сверху, парк с прудом снизу. 28×20 клеток.
import type { MapDef } from './types';

const T = 16;
const row = (s: string) => { if (s.length !== 28) throw new Error(`street: длина строки ${s.length}`); return s; };
const G = (n: number) => 'g'.repeat(n);

export const STREET: MapDef = {
  id: 'street',
  tiles: [
    row('X'.repeat(28)),
    row('X' + G(26) + 'X'),
    row('X' + G(26) + 'X'),
    row('X' + G(26) + 'X'),
    row('X' + G(26) + 'X'),
    row('X' + 'p'.repeat(26) + 'X'),
    row('X' + 'p'.repeat(26) + 'X'),
    row('X' + G(12) + 'pp' + G(12) + 'X'),
    row('X' + G(12) + 'pp' + G(12) + 'X'),
    row('X' + G(12) + 'pp' + G(12) + 'X'),
    row('X' + G(3) + '~~~~~' + G(4) + 'pp' + G(12) + 'X'),
    row('X' + G(3) + '~~~~~' + G(4) + 'pppppppp' + G(6) + 'X'),
    row('X' + G(3) + '~~~~~' + G(4) + 'pp' + G(12) + 'X'),
    row('X' + G(3) + '~~~~~' + G(4) + 'pp' + G(12) + 'X'),
    row('X' + G(12) + 'pp' + G(12) + 'X'),
    row('X' + G(12) + 'pp' + G(12) + 'X'),
    row('X' + G(12) + 'pp' + G(12) + 'X'),
    row('X' + G(12) + 'pp' + G(12) + 'X'),
    row('X' + G(26) + 'X'),
    row('X'.repeat(28)),
  ],
  furniture: [
    { key: 'house', tx: 2, ty: 1, tw: 6, th: 4 },
    { key: 'shop_building', tx: 11, ty: 1, tw: 6, th: 4 },
    { key: 'school_building', tx: 20, ty: 1, tw: 7, th: 4 },
    { key: 'tree', tx: 1, ty: 8, tw: 2, th: 1 },
    { key: 'tree', tx: 24, ty: 8, tw: 2, th: 1 },
    { key: 'tree', tx: 9, ty: 16, tw: 2, th: 1 },
    { key: 'tree', tx: 22, ty: 17, tw: 2, th: 1 },
    { key: 'tree', tx: 2, ty: 17, tw: 2, th: 1 },
    { key: 'bench', tx: 17, ty: 8, tw: 2, th: 1 },
    { key: 'flowers', tx: 6, ty: 15, tw: 1, th: 1, walkable: true },
    { key: 'flowers', tx: 19, ty: 14, tw: 1, th: 1, walkable: true },
    { key: 'flowers', tx: 25, ty: 13, tw: 1, th: 1, walkable: true },
    { key: 'flowers', tx: 11, ty: 9, tw: 1, th: 1, walkable: true },
  ],
  items: [],
  npcs: [
    { npcId: 'npc.ben', tx: 10, ty: 12, dir: 'left' },
    { npcId: 'npc.mrs_brown', tx: 20, ty: 10, dir: 'down' },
  ],
  spots: {
    // утки на пруду (вода — «мебель»: клетки и так заняты)
    pond: [
      { tx: 4, ty: 10, px: 4 * T + 8, py: 11 * T - 2, onFurniture: true },
      { tx: 6, ty: 10, px: 6 * T + 8, py: 11 * T - 2, onFurniture: true },
      { tx: 8, ty: 11, px: 8 * T + 8, py: 12 * T - 2, onFurniture: true },
      { tx: 5, ty: 12, px: 5 * T + 8, py: 13 * T - 2, onFurniture: true },
      { tx: 7, ty: 13, px: 7 * T + 8, py: 14 * T - 2, onFurniture: true },
      { tx: 4, ty: 13, px: 4 * T + 8, py: 14 * T - 2, onFurniture: true },
    ],
    // животные в парке
    park: [
      { tx: 16, ty: 15, px: 16 * T + 8, py: 16 * T, onFurniture: false },
      { tx: 24, ty: 11, px: 24 * T + 8, py: 12 * T, onFurniture: false },
      { tx: 5, ty: 16, px: 5 * T + 8, py: 17 * T, onFurniture: false },
      { tx: 19, ty: 17, px: 19 * T + 8, py: 18 * T, onFurniture: false },
    ],
    // «Что это?» — животные рядом с Беном
    meadow: [
      { tx: 9, ty: 8, px: 9 * T + 8, py: 9 * T, onFurniture: false },
      { tx: 4, ty: 8, px: 4 * T + 8, py: 9 * T, onFurniture: false },
      { tx: 7, ty: 14, px: 7 * T + 8, py: 15 * T, onFurniture: false },
    ],
  },
  decor: {},
  spawn: { tx: 5, ty: 5, dir: 'down' },
  exits: [
    { tx: 5, ty: 4, to: 'home', spawn: { tx: 9, ty: 12, dir: 'up' } },
    { tx: 14, ty: 4, to: 'shop', spawn: { tx: 6, ty: 8, dir: 'up' }, requires: 'q.street.ducks', lockedText: 'Магазин откроется чуть позже — сначала загляни к Бену в парк 🦆' },
    { tx: 23, ty: 4, to: 'school', spawn: { tx: 7, ty: 9, dir: 'up' }, requires: 'q.street.ducks', lockedText: 'Школа откроется чуть позже — сначала загляни к Бену в парк 🦆' },
  ],
  zones: { street: { tx: 1, ty: 5, tw: 26, th: 14 } },
  signs: [
    // над дверью — здание и вывеска видны вместе
    { text: 'HOME', x: 5 * T, y: 3 * T + 4 },
    { text: 'SHOP', x: 14 * T, y: 3 * T + 4 },
    { text: 'SCHOOL', x: 23.5 * T, y: 3 * T + 4 },
  ],
  title: { ru: 'Улица', en: 'Street' },
};
