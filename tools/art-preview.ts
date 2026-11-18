// Лист предпросмотра всей графики: npm run art-preview → art-preview.png (нужен rsvg-convert).
// Каждый спрайт вставляется картинкой, чтобы id градиентов разных спрайтов не пересекались.
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { allArt } from '../src/game/art/catalog';

const filter = process.argv[3];
const S = Number(process.env.SCALE ?? 3), PAD = 10, W = 1500;
const entries = Object.entries(allArt()).filter(([k]) => !filter || k.includes(filter))
  // кадры ходьбы всех жителей в превью не нужны — по одному стоячему и одному шагу сбоку
  .filter(([k]) => !/_(up|left)_[12]$/.test(k) && !/_down_[12]$/.test(k));
let x = PAD, y = PAD, rowH = 0;
const parts: string[] = [];
for (const [key, a] of entries) {
  const w = a.w * S, h = a.h * S;
  if (x + w > W) { x = PAD; y += rowH + PAD + 12; rowH = 0; }
  parts.push(`<image x="${x}" y="${y}" width="${w}" height="${h}" href="data:image/svg+xml;base64,${Buffer.from(a.svg).toString('base64')}"/>`);
  parts.push(`<text x="${x}" y="${y + h + 10}" font-size="9" font-family="sans-serif" fill="#334">${key.slice(0, Math.max(6, Math.floor(w / 5)))}</text>`);
  x += w + PAD; rowH = Math.max(rowH, h);
}
const H = y + rowH + PAD + 12;
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#cfe3c4"/>${parts.join('')}</svg>`;
const out = process.argv[2] ?? 'art-preview.png';
writeFileSync(out.replace(/\.png$/, '.svg'), sheet);
execFileSync('rsvg-convert', ['-o', out, out.replace(/\.png$/, '.svg')]);
console.log(`${entries.length} спрайтов → ${out}`);
