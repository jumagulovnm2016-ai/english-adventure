// Персонажи в мультяшном стиле: крупная голова, выразительные глаза, контур.
// 4 направления × 3 кадра (стоит, шаг левой, шаг правой); «влево» — зеркало «вправо».
// Ребёнок 20×26 единиц мира, взрослый 20×32. Начало координат спрайта — ноги (низ по центру).
import { art, groundShadow, mirror, tint, vgrad, rgrad, ST, ST2, INK, type Art } from './svg';

export type Dir = 'down' | 'up' | 'right' | 'left';
export const CHAR_W = 20;
export const CHAR_H = 26;
export const ADULT_H = 32;

export type HairStyle = 'short' | 'long' | 'pony' | 'bun' | 'curly' | 'spiky';
export interface Look {
  skin: string; hair: string; shirt: string; pants: string; shoes: string;
  style: HairStyle;
  adult?: boolean; glasses?: boolean; beard?: boolean; skirt?: boolean;
}

const SKIN = { light: '#ffdcbf', fair: '#f6c9a2', tan: '#d99a6c', brown: '#a8693f', dark: '#7a4a2c' };

export const LOOKS: Record<string, Look> = {
  // герои на выбор
  kid_1: { skin: SKIN.light, hair: '#6b3f22', shirt: '#2fb5b0', pants: '#3f5bb5', shoes: '#f4f4f8', style: 'short' },
  kid_2: { skin: SKIN.fair, hair: '#3a2418', shirt: '#9b6ce0', pants: '#3f5bb5', shoes: '#ff6f91', style: 'long', skirt: true },
  kid_3: { skin: SKIN.brown, hair: '#1f1712', shirt: '#ff8a3d', pants: '#4a4f5c', shoes: '#f4f4f8', style: 'curly' },
  kid_4: { skin: SKIN.tan, hair: '#1f1712', shirt: '#ffcc1f', pants: '#2f7de1', shoes: '#e53935', style: 'pony' },
  kid_5: { skin: SKIN.light, hair: '#e07a2f', shirt: '#3dae4a', pants: '#2b3460', shoes: '#4a4f5c', style: 'spiky' },
  kid_6: { skin: SKIN.dark, hair: '#2a1a12', shirt: '#e53935', pants: '#4a4f5c', shoes: '#ffcc1f', style: 'bun', skirt: true },
  // жители городка
  ben: { skin: SKIN.tan, hair: '#2a1a12', shirt: '#e53935', pants: '#3f5bb5', shoes: '#f4f4f8', style: 'spiky' },
  tom: { skin: SKIN.light, hair: '#f2c94c', shirt: '#2f7de1', pants: '#4a4f5c', shoes: '#e53935', style: 'short' },
  amy: { skin: SKIN.light, hair: '#f2c94c', shirt: '#3dae4a', pants: '#ff8fb1', shoes: '#ffffff', style: 'pony', skirt: true },
  mrs_brown: { skin: SKIN.fair, hair: '#d9d9e3', shirt: '#9b6ce0', pants: '#5a4a7a', shoes: '#4a3a2a', style: 'bun', adult: true, glasses: true, skirt: true },
  mr_green: { skin: SKIN.fair, hair: '#6b3f22', shirt: '#3dae4a', pants: '#3a3f50', shoes: '#4a3a2a', style: 'short', adult: true, beard: true },
  ms_lee: { skin: SKIN.light, hair: '#1f1712', shirt: '#2fb5b0', pants: '#2b3460', shoes: '#4a3a2a', style: 'long', adult: true, glasses: true },
  mum: { skin: SKIN.light, hair: '#c45a2a', shirt: '#e53935', pants: '#7d5cd6', shoes: '#4a3a2a', style: 'long', adult: true, skirt: true },
  dad: { skin: SKIN.tan, hair: '#2a1a12', shirt: '#2f7de1', pants: '#4a4f5c', shoes: '#4a3a2a', style: 'short', adult: true },
  // юнит 2: площадка и зоопарк
  mia: { skin: SKIN.fair, hair: '#a0522d', shirt: '#ff8a3d', pants: '#2f7de1', shoes: '#ffffff', style: 'pony' },
  sam: { skin: SKIN.brown, hair: '#1f1712', shirt: '#ff6f91', pants: '#f4f4f8', shoes: '#4a3a2a', style: 'curly', adult: true },
  kate: { skin: SKIN.light, hair: '#e0a040', shirt: '#7a8a3a', pants: '#5a4a2a', shoes: '#4a3a2a', style: 'pony', adult: true },
  leo: { skin: SKIN.tan, hair: '#2a1a12', shirt: '#2fb5b0', pants: '#4a4f5c', shoes: '#ffcc1f', style: 'curly' },
};
export const ADULTS = new Set(Object.entries(LOOKS).filter(([, l]) => l.adult).map(([k]) => k));
export const PLAYER_LOOKS = ['kid_1', 'kid_2', 'kid_3', 'kid_4', 'kid_5', 'kid_6'] as const;

