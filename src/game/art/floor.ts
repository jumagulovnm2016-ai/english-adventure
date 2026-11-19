// Пол карты целиком одним рисунком: так дорожки, пруд и живая изгородь получаются со скруглёнными
// краями и без швов между клетками. Ключ текстуры — floor_<id карты>.
import type { MapDef } from '../maps/types';
import { art, hash, D, FLOOR_RES, INK, type Art } from './svg';

const C = 16 * D; // клетка в единицах рисования

type Kind = 'grass' | 'sand' | 'path' | 'water' | 'hedge' | 'wood' | 'tile' | 'wallTop' | 'wallFace' | 'window' | 'door';
const KIND: Record<string, Kind> = {
  g: 'grass', s: 'sand', p: 'path', '~': 'water', X: 'hedge', '.': 'wood', ',': 'tile',
  '#': 'wallTop', '=': 'wallFace', w: 'window', D: 'door',
};

/** Прямоугольник клетки с отдельным радиусом каждого угла (tl, tr, br, bl) и отступом наружу e. */
function cellPath(x: number, y: number, r: [number, number, number, number], e = 0) {
  const x0 = x - e, y0 = y - e, x1 = x + C + e, y1 = y + C + e;
  const [tl, tr, br, bl] = r.map((v) => (v ? v + e : 0));
  return `M${x0 + tl} ${y0} H${x1 - tr} ${tr ? `Q${x1} ${y0} ${x1} ${y0 + tr}` : ''} V${y1 - br} ${br ? `Q${x1} ${y1} ${x1 - br} ${y1}` : ''} H${x0 + bl} ${bl ? `Q${x0} ${y1} ${x0} ${y1 - bl}` : ''} V${y0 + tl} ${tl ? `Q${x0} ${y0} ${x0 + tl} ${y0}` : ''}Z`;
}

