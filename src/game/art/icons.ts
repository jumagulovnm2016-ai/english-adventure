// Картинки-значки для слов без предмета: действия, погода, части тела, «большой/маленький/длинный»,
// площадка. 16×16 единиц мира, на мягком круглом фоне — чтобы читались как карточка.
import { art, rgrad, vgrad, ST, ST2, INK, D, type Art } from './svg';
import { animal } from './animals';
import { ITEM_ART } from './items';

const SKIN = '#ffdcbf', HAIR = '#6b3f22', SHIRT = '#2fb5b0', PANTS = '#3f5bb5';
const icon = (body: string, defs = '', bg = '#fff3d6') => art(16, 16,
  `<circle cx="32" cy="32" r="30" fill="${bg}"/><g clip-path="url(#cc)">${body}</g><circle cx="32" cy="32" r="30" fill="none" stroke="${INK}" stroke-width="1.5" opacity="0.25"/>`,
  defs + '<clipPath id="cc"><circle cx="32" cy="32" r="30"/></clipPath>');

function limb(d: string, color: string, w = 6) {
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 3.5}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
/** Голова ребёнка с лицом. mouth: smile | open | o. */
function head(cx: number, cy: number, r = 9, mouth: 'smile' | 'open' | 'o' = 'smile') {
  const m = mouth === 'smile' ? `<path d="M${cx - 3} ${cy + 3.5} Q${cx} ${cy + 6.5} ${cx + 3} ${cy + 3.5}" fill="none" ${ST2}/>`
    : mouth === 'open' ? `<ellipse cx="${cx}" cy="${cy + 4.5}" rx="3" ry="3.2" fill="#c0392b" ${ST2}/>`
      : `<circle cx="${cx}" cy="${cy + 4.5}" r="2" fill="#c0392b" ${ST2}/>`;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${SKIN}" ${ST}/>
    <path d="M${cx - r} ${cy - 1} Q${cx - r} ${cy - r - 1} ${cx} ${cy - r - 1} Q${cx + r} ${cy - r - 1} ${cx + r} ${cy - 1} Q${cx + 3} ${cy - 6} ${cx - 2} ${cy - 4} Q${cx - 6} ${cy - 6} ${cx - r} ${cy - 1}Z" fill="${HAIR}" ${ST2}/>
    <circle cx="${cx - 3.4}" cy="${cy + 0.5}" r="1.5" fill="${INK}"/><circle cx="${cx + 3.4}" cy="${cy + 0.5}" r="1.5" fill="${INK}"/>${m}`;
}
const torso = (x: number, y: number, w: number, h: number, rot = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${SHIRT}" ${ST} transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"/>`;
const note = (x: number, y: number, c = '#9b6ce0') => `<path d="M${x} ${y} v-11 l7 -2 v10" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="${x - 2}" cy="${y}" rx="3" ry="2.3" fill="${c}"/><ellipse cx="${x + 5}" cy="${y - 1}" rx="3" ry="2.3" fill="${c}"/>`;
const speed = (x: number, y: number) => `<path d="M${x} ${y} h-10 M${x + 2} ${y + 7} h-12 M${x} ${y + 14} h-8" stroke="#9aa6b8" stroke-width="2.4" stroke-linecap="round"/>`;

// ---------- действия ----------
const ACTIONS: Record<string, () => Art> = {
  run: () => icon(`${speed(16, 24)}
    ${limb('M36 40 L44 46 L42 56', PANTS)}${limb('M32 40 L24 48 L16 46', PANTS)}
    ${limb('M30 28 L22 34 L18 30', SHIRT, 5)}
    ${torso(26, 24, 14, 18, 18)}
    ${limb('M38 28 L44 34 L50 30', SHIRT, 5)}
    ${head(38, 16)}`),
  jump: () => icon(`<ellipse cx="32" cy="58" rx="10" ry="2.6" fill="#1e2a14" opacity="0.2"/>
    <path d="M22 54 l-3 4 M42 54 l3 4 M32 54 v5" stroke="#9aa6b8" stroke-width="2.4" stroke-linecap="round"/>
    ${limb('M28 40 L22 46 L28 50', PANTS)}${limb('M36 40 L42 46 L36 50', PANTS)}
    ${torso(25, 26, 14, 16)}
    ${limb('M26 30 L16 20', SHIRT, 5)}${limb('M38 30 L48 20', SHIRT, 5)}
    ${head(32, 16, 9, 'open')}`),
  swim: () => icon(`<path d="M2 40 Q10 34 18 40 T34 40 T50 40 T66 40 V62 H2Z" fill="url(#w)"/>
    ${limb('M24 38 Q18 22 30 20', SKIN, 5)}
    ${head(36, 34, 9, 'open')}
    <path d="M4 46 Q12 41 20 46 T36 46 T52 46 T64 46" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>`,
  vgrad('w', '#4fb3ea', 0.2, -0.1)),
  fly: () => icon(`<path d="M8 20 Q14 22 18 18 M4 30 Q12 32 16 28" stroke="#9aa6b8" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M24 32 Q20 10 34 14 Q30 24 32 32Z" fill="url(#b)" ${ST}/>
    <path d="M38 32 Q46 12 56 20 Q46 26 42 34Z" fill="url(#b)" ${ST}/>
    <ellipse cx="34" cy="38" rx="14" ry="10" fill="url(#b)" ${ST}/>
    <circle cx="44" cy="34" r="2.4" fill="${INK}"/><path d="M48 37 l6 2 l-6 2Z" fill="#ffa53a" ${ST2}/>`,
  rgrad('b', '#3d8bf2', 0.35, -0.15), '#e3f3ff'),
  climb: () => icon(`<rect x="18" y="4" width="5" height="56" rx="2" fill="#c98a52" ${ST2}/><rect x="41" y="4" width="5" height="56" rx="2" fill="#c98a52" ${ST2}/>
    ${[12, 24, 36, 48].map((y) => `<rect x="20" y="${y}" width="24" height="4" rx="2" fill="#e8b47c" ${ST2}/>`).join('')}
    ${limb('M30 40 L26 50', PANTS)}${limb('M34 40 L40 36', PANTS)}
    ${torso(25, 24, 14, 17)}
    ${limb('M27 26 L24 14', SHIRT, 5)}${limb('M37 26 L40 22', SHIRT, 5)}
    ${head(32, 15)}`),
  sing: () => icon(`${note(48, 22)}${note(50, 44, '#ff6f91')}
    ${torso(18, 40, 20, 18)}
    ${head(28, 28, 13, 'open')}`),
  dance: () => icon(`${note(10, 22, '#ff6f91')}${note(52, 18)}
    ${limb('M30 42 L26 56', PANTS)}${limb('M34 42 L44 48 L48 42', PANTS)}
    ${torso(25, 26, 14, 17, -10)}
    ${limb('M27 30 L16 22 L14 14', SHIRT, 5)}${limb('M37 30 L46 34', SHIRT, 5)}
    ${head(30, 16, 9, 'open')}`),
  ride: () => {
    const bike = ITEM_ART.bike_red().svg;
    return icon(`<image x="4" y="14" width="56" height="56" href="data:image/svg+xml;base64,${btoa64(bike)}"/>
      ${limb('M30 36 L34 46 L40 50', PANTS)}
      ${torso(22, 20, 13, 17, 12)}
      ${limb('M30 24 L40 26 L44 24', SHIRT, 5)}
      ${head(28, 12)}`);
  },
};

// ---------- погода ----------
const sun = (cx: number, cy: number, r: number) => `<g stroke="#ff9a1f" stroke-width="4" stroke-linecap="round">${Array.from({ length: 8 }, (_, i) => { const a = (Math.PI / 4) * i; return `<path d="M${cx + Math.cos(a) * (r + 4)} ${cy + Math.sin(a) * (r + 4)} L${cx + Math.cos(a) * (r + 10)} ${cy + Math.sin(a) * (r + 10)}"/>`; }).join('')}</g>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#s)" ${ST}/>`;
const cloud = (cx: number, cy: number, fill = '#fff') => `<g fill="${fill}" ${ST}><circle cx="${cx - 12}" cy="${cy + 2}" r="9"/><circle cx="${cx}" cy="${cy - 5}" r="12"/><circle cx="${cx + 13}" cy="${cy + 2}" r="9"/></g>
  <g fill="${fill}"><circle cx="${cx - 12}" cy="${cy + 2}" r="7.5"/><circle cx="${cx}" cy="${cy - 5}" r="10.5"/><circle cx="${cx + 13}" cy="${cy + 2}" r="7.5"/><rect x="${cx - 12}" y="${cy - 2}" width="25" height="12"/></g>
  <path d="M${cx - 21} ${cy + 10} H${cx + 22}" ${ST}/>`;
const thermo = (x: number, fill: string, level: number) => `<rect x="${x - 4}" y="10" width="8" height="38" rx="4" fill="#fff" ${ST}/>
  <rect x="${x - 1.6}" y="${46 - level}" width="3.2" height="${level}" fill="${fill}"/>
  <circle cx="${x}" cy="50" r="7" fill="${fill}" ${ST}/>`;
const WEATHER: Record<string, () => Art> = {
  sunny: () => icon(sun(32, 32, 13) + `<circle cx="28" cy="31" r="1.6" fill="${INK}"/><circle cx="36" cy="31" r="1.6" fill="${INK}"/><path d="M28 36 Q32 39 36 36" fill="none" ${ST2}/>`, rgrad('s', '#ffd23f', 0.4, -0.05), '#e3f3ff'),
  rainy: () => icon(cloud(32, 26, '#dfe6f0') + [18, 30, 42, 24, 36].map((x, i) => `<path d="M${x} ${42 + (i > 2 ? 8 : 0)} q-2 4 0 6 q2 -2 0 -6Z" fill="#3d8bf2" ${ST2}/>`).join(''), '', '#e3f3ff'),
  hot: () => icon(sun(24, 26, 10) + thermo(46, '#e53935', 28) + `<path d="M10 52 q4 -4 0 -8 q-4 -4 0 -8 M20 56 q4 -4 0 -8" fill="none" stroke="#ff9a1f" stroke-width="2.4" stroke-linecap="round"/>`, rgrad('s', '#ffd23f', 0.4, -0.05), '#ffe9d6'),
  cold: () => icon(`<g stroke="#3d8bf2" stroke-width="3.4" stroke-linecap="round">${[0, 60, 120].map((a) => `<path d="M24 32 m${Math.cos((a * Math.PI) / 180) * -13} ${Math.sin((a * Math.PI) / 180) * -13} l${Math.cos((a * Math.PI) / 180) * 26} ${Math.sin((a * Math.PI) / 180) * 26}"/>`).join('')}</g>
    <circle cx="24" cy="32" r="3" fill="#fff" stroke="#3d8bf2" stroke-width="2"/>` + thermo(48, '#3d8bf2', 6), '', '#e3f3ff'),
};

// ---------- части тела: крупное лицо или зверь, нужная часть подсвечена ----------
const glow = (shape: string) => `<g fill="none" stroke="#ffd23f" stroke-width="7" opacity="0.85">${shape}</g><g fill="none" stroke="${INK}" stroke-width="1.6" stroke-dasharray="3 3">${shape}</g>`;
function bigFace(highlight: string) {
  return icon(`${highlight === 'ears' ? glow('<circle cx="11" cy="34" r="8"/><circle cx="53" cy="34" r="8"/>') : ''}
    <circle cx="11" cy="34" r="6" fill="${SKIN}" ${ST}/><circle cx="53" cy="34" r="6" fill="${SKIN}" ${ST}/>
    <circle cx="32" cy="34" r="21" fill="url(#k)" ${ST}/>
    <path d="M11 30 Q11 10 32 10 Q53 10 53 30 Q44 18 34 22 Q24 16 11 30Z" fill="${HAIR}" ${ST}/>
    ${highlight === 'head' ? glow('<circle cx="32" cy="32" r="27"/>') : ''}
    <ellipse cx="24" cy="32" rx="3" ry="4" fill="${INK}"/><ellipse cx="40" cy="32" rx="3" ry="4" fill="${INK}"/>
    ${highlight === 'eyes' ? glow('<ellipse cx="24" cy="32" rx="7" ry="7"/><ellipse cx="40" cy="32" rx="7" ry="7"/>') : ''}
    <path d="M30 37 Q32 41 34 37" fill="none" ${ST2}/>
    ${highlight === 'nose' ? glow('<circle cx="32" cy="38" r="6"/>') : ''}
    <path d="M25 45 Q32 51 39 45" fill="#c0392b" ${ST2}/>
    ${highlight === 'mouth' ? glow('<ellipse cx="32" cy="47" rx="10" ry="6"/>') : ''}`, rgrad('k', SKIN, 0.25, -0.08));
}
const BODY: Record<string, () => Art> = {
  head: () => bigFace('head'), eyes: () => bigFace('eyes'), ears: () => bigFace('ears'), nose: () => bigFace('nose'), mouth: () => bigFace('mouth'),
  legs: () => icon(`${limb('M28 38 L26 56', PANTS)}${limb('M36 38 L38 56', PANTS)}
    ${torso(24, 22, 16, 18)}${limb('M25 26 L18 38', SHIRT, 5)}${limb('M39 26 L46 38', SHIRT, 5)}${head(32, 13)}
    ${glow('<rect x="19" y="38" width="26" height="22" rx="8"/>')}`),
  tail: () => icon(`<image x="0" y="0" width="64" height="64" href="data:image/svg+xml;base64,${btoa64(animal('monkey').svg)}"/>${glow('<path d="M44 52 Q60 50 58 36 Q56 28 50 32"/>')}`),
  neck: () => icon(`<image x="0" y="0" width="64" height="64" href="data:image/svg+xml;base64,${btoa64(animal('giraffe').svg)}"/>${glow('<rect x="17" y="14" width="18" height="34" rx="8"/>')}`),
};

// ---------- описание ----------
const arrows = (out: boolean) => out
  ? `<path d="M6 32 h8 M10 28 l-4 4 l4 4 M58 32 h-8 M54 28 l4 4 l-4 4" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
  : `<path d="M4 32 h12 M12 28 l4 4 l-4 4 M60 32 h-12 M52 28 l-4 4 l4 4" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
const DESCRIBE: Record<string, () => Art> = {
  big: () => icon(`<image x="8" y="6" width="50" height="50" href="data:image/svg+xml;base64,${btoa64(animal('elephant').svg)}"/>${arrows(true)}`),
  small: () => icon(`<image x="20" y="20" width="24" height="24" href="data:image/svg+xml;base64,${btoa64(ITEM_ART.rabbit_white().svg)}"/>${arrows(false)}`),
  long: () => icon(`<path d="M6 40 Q16 28 26 40 T46 40 T58 36" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
    <path d="M6 40 Q16 28 26 40 T46 40 T58 36" fill="none" stroke="#5cc24a" stroke-width="6" stroke-linecap="round"/>
    <circle cx="58" cy="35" r="5" fill="#5cc24a" ${ST2}/><circle cx="59" cy="34" r="1.3" fill="${INK}"/>
    <path d="M6 54 H58 M10 50 l-4 4 l4 4 M54 50 l4 4 l-4 4" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`),
};

// ---------- площадка (то же, что на карте, но значком) ----------
export function swingArt(w = 32, h = 28): Art {
  const W = w * D;
  return art(w, h, `<path d="M8 ${h * D - 4} L24 6 L${W - 24} 6 L${W - 8} ${h * D - 4}" fill="none" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>
    <path d="M8 ${h * D - 4} L24 6 L${W - 24} 6 L${W - 8} ${h * D - 4}" fill="none" stroke="#e53935" stroke-width="5" stroke-linejoin="round"/>
    ${[W * 0.33, W * 0.67].map((x) => `<path d="M${x - 9} 8 V70 M${x + 9} 8 V70" stroke="#6c6c7c" stroke-width="2"/><rect x="${x - 13}" y="68" width="26" height="7" rx="3" fill="#ffd23f" ${ST2}/>`).join('')}`);
}
export function slideArt(w = 32, h = 30): Art {
  const H = h * D;
  return art(w, h, `<rect x="16" y="14" width="6" height="${H - 18}" fill="#9aa6b8" ${ST2}/><rect x="42" y="14" width="6" height="${H - 18}" fill="#9aa6b8" ${ST2}/>
    ${[30, 50, 70, 90].map((y) => `<rect x="16" y="${y}" width="32" height="5" rx="2" fill="#c9ced8" ${ST2}/>`).join('')}
    <rect x="12" y="8" width="40" height="10" rx="4" fill="#ffd23f" ${ST}/>
    <path d="M48 12 Q80 20 92 ${H - 30} Q100 ${H - 8} ${w * D - 4} ${H - 6} L${w * D - 4} ${H - 18} Q108 ${H - 22} 104 ${H - 40} Q92 10 52 2Z" fill="url(#sl)" ${ST}/>`,
  vgrad('sl', '#3d8bf2', 0.3, -0.1));
}
const PARK: Record<string, () => Art> = {
  swing: () => fitIcon(swingArt(), '#e3f3ff'),
  slide: () => fitIcon(slideArt(), '#e3f3ff'),
  tree: () => icon(`<path d="M28 60 Q30 46 28 40 L36 40 Q34 46 36 60Z" fill="#9a6034" ${ST}/>
    <g fill="url(#l)" ${ST}><circle cx="22" cy="32" r="12"/><circle cx="42" cy="32" r="12"/><circle cx="32" cy="20" r="15"/></g>
    <g fill="url(#l)"><circle cx="22" cy="32" r="10.5"/><circle cx="42" cy="32" r="10.5"/><circle cx="32" cy="20" r="13.5"/></g>`, rgrad('l', '#5fc04a', 0.3, -0.2)),
  flower: () => icon(`<path d="M32 36 V60" stroke="#3f8f2f" stroke-width="4"/><path d="M32 50 Q22 44 18 50 Q24 56 32 52Z" fill="#5fbf45" ${ST2}/>
    <g fill="#ff6f91" ${ST2}>${[0, 72, 144, 216, 288].map((a) => `<circle cx="${32 + Math.cos((a * Math.PI) / 180) * 10}" cy="${24 + Math.sin((a * Math.PI) / 180) * 10}" r="8"/>`).join('')}</g>
    <circle cx="32" cy="24" r="6" fill="#ffd23f" ${ST2}/>`),
};

/** Вписать произвольный рисунок в квадратный значок 16×16. */
function fitIcon(a: Art, bg: string): Art {
  return icon(`<image x="6" y="6" width="52" height="52" href="data:image/svg+xml;base64,${btoa64(a.svg)}" preserveAspectRatio="xMidYMid meet"/>`, '', bg);
}

/** base64 и в браузере, и в Node (для превью). */
function btoa64(s: string): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(s, 'utf-8').toString('base64');
  return btoa(unescape(encodeURIComponent(s)));
}

export const ICON_ART: Record<string, () => Art> = { ...ACTIONS, ...WEATHER, ...BODY, ...DESCRIBE, ...PARK };
