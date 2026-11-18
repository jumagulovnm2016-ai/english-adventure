import type { FurnitureKey } from '../art/furniture';
import type { Location } from '../../content/types';

export interface Furniture {
  key: FurnitureKey;
  /** Занятые клетки: левая верхняя клетка и размер в клетках. */
  tx: number; ty: number; tw: number; th: number;
  /** Можно ли ходить по нему (ковёр). */
  walkable?: boolean;
}

export interface ItemPlacement {
  itemId: string;
  /** Клетки, которые занимает предмет (на полу — своя клетка; на столе — клетки стола). */
  tx: number; ty: number; tw: number; th: number;
  /** Где рисовать предмет: центр по x и низ спрайта по y, в пикселях. */
  px: number; py: number;
}

export interface NpcPlacement { npcId: string; tx: number; ty: number; dir: 'down' | 'up' | 'left' | 'right' }

/** Место, куда квест «найди» раскладывает предметы. onFurniture — предмет лежит на мебели (клетки уже заняты). */
export interface Spot { tx: number; ty: number; px: number; py: number; onFurniture: boolean }

export interface Exit {
  /** Клетка-дверь: войти в неё — перейти в другую локацию. */
  tx: number; ty: number;
  to: Location;
  /** Где появиться в новой локации. */
  spawn: { tx: number; ty: number; dir: 'down' | 'up' | 'left' | 'right' };
  /** Дверь открывается после этого квеста. */
  requires?: string;
  lockedText?: string;
}

export interface MapDef {
  id: Location;
  /** Строки клеток. Обозначения — в TILE_LEGEND. */
  tiles: string[];
  furniture: Furniture[];
  items: ItemPlacement[];
  npcs: NpcPlacement[];
  /** Наборы мест для предметов квестов «найди» (по одному набору на часть комнаты). */
  spots: Record<string, Spot[]>;
  /** Куда ставится украшение-награда. */
  decor: Record<string, { tx: number; ty: number; px: number; py: number }>;
  spawn: { tx: number; ty: number; dir: 'down' | 'up' | 'left' | 'right' };
  exits: Exit[];
  /** Именованные области: шаг квеста «дойди до» (go_to). */
  zones: Record<string, { tx: number; ty: number; tw: number; th: number }>;
  /** Надписи на зданиях (английские вывески — тоже чтение). */
  signs: { text: string; x: number; y: number }[];
  /** Название для шапки. */
  title: { ru: string; en: string };
}

export const TILE_LEGEND = {
  '#': { art: 'wall_top', blocked: true },
  '=': { art: 'wall_face', blocked: true },
  'w': { art: 'wall_window', blocked: true },
  'D': { art: 'door', blocked: false },   // дверь — проход (выход задаётся в exits)
  'g': { art: 'grass', blocked: false },
  'p': { art: 'path', blocked: false },
  '~': { art: 'water', blocked: true },
  'X': { art: 'hedge', blocked: true },
  ',': { art: 'floor_tile', blocked: false },
  '.': { art: 'floor_wood', blocked: false },
} as const;
export type TileChar = keyof typeof TILE_LEGEND;
