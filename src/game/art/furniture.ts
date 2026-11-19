// Мебель, здания, деревья. Мировые размеры прежние (ширина = клетки × 16), холст рисования ×4.
// Вид «сверху-спереди»: видна верхняя плоскость (светлее) и передняя грань (темнее).
import { art, groundShadow, rgrad, shine, tint, vgrad, ST, ST2, INK, D, type Art } from './svg';
import { swingArt, slideArt } from './icons';
import { ANIMALS, animal, type AnimalKind } from './animals';

const WOOD = '#c98a52', WOOD_D = '#9a6034', WOOD_L = '#e8b47c';

/** Плоский «ящик»: верх (top) и перед (front). Координаты в единицах рисования. */
function box(x: number, y: number, w: number, topH: number, frontH: number, top: string, front: string, r = 6) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${topH + frontH}" rx="${r}" fill="${front}" ${ST}/>
    <rect x="${x}" y="${y}" width="${w}" height="${topH}" rx="${r}" fill="${top}" ${ST}/>`;
}

function rug(): Art {
  const W = 64 * D, H = 48 * D;
  const dia = (cx: number) => `<path d="M${cx} ${H / 2 - 26} L${cx + 26} ${H / 2} L${cx} ${H / 2 + 26} L${cx - 26} ${H / 2}Z" fill="#ffd166" ${ST2}/>`;
  return art(64, 48, `<rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="26" fill="url(#c)" ${ST}/>
    <rect x="26" y="26" width="${W - 52}" height="${H - 52}" rx="14" fill="none" stroke="#fff3e0" stroke-width="5" stroke-dasharray="2 10" stroke-linecap="round"/>
    ${dia(W / 2 - 64)}${dia(W / 2)}${dia(W / 2 + 64)}`, vgrad('c', '#e2574c', 0.15, -0.1));
}

function table(): Art {
  return art(32, 26, `${groundShadow(64, 98, 54, 7)}
    <rect x="14" y="44" width="11" height="54" rx="4" fill="${WOOD_D}" ${ST}/><rect x="103" y="44" width="11" height="54" rx="4" fill="${WOOD_D}" ${ST}/>
    ${box(4, 6, 120, 44, 12, 'url(#t)', WOOD_D, 8)}
    <path d="M16 16 H70" stroke="#fff" stroke-width="3" opacity="0.35" stroke-linecap="round"/>`, vgrad('t', WOOD_L, 0.15, -0.08));
}

function counter(): Art {
  const W = 48 * D;
  const doors = [0, 1, 2].map((i) => `<rect x="${10 + i * 60}" y="58" width="52" height="46" rx="5" fill="#a9d6f5" ${ST2}/><circle cx="${i % 2 ? 18 + i * 60 : 54 + i * 60}" cy="80" r="3" fill="${INK}"/>`).join('');
  return art(48, 28, `<rect x="2" y="40" width="${W - 4}" height="70" rx="6" fill="url(#f)" ${ST}/>${doors}
    <rect x="2" y="4" width="${W - 4}" height="44" rx="6" fill="#eef1f6" ${ST}/>
    <rect x="18" y="12" width="44" height="24" rx="8" fill="#c5d3e3" ${ST2}/>
    <path d="M40 12 V4 Q40 -2 48 0" fill="none" stroke="#9aa6b8" stroke-width="4" stroke-linecap="round"/>
    <circle cx="140" cy="24" r="10" fill="#4a4f5c" ${ST2}/><circle cx="170" cy="24" r="10" fill="#4a4f5c" ${ST2}/>`, vgrad('f', '#7fc0ef', 0.2, -0.1));
}

function fridge(): Art {
  return art(16, 30, `${groundShadow(32, 116, 28, 5)}
    <rect x="4" y="4" width="56" height="112" rx="10" fill="url(#c)" ${ST}/>
    <path d="M4 42 H60" ${ST}/>
    <rect x="48" y="14" width="5" height="20" rx="2.5" fill="#9aa6b8"/><rect x="48" y="52" width="5" height="28" rx="2.5" fill="#9aa6b8"/>
    <circle cx="20" cy="60" r="5" fill="#ff6f91" ${ST2}/><rect x="14" y="20" width="12" height="9" rx="2" fill="#ffd23f" ${ST2}/>
    <rect x="10" y="10" width="6" height="26" rx="3" fill="#fff" opacity="0.7"/>`, vgrad('c', '#f4f7fb', 0.3, -0.1));
}

function sofa(): Art {
  const W = 48 * D;
  return art(48, 28, `${groundShadow(W / 2, 106, 90, 7)}
    <rect x="22" y="6" width="${W - 44}" height="56" rx="18" fill="url(#c)" ${ST}/>
    <rect x="24" y="48" width="${W - 48}" height="44" rx="12" fill="${tint('#7d5cd6', 0.1)}" ${ST}/>
    <path d="M${W / 2} 52 V88" ${ST2}/>
    <rect x="4" y="34" width="34" height="68" rx="14" fill="url(#c)" ${ST}/><rect x="${W - 38}" y="34" width="34" height="68" rx="14" fill="url(#c)" ${ST}/>
    <rect x="14" y="98" width="10" height="10" fill="${WOOD_D}" ${ST2}/><rect x="${W - 24}" y="98" width="10" height="10" fill="${WOOD_D}" ${ST2}/>
    <rect x="44" y="16" width="40" height="5" rx="2.5" fill="#fff" opacity="0.3"/>`, vgrad('c', '#7d5cd6', 0.22, -0.12));
}

function bookshelf(): Art {
  const colors = ['#e53935', '#2f7de1', '#ffcc1f', '#3dae4a', '#ff8a3d', '#8e5cd6', '#2fb5b0'];
  const shelfRow = (y: number, seed: number) => {
    let x = 18, s = '';
    for (let i = 0; i < 7 && x < 104; i++) {
      const w = 9 + ((i * 7 + seed) % 4) * 2, h = 26 + ((i * 5 + seed) % 3) * 4;
      const tilt = i === 4 ? 'transform="rotate(-10 ' + (x + w / 2) + ' ' + (y + 34) + ')"' : '';
      s += `<rect x="${x}" y="${y + 34 - h}" width="${w}" height="${h}" rx="2" fill="${colors[(i + seed) % colors.length]}" ${ST2} ${tilt}/>`;
      x += w + 2;
    }
    return s;
  };
  return art(32, 34, `${groundShadow(64, 132, 56, 6)}
    <rect x="6" y="4" width="116" height="128" rx="8" fill="url(#c)" ${ST}/>
    <rect x="16" y="14" width="96" height="108" rx="4" fill="${WOOD_D}"/>
    ${shelfRow(14, 0)}<rect x="12" y="48" width="104" height="8" fill="${WOOD}" ${ST2}/>
    ${shelfRow(56, 3)}<rect x="12" y="90" width="104" height="8" fill="${WOOD}" ${ST2}/>
    ${shelfRow(90, 5)}`, vgrad('c', WOOD, 0.15, -0.1));
}

function plant(): Art {
  return art(16, 26, `${groundShadow(32, 100, 20, 5)}
    <path d="M32 66 Q14 44 8 52 Q12 30 30 56 Q22 22 32 14 Q42 22 34 56 Q52 30 56 52 Q50 44 32 66Z" fill="url(#l)" ${ST}/>
    <path d="M32 60 Q30 40 32 22" fill="none" stroke="#2f7a32" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M14 66 L50 66 L44 100 L20 100Z" fill="url(#p)" ${ST}/>
    <rect x="12" y="62" width="40" height="10" rx="4" fill="${tint('#e07a3f', 0.1)}" ${ST}/>`,
  vgrad('l', '#5fc04a', 0.25, -0.2) + vgrad('p', '#e07a3f', 0.15, -0.15));
}

function tv(): Art {
  return art(32, 26, `${groundShadow(64, 100, 56, 6)}
    ${box(6, 60, 116, 12, 28, WOOD_L, WOOD_D, 6)}
    <rect x="18" y="4" width="92" height="58" rx="8" fill="#2b2f3a" ${ST}/>
    <rect x="25" y="10" width="78" height="44" rx="5" fill="url(#s)"/>
    <path d="M32 18 L48 14 M32 26 L60 18" stroke="#fff" stroke-width="3" opacity="0.4" stroke-linecap="round"/>
    <circle cx="44" cy="82" r="3" fill="${INK}"/><circle cx="84" cy="82" r="3" fill="${INK}"/>`,
  vgrad('s', '#3d8bf2', 0.35, -0.3));
}

/** Фасад здания: ширина в клетках, цвет стен и крыши; дверь по центру внизу (12 × 22 ед. мира). */
function building(tw: number, wall: string, roof: string, style: 'house' | 'shop' | 'school'): Art {
  const W = tw * 16 * D, H = 80 * D;
  const roofBottom = 92, doorW = 12 * D, doorH = 22 * D, doorX = W / 2 - doorW / 2;
  const win = (x: number) => `<rect x="${x}" y="${roofBottom + 40}" width="60" height="56" rx="10" fill="url(#g)" ${ST}/>
    <path d="M${x + 30} ${roofBottom + 40} V${roofBottom + 96} M${x} ${roofBottom + 68} H${x + 60}" ${ST2}/>
    <path d="M${x + 8} ${roofBottom + 50} l12 0 M${x + 8} ${roofBottom + 58} l6 0" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity="0.8"/>
    <rect x="${x - 6}" y="${roofBottom + 94}" width="72" height="8" rx="3" fill="${tint(wall, -0.25)}" ${ST2}/>`;
  const slots = tw >= 7 ? 4 : 3;
  let wins = '';
  for (let i = 0; i < slots; i++) {
    const cx = ((i + 0.5) / slots) * W;
    if (Math.abs(cx - W / 2) < doorW) continue;
    wins += win(cx - 30);
  }
  // крыша: дом — треугольная черепица, магазин — плоская с полосатым навесом, школа — с башенкой и часами
  let roofSvg = '';
  if (style === 'shop') {
    const stripes = Array.from({ length: Math.ceil(W / 32) }, (_, i) => `<path d="M${i * 32 + 6} ${roofBottom - 8} h16 v26 q-8 10 -16 0z" fill="${i % 2 ? '#fff' : '#e53935'}"/>`).join('');
    roofSvg = `<rect x="6" y="24" width="${W - 12}" height="${roofBottom - 28}" rx="8" fill="url(#r)" ${ST}/>
      <rect x="0" y="${roofBottom - 10}" width="${W}" height="12" rx="4" fill="${tint(roof, -0.25)}" ${ST}/>
      <g>${stripes}</g><path d="M6 ${roofBottom + 8} H${W - 6}" ${ST2}/>`;
  } else {
    roofSvg = `<path d="M-2 ${roofBottom} L${W * 0.16} 6 L${W * 0.84} 6 L${W + 2} ${roofBottom}Z" fill="url(#r)" ${ST}/>
      ${[30, 54, 78].map((y) => `<path d="M${W * 0.16 * (1 - y / roofBottom) + 6} ${y} H${W - W * 0.16 * (1 - y / roofBottom) - 6}" stroke="${tint(roof, -0.25)}" stroke-width="3" stroke-linecap="round"/>`).join('')}`;
    if (style === 'school') roofSvg += `<rect x="${W / 2 - 34}" y="-2" width="68" height="40" rx="8" fill="${tint(wall, 0.2)}" ${ST}/>
      <circle cx="${W / 2}" cy="18" r="13" fill="#fffdf4" ${ST2}/><path d="M${W / 2} 18 V10 M${W / 2} 18 H${W / 2 + 7}" ${ST2}/>`;
    else roofSvg += `<rect x="${W * 0.7}" y="2" width="30" height="40" rx="4" fill="#b55a3c" ${ST}/>`;
  }
  const bricks = style === 'school'
    ? Array.from({ length: 6 }, (_, r) => Array.from({ length: Math.ceil(W / 48) + 1 }, (_, c) => c * 48 + (r % 2) * 24 + 10).filter((bx) => bx >= 16 && bx + 30 <= W - 16).map((bx) => `<rect x="${bx}" y="${roofBottom + 14 + r * 36}" width="30" height="8" rx="4" fill="${tint(wall, -0.12)}"/>`).join('')).join('')
    : '';
  return art(tw * 16, 80, `${groundShadow(W / 2, H - 2, W / 2 - 4, 10)}
    <rect x="10" y="${roofBottom - 8}" width="${W - 20}" height="${H - roofBottom + 4}" rx="6" fill="url(#w)" ${ST}/>
    ${bricks}${wins}
    <rect x="${doorX - 8}" y="${H - doorH - 8}" width="${doorW + 16}" height="${doorH + 8}" rx="10" fill="${tint(wall, -0.2)}" ${ST}/>
    <rect x="${doorX}" y="${H - doorH}" width="${doorW}" height="${doorH}" rx="8" fill="url(#d)" ${ST}/>
    <circle cx="${doorX + doorW - 10}" cy="${H - doorH / 2}" r="4" fill="#ffd23f" ${ST2}/>
    <rect x="${doorX + 8}" y="${H - doorH + 10}" width="${doorW - 16}" height="22" rx="6" fill="#a9d6f5" ${ST2}/>
    ${roofSvg}`,
  vgrad('w', wall, 0.12, -0.08) + vgrad('r', roof, 0.2, -0.12) + vgrad('d', '#9a5e36', 0.15, -0.15) + vgrad('g', '#9fdcff', 0.3, -0.05));
}

function tree(): Art {
  return art(32, 44, `${groundShadow(64, 168, 46, 9)}
    <path d="M54 170 Q56 130 50 108 L78 108 Q72 130 74 170Z" fill="url(#t)" ${ST}/>
    <g fill="url(#l)" ${ST}>
      <circle cx="40" cy="84" r="32"/><circle cx="88" cy="84" r="32"/><circle cx="64" cy="48" r="40"/><circle cx="64" cy="96" r="30"/>
    </g>
    <g fill="url(#l)"><circle cx="40" cy="84" r="29.5"/><circle cx="88" cy="84" r="29.5"/><circle cx="64" cy="48" r="37.5"/><circle cx="64" cy="96" r="27.5"/></g>
    ${shine(46, 30, 9, 14, 40)}
    <circle cx="86" cy="60" r="3" fill="#2f7a32" opacity="0.4"/><circle cx="40" cy="100" r="3" fill="#2f7a32" opacity="0.4"/>`,
  rgrad('l', '#5fc04a', 0.3, -0.25) + vgrad('t', '#9a6034', 0.15, -0.15));
}

function bench(): Art {
  return art(32, 22, `${groundShadow(64, 84, 58, 6)}
    <rect x="16" y="50" width="9" height="34" fill="#6c6c7c" ${ST2}/><rect x="103" y="50" width="9" height="34" fill="#6c6c7c" ${ST2}/>
    <rect x="6" y="8" width="116" height="16" rx="5" fill="url(#c)" ${ST}/>
    <rect x="6" y="28" width="116" height="16" rx="5" fill="url(#c)" ${ST}/>
    <rect x="4" y="46" width="120" height="14" rx="5" fill="${WOOD_D}" ${ST}/>`, vgrad('c', WOOD, 0.2, -0.1));
}

function flowers(): Art {
  const f = (x: number, y: number, c: string) => `<path d="M${x} ${y + 6} v14" stroke="#3f8f2f" stroke-width="2.5"/>
    <g fill="${c}" ${ST2}>${[0, 72, 144, 216, 288].map((a) => `<circle cx="${x + Math.cos((a * Math.PI) / 180) * 5}" cy="${y + Math.sin((a * Math.PI) / 180) * 5}" r="4.2"/>`).join('')}</g>
    <circle cx="${x}" cy="${y}" r="3.4" fill="#ffd23f" ${ST2}/>`;
  return art(16, 16, `<ellipse cx="32" cy="46" rx="26" ry="12" fill="#4fae3e" opacity="0.6"/>
    ${f(18, 28, '#ff6f91')}${f(44, 22, '#fff')}${f(34, 44, '#7cc7ff')}${f(12, 48, '#ffd23f')}`);
}

function shelf(): Art {
  const goods = (y: number, kind: number) => Array.from({ length: 6 }, (_, i) => {
    const x = 18 + i * 28;
    if (kind === 0) return `<circle cx="${x + 9}" cy="${y + 22}" r="9" fill="${['#e53935', '#ff9a1f', '#5fbf45'][i % 3]}" ${ST2}/>`;
    return `<rect x="${x}" y="${y + 6}" width="20" height="26" rx="3" fill="${['#2f7de1', '#ffcc1f', '#fff', '#e53935'][i % 4]}" ${ST2}/>`;
  }).join('');
  return art(48, 30, `${groundShadow(96, 116, 88, 6)}
    <rect x="6" y="4" width="180" height="112" rx="8" fill="url(#c)" ${ST}/>
    <rect x="14" y="12" width="164" height="96" rx="4" fill="${WOOD_D}"/>
    ${goods(12, 0)}<rect x="10" y="44" width="172" height="8" fill="${WOOD}" ${ST2}/>
    ${goods(52, 1)}<rect x="10" y="86" width="172" height="8" fill="${WOOD}" ${ST2}/>`, vgrad('c', WOOD, 0.15, -0.1));
}

function shopCounter(): Art {
  return art(48, 26, `${groundShadow(96, 100, 90, 6)}
    ${box(4, 6, 184, 34, 58, '#f4f7fb', 'url(#f)', 8)}
    <rect x="14" y="50" width="164" height="8" rx="4" fill="#fff" opacity="0.5"/>
    <rect x="120" y="0" width="44" height="26" rx="5" fill="#4a4f5c" ${ST2}/><rect x="126" y="4" width="32" height="10" rx="2" fill="#9fe27a"/>`,
  vgrad('f', '#ffb347', 0.15, -0.15));
}

function blackboard(): Art {
  return art(64, 16, `<rect x="4" y="2" width="248" height="58" rx="6" fill="#8a5a33" ${ST}/>
    <rect x="12" y="8" width="232" height="44" rx="3" fill="url(#c)"/>
    <text x="30" y="40" font-family="'Comic Sans MS', 'Segoe Print', cursive" font-size="24" fill="#f4f6ef">ABC</text>
    <path d="M120 30 h20 M150 22 v18 M162 22 v18 M174 22 v18" stroke="#f4f6ef" stroke-width="3" stroke-linecap="round"/>
    <path d="M196 34 l14 -8 l14 8" fill="none" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/>
    <rect x="200" y="54" width="20" height="5" rx="2" fill="#fff" ${ST2}/>`, vgrad('c', '#2f6b52', 0.1, -0.1));
}

function teacherDesk(): Art {
  return art(32, 24, `${groundShadow(64, 92, 58, 6)}
    ${box(4, 6, 120, 34, 50, 'url(#t)', WOOD_D, 8)}
    <rect x="20" y="52" width="88" height="30" rx="5" fill="${WOOD}" ${ST2}/><circle cx="64" cy="66" r="3" fill="${INK}"/>
    <rect x="80" y="10" width="30" height="20" rx="3" fill="#2f7de1" ${ST2}/><rect x="84" y="6" width="24" height="18" rx="3" fill="#e53935" ${ST2}/>
    <circle cx="26" cy="22" r="9" fill="#e53935" ${ST2}/><path d="M26 13 q2 -5 6 -6" fill="none" stroke="#6b4426" stroke-width="2.4"/>`, vgrad('t', WOOD_L, 0.15, -0.08));
}

function desk(): Art {
  return art(32, 22, `${groundShadow(64, 86, 56, 6)}
    <rect x="12" y="40" width="9" height="46" rx="3" fill="#6c6c7c" ${ST2}/><rect x="107" y="40" width="9" height="46" rx="3" fill="#6c6c7c" ${ST2}/>
    ${box(4, 4, 120, 32, 14, 'url(#t)', WOOD_D, 7)}
    <path d="M18 12 H60" stroke="#fff" stroke-width="3" opacity="0.35" stroke-linecap="round"/>`, vgrad('t', WOOD_L, 0.15, -0.08));
}

// ---------- юнит 2: площадка и зоопарк ----------
function iceCreamCart(): Art {
  return art(32, 34, `${groundShadow(64, 132, 56, 7)}
    <circle cx="30" cy="118" r="12" fill="#4a4f5c" ${ST}/><circle cx="100" cy="118" r="12" fill="#4a4f5c" ${ST}/>
    <rect x="12" y="62" width="104" height="52" rx="10" fill="url(#c)" ${ST}/>
    <rect x="12" y="62" width="104" height="12" rx="6" fill="#fff" ${ST2}/>
    <circle cx="44" cy="90" r="10" fill="#ff9ec4" ${ST2}/><path d="M36 96 L44 110 L52 96Z" fill="#f2b968" ${ST2}/>
    <circle cx="80" cy="90" r="10" fill="#8a5a33" ${ST2}/><path d="M72 96 L80 110 L88 96Z" fill="#f2b968" ${ST2}/>
    <rect x="61" y="18" width="5" height="46" fill="#9aa6b8" ${ST2}/>
    <path d="M10 26 Q64 -8 118 26 Z" fill="url(#u)" ${ST}/>
    ${[0, 1, 2, 3].map((i) => `<path d="M${10 + i * 27} 26 Q${23 + i * 27} ${i === 0 || i === 3 ? 10 : 2} ${37 + i * 27} 26" fill="${i % 2 ? '#fff' : '#ff6f91'}" opacity="0.9"/>`).join('')}
    <path d="M10 26 H118" ${ST}/>`, vgrad('c', '#7fd0f0', 0.25, -0.1) + vgrad('u', '#ff6f91', 0.2, -0.1));
}

function sandbox(): Art {
  return art(32, 22, `<rect x="4" y="8" width="120" height="76" rx="10" fill="#c98a52" ${ST}/>
    <rect x="14" y="16" width="100" height="60" rx="6" fill="url(#s)"/>
    <path d="M30 50 q8 -10 16 0 M70 40 q6 -8 12 0" fill="none" stroke="#d9b06a" stroke-width="3" stroke-linecap="round"/>
    <path d="M86 58 L96 44 L100 46 L92 60Z" fill="#e53935" ${ST2}/><path d="M40 62 h14 l-3 10 h-8Z" fill="#3d8bf2" ${ST2}/>`, vgrad('s', '#f6dd9c', 0.15, -0.08));
}

/** Ограда вольера: столбики и перекладины по краю, внутри пусто — там пол карты и зверь. */
function pen(tw: number, th: number): Art {
  const W = tw * 16 * D, H = th * 16 * D;
  const rail = (x1: number, y1: number, x2: number, y2: number) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${x1} ${y1} L${x2} ${y2}" stroke="#c98a52" stroke-width="4.5" stroke-linecap="round"/>`;
  const posts: string[] = [];
  for (let x = 6; x <= W - 6; x += 32) posts.push(`<rect x="${x - 4}" y="${H - 34}" width="8" height="30" rx="3" fill="#9a6034" ${ST2}/>`, `<rect x="${x - 4}" y="2" width="8" height="24" rx="3" fill="#9a6034" ${ST2}/>`);
  for (let y = 10; y <= H - 20; y += 32) posts.push(`<rect x="2" y="${y}" width="8" height="24" rx="3" fill="#9a6034" ${ST2}/>`, `<rect x="${W - 10}" y="${y}" width="8" height="24" rx="3" fill="#9a6034" ${ST2}/>`);
  return art(tw * 16, th * 16, `${rail(6, 10, W - 6, 10)}${rail(6, 20, W - 6, 20)}${rail(6, 10, 6, H - 12)}${rail(W - 6, 10, W - 6, H - 12)}${posts.join('')}${rail(6, H - 26, W - 6, H - 26)}${rail(6, H - 12, W - 6, H - 12)}`);
}

export const FURNITURE_ART = {
  rug, table, counter, fridge, sofa, bookshelf, plant, tv,
  house: () => building(6, '#fff1d6', '#ef6a4a', 'house'),
  shop_building: () => building(6, '#cfe9ff', '#5aa9e6', 'shop'),
  school_building: () => building(7, '#f2a77f', '#8a8fa3', 'school'),
  tree, bench, flowers, shelf, shop_counter: shopCounter, blackboard, teacher_desk: teacherDesk, desk,
  swing: () => swingArt(), slide: () => slideArt(), ice_cream_cart: iceCreamCart, sandbox,
  pen_5x4: () => pen(5, 4), pen_6x4: () => pen(6, 4), pen_4x4: () => pen(4, 4),
  ...Object.fromEntries(ANIMALS.map((k) => [`zoo_${k}`, () => animal(k, k === 'elephant' || k === 'giraffe' || k === 'hippo' ? 34 : 26)])) as Record<`zoo_${AnimalKind}`, () => Art>,
};
export type FurnitureKey = keyof typeof FURNITURE_ART;