/** Толстая линия с контуром (рука): сначала контур, потом цвет. */
function limb(d: string, color: string, w = 7) {
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 4}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
}

interface Body { cx: number; headCY: number; headR: number; shoulderY: number; hipY: number; feetY: number; W: number; H: number }

function geometry(l: Look, frame: number): Body {
  const adult = !!l.adult;
  const W = CHAR_W * 4, H = (adult ? ADULT_H : CHAR_H) * 4;
  const feetY = H - 5;
  const hipY = feetY - (adult ? 28 : 15);
  const shoulderY = hipY - (adult ? 34 : 24);
  const headR = adult ? 19 : 22;
  const bob = frame ? -1.5 : 0;
  return { cx: W / 2, headCY: shoulderY - headR + 7 + bob, headR, shoulderY: shoulderY + bob, hipY: hipY + bob, feetY, W, H };
}

// ---------- волосы ----------
function hairBack(l: Look, b: Body, dir: Dir): string {
  const { cx, headCY: y, headR: r } = b;
  const c = 'url(#hair)';
  if (l.style === 'long') {
    const len = l.adult ? 34 : 30;
    if (dir === 'right') return `<path d="M${cx - r + 2} ${y} Q${cx - r - 4} ${y + len} ${cx - 6} ${y + len + 4} L${cx + 4} ${y + 6}Z" fill="${c}" ${ST}/>`;
    return `<path d="M${cx - r - 2} ${y - 2} Q${cx - r - 6} ${y + len} ${cx - r + 6} ${y + len + 2} L${cx + r - 6} ${y + len + 2} Q${cx + r + 6} ${y + len} ${cx + r + 2} ${y - 2}Z" fill="${c}" ${ST}/>`;
  }
  if (l.style === 'pony') {
    if (dir === 'down') return `<path d="M${cx + r - 4} ${y - 8} Q${cx + r + 14} ${y - 4} ${cx + r + 6} ${y + 22} Q${cx + r} ${y + 8} ${cx + r - 6} ${y + 2}Z" fill="${c}" ${ST}/>`;
    if (dir === 'up') return '';
    return `<path d="M${cx - r + 4} ${y - 8} Q${cx - r - 16} ${y - 2} ${cx - r - 8} ${y + 24} Q${cx - r - 2} ${y + 8} ${cx - r + 6} ${y + 2}Z" fill="${c}" ${ST}/>`;
  }
  return '';
}

