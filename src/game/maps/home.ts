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
  items: [
    // синяя чашка на столе
    { itemId: 'it.cup_blue', tx: 2, ty: 7, tw: 2, th: 1, px: 3 * T, py: 7 * T + 5 },
    // красный мяч на ковре
    { itemId: 'it.ball_red', tx: 15, ty: 6, tw: 1, th: 1, px: 15 * T + 8, py: 7 * T },
    // зелёная книга на полу у полки
    { itemId: 'it.book_green', tx: 10, ty: 4, tw: 1, th: 1, px: 10 * T + 8, py: 5 * T },
  ],
  spawn: { tx: 9, ty: 11, dir: 'up' },
};
