import { describe, it, expect } from 'vitest';
import { Grid, TILE } from '../src/game/world/grid';
import { findPath, smoothPath, clearLine } from '../src/game/world/pathfinding';
import { moveWithCollision, feetBlocked, facingFor, distToRect } from '../src/game/world/movement';
import type { MapDef } from '../src/game/maps/types';

const tiny: MapDef = {
  id: 'home',
  tiles: ['#######', '#.....#', '#.###.#', '#.....#', '#######'],
  furniture: [], items: [], npcs: [], spots: {}, decor: {}, spawn: { tx: 1, ty: 1, dir: 'down' },
  exits: [], zones: {}, signs: [], title: { ru: '', en: '' },
};

describe('Grid', () => {
  const g = new Grid(tiny);
  it('стены и пол', () => {
    expect(g.isBlocked(0, 0)).toBe(true);
    expect(g.isBlocked(1, 1)).toBe(false);
    expect(g.isBlocked(3, 2)).toBe(true);
    expect(g.isBlocked(-1, 1)).toBe(true); // за картой — стена
  });
  it('ближайшая проходимая клетка к стене', () => {
    expect(g.nearestWalkable({ tx: 3, ty: 2 })).not.toBeNull();
    const c = g.nearestWalkable({ tx: 3, ty: 2 })!;
    expect(g.isBlocked(c.tx, c.ty)).toBe(false);
  });
  it('неизвестный символ на карте — ошибка', () => {
    expect(() => new Grid({ ...tiny, tiles: ['#?#'] })).toThrow(/неизвестный символ/);
  });
  it('строки разной длины — ошибка', () => {
    expect(() => new Grid({ ...tiny, tiles: ['###', '##'] })).toThrow(/разной длины/);
  });
});

describe('Поиск пути', () => {
  const g = new Grid(tiny);
  it('обходит препятствие', () => {
    const p = findPath(g, { tx: 1, ty: 1 }, { tx: 5, ty: 3 })!;
    expect(p).not.toBeNull();
    expect(p[0]).toEqual({ tx: 1, ty: 1 });
    expect(p[p.length - 1]).toEqual({ tx: 5, ty: 3 });
    for (const c of p) expect(g.isBlocked(c.tx, c.ty)).toBe(false);
  });
  it('не срезает углы между стенами', () => {
    const p = findPath(g, { tx: 1, ty: 1 }, { tx: 1, ty: 3 })!;
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1], b = p[i];
      const dx = b.tx - a.tx, dy = b.ty - a.ty;
      if (dx && dy) expect(g.isBlocked(a.tx + dx, a.ty) || g.isBlocked(a.tx, a.ty + dy)).toBe(false);
    }
  });
  it('в стену пути нет', () => {
    expect(findPath(g, { tx: 1, ty: 1 }, { tx: 3, ty: 2 })).toBeNull();
  });
  it('сглаженный путь не проходит сквозь стены', () => {
    const cells = findPath(g, { tx: 1, ty: 1 }, { tx: 5, ty: 3 })!;
    const from = g.feetOf(cells[0]);
    const pts = smoothPath(g, from, cells);
    let prev = from;
    for (const p of pts) { expect(clearLine(g, prev, p)).toBe(true); prev = p; }
    expect(pts.length).toBeLessThan(cells.length);
  });
});

describe('Движение', () => {
  const g = new Grid(tiny);
  it('скользит вдоль стены и не входит в неё', () => {
    let p = { x: 1 * TILE + 8, y: 1 * TILE + 10 };
    for (let i = 0; i < 100; i++) p = moveWithCollision(g, p, 0, -2); // упираемся вверх
    expect(feetBlocked(g, p)).toBe(false);
    expect(p.y).toBeGreaterThanOrEqual(TILE + 5);
    const before = p.x;
    for (let i = 0; i < 10; i++) p = moveWithCollision(g, p, 2, -2); // по диагонали в стену — скользим вправо
    expect(p.x).toBeGreaterThan(before);
  });
  it('сторона взгляда', () => {
    expect(facingFor(1, 0, 'down')).toBe('right');
    expect(facingFor(-1, 0.2, 'down')).toBe('left');
    expect(facingFor(0, -1, 'down')).toBe('up');
    expect(facingFor(0, 0, 'left')).toBe('left');
  });
  it('расстояние до предмета', () => {
    expect(distToRect({ x: 24, y: 27 }, 1, 1, 1, 1)).toBe(0);
    expect(distToRect({ x: 60, y: 27 }, 1, 1, 1, 1)).toBeCloseTo(28);
  });
});