function hairFront(l: Look, b: Body, dir: Dir): string {
  const { cx, headCY: y, headR: r } = b;
  const c = 'url(#hair)';
  if (dir === 'up') {
    // затылок: волосы закрывают почти всю голову
    let s = `<path d="M${cx - r - 1} ${y + 4} Q${cx - r} ${y - r - 2} ${cx} ${y - r - 2} Q${cx + r} ${y - r - 2} ${cx + r + 1} ${y + 4} Q${cx + r} ${y + r - 4} ${cx} ${y + r - 2} Q${cx - r} ${y + r - 4} ${cx - r - 1} ${y + 4}Z" fill="${c}" ${ST}/>`;
    if (l.style === 'pony') s += `<path d="M${cx - 5} ${y + 2} Q${cx - 10} ${y + 30} ${cx} ${y + 34} Q${cx + 10} ${y + 30} ${cx + 5} ${y + 2}Z" fill="${c}" ${ST}/>`;
    if (l.style === 'bun') s += `<circle cx="${cx}" cy="${y - r + 2}" r="10" fill="${c}" ${ST}/>`;
    return s;
  }
  if (dir === 'right') {
    let s = `<path d="M${cx - r - 1} ${y + 8} Q${cx - r - 2} ${y - r - 2} ${cx + 2} ${y - r - 2} Q${cx + r + 3} ${y - r + 2} ${cx + r + 1} ${y - 4} Q${cx + 8} ${y - 10} ${cx + 2} ${y - 4} Q${cx - 2} ${y + 6} ${cx - 8} ${y + 14} Q${cx - r + 2} ${y + 16} ${cx - r - 1} ${y + 8}Z" fill="${c}" ${ST}/>`;
    if (l.style === 'spiky') s += `<path d="M${cx - 14} ${y - r + 2} l-4 -8 l9 4 l2 -9 l7 7 l5 -7 l2 9" fill="${c}" ${ST2}/>`;
    if (l.style === 'curly') s += [-14, -2, 10].map((dx) => `<circle cx="${cx + dx}" cy="${y - r + 3}" r="7" fill="${c}" ${ST2}/>`).join('');
    if (l.style === 'bun') s += `<circle cx="${cx - 6}" cy="${y - r}" r="9" fill="${c}" ${ST}/>`;
    return s;
  }
  // спереди
  let s = '';
  switch (l.style) {
    case 'spiky':
      s = `<path d="M${cx - r - 1} ${y + 2} Q${cx - r} ${y - r} ${cx} ${y - r - 1} Q${cx + r} ${y - r} ${cx + r + 1} ${y + 2} L${cx + r - 6} ${y - 6} L${cx + 8} ${y - 2} L${cx + 2} ${y - 9} L${cx - 6} ${y - 2} L${cx - 10} ${y - 9} L${cx - r + 4} ${y - 2}Z" fill="${c}" ${ST}/>
        <path d="M${cx - 12} ${y - r + 1} l-3 -8 l8 4 l3 -9 l6 8 l6 -7 l1 9" fill="${c}" ${ST2}/>`;
      break;
    case 'curly':
      s = `<path d="M${cx - r - 1} ${y + 2} Q${cx - r} ${y - r} ${cx} ${y - r - 1} Q${cx + r} ${y - r} ${cx + r + 1} ${y + 2} Q${cx + 8} ${y - 8} ${cx} ${y - 6} Q${cx - 8} ${y - 8} ${cx - r - 1} ${y + 2}Z" fill="${c}" ${ST}/>`
        + [-16, -6, 4, 14].map((dx, i) => `<circle cx="${cx + dx}" cy="${y - r + 4 + (i % 2) * 2}" r="7.5" fill="${c}" ${ST2}/>`).join('');
      break;
    default: {
      // чёлка с пробором
      s = `<path d="M${cx - r - 1} ${y + 6} Q${cx - r - 1} ${y - r - 1} ${cx} ${y - r - 1} Q${cx + r + 1} ${y - r - 1} ${cx + r + 1} ${y + 6} Q${cx + r - 4} ${y - 4} ${cx + 6} ${y - 6} Q${cx - 2} ${y - 2} ${cx - 6} ${y - 8} Q${cx - r + 2} ${y - 6} ${cx - r - 1} ${y + 6}Z" fill="${c}" ${ST}/>`;
      if (l.style === 'bun') s += `<circle cx="${cx}" cy="${y - r - 3}" r="10" fill="${c}" ${ST}/>`;
      if (l.style === 'pony' || l.style === 'long') s += `<circle cx="${cx + r - 4}" cy="${y - r + 8}" r="4" fill="#ff6f91" ${ST2}/>`;
    }
  }
  return s;
}

