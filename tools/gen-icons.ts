// Иконки приложения из пиксельного Пипа: npx vite-node tools/gen-icons.ts → public/icons/*.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { PALETTE } from '../src/game/art/pixels';
import { drawPip } from '../src/game/art/character';
import { encodePng, hexRgb } from './png';

mkdirSync('public/icons', { recursive: true });
const pip = drawPip(0);

/** size — сторона; safe — доля стороны, которую занимает рисунок (для «маскируемой» иконки меньше). */
function icon(size: number, safe: number, round: boolean) {
  const img = Buffer.alloc(size * size * 4);
  const [br, bg, bb] = hexRgb('#3b2f58');
  const [dr, dg, db] = hexRgb('#f2a93b');
  const r = round ? size * 0.22 : 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const o = (y * size + x) * 4;
    // скруглённые углы для обычной иконки, полный квадрат для маскируемой
    const dx = Math.max(r - x, 0, x - (size - 1 - r)), dy = Math.max(r - y, 0, y - (size - 1 - r));
    if (r && Math.hypot(dx, dy) > r) continue;
    const ring = round && (x < size * 0.03 || y < size * 0.03 || x > size * 0.97 || y > size * 0.97);
    img[o] = ring ? dr : br; img[o + 1] = ring ? dg : bg; img[o + 2] = ring ? db : bb; img[o + 3] = 255;
  }
  const scale = Math.floor((size * safe) / Math.max(pip.w, pip.h));
  const ox = Math.floor((size - pip.w * scale) / 2), oy = Math.floor((size - pip.h * scale) / 2);
  pip.rows.forEach((row, j) => row.forEach((ch, i) => {
    const c = PALETTE[ch]; if (!c) return;
    const [cr, cg, cb] = hexRgb(c);
    for (let yy = 0; yy < scale; yy++) for (let xx = 0; xx < scale; xx++) {
      const o = ((oy + j * scale + yy) * size + ox + i * scale + xx) * 4;
      img[o] = cr; img[o + 1] = cg; img[o + 2] = cb; img[o + 3] = 255;
    }
  }));
  return encodePng(size, size, img);
}

writeFileSync('public/icons/icon-192.png', icon(192, 0.7, true));
writeFileSync('public/icons/icon-512.png', icon(512, 0.7, true));
writeFileSync('public/icons/maskable-512.png', icon(512, 0.5, false));
writeFileSync('public/icons/apple-touch-icon.png', icon(180, 0.62, false));
console.log('иконки готовы');
