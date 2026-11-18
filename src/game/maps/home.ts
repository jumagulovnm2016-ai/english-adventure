// Дом героя: слева кухня (кафель), справа комната (дерево). 20×14 клеток по 16 px.
import type { MapDef } from './types';

const T = 16;

export const HOME: MapDef = {
  id: 'home',
  tiles: [
    '####################',
    '#=w====w===w====w==#',
    '#,,,,,,,...........#',
    '#,,,,,,,...........#',
    '#,,,,,,,...........#',
    '#,,,,,,,...........#',
    '#,,,,,,,...........#',
    '#,,,,,,,...........#',
    '#,,,,,,,...........#',
    '#,,,,,,,...........#',
    '#,,,,,,,...........#',
    '#,,,,,,,...........#',
    '#,,,,,,,...........#',
    '#########D##########',
  ],
  furniture: [
    { key: 'counter', tx: 1, ty: 2, tw: 3, th: 1 },
    { key: 'fridge', tx: 5, ty: 2, tw: 1, th: 1 },
    { key: 'plant', tx: 7, ty: 2, tw: 1, th: 1 },
    { key: 'table', tx: 2, ty: 7, tw: 2, th: 1 },
    { key: 'bookshelf', tx: 9, ty: 2, tw: 2, th: 1 },
    { key: 'sofa', tx: 13, ty: 2, tw: 3, th: 1 },
    { key: 'plant', tx: 18, ty: 2, tw: 1, th: 1 },
    { key: 'rug', tx: 12, ty: 4, tw: 4, th: 3, walkable: true },
    { key: 'tv', tx: 13, ty: 10, tw: 2, th: 1 },
  ],
  // предметы, которые всегда лежат в комнате и которые можно рассмотреть
  items: [
    { itemId: 'it.book_green', tx: 10, ty: 4, tw: 1, th: 1, px: 10 * T + 8, py: 5 * T },
  ],
  npcs: [
    { npcId: 'npc.mum', tx: 5, ty: 5, dir: 'down' },
    { npcId: 'npc.dad', tx: 13, ty: 5, dir: 'down' },
    { npcId: 'npc.amy', tx: 17, ty: 8, dir: 'left' },
  ],
  spots: {
    // на кухне: на столешнице и на столе
    kitchen: [
      { tx: 1, ty: 2, px: 1 * T + 8, py: 2 * T - 1, onFurniture: true },
      { tx: 3, ty: 2, px: 3 * T + 8, py: 2 * T - 1, onFurniture: true },
      { tx: 2, ty: 7, px: 2 * T + 8, py: 7 * T + 5, onFurniture: true },
      { tx: 3, ty: 7, px: 3 * T + 8, py: 7 * T + 5, onFurniture: true },
    ],
    // в комнате: на полу
    living: [
      { tx: 11, ty: 7, px: 11 * T + 8, py: 8 * T, onFurniture: false },
      { tx: 17, ty: 4, px: 17 * T + 8, py: 5 * T, onFurniture: false },
      { tx: 10, ty: 10, px: 10 * T + 8, py: 11 * T, onFurniture: false },
      { tx: 16, ty: 11, px: 16 * T + 8, py: 12 * T, onFurniture: false },
    ],
  },
  decor: {
    'it.decor_blue_lamp': { tx: 18, ty: 11, px: 18 * T + 8, py: 12 * T },
  },
  spawn: { tx: 9, ty: 11, dir: 'up' },
  exits: [
    { tx: 9, ty: 13, to: 'street', spawn: { tx: 5, ty: 5, dir: 'down' }, requires: 'q.home.dad_ball', lockedText: 'Сначала помоги маме, Эми и папе 🙂' },
  ],
  zones: { home_inside: { tx: 1, ty: 2, tw: 18, th: 11 } },
  signs: [],
  title: { ru: 'Дом', en: 'Home' },
};