// ---------- лицо ----------
function face(l: Look, b: Body, dir: Dir, blink = false): string {
  const { cx, headCY: y } = b;
  const eye = (x: number) => blink
    ? `<path d="M${x - 3.6} ${y + 5} Q${x} ${y + 8} ${x + 3.6} ${y + 5}" fill="none" ${ST2}/>`
    : `<ellipse cx="${x}" cy="${y + 5}" rx="3.6" ry="4.6" fill="${INK}"/><circle cx="${x + 1.3}" cy="${y + 3.2}" r="1.5" fill="#fff"/>`;
  if (dir === 'down') {
    let s = eye(cx - 8.5) + eye(cx + 8.5)
      + `<ellipse cx="${cx - 14}" cy="${y + 12}" rx="4" ry="2.5" fill="#ff8f8f" opacity="0.55"/><ellipse cx="${cx + 14}" cy="${y + 12}" rx="4" ry="2.5" fill="#ff8f8f" opacity="0.55"/>`
      + `<path d="M${cx - 4} ${y + 13} Q${cx} ${y + 17} ${cx + 4} ${y + 13}" fill="none" ${ST2}/>`;
    if (l.glasses) s += `<g fill="none" ${ST2}><circle cx="${cx - 8.5}" cy="${y + 5}" r="7"/><circle cx="${cx + 8.5}" cy="${y + 5}" r="7"/><path d="M${cx - 1.5} ${y + 4} h3"/></g>`;
    if (l.beard) s += `<path d="M${cx - 15} ${y + 8} Q${cx - 14} ${y + 22} ${cx} ${y + 22} Q${cx + 14} ${y + 22} ${cx + 15} ${y + 8} Q${cx + 8} ${y + 14} ${cx} ${y + 12} Q${cx - 8} ${y + 14} ${cx - 15} ${y + 8}Z" fill="url(#hair)" ${ST2}/>`;
    return s;
  }
  if (dir === 'right') {
    let s = eye(cx + 11) + `<ellipse cx="${cx + 13}" cy="${y + 12}" rx="3.5" ry="2.4" fill="#ff8f8f" opacity="0.55"/>`
      + `<path d="M${cx + 14} ${y + 15} Q${cx + 17} ${y + 17} ${cx + 19} ${y + 14}" fill="none" ${ST2}/>`;
    if (l.glasses) s += `<g fill="none" ${ST2}><circle cx="${cx + 11}" cy="${y + 5}" r="7"/><path d="M${cx + 4} ${y + 4} L${cx - 6} ${y + 2}"/></g>`;
    if (l.beard) s += `<path d="M${cx + 2} ${y + 10} Q${cx + 4} ${y + 22} ${cx + 14} ${y + 21} Q${cx + 20} ${y + 19} ${cx + 20} ${y + 14} Q${cx + 12} ${y + 16} ${cx + 2} ${y + 10}Z" fill="url(#hair)" ${ST2}/>`;
    return s;
  }
  return '';
}

// ---------- тело ----------
function frontBody(l: Look, b: Body, frame: number, back: boolean): string {
  const { cx, shoulderY: sy, hipY: hy, feetY: fy } = b;
  const lift = (leg: number) => (frame === leg ? 5 : 0);
  const leg = (x: number, n: number) => `<rect x="${x - 5.5}" y="${hy - 4}" width="11" height="${fy - hy - lift(n)}" rx="5" fill="url(#pants)" ${ST}/>
    <ellipse cx="${x}" cy="${fy - 1 - lift(n)}" rx="8" ry="4.6" fill="${l.shoes}" ${ST2}/>`;
  const legs = leg(cx - 7, 1) + leg(cx + 7, 2);
  const swing = frame === 1 ? 4 : frame === 2 ? -4 : 0;
  const arms = limb(`M${cx - 15} ${sy + 5} Q${cx - 21} ${sy + 14} ${cx - 19 + swing} ${hy - 3}`, l.shirt)
    + limb(`M${cx + 15} ${sy + 5} Q${cx + 21} ${sy + 14} ${cx + 19 + swing} ${hy - 3}`, l.shirt)
    + `<circle cx="${cx - 19 + swing}" cy="${hy - 2}" r="4.6" fill="${l.skin}" ${ST2}/><circle cx="${cx + 19 + swing}" cy="${hy - 2}" r="4.6" fill="${l.skin}" ${ST2}/>`;
  const torso = l.skirt
    ? `<path d="M${cx - 13} ${sy} Q${cx} ${sy - 4} ${cx + 13} ${sy} L${cx + 19} ${hy + 6} Q${cx} ${hy + 10} ${cx - 19} ${hy + 6}Z" fill="url(#shirt)" ${ST}/>`
    : `<path d="M${cx - 13} ${sy} Q${cx} ${sy - 4} ${cx + 13} ${sy} L${cx + 15} ${hy + 2} Q${cx} ${hy + 5} ${cx - 15} ${hy + 2}Z" fill="url(#shirt)" ${ST}/>`;
  const collar = back ? '' : `<path d="M${cx - 6} ${sy - 1} Q${cx} ${sy + 6} ${cx + 6} ${sy - 1}" fill="${tint(l.skin, -0.05)}" ${ST2}/>`;
  return legs + torso + collar + arms;
}

