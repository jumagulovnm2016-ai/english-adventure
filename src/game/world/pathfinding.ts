// Поиск пути A* по клеткам (8 направлений, без срезания углов) + сглаживание пути.
import type { Cell, Grid, Point } from './grid';

const DIRS: [number, number, number][] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

export function findPath(grid: Grid, start: Cell, goal: Cell): Cell[] | null {
  if (grid.isBlocked(goal.tx, goal.ty) || grid.isBlocked(start.tx, start.ty)) return null;
  const key = (c: Cell) => grid.key(c);
  const h = (c: Cell) => {
    const dx = Math.abs(c.tx - goal.tx), dy = Math.abs(c.ty - goal.ty);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  const g = new Map<number, number>([[key(start), 0]]);
  const came = new Map<number, Cell>();
  const open: { c: Cell; f: number }[] = [{ c: start, f: h(start) }];
  const closed = new Set<number>();

  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const { c } = open.splice(bi, 1)[0];
    const ck = key(c);
    if (c.tx === goal.tx && c.ty === goal.ty) {
      const path = [c];
      let k = ck;
      while (came.has(k)) { const p = came.get(k)!; path.unshift(p); k = key(p); }
      return path;
    }
    if (closed.has(ck)) continue;
    closed.add(ck);
    for (const [dx, dy, cost] of DIRS) {
      const n = { tx: c.tx + dx, ty: c.ty + dy };
      if (grid.isBlocked(n.tx, n.ty)) continue;
      // по диагонали — только если обе соседние клетки свободны (не протискиваемся между мебелью)
      if (dx && dy && (grid.isBlocked(c.tx + dx, c.ty) || grid.isBlocked(c.tx, c.ty + dy))) continue;
      const nk = key(n);
      const ng = g.get(ck)! + cost;
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng);
        came.set(nk, c);
        open.push({ c: n, f: ng + h(n) });
      }
    }
  }
  return null;
}

/** Прямая видимость между точками для тела шириной halfW (проверяем три параллельные линии). */
export function clearLine(grid: Grid, a: Point, b: Point, halfW = 5): boolean {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len === 0) return true;
  const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
  const steps = Math.ceil(len / 2);
  for (const off of [-halfW, 0, halfW]) {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = a.x + (b.x - a.x) * t + nx * off;
      const y = a.y + (b.y - a.y) * t + ny * off;
      if (grid.isBlockedAt(x, y)) return false;
    }
  }
  return true;
}

/** Превращает путь по клеткам в короткий список точек: убирает лишние промежуточные повороты. */
export function smoothPath(grid: Grid, from: Point, cells: Cell[]): Point[] {
  const pts = cells.map((c) => grid.feetOf(c));
  if (!pts.length) return [];
  const out: Point[] = [];
  let anchor = from;
  let i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !clearLine(grid, anchor, pts[j])) j--;
    out.push(pts[j]);
    anchor = pts[j];
    i = j + 1;
  }
  return out;
}
