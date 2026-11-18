// Класс: доска, стол учительницы, парты. 16×11 клеток.
import type { MapDef } from './types';

const T = 16;

export const SCHOOL: MapDef = {
  id: 'school',
  tiles: [
    '################',
    '#===w=====w====#',
    '#..............#',
    '#..............#',
    '#..............#',
    '#..............#',
    '#..............#',
    '#..............#',
    '#..............#',
    '#..............#',
    '#######D########',
  ],
  furniture: [
    { key: 'blackboard', tx: 5, ty: 1, tw: 4, th: 1, walkable: true },
    { key: 'teacher_desk', tx: 2, ty: 3, tw: 2, th: 1 },
    { key: 'desk', tx: 3, ty: 6, tw: 2, th: 1 },
    { key: 'desk', tx: 7, ty: 6, tw: 2, th: 1 },
    { key: 'desk', tx: 11, ty: 6, tw: 2, th: 1 },
    { key: 'desk', tx: 3, ty: 8, tw: 2, th: 1 },
    { key: 'desk', tx: 11, ty: 8, tw: 2, th: 1 },
    { key: 'bookshelf', tx: 13, ty: 2, tw: 2, th: 1 },
  ],
  items: [],
  npcs: [
    { npcId: 'npc.ms_lee', tx: 5, ty: 3, dir: 'down' },
    { npcId: 'npc.tom', tx: 10, ty: 4, dir: 'down' },
  ],
  spots: {
    desks: [
      { tx: 3, ty: 6, px: 3 * T + 8, py: 6 * T + 4, onFurniture: true },
      { tx: 4, ty: 6, px: 4 * T + 8, py: 6 * T + 4, onFurniture: true },
      { tx: 7, ty: 6, px: 7 * T + 8, py: 6 * T + 4, onFurniture: true },
      { tx: 8, ty: 6, px: 8 * T + 8, py: 6 * T + 4, onFurniture: true },
      { tx: 11, ty: 6, px: 11 * T + 8, py: 6 * T + 4, onFurniture: true },
      { tx: 12, ty: 6, px: 12 * T + 8, py: 6 * T + 4, onFurniture: true },
      { tx: 3, ty: 8, px: 3 * T + 8, py: 8 * T + 4, onFurniture: true },
      { tx: 11, ty: 8, px: 11 * T + 8, py: 8 * T + 4, onFurniture: true },
    ],
  },
  decor: {},
  spawn: { tx: 7, ty: 9, dir: 'up' },
  exits: [{ tx: 7, ty: 10, to: 'street', spawn: { tx: 23, ty: 5, dir: 'down' } }],
  zones: { school_inside: { tx: 1, ty: 2, tw: 14, th: 8 } },
  signs: [],
  title: { ru: 'Школа', en: 'School' },
};