function sideBody(l: Look, b: Body, frame: number): string {
  const { cx, shoulderY: sy, hipY: hy, feetY: fy } = b;
  const legLen = fy - hy;
  const legAt = (dx: number, color: string, shoeDx: number) => `<path d="M${cx} ${hy - 2} L${cx + dx} ${hy + legLen - 4}" fill="none" stroke="${INK}" stroke-width="15" stroke-linecap="round"/>
    <path d="M${cx} ${hy - 2} L${cx + dx} ${hy + legLen - 4}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"/>
    <ellipse cx="${cx + dx + shoeDx}" cy="${fy - 1}" rx="9" ry="4.6" fill="${l.shoes}" ${ST2}/>`;
  const legs = frame === 0
    ? legAt(0, l.pants, 3)
    : frame === 1
      ? legAt(-8, tint(l.pants, -0.25), 3) + legAt(8, l.pants, 3)
      : legAt(8, tint(l.pants, -0.25), 3) + legAt(-8, l.pants, 3);
  const swing = frame === 1 ? -8 : frame === 2 ? 8 : 0;
  const tw = l.adult ? 30 : 26;
  const torso = l.skirt
    ? `<path d="M${cx - 10} ${sy} Q${cx} ${sy - 4} ${cx + 10} ${sy} L${cx + 15} ${hy + 6} Q${cx} ${hy + 9} ${cx - 15} ${hy + 6}Z" fill="url(#shirt)" ${ST}/>`
    : `<rect x="${cx - tw / 2}" y="${sy - 2}" width="${tw}" height="${hy - sy + 5}" rx="10" fill="url(#shirt)" ${ST}/>`;
  const arm = limb(`M${cx} ${sy + 5} Q${cx + swing / 2} ${sy + 14} ${cx + swing} ${hy - 3}`, l.shirt)
    + `<circle cx="${cx + swing}" cy="${hy - 2}" r="4.6" fill="${l.skin}" ${ST2}/>`;
  return legs + torso + arm;
}

function personRight(l: Look, frame: number, blink = false): Art {
  const b = geometry(l, frame);
  const head = `<circle cx="${b.cx + 1}" cy="${b.headCY}" r="${b.headR}" fill="url(#skin)" ${ST}/>
    <circle cx="${b.cx - 9}" cy="${b.headCY + 5}" r="5" fill="${l.skin}" ${ST2}/>`;
  return art(CHAR_W, b.H / 4, hairBack(l, b, 'right') + sideBody(l, b, frame) + head + hairFront(l, b, 'right') + face(l, b, 'right', blink), defs(l));
}

function personFrontBack(l: Look, dir: 'down' | 'up', frame: number, blink = false): Art {
  const b = geometry(l, frame);
  const back = dir === 'up';
  const head = `<circle cx="${b.cx}" cy="${b.headCY}" r="${b.headR}" fill="url(#skin)" ${ST}/>`;
  const ears = back ? '' : `<circle cx="${b.cx - b.headR + 1}" cy="${b.headCY + 5}" r="4.5" fill="${l.skin}" ${ST2}/><circle cx="${b.cx + b.headR - 1}" cy="${b.headCY + 5}" r="4.5" fill="${l.skin}" ${ST2}/>`;
  const body = back
    ? hairBack(l, b, dir) + frontBody(l, b, frame, true)
    : hairBack(l, b, dir) + frontBody(l, b, frame, false);
  return art(CHAR_W, b.H / 4, body + ears + head + hairFront(l, b, dir) + face(l, b, dir, blink), defs(l));
}

