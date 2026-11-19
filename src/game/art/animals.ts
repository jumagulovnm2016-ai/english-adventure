// Животные зоопарка. Рисуются в сетке 64×64; size — размер в единицах мира
// (16 — предмет/картинка в задании, крупнее — обитатель вольера).
import { art, groundShadow, rgrad, vgrad, ST, ST2, INK, type Art } from './svg';

function eyes(x1: number, x2: number, y: number, r = 3.2): string {
  return [x1, x2].map((x) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.4}" r="${r * 0.38}" fill="#fff"/>`).join('');
}
const blush = (x1: number, x2: number, y: number) => `<ellipse cx="${x1}" cy="${y}" rx="3" ry="1.8" fill="#ff8f8f" opacity="0.55"/><ellipse cx="${x2}" cy="${y}" rx="3" ry="1.8" fill="#ff8f8f" opacity="0.55"/>`;

const BODIES = {
  lion: () => ({
    body: `${groundShadow(32, 60, 20)}
      <ellipse cx="32" cy="50" rx="14" ry="10" fill="url(#c)" ${ST}/>
      <g fill="url(#m)" ${ST}>${Array.from({ length: 12 }, (_, i) => { const a = (Math.PI * 2 * i) / 12; return `<circle cx="${32 + Math.cos(a) * 17}" cy="${28 + Math.sin(a) * 16}" r="8"/>`; }).join('')}</g>
      <g fill="url(#m)">${Array.from({ length: 12 }, (_, i) => { const a = (Math.PI * 2 * i) / 12; return `<circle cx="${32 + Math.cos(a) * 17}" cy="${28 + Math.sin(a) * 16}" r="6.5"/>`; }).join('')}</g>
      <circle cx="32" cy="28" r="15" fill="url(#c)" ${ST}/>
      <circle cx="21" cy="16" r="4.5" fill="url(#c)" ${ST2}/><circle cx="43" cy="16" r="4.5" fill="url(#c)" ${ST2}/>
      ${eyes(26, 38, 25)}${blush(21, 43, 32)}
      <ellipse cx="32" cy="34" rx="7" ry="5" fill="#fff4d6"/>
      <path d="M29 31 L35 31 L32 34Z" fill="#8a4a2a"/>
      <path d="M32 34 Q30 38 27 37 M32 34 Q34 38 37 37" fill="none" ${ST2}/>`,
    defs: rgrad('c', '#ffcc4d', 0.3, -0.1) + rgrad('m', '#c96a24', 0.25, -0.2),
  }),
  tiger: () => ({
    body: `${groundShadow(32, 60, 20)}
      <ellipse cx="32" cy="50" rx="14" ry="10" fill="url(#c)" ${ST}/>
      <path d="M22 46 l4 6 M42 46 l-4 6 M32 42 v6" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M16 18 L14 6 L26 12Z M48 18 L50 6 L38 12Z" fill="url(#c)" ${ST}/>
      <ellipse cx="32" cy="27" rx="18" ry="16" fill="url(#c)" ${ST}/>
      <path d="M32 11 v7 M25 12 l2 6 M39 12 l-2 6 M14 26 h6 M14 31 h5 M50 26 h-6 M50 31 h-5" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M20 32 Q32 46 44 32 Q40 40 32 40 Q24 40 20 32Z" fill="#fff"/>
      ${eyes(25, 39, 25)}
      <path d="M29 31 L35 31 L32 34Z" fill="#ff8fa8"/>
      <path d="M32 34 Q30 37 27.5 36 M32 34 Q34 37 36.5 36" fill="none" ${ST2}/>`,
    defs: vgrad('c', '#ff8a2a', 0.25, -0.12),
  }),
  elephant: () => ({
    body: `${groundShadow(32, 60, 24)}
      <ellipse cx="32" cy="48" rx="18" ry="12" fill="url(#c)" ${ST}/>
      <rect x="18" y="50" width="9" height="9" rx="3" fill="url(#c)" ${ST2}/><rect x="37" y="50" width="9" height="9" rx="3" fill="url(#c)" ${ST2}/>
      <ellipse cx="12" cy="26" rx="11" ry="14" fill="url(#c)" ${ST}/><ellipse cx="52" cy="26" rx="11" ry="14" fill="url(#c)" ${ST}/>
      <ellipse cx="12" cy="26" rx="6" ry="9" fill="#f2b6c6" opacity="0.8"/><ellipse cx="52" cy="26" rx="6" ry="9" fill="#f2b6c6" opacity="0.8"/>
      <circle cx="32" cy="24" r="15" fill="url(#c)" ${ST}/>
      <path d="M32 30 Q30 42 33 48 Q36 52 40 48" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>
      <path d="M32 30 Q30 42 33 48 Q36 52 40 48" fill="none" stroke="url(#c)" stroke-width="6.5" stroke-linecap="round"/>
      ${eyes(25, 39, 22, 2.8)}${blush(21, 43, 29)}`,
    defs: vgrad('c', '#a7b0c2', 0.25, -0.15),
  }),
  monkey: () => ({
    body: `${groundShadow(32, 60, 18)}
      <path d="M44 52 Q60 50 58 36 Q56 28 50 32" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
      <path d="M44 52 Q60 50 58 36 Q56 28 50 32" fill="none" stroke="url(#c)" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="32" cy="48" rx="13" ry="11" fill="url(#c)" ${ST}/>
      <ellipse cx="32" cy="50" rx="7" ry="6" fill="#f3d2a2"/>
      <circle cx="14" cy="26" r="7" fill="#f3d2a2" ${ST}/><circle cx="50" cy="26" r="7" fill="#f3d2a2" ${ST}/>
      <circle cx="32" cy="26" r="16" fill="url(#c)" ${ST}/>
      <path d="M32 24 Q22 14 20 26 Q19 38 32 40 Q45 38 44 26 Q42 14 32 24Z" fill="#f3d2a2" ${ST2}/>
      ${eyes(27, 37, 25, 2.8)}
      <ellipse cx="30" cy="31" rx="1.2" ry="1" fill="${INK}"/><ellipse cx="34" cy="31" rx="1.2" ry="1" fill="${INK}"/>
      <path d="M27 34 Q32 38 37 34" fill="none" ${ST2}/>`,
    defs: vgrad('c', '#9a6034', 0.22, -0.15),
  }),
  giraffe: () => ({
    body: `${groundShadow(34, 60, 18)}
      <ellipse cx="36" cy="50" rx="14" ry="8" fill="url(#c)" ${ST}/>
      <rect x="25" y="52" width="6" height="8" rx="2" fill="url(#c)" ${ST2}/><rect x="40" y="52" width="6" height="8" rx="2" fill="url(#c)" ${ST2}/>
      <path d="M22 46 L20 16 L30 16 L32 46Z" fill="url(#c)" ${ST}/>
      <circle cx="24" cy="26" r="2.6" fill="#c97a2a"/><circle cx="27" cy="35" r="3" fill="#c97a2a"/><circle cx="23" cy="41" r="2.4" fill="#c97a2a"/><circle cx="38" cy="48" r="3" fill="#c97a2a"/><circle cx="44" cy="51" r="2.2" fill="#c97a2a"/>
      <path d="M19 6 v-4 M27 6 v-4" stroke="${INK}" stroke-width="2.4"/><circle cx="19" cy="2" r="2.4" fill="#9a6034" ${ST2}/><circle cx="27" cy="2" r="2.4" fill="#9a6034" ${ST2}/>
      <ellipse cx="23" cy="13" rx="10" ry="8" fill="url(#c)" ${ST}/>
      <ellipse cx="18" cy="16" rx="6" ry="4.4" fill="#ffe6b0" ${ST2}/>
      ${eyes(21, 28, 11, 2.2)}
      <path d="M33 9 l6 -2 l-1 5Z" fill="url(#c)" ${ST2}/>`,
    defs: vgrad('c', '#ffcf4d', 0.25, -0.08),
  }),
  zebra: () => ({
    body: `${groundShadow(32, 60, 18)}
      <ellipse cx="32" cy="52" rx="13" ry="8" fill="#fff" ${ST}/>
      <path d="M22 50 v6 M28 48 v9 M36 48 v9 M42 50 v6" stroke="${INK}" stroke-width="3"/>
      <path d="M22 14 L19 4 L27 10Z M42 14 L45 4 L37 10Z" fill="#fff" ${ST}/>
      <path d="M22 10 Q32 4 42 10 L40 20 Q32 16 24 20Z" fill="${INK}"/>
      <path d="M20 14 Q20 6 32 6 Q44 6 44 14 L42 36 Q40 46 32 46 Q24 46 22 36Z" fill="url(#c)" ${ST}/>
      <path d="M21 20 h6 M37 20 h6 M21 27 h5 M38 27 h5 M23 34 h4 M37 34 h4" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="32" cy="40" rx="9" ry="6" fill="#5a5a6a" ${ST2}/>
      <circle cx="29" cy="40" r="1.4" fill="#222"/><circle cx="35" cy="40" r="1.4" fill="#222"/>
      ${eyes(26, 38, 22, 2.6)}`,
    defs: vgrad('c', '#ffffff', 0, -0.06),
  }),
  bear: () => ({
    body: `${groundShadow(32, 60, 20)}
      <ellipse cx="32" cy="48" rx="16" ry="12" fill="url(#c)" ${ST}/>
      <ellipse cx="32" cy="50" rx="8" ry="7" fill="#d9a46a"/>
      <circle cx="17" cy="12" r="7" fill="url(#c)" ${ST}/><circle cx="47" cy="12" r="7" fill="url(#c)" ${ST}/>
      <circle cx="17" cy="12" r="3.5" fill="#d9a46a"/><circle cx="47" cy="12" r="3.5" fill="#d9a46a"/>
      <circle cx="32" cy="26" r="17" fill="url(#c)" ${ST}/>
      <ellipse cx="32" cy="33" rx="8.5" ry="6.5" fill="#e8bd88" ${ST2}/>
      <ellipse cx="32" cy="30.5" rx="3.6" ry="2.6" fill="${INK}"/>
      <path d="M32 33 Q32 36.5 29 36.5 M32 33 Q32 36.5 35 36.5" fill="none" ${ST2}/>
      ${eyes(25, 39, 23)}${blush(20, 44, 30)}`,
    defs: vgrad('c', '#9a6034', 0.2, -0.18),
  }),
  snake: () => ({
    body: `${groundShadow(32, 58, 24)}
      <path d="M8 52 Q14 42 26 48 Q38 54 44 44 Q50 34 40 30 Q30 26 28 18" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>
      <path d="M8 52 Q14 42 26 48 Q38 54 44 44 Q50 34 40 30 Q30 26 28 18" fill="none" stroke="url(#c)" stroke-width="8" stroke-linecap="round"/>
      <path d="M16 47 l2 3 M30 50 l1 3 M44 40 l3 1" stroke="#ffd23f" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse cx="28" cy="14" rx="10" ry="8" fill="url(#c)" ${ST}/>
      ${eyes(24, 32, 11, 2.4)}
      <path d="M28 21 v5 l-2 2 M28 26 l2 2" fill="none" stroke="#e53935" stroke-width="1.6" stroke-linecap="round"/>`,
    defs: vgrad('c', '#5cc24a', 0.25, -0.15),
  }),
  penguin: () => ({
    body: `${groundShadow(32, 60, 16)}
      <ellipse cx="25" cy="58" rx="6" ry="3" fill="#ff9a2e" ${ST2}/><ellipse cx="39" cy="58" rx="6" ry="3" fill="#ff9a2e" ${ST2}/>
      <path d="M14 30 Q8 42 14 46 Z M50 30 Q56 42 50 46 Z" fill="#2b2f3a" ${ST2}/>
      <ellipse cx="32" cy="36" rx="18" ry="22" fill="url(#c)" ${ST}/>
      <path d="M32 20 Q20 20 20 38 Q20 56 32 56 Q44 56 44 38 Q44 20 32 20Z" fill="#fffdf6"/>
      ${eyes(26, 38, 24, 2.8)}${blush(22, 42, 30)}
      <path d="M28 28 L36 28 L32 34Z" fill="#ff9a2e" ${ST2}/>`,
    defs: vgrad('c', '#3b4252', 0.15, -0.2),
  }),
  hippo: () => ({
    body: `${groundShadow(32, 60, 24)}
      <ellipse cx="32" cy="50" rx="18" ry="10" fill="url(#c)" ${ST}/>
      <circle cx="18" cy="14" r="4.5" fill="url(#c)" ${ST2}/><circle cx="46" cy="14" r="4.5" fill="url(#c)" ${ST2}/>
      <ellipse cx="32" cy="22" rx="17" ry="12" fill="url(#c)" ${ST}/>
      <ellipse cx="32" cy="36" rx="21" ry="12" fill="url(#c)" ${ST}/>
      <ellipse cx="25" cy="33" rx="2.4" ry="3" fill="${INK}"/><ellipse cx="39" cy="33" rx="2.4" ry="3" fill="${INK}"/>
      <path d="M22 41 Q32 46 42 41" fill="none" ${ST2}/>
      ${eyes(25, 39, 19, 2.8)}${blush(18, 46, 38)}`,
    defs: vgrad('c', '#a58ac9', 0.25, -0.12),
  }),
  crocodile: () => ({
    body: `${groundShadow(32, 56, 28, 5)}
      <path d="M4 44 Q2 34 14 32 L40 30 Q50 26 58 30 Q62 34 58 38 L40 40 Q34 52 18 52 Q6 52 4 44Z" fill="url(#c)" ${ST}/>
      <path d="M40 34 L58 34" ${ST2}/>
      <path d="M42 34 l2 3 l2 -3 l2 3 l2 -3 l2 3 l2 -3" fill="#fff" stroke="${INK}" stroke-width="1.2"/>
      ${[12, 20, 28].map((x) => `<path d="M${x} 32 l3 -5 l3 5" fill="url(#c)" ${ST2}/>`).join('')}
      <circle cx="40" cy="26" r="5.5" fill="url(#c)" ${ST2}/><circle cx="41" cy="26" r="2.4" fill="${INK}"/><circle cx="41.8" cy="25" r="0.9" fill="#fff"/>
      <path d="M12 52 v4 M26 52 v4" ${ST}/>`,
    defs: vgrad('c', '#4caf50', 0.25, -0.15),
  }),
  parrot: () => ({
    body: `${groundShadow(32, 60, 14)}
      <path d="M28 50 L22 62 L30 56 L34 62 L34 50Z" fill="#2f7de1" ${ST2}/>
      <ellipse cx="32" cy="38" rx="13" ry="16" fill="url(#c)" ${ST}/>
      <path d="M20 34 Q14 46 24 52 Q28 42 26 34Z" fill="#ffd23f" ${ST2}/><path d="M22 44 Q20 50 25 52" fill="none" stroke="#2f7de1" stroke-width="4"/>
      <circle cx="33" cy="20" r="11" fill="url(#c)" ${ST}/>
      <ellipse cx="37" cy="19" rx="5" ry="5.5" fill="#fff"/>
      <circle cx="37.5" cy="19" r="2.4" fill="${INK}"/><circle cx="38.3" cy="18" r="0.9" fill="#fff"/>
      <path d="M42 20 Q50 22 46 30 Q44 26 40 26Z" fill="#ffd23f" ${ST}/>`,
    defs: rgrad('c', '#e53935', 0.3, -0.18),
  }),
} satisfies Record<string, () => { body: string; defs: string }>;

export type AnimalKind = keyof typeof BODIES;
export const ANIMALS = Object.keys(BODIES) as AnimalKind[];

/** Животное размером size×size единиц мира. */
export function animal(kind: AnimalKind, size = 16): Art {
  const { body, defs } = BODIES[kind]();
  return art(size, size, size === 16 ? body : `<g transform="scale(${size / 16})">${body}</g>`, defs);
}

