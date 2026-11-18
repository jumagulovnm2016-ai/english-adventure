// Магазин: полки с продуктами, прилавок, продавец мистер Грин. 14×10 клеток.
import type { MapDef } from './types';

const T = 16;

export const SHOP: MapDef = {
  id: 'shop',
  tiles: [
    '##############',
    '#==w==w==w==w#',
    '#,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,#',
    '######D#######',
  ],
  furniture: [
    { key: 'shelf', tx: 1, ty: 2, tw: 3, th: 1 },
    { key: 'shelf', tx: 5, ty: 2, tw: 3, th: 1 },
    { key: 'shop_counter', tx: 9, ty: 4, tw: 3, th: 1 },
    { key: 'plant', tx: 12, ty: 8, tw: 1, th: 1 },
    { key: 'plant', tx: 1, ty: 8, tw: 1, th: 1 },
  ],
  items: [],
  npcs: [
    { npcId: 'npc.mr_green', tx: 12, ty: 4, dir: 'left' },
  ],
  spots: {
    shelves: [
      { tx: 1, ty: 2, px: 1 * T + 8, py: 2 * T - 4, onFurniture: true },
      { tx: 2, ty: 2, px: 2 * T + 8, py: 2 * T - 4, onFurniture: true },
      { tx: 3, ty: 2, px: 3 * T + 8, py: 2 * T - 4, onFurniture: true },
      { tx: 5, ty: 2, px: 5 * T + 8, py: 2 * T - 4, onFurniture: true },
      { tx: 6, ty: 2, px: 6 * T + 8, py: 2 * T - 4, onFurniture: true },
      { tx: 7, ty: 2, px: 7 * T + 8, py: 2 * T - 4, onFurniture: true },
    ],
  },
  decor: {},
  spawn: { tx: 6, ty: 8, dir: 'up' },
  exits: [{ tx: 6, ty: 9, to: 'street', spawn: { tx: 14, ty: 5, dir: 'down' } }],
  zones: { shop_inside: { tx: 1, ty: 2, tw: 12, th: 7 } },
  signs: [],
  title: { ru: 'Магазин', en: 'Shop' },
};