function defs(l: Look): string {
  return rgrad('skin', l.skin, 0.25, -0.1) + vgrad('hair', l.hair, 0.22, -0.15) + vgrad('shirt', l.shirt, 0.22, -0.15) + vgrad('pants', l.pants, 0.15, -0.15);
}

export function drawLook(l: Look, dir: Dir, frame: 0 | 1 | 2): Art {
  if (dir === 'left') return mirror(personRight(l, frame));
  if (dir === 'right') return personRight(l, frame);
  return personFrontBack(l, dir, frame);
}

export function drawPerson(lookKey: string, dir: Dir, frame: 0 | 1 | 2): Art {
  return drawLook(LOOKS[lookKey] ?? LOOKS.kid_1, dir, frame);
}

/** Стоит и моргнул (для «вверх» лица не видно — моргания нет). */
export function drawPersonBlink(lookKey: string, dir: Exclude<Dir, 'up'>): Art {
  const l = LOOKS[lookKey] ?? LOOKS.kid_1;
  if (dir === 'left') return mirror(personRight(l, 0, true));
  return dir === 'right' ? personRight(l, 0, true) : personFrontBack(l, 'down', 0, true);
}

/** Спутник Пип — лисёнок (собственный персонаж). 2 кадра: подпрыгивает и машет хвостом. Смотрит вправо. */
export function drawPip(frame: 0 | 1, flip = false): Art {
  const y = frame ? -2 : 0;
  const tail = frame ? 'M24 46 Q4 44 6 22 Q14 34 26 38Z' : 'M24 46 Q2 50 2 30 Q12 40 26 38Z';
  const a = art(18, 16, `${groundShadow(38, 61, 22)}
    <path d="${tail}" fill="url(#fox)" ${ST}/>
    <path d="${frame ? 'M6 22 Q6 30 11 31 Q8 26 6 22Z' : 'M2 30 Q3 38 8 40 Q4 35 2 30Z'}" fill="#fff"/>
    <g transform="translate(0 ${y})">
      <ellipse cx="38" cy="44" rx="17" ry="13" fill="url(#fox)" ${ST}/>
      <ellipse cx="42" cy="48" rx="9" ry="7" fill="#fff6ea"/>
      <rect x="28" y="50" width="7" height="10" rx="3.5" fill="#5a2e10" ${ST2}/><rect x="42" y="50" width="7" height="10" rx="3.5" fill="#5a2e10" ${ST2}/>
      <path d="M36 14 L38 0 L48 10Z M62 14 L64 0 L54 10Z" fill="url(#fox)" ${ST}/>
      <path d="M39 9 L40 4 L45 9Z M61 9 L62 4 L57 9Z" fill="#5a2e10"/>
      <ellipse cx="50" cy="24" rx="17" ry="15" fill="url(#fox)" ${ST}/>
      <path d="M38 28 Q50 42 66 28 Q58 36 50 36 Q42 36 38 28Z" fill="#fff6ea"/>
      <ellipse cx="44" cy="22" rx="3" ry="3.8" fill="${INK}"/><ellipse cx="57" cy="22" rx="3" ry="3.8" fill="${INK}"/>
      <circle cx="45" cy="20.6" r="1.2" fill="#fff"/><circle cx="58" cy="20.6" r="1.2" fill="#fff"/>
      <ellipse cx="51" cy="30" rx="3.2" ry="2.4" fill="${INK}"/>
      <ellipse cx="39" cy="29" rx="3" ry="2" fill="#ff8f8f" opacity="0.6"/><ellipse cx="62" cy="29" rx="3" ry="2" fill="#ff8f8f" opacity="0.6"/>
    </g>`, rgrad('fox', '#ff9a3c', 0.3, -0.2));
  return flip ? mirror(a) : a;
}

/** Тень под персонажем. */
export function shadow(): Art {
  return art(12, 4, `<ellipse cx="24" cy="8" rx="22" ry="7" fill="#1e2a14"/>`);
}
