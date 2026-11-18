// Лист предпросмотра всей графики: npx vite-node tools/art-preview.ts → art-preview.png
import { writeFileSync } from 'node:fs';
import { encodePng } from './png';
import { PALETTE, type Px } from '../src/game/art/pixels';
import { TILE_ART } from '../src/game/art/tiles';
import { FURNITURE_ART } from '../src/game/art/furniture';
import { ITEM_ART } from '../src/game/art/items';
import { LOOKS, drawPerson, drawPip } from '../src/game/art/character';

const S = 3, PAD = 6, W = 1400;
const sprites: Px[] = [
  ...Object.values(TILE_ART).map((f) => f()), ...Object.values(ITEM_ART).map((f) => f()),
  ...Object.values(FURNITURE_ART).map((f) => f()),
  ...Object.keys(LOOKS).flatMap((k) => [drawPerson(k, 'down', 0), drawPerson(k, 'right', 1)]),
  drawPip(0), drawPip(1),
];
// раскладка по строкам
let x = PAD, y = PAD, rowH = 0;
const placed = sprites.map((p) => {
  if (x + p.w * S > W) { x = PAD; y += rowH + PAD; rowH = 0; }
  const pos = { p, x, y }; x += p.w * S + PAD; rowH = Math.max(rowH, p.h * S); return pos;
});
const H = y + rowH + PAD;
const img = Buffer.alloc(W * H * 4, 0);
for (let i = 0; i < W * H; i++) { img[i * 4] = 0x55; img[i * 4 + 1] = 0x77; img[i * 4 + 2] = 0x88; img[i * 4 + 3] = 255; }
for (const { p, x, y } of placed) p.rows.forEach((row, j) => row.forEach((ch, i) => {
  const c = PALETTE[ch]; if (!c) return;
  const [r, g, b] = [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
  for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) { const o = ((y + j * S + dy) * W + x + i * S + dx) * 4; img[o] = r; img[o + 1] = g; img[o + 2] = b; }
}));
writeFileSync(process.argv[2] ?? 'art-preview.png', encodePng(W, H, img));
console.log(`${sprites.length} спрайтов`);
