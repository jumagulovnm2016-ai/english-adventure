import { describe, it, expect } from 'vitest';
import { Grid, TILE } from '../src/game/world/grid';
import { findPath, smoothPath, clearLine } from '../src/game/world/pathfinding';
import { moveWithCollision, feetBlocked, facingFor, distToRect } from '../src/game/world/movement';
import { HOME } from '../src/game/maps/home';
import type { MapDef } from '../src/game/maps/types';
import { loadContent } from '../src/content/load';

const tiny: MapDef = {
  id: 'home',
  tiles: ['#######', '#.....#', '#.###.#', '#.....#', '#######'],
  furniture: [], items: [], npcs: [], spots: {}, decor: {}, spawn: { tx: 1, ty: 1, dir: 'down' },
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

describe('Карта дома', () => {
  const g = new Grid(HOME);
  const content = loadContent();
  const spawn = { tx: HOME.spawn.tx, ty: HOME.spawn.ty };
  const reach = g.reachableFrom(spawn);

  it('точка появления проходима', () => {
    expect(g.isBlocked(spawn.tx, spawn.ty)).toBe(false);
  });
  it('все клетки пола связаны (нет запертых углов)', () => {
    for (let ty = 0; ty < g.rows; ty++) for (let tx = 0; tx < g.cols; tx++) {
      if (!g.isBlocked(tx, ty)) expect(reach.has(g.key({ tx, ty })), `клетка ${tx},${ty} недостижима`).toBe(true);
    }
  });
  it('к каждому предмету можно подойти', () => {
    for (const it of HOME.items) {
      const stands = g.standCellsAround(it.tx, it.ty, it.tw, it.th).filter((c) => reach.has(g.key(c)));
      expect(stands.length, `к ${it.itemId} не подойти`).toBeGreaterThan(0);
    }
  });
  it('с персонажами, предметами квестов на полу и украшениями дом остаётся проходимым', () => {
    const g2 = new Grid(HOME);
    for (const n of HOME.npcs) g2.setDynamic(n.tx, n.ty, true);
    for (const set of Object.values(HOME.spots)) for (const s of set) if (!s.onFurniture) g2.setDynamic(s.tx, s.ty, true);
    for (const d of Object.values(HOME.decor)) g2.setDynamic(d.tx, d.ty, true);
    const r = g2.reachableFrom(spawn);
    // к каждому персонажу, месту и предмету можно подойти
    const check = (name: string, tx: number, ty: number) => {
      const stands = g2.standCellsAround(tx, ty, 1, 1).filter((c) => r.has(g2.key(c)));
      expect(stands.length, `${name}: не подойти`).toBeGreaterThan(0);
    };
    for (const n of HOME.npcs) check(n.npcId, n.tx, n.ty);
    for (const [k, set] of Object.entries(HOME.spots)) set.forEach((s, i) => check(`${k}[${i}]`, s.tx, s.ty));
    for (const it of HOME.items) check(it.itemId, it.tx, it.ty);
  });
  it('квесты дома: их персонажи стоят на карте, зон и мест для предметов хватает', () => {
    for (const q of content.quests().filter((q) => q.location === 'home')) {
      expect(HOME.npcs.some((n) => n.npcId === q.giver), `${q.id}: нет ${q.giver} на карте`).toBe(true);
      for (const s of q.steps) {
        if (s.type === 'find_item') {
          const set = HOME.spots[s.zone!];
          expect(set, `${q.id}/${s.id}: нет зоны ${s.zone}`).toBeDefined();
          expect(set.length).toBeGreaterThanOrEqual(1 + s.distractors!.length);
        }
        if (s.type === 'give_item') expect(HOME.npcs.some((n) => n.npcId === s.npc)).toBe(true);
      }
      for (const d of q.rewards.decor ?? []) expect(HOME.decor[d], `нет места для ${d}`).toBeDefined();
    }
  });
  it('места для предметов на мебели действительно на мебели, на полу — на свободном полу', () => {
    for (const set of Object.values(HOME.spots)) for (const s of set) {
      const onF = HOME.furniture.some((f) => !f.walkable && s.tx >= f.tx && s.tx < f.tx + f.tw && s.ty >= f.ty && s.ty < f.ty + f.th);
      expect(onF, `место ${s.tx},${s.ty}`).toBe(s.onFurniture);
      if (!s.onFurniture) expect(g.isBlocked(s.tx, s.ty), `место ${s.tx},${s.ty} занято`).toBe(false);
    }
  });
  it('предметы на карте есть в контенте', () => {
    for (const it of HOME.items) expect(content.hasItem(it.itemId), it.itemId).toBe(true);
  });
  it('мебель и предметы не выходят за стены и не пересекаются', () => {
    const taken = new Map<number, string>();
    const occupy = (name: string, tx: number, ty: number, tw: number, th: number, allowShared: string[] = []) => {
      for (let y = ty; y < ty + th; y++) for (let x = tx; x < tx + tw; x++) {
        expect('#=wD'.includes(HOME.tiles[y][x]), `${name} стоит на стене (${x},${y})`).toBe(false);
        const k = y * g.cols + x;
        const prev = taken.get(k);
        if (prev && !allowShared.includes(prev)) throw new Error(`${name} пересекается с ${prev} в (${x},${y})`);
        taken.set(k, name);
      }
    };
    for (const f of HOME.furniture) if (!f.walkable) occupy(`мебель ${f.key}@${f.tx},${f.ty}`, f.tx, f.ty, f.tw, f.th);
    for (const it of HOME.items) {
      const onFurniture = HOME.furniture.filter((f) => f.tx <= it.tx && f.ty <= it.ty && f.tx + f.tw >= it.tx + it.tw && f.ty + f.th >= it.ty + it.th && !f.walkable)
        .map((f) => `мебель ${f.key}@${f.tx},${f.ty}`);
      occupy(it.itemId, it.tx, it.ty, it.tw, it.th, onFurniture);
    }
  });
});