export function floorArt(map: MapDef): Art {
  const rows = map.tiles.length, cols = map.tiles[0].length;
  const kindAt = (tx: number, ty: number): Kind | null => (tx < 0 || ty < 0 || tx >= cols || ty >= rows ? null : KIND[map.tiles[ty][tx]]);
  const cells = (k: Kind) => {
    const out: { tx: number; ty: number }[] = [];
    for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) if (kindAt(tx, ty) === k) out.push({ tx, ty });
    return out;
  };
  /** Скругляем внешний угол, если обе соседние по сторонам клетки другого типа (край карты — «свой»). */
  const radii = (tx: number, ty: number, k: Kind, r: number): [number, number, number, number] => {
    const other = (dx: number, dy: number) => { const n = kindAt(tx + dx, ty + dy); return n !== null && n !== k; };
    return [
      other(-1, 0) && other(0, -1) ? r : 0, other(1, 0) && other(0, -1) ? r : 0,
      other(1, 0) && other(0, 1) ? r : 0, other(-1, 0) && other(0, 1) ? r : 0,
    ];
  };
  /** Залить все клетки типа одной фигурой; e — расширение (для каймы). */
  const shape = (k: Kind, r: number, e: number, fill: string, extra = '') => {
    const d = cells(k).map(({ tx, ty }) => cellPath(tx * C, ty * C, radii(tx, ty, k, r), e)).join('');
    return d ? `<path d="${d}" fill="${fill}" ${extra}/>` : '';
  };

  const W = cols * C, H = rows * C;
  const parts: string[] = [];
  const outdoor = cells('grass').length > 0;

  // ---------- основа ----------
  parts.push(`<rect width="${W}" height="${H}" fill="${outdoor ? '#7fcf55' : '#d9a066'}"/>`);

  // ---------- трава: пятна и травинки ----------
  for (const { tx, ty } of cells('grass')) {
    const x = tx * C, y = ty * C, h = hash(tx, ty, 3);
    if (h > 0.6) parts.push(`<ellipse cx="${x + 12 + hash(tx, ty, 4) * 40}" cy="${y + 12 + hash(tx, ty, 5) * 40}" rx="${26 + h * 18}" ry="${16 + h * 8}" fill="#72c64e" opacity="0.45"/>`);
    for (let i = 0; i < 3; i++) {
      const gx = x + 8 + hash(tx, ty, 10 + i) * 48, gy = y + 10 + hash(tx, ty, 20 + i) * 44;
      if (hash(tx, ty, 30 + i) > 0.55) parts.push(`<path d="M${gx - 4} ${gy} l2 -6 M${gx} ${gy} l0 -8 M${gx + 4} ${gy} l-2 -6" stroke="#4e9e36" stroke-width="2" stroke-linecap="round"/>`);
    }
    if (h > 0.93) parts.push(`<circle cx="${x + 20}" cy="${y + 40}" r="3.5" fill="#fff"/><circle cx="${x + 20}" cy="${y + 40}" r="1.5" fill="#ffd23f"/>`);
  }

  // ---------- песок: площадка, вольеры ----------
  parts.push(shape('sand', 22, 3, '#d9b06a'));
  parts.push(shape('sand', 22, 0, '#f3dc9c'));
  for (const { tx, ty } of cells('sand')) if (hash(tx, ty, 7) > 0.5) parts.push(`<circle cx="${tx * C + 10 + hash(tx, ty, 8) * 44}" cy="${ty * C + 10 + hash(tx, ty, 9) * 44}" r="2.2" fill="#d9b06a"/>`);

  // ---------- дорожка: кайма, заливка, камешки ----------
  parts.push(shape('path', 18, 4, '#d4a96a'));
  parts.push(shape('path', 18, 0, 'url(#path)'));
  for (const { tx, ty } of cells('path')) for (let i = 0; i < 2; i++) {
    if (hash(tx, ty, 40 + i) < 0.5) continue;
    parts.push(`<ellipse cx="${tx * C + 10 + hash(tx, ty, 50 + i) * 44}" cy="${ty * C + 10 + hash(tx, ty, 60 + i) * 44}" rx="4" ry="2.6" fill="#d9b27a"/>`);
  }

  // ---------- пруд: песчаный берег, вода, блики, кувшинка ----------
  parts.push(shape('water', 30, 10, '#e8d39a'));
  parts.push(shape('water', 30, 3, INK, 'opacity="0.35"'));
  parts.push(shape('water', 30, 0, 'url(#water)'));
  for (const { tx, ty } of cells('water')) {
    const h = hash(tx, ty, 70);
    if (h > 0.45) parts.push(`<path d="M${tx * C + 14} ${ty * C + 30} q8 -6 16 0 M${tx * C + 30} ${ty * C + 44} q6 -4 12 0" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>`);
    if (h > 0.88) parts.push(`<path d="M${tx * C + 40} ${ty * C + 20} m-11 0 a11 8 0 1 0 11 -8 l0 8z" fill="#5fbf45" stroke="${INK}" stroke-width="2"/>`);
  }

  // ---------- живая изгородь: кусты одной массой с общим контуром ----------
  const bushes = cells('hedge').flatMap(({ tx, ty }) => [0, 1, 2, 3].map((i) => ({
    cx: tx * C + 16 + (i % 2) * 32 + (hash(tx, ty, 80 + i) - 0.5) * 8,
    cy: ty * C + 16 + Math.floor(i / 2) * 32 + (hash(tx, ty, 90 + i) - 0.5) * 8,
    r: 22 + hash(tx, ty, 100 + i) * 6,
  })));
  parts.push(shape('hedge', 0, 0, '#3f8f3a'));
  parts.push(`<g fill="${INK}">${bushes.map((b) => `<circle cx="${b.cx}" cy="${b.cy}" r="${b.r + 3}"/>`).join('')}</g>`);
  parts.push(`<g fill="url(#bush)">${bushes.map((b) => `<circle cx="${b.cx}" cy="${b.cy}" r="${b.r}"/>`).join('')}</g>`);
  parts.push(`<g fill="#9be36a" opacity="0.55">${bushes.filter((_, i) => i % 3 === 0).map((b) => `<ellipse cx="${b.cx - 7}" cy="${b.cy - 9}" rx="6" ry="4"/>`).join('')}</g>`);

  // ---------- полы в доме ----------
  parts.push(shape('wood', 0, 0, 'url(#wood)'));
  parts.push(shape('tile', 0, 0, 'url(#tile)'));
  // мягкая тень у стены сверху
  for (const k of ['wood', 'tile'] as const) for (const { tx, ty } of cells(k)) {
    const up = kindAt(tx, ty - 1);
    if (up === 'wallFace' || up === 'window') parts.push(`<rect x="${tx * C}" y="${ty * C}" width="${C}" height="14" fill="#5a3b2a" opacity="0.18"/>`);
  }

  // ---------- стены ----------
  for (const k of ['wallFace', 'window'] as const) for (const { tx, ty } of cells(k)) {
    const x = tx * C, y = ty * C;
    parts.push(`<rect x="${x}" y="${y}" width="${C}" height="${C}" fill="url(#paper)"/>`);
    parts.push(`<rect x="${x}" y="${y + C - 12}" width="${C}" height="12" fill="#b07a4a"/><rect x="${x}" y="${y + C - 12}" width="${C}" height="2.5" fill="${INK}" opacity="0.6"/>`);
    if (k === 'window') parts.push(`<rect x="${x + 10}" y="${y + 6}" width="44" height="36" rx="5" fill="#9fdcff" stroke="${INK}" stroke-width="3"/>
      <path d="M${x + 32} ${y + 6} v36 M${x + 10} ${y + 24} h44" stroke="${INK}" stroke-width="2.5"/>
      <path d="M${x + 15} ${y + 12} h8 M${x + 15} ${y + 17} h4" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M${x + 6} ${y + 6} q6 18 0 36 M${x + 58} ${y + 6} q-6 18 0 36" fill="#ff8f8f" stroke="${INK}" stroke-width="2"/>`);
  }
  for (const { tx, ty } of cells('wallTop')) parts.push(`<rect x="${tx * C}" y="${ty * C}" width="${C}" height="${C}" fill="#7a5640"/>`);
  // светлый край верха стены там, где он граничит с полом или стеной-фасадом
  for (const { tx, ty } of cells('wallTop')) {
    const x = tx * C, y = ty * C;
    const edge = (dx: number, dy: number) => { const n = kindAt(tx + dx, ty + dy); return n !== null && n !== 'wallTop'; };
    if (edge(0, 1)) parts.push(`<rect x="${x}" y="${y + C - 8}" width="${C}" height="8" fill="#a07656"/><rect x="${x}" y="${y + C - 2}" width="${C}" height="2" fill="${INK}" opacity="0.5"/>`);
    if (edge(0, -1)) parts.push(`<rect x="${x}" y="${y}" width="${C}" height="6" fill="#a07656"/>`);
    if (edge(1, 0)) parts.push(`<rect x="${x + C - 6}" y="${y}" width="6" height="${C}" fill="#a07656"/>`);
    if (edge(-1, 0)) parts.push(`<rect x="${x}" y="${y}" width="6" height="${C}" fill="#a07656"/>`);
  }
  // дверь в нижней стене — проём с ковриком
  for (const { tx, ty } of cells('door')) {
    const x = tx * C, y = ty * C;
    parts.push(`<rect x="${x}" y="${y}" width="${C}" height="${C}" fill="#e9c38f"/>
      <rect x="${x + 8}" y="${y + 10}" width="48" height="34" rx="8" fill="#5aa9e6" stroke="${INK}" stroke-width="3"/>
      <path d="M${x + 16} ${y + 20} h32 M${x + 16} ${y + 27} h32 M${x + 16} ${y + 34} h32" stroke="#fff" stroke-width="2.5" opacity="0.7"/>
      <path d="M${x + 22} ${y + 54} l10 6 l10 -6" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>`);
  }

  const defs = `<linearGradient id="path" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7e2b4"/><stop offset="1" stop-color="#efd29a"/></linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6cc6f0"/><stop offset="1" stop-color="#3f9fd8"/></linearGradient>
    <radialGradient id="bush" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#7fd65a"/><stop offset="1" stop-color="#3f9a3a"/></radialGradient>
    <pattern id="wood" width="${C}" height="${C}" patternUnits="userSpaceOnUse">
      <rect width="${C}" height="${C}" fill="#dca46c"/>
      ${[0, 1, 2, 3].map((i) => `<rect y="${i * 16}" width="${C}" height="16" fill="${i % 2 ? '#d69c62' : '#e2ab73'}"/><path d="M0 ${i * 16 + 15.5} H${C} M${(i * 23) % C} ${i * 16} v16" stroke="#b07a4a" stroke-width="1.6"/>`).join('')}
    </pattern>
    <pattern id="tile" width="32" height="32" patternUnits="userSpaceOnUse">
      <rect width="32" height="32" fill="#f4f1ea"/><rect width="16" height="16" fill="#e3ecf2"/><rect x="16" y="16" width="16" height="16" fill="#e3ecf2"/>
      <path d="M0 0.5 H32 M0.5 0 V32" stroke="#cdd6de" stroke-width="1.2"/>
    </pattern>
    <pattern id="paper" width="24" height="${C}" patternUnits="userSpaceOnUse">
      <rect width="24" height="${C}" fill="#fbe9c8"/><rect x="0" width="10" height="${C}" fill="#f6dfb6"/>
    </pattern>`;

  return art(cols * 16, rows * 16, parts.join(''), defs, FLOOR_RES);
}
