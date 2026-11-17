// Перемещение с учётом стен: «ноги» героя — прямоугольник, оси проверяются раздельно (скольжение вдоль стен).
import type { Grid, Point } from './grid';

export const FEET_HALF_W = 5;
export const FEET_H = 5;

export function feetBlocked(grid: Grid, p: Point): boolean {
  const l = p.x - FEET_HALF_W, r = p.x + FEET_HALF_W - 0.01;
  const t = p.y - FEET_H, b = p.y - 0.01;
  return grid.isBlockedAt(l, t) || grid.isBlockedAt(r, t) || grid.isBlockedAt(l, b) || grid.isBlockedAt(r, b);
}

export function moveWithCollision(grid: Grid, p: Point, dx: number, dy: number): Point {
  let x = p.x, y = p.y;
  if (dx) { const nx = x + dx; if (!feetBlocked(grid, { x: nx, y })) x = nx; }
  if (dy) { const ny = y + dy; if (!feetBlocked(grid, { x, y: ny })) y = ny; }
  return { x, y };
}

export type Facing = 'down' | 'up' | 'left' | 'right';

export function facingFor(dx: number, dy: number, prev: Facing): Facing {
  if (!dx && !dy) return prev;
  if (Math.abs(dx) > Math.abs(dy) * 1.05) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/** Расстояние от точки до прямоугольника клеток предмета (в пикселях). */
export function distToRect(p: Point, tx: number, ty: number, tw: number, th: number, tile = 16): number {
  const l = tx * tile, t = ty * tile, r = (tx + tw) * tile, b = (ty + th) * tile;
  const cx = Math.max(l, Math.min(p.x, r));
  const cy = Math.max(t, Math.min(p.y - 3, b));
  return Math.hypot(p.x - cx, p.y - 3 - cy);
}
