// Иконки приложения из нового Пипа: npx vite-node tools/gen-icons.ts → public/icons/*.png (нужен rsvg-convert)
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { drawPip } from '../src/game/art/character';

mkdirSync('public/icons', { recursive: true });
const pip = drawPip(0, true);
const b64 = Buffer.from(pip.svg).toString('base64');

/** safe — доля стороны под рисунок (у «маскируемой» иконки меньше: система обрезает края). */
function icon(file: string, size: number, safe: number, round: boolean) {
  const r = round ? size * 0.22 : 0;
  const w = size * safe, h = (w * pip.h) / pip.w;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3ff"/><stop offset="0.62" stop-color="#d9f1ff"/><stop offset="0.62" stop-color="#8ed85b"/><stop offset="1" stop-color="#5fb944"/></linearGradient></defs>
    <rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
    ${round ? `<rect x="${size * 0.02}" y="${size * 0.02}" width="${size * 0.96}" height="${size * 0.96}" rx="${r * 0.9}" fill="none" stroke="#3d2b24" stroke-width="${size * 0.035}"/>` : ''}
    <image x="${(size - w) / 2}" y="${(size - h) / 2 + size * 0.04}" width="${w}" height="${h}" href="data:image/svg+xml;base64,${b64}"/>
  </svg>`;
  writeFileSync('/tmp/icon.svg', svg);
  execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), '-o', `public/icons/${file}`, '/tmp/icon.svg']);
}

icon('icon-192.png', 192, 0.78, true);
icon('icon-512.png', 512, 0.78, true);
icon('maskable-512.png', 512, 0.58, false);
icon('apple-touch-icon.png', 180, 0.7, false);
console.log('иконки готовы');
