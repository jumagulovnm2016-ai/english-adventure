// Сетка проходимости карты. Чистая логика без Phaser — тестируется отдельно.
import { TILE_LEGEND, type MapDef, type TileChar } from '../maps/types';

export const TILE = 16;

export interface Point { x: number; y: number }
export interface Cell { tx: number; ty: number }

export class Grid {
  readonly cols: number;
  readonly rows: number;
  private blocked: boolean[];
  /** Временные препятствия: персонажи, предметы квестов на полу. */
  private dynamic = new Set<number>();

  constructor(readonly map: MapDef) {
    this.rows = map.tiles.length;
    this.cols = map.tiles[0].length;
    for (const r of map.tiles) if (r.length !== this.cols) throw new Error(`Карта ${map.id}: строки разной длины`);
    this.blocked = new Array(this.cols * this.rows).fill(false);
    for (let ty = 0; ty < this.rows; ty++) for (let tx = 0; tx < this.cols; tx++) {
      const ch = map.tiles[ty][tx] as TileChar;
      const def = TILE_LEGEND[ch];
      if (!def) throw new Error(`Карта ${map.id}: неизвестный символ «${ch}» в (${tx},${ty})`);
      this.blocked[ty * this.cols + tx] = def.blocked;
    }
    for (const f of map.furniture) if (!f.walkable) this.blockRect(f.tx, f.ty, f.tw, f.th);
    for (const it of map.items) this.blockRect(it.tx, it.ty, it.tw, it.th);
    // двери всегда проходимы, даже если попали в «след» здания
    for (const e of map.exits ?? []) this.blocked[e.ty * this.cols + e.tx] = false;
  }

  private blockRect(tx: number, ty: number, tw: number, th: number) {
    for (let y = ty; y < ty + th; y++) for (let x = tx; x < tx + tw; x++) this.blocked[y * this.cols + x] = true;
  }

  inside(tx: number, ty: number) { return tx >= 0 && ty >= 0 && tx < this.cols && ty < this.rows; }
  isBlocked(tx: number, ty: number) {
    if (!this.inside(tx, ty)) return true;
    const k = ty * this.cols + tx;
    return this.blocked[k] || this.dynamic.has(k);
  }
  setDynamic(tx: number, ty: number, on: boolean) {
    const k = ty * this.cols + tx;
    if (on) this.dynamic.add(k); else this.dynamic.delete(k);
  }
  isBlockedAt(x: number, y: number) { return this.isBlocked(Math.floor(x / TILE), Math.floor(y / TILE)); }

  cellOf(p: Point): Cell { return { tx: Math.floor(p.x / TILE), ty: Math.floor(p.y / TILE) }; }
  /** Точка «ног» героя в центре клетки (чуть ниже центра — так естественнее). */
  feetOf(c: Cell): Point { return { x: c.tx * TILE + TILE / 2, y: c.ty * TILE + TILE / 2 + 2 }; }

  /** Ближайшая проходимая клетка к заданной (поиск в ширину). */
  nearestWalkable(from: Cell, near?: Point): Cell | null {
    if (!this.isBlocked(from.tx, from.ty)) return from;
    const seen = new Set<number>([from.ty * this.cols + from.tx]);
    let frontier: Cell[] = [from];
    while (frontier.length) {
      const next: Cell[] = [];
      const found: Cell[] = [];
      for (const c of frontier) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { tx: c.tx + dx, ty: c.ty + dy };
        if (!this.inside(n.tx, n.ty)) continue;
        const k = n.ty * this.cols + n.tx;
        if (seen.has(k)) continue;
        seen.add(k);
        if (this.isBlocked(n.tx, n.ty)) next.push(n); else found.push(n);
      }
      if (found.length) {
        if (!near) return found[0];
        const d = (c: Cell) => { const f = this.feetOf(c); return Math.hypot(f.x - near.x, f.y - near.y); };
        return found.sort((a, b) => d(a) - d(b))[0];
      }
      frontier = next;
    }
    return null;
  }

  /** Проходимые клетки вокруг прямоугольника (откуда можно взаимодействовать с предметом). */
  standCellsAround(tx: number, ty: number, tw: number, th: number): Cell[] {
    const out: Cell[] = [];
    for (let y = ty - 1; y <= ty + th; y++) for (let x = tx - 1; x <= tx + tw; x++) {
      const insideRect = x >= tx && x < tx + tw && y >= ty && y < ty + th;
      const corner = (x === tx - 1 || x === tx + tw) && (y === ty - 1 || y === ty + th);
      if (!insideRect && !corner && !this.isBlocked(x, y)) out.push({ tx: x, ty: y });
    }
    return out;
  }

  /** Все проходимые клетки, достижимые из start. */
  reachableFrom(start: Cell): Set<number> {
    const seen = new Set<number>();
    if (this.isBlocked(start.tx, start.ty)) return seen;
    const q: Cell[] = [start];
    seen.add(start.ty * this.cols + start.tx);
    while (q.length) {
      const c = q.shift()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { tx: c.tx + dx, ty: c.ty + dy };
        const k = n.ty * this.cols + n.tx;
        if (!this.isBlocked(n.tx, n.ty) && !seen.has(k)) { seen.add(k); q.push(n); }
      }
    }
    return seen;
  }

  key(c: Cell) { return c.ty * this.cols + c.tx; }
}
