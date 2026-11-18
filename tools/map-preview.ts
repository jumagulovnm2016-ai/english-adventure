// Превью локации так, как её собирает сцена: пол, мебель, предметы, жители.
// npx vite-node tools/map-preview.ts street out.png  (нужен rsvg-convert)
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { MAPS } from '../src/game/maps';
import { allArt } from '../src/game/art/catalog';
import { TILE } from '../src/game/world/grid';
import type { Art } from '../src/game/art/svg';
import itemsJson from '../content/items.json';
import npcsJson from '../content/npcs.json';

const id = (process.argv[2] ?? 'street') as keyof typeof MAPS;
const out = process.argv[3] ?? `/tmp/map-${id}.png`;
const S = Number(process.env.SCALE ?? 3);
const map = MAPS[id];
const A = allArt();
const img = (a: Art, x: number, y: number) => `<image x="${x * S}" y="${y * S}" width="${a.w * S}" height="${a.h * S}" href="data:image/svg+xml;base64,${Buffer.from(a.svg).toString('base64')}"/>`;
const layers: { depth: number; s: string }[] = [];
const floor = A[`floor_${id}`];
layers.push({ depth: -1000, s: img(floor, 0, 0) });
for (const f of map.furniture) {
  const a = A[`furn_${f.key}`];
  if (f.walkable) layers.push({ depth: -500, s: img(a, f.tx * TILE, f.ty * TILE) });
  else layers.push({ depth: (f.ty + f.th) * TILE, s: img(a, (f.tx + f.tw / 2) * TILE - a.w / 2, (f.ty + f.th) * TILE - a.h) });
}
const items = (itemsJson as { items: { id: string; sprite: string }[] }).items ?? (itemsJson as unknown as { id: string; sprite: string }[]);
const spriteOf = (iid: string) => items.find((i) => i.id === iid)?.sprite;
const put = (sprite: string | undefined, px: number, py: number, depth: number) => {
  const a = sprite && A[`item_${sprite}`]; if (!a) return;
  layers.push({ depth, s: img(a, px - a.w / 2, py - a.h) });
};
for (const it of map.items) put(spriteOf(it.itemId), it.px, it.py, (it.ty + it.th) * TILE + 1);
// по одному предмету в каждый набор мест — чтобы видеть, как они лежат
const demo = ['apple_red', 'cat_black', 'duck', 'ball_blue', 'cup_red', 'book_yellow'];
Object.values(map.spots).forEach((spots, i) => spots.forEach((s, j) => put(demo[(i + j) % demo.length], s.px, s.py, (s.ty + 1) * TILE + 1)));
const npcs = (npcsJson as unknown as { npcs?: { id: string; sprite: string }[] }).npcs ?? (npcsJson as unknown as { id: string; sprite: string }[]);
for (const n of map.npcs) {
  const look = npcs.find((x) => x.id === n.npcId)?.sprite ?? 'kid_1';
  const a = A[`${look}_${n.dir}_0`]; if (!a) continue;
  const fx = n.tx * TILE + TILE / 2, fy = n.ty * TILE + TILE / 2 + 2;
  if (A.shadow) layers.push({ depth: fy - 0.5, s: img(A.shadow, fx - A.shadow.w / 2, fy - A.shadow.h / 2) });
  layers.push({ depth: fy, s: img(a, fx - a.w / 2, fy + 1 - a.h) });
}
const hero = A['kid_1_down_0'];
if (hero) { const fx = map.spawn.tx * TILE + 8, fy = map.spawn.ty * TILE + 10; layers.push({ depth: fy, s: img(hero, fx - hero.w / 2, fy + 1 - hero.h) }); }
const pip = A['pip_0'];
if (pip) { const fx = map.spawn.tx * TILE + 26, fy = map.spawn.ty * TILE + 12; layers.push({ depth: fy, s: img(pip, fx - pip.w / 2, fy - pip.h) }); }
for (const sg of map.signs) layers.push({ depth: 5000, s: `<g font-family="sans-serif" font-weight="bold" font-size="${9 * S}"><rect x="${(sg.x - 16) * S}" y="${(sg.y - 6) * S}" width="${32 * S}" height="${12 * S}" rx="${3 * S}" fill="#3d2b24"/><text x="${sg.x * S}" y="${(sg.y + 3.5) * S}" text-anchor="middle" fill="#fff">${sg.text}</text></g>` });
layers.sort((a, b) => a.depth - b.depth);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${floor.w * S}" height="${floor.h * S}">${layers.map((l) => l.s).join('')}</svg>`;
writeFileSync(out.replace(/\.png$/, '.svg'), svg);
execFileSync('rsvg-convert', ['-o', out, out.replace(/\.png$/, '.svg')]);
console.log(out);
