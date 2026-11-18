// Векторная графика, нарисованная кодом: каждый спрайт — SVG-строка (см. DECISIONS D45).
// Мировые размеры спрайтов те же, что у прежней пиксельной графики (клетка — 16 единиц),
// поэтому карты, столкновения и квесты не меняются. Текстура растеризуется с запасом
// разрешения (RES пикселей на единицу мира) и в сцене выводится с масштабом 1/RES.

/** Пикселей текстуры на единицу мира для спрайтов. */
export const RES = 6;
/** Для пола карты — меньше: он большой, мягкий и мелкие детали на нём не нужны. */
export const FLOOR_RES = 4;
/** Единиц рисования на единицу мира: рисуем в сетке ×4 (предмет 16×16 → холст 64×64). */
export const D = 4;

/** Цвет контура — тёплый тёмно-коричневый, один на всю игру. */
export const INK = '#3d2b24';
/** Стандартный контур (в единицах рисования). */
export const ST = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
export const ST2 = `stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;

export interface Art {
  /** Размер в единицах мира. */
  w: number; h: number;
  /** Полный SVG-документ с width/height в пикселях текстуры. */
  svg: string;
  /** Пикселей текстуры на единицу мира. */
  res: number;
}

export function art(w: number, h: number, body: string, defs = '', res = RES): Art {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w * res)}" height="${Math.round(h * res)}" viewBox="0 0 ${w * D} ${h * D}">`
    + (defs ? `<defs>${defs}</defs>` : '') + body + '</svg>';
  return { w, h, svg, res };
}

// ---------- цвета ----------
function toRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
function toHex([r, g, b]: number[]): string {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
/** Смешать цвет с белым (t > 0) или чёрным (t < 0). */
export function tint(hex: string, t: number): string {
  const c = toRgb(hex);
  return toHex(c.map((v) => (t >= 0 ? v + (255 - v) * t : v * (1 + t))));
}

// ---------- градиенты ----------
/** Вертикальный градиент «светлее сверху — темнее снизу» от базового цвета. */
export function vgrad(id: string, base: string, top = 0.28, bottom = -0.12): string {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tint(base, top)}"/><stop offset="1" stop-color="${tint(base, bottom)}"/></linearGradient>`;
}
/** Объёмный градиент для круглых предметов: блик сверху слева. */
export function rgrad(id: string, base: string, light = 0.4, dark = -0.18): string {
  return `<radialGradient id="${id}" cx="0.36" cy="0.32" r="0.78"><stop offset="0" stop-color="${tint(base, light)}"/><stop offset="0.55" stop-color="${base}"/><stop offset="1" stop-color="${tint(base, dark)}"/></radialGradient>`;
}

/** Мягкая тень на полу (центр, полуоси — в единицах рисования). */
export function groundShadow(cx: number, cy: number, rx: number, ry = rx * 0.28): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#1e2a14" opacity="0.18"/>`;
}

/** Белый блик-«капля» на объёмном предмете. */
export function shine(cx: number, cy: number, rx: number, ry: number, rot = -30): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="#fff" opacity="0.55"/>`;
}

/** Отражённая по горизонтали копия рисунка той же ширины. */
export function mirror(a: Art): Art {
  const W = a.w * D;
  const svg = a.svg.replace(/(<svg[^>]*>)(<defs>[\s\S]*?<\/defs>)?([\s\S]*)<\/svg>$/, (_m, open, defs = '', body) => `${open}${defs}<g transform="translate(${W} 0) scale(-1 1)">${body}</g></svg>`);
  return { ...a, svg };
}

/** data:-URL для HTML-интерфейса (карточки предметов, выбор героя). */
export function artDataUrl(a: Art): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(a.svg);
}

/** Детерминированный «шум» (одинаковый при каждом запуске). */
export function hash(x: number, y: number, seed = 1): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
