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

export interface MapDef {
  id: Location;
  /** Строки клеток. Обозначения — в TILE_LEGEND. */
  tiles: string[];
  furniture: Furniture[];
  items: ItemPlacement[];
  spawn: { tx: number; ty: number; dir: 'down' | 'up' | 'left' | 'right' };
}

export const TILE_LEGEND = {
  '#': { art: 'wall_top', blocked: true },
  '=': { art: 'wall_face', blocked: true },
  'w': { art: 'wall_window', blocked: true },
  'D': { art: 'door', blocked: true },
  ',': { art: 'floor_tile', blocked: false },
  '.': { art: 'floor_wood', blocked: false },
} as const;
export type TileChar = keyof typeof TILE_LEGEND;
