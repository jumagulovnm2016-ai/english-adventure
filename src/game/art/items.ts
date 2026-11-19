// Предметы 16×16 единиц мира (холст рисования 64×64). Названия совпадают с полем sprite в content/items.json.
// Главное требование — узнаваемость без подписи: ребёнок отвечает по картинке.
import { art, groundShadow, rgrad, shine, vgrad, tint, ST, ST2, INK, type Art } from './svg';
import { ANIMALS, animal, type AnimalKind } from './animals';

const item = (body: string, defs = ''): Art => art(16, 16, body, defs);

/** Глаза-бусинки с бликом. */
function eyes(x1: number, x2: number, y: number, r = 3.2): string {
  return [x1, x2].map((x) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.4}" r="${r * 0.38}" fill="#fff"/>`).join('');
}
const blush = (x1: number, x2: number, y: number) => `<ellipse cx="${x1}" cy="${y}" rx="3.2" ry="2" fill="#ff8f8f" opacity="0.55"/><ellipse cx="${x2}" cy="${y}" rx="3.2" ry="2" fill="#ff8f8f" opacity="0.55"/>`;

// ---------- животные ----------
function cat(base: string, eyeCol: string) {
  return item(`${groundShadow(32, 60, 20)}
    <path d="M44 54 Q60 50 56 32" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
    <path d="M44 54 Q60 50 56 32" fill="none" stroke="url(#c)" stroke-width="4.5" stroke-linecap="round"/>
    <ellipse cx="32" cy="47" rx="15" ry="12" fill="url(#c)" ${ST}/>
    <path d="M17 22 L16 5 L28 14Z M47 22 L48 5 L36 14Z" fill="url(#c)" ${ST}/>
    <path d="M19 17 L19 10 L25 14Z M45 17 L45 10 L39 14Z" fill="#ff9fb4"/>
    <ellipse cx="32" cy="26" rx="17" ry="14" fill="url(#c)" ${ST}/>
    <ellipse cx="25" cy="25" rx="3.6" ry="4.6" fill="${eyeCol}"/><ellipse cx="39" cy="25" rx="3.6" ry="4.6" fill="${eyeCol}"/>
    <ellipse cx="25" cy="25" rx="1.3" ry="3.6" fill="#1b1b22"/><ellipse cx="39" cy="25" rx="1.3" ry="3.6" fill="#1b1b22"/>
    <path d="M29.5 31 L34.5 31 L32 34Z" fill="#ff8fa8"/>
    <path d="M32 34 Q29 37 26.5 35 M32 34 Q35 37 37.5 35" fill="none" ${ST2}/>
    <path d="M12 29 L20 30 M12 33 L20 32 M52 29 L44 30 M52 33 L44 32" stroke="${tint(base, -0.5)}" stroke-width="1.2" opacity="0.6"/>`,
  vgrad('c', base, 0.22, -0.15));
}

function dog(base: string, ear: string) {
  return item(`${groundShadow(32, 60, 20)}
    <path d="M45 52 Q58 46 54 36" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
    <path d="M45 52 Q58 46 54 36" fill="none" stroke="${base}" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="32" cy="47" rx="15" ry="12" fill="url(#c)" ${ST}/>
    <ellipse cx="32" cy="51" rx="8" ry="6" fill="${tint(base, 0.45)}"/>
    <ellipse cx="32" cy="25" rx="16" ry="15" fill="url(#c)" ${ST}/>
    <path d="M17 14 Q8 18 11 34 Q17 34 20 24Z M47 14 Q56 18 53 34 Q47 34 44 24Z" fill="${ear}" ${ST}/>
    ${eyes(25, 39, 23)}
    <ellipse cx="32" cy="32" rx="9" ry="6.5" fill="${tint(base, 0.5)}" ${ST2}/>
    <ellipse cx="32" cy="29.5" rx="3.6" ry="2.6" fill="${INK}"/>
    <path d="M32 32 Q32 36 28.5 36 M32 32 Q32 36 35.5 36" fill="none" ${ST2}/>`,
  vgrad('c', base, 0.22, -0.15));
}

function duck() {
  return item(`${groundShadow(32, 60, 21)}
    <path d="M10 44 Q8 30 20 34 Q24 22 36 24 Q40 14 34 10 Q46 8 48 20 Q48 28 42 32 Q56 30 54 46 Q50 58 30 58 Q12 58 10 44Z" fill="url(#c)" ${ST}/>
    <path d="M22 44 Q30 50 40 42" fill="none" ${ST2}/>
    <path d="M47 18 Q58 18 58 22 Q56 26 47 25Z" fill="#ff9a2e" ${ST}/>
    <circle cx="41" cy="16" r="2.8" fill="${INK}"/><circle cx="42" cy="15" r="1" fill="#fff"/>
    <ellipse cx="37" cy="22" rx="2.6" ry="1.6" fill="#ff8f8f" opacity="0.6"/>`,
  vgrad('c', '#ffd23f', 0.35, -0.1));
}

function bird() {
  return item(`${groundShadow(32, 60, 16)}
    <path d="M26 56 L24 60 M36 56 L38 60" ${ST}/>
    <path d="M10 30 Q2 40 14 42 Z" fill="${tint('#3d8bf2', -0.15)}" ${ST}/>
    <circle cx="32" cy="34" r="20" fill="url(#c)" ${ST}/>
    <ellipse cx="32" cy="44" rx="11" ry="8" fill="#d9ecff"/>
    <path d="M15 34 Q24 30 30 40 Q22 46 15 34Z" fill="${tint('#3d8bf2', -0.2)}" ${ST2}/>
    ${eyes(27, 39, 28, 2.8)}
    <path d="M30 33 L34 33 L32 38Z" fill="#ffa53a" ${ST2}/>
    <path d="M28 14 Q32 6 36 14" fill="url(#c)" ${ST2}/>`,
  rgrad('c', '#3d8bf2', 0.35, -0.2));
}

function rabbit() {
  return item(`${groundShadow(32, 60, 19)}
    <ellipse cx="24" cy="12" rx="5.5" ry="13" fill="url(#c)" ${ST}/><ellipse cx="40" cy="12" rx="5.5" ry="13" fill="url(#c)" ${ST}/>
    <ellipse cx="24" cy="13" rx="2.4" ry="9" fill="#ffb3c4"/><ellipse cx="40" cy="13" rx="2.4" ry="9" fill="#ffb3c4"/>
    <ellipse cx="32" cy="48" rx="15" ry="11" fill="url(#c)" ${ST}/>
    <circle cx="32" cy="31" r="14" fill="url(#c)" ${ST}/>
    ${eyes(26.5, 37.5, 29, 2.8)}${blush(22, 42, 35)}
    <path d="M30 34 L34 34 L32 36.5Z" fill="#ff8fa8"/>
    <path d="M32 36.5 Q30 39 28 38 M32 36.5 Q34 39 36 38" fill="none" ${ST2}/>
    <ellipse cx="25" cy="57" rx="5" ry="3" fill="#fff" ${ST2}/><ellipse cx="39" cy="57" rx="5" ry="3" fill="#fff" ${ST2}/>`,
  vgrad('c', '#f4f4fb', 0.6, -0.08));
}

function frog() {
  return item(`${groundShadow(32, 60, 22)}
    <path d="M8 58 Q8 30 32 30 Q56 30 56 58Z" fill="url(#c)" ${ST}/>
    <circle cx="21" cy="26" r="9" fill="url(#c)" ${ST}/><circle cx="43" cy="26" r="9" fill="url(#c)" ${ST}/>
    <circle cx="21" cy="26" r="5" fill="#fff"/><circle cx="43" cy="26" r="5" fill="#fff"/>
    ${eyes(21, 43, 26, 3)}
    <path d="M20 42 Q32 50 44 42" fill="none" ${ST}/>
    ${blush(16, 48, 42)}
    <ellipse cx="32" cy="52" rx="12" ry="5" fill="#c6f08a" opacity="0.8"/>`,
  vgrad('c', '#53c24a', 0.3, -0.15));
}

// ---------- еда ----------
function apple(cx = 32, cy = 36, s = 1, id = 'a') {
  return `<g transform="translate(${cx} ${cy}) scale(${s})">
    <path d="M0 -14 Q-6 -20 -13 -17 Q-23 -12 -21 3 Q-18 20 -8 21 Q-3 22 0 19 Q3 22 8 21 Q18 20 21 3 Q23 -12 13 -17 Q6 -20 0 -14Z" fill="url(#${id})" ${ST}/>
    <path d="M0 -14 Q0 -20 3 -25" fill="none" stroke="#6b4426" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M3 -22 Q12 -28 17 -21 Q10 -16 3 -22Z" fill="#5fbf45" ${ST2}/>
    ${shine(-11, -6, 3.6, 6, 20)}</g>`;
}
const appleDefs = rgrad('a', '#e53935', 0.38, -0.25);

function banana() {
  return item(`${groundShadow(32, 58, 22)}
    <path d="M10 26 Q14 52 40 52 Q54 50 58 40 Q50 46 40 44 Q22 42 18 22 Z" fill="url(#c)" ${ST}/>
    <path d="M18 22 L14 17 L10 20 L10 26" fill="#8a6a2a" ${ST}/>
    <path d="M22 36 Q30 44 46 46" fill="none" stroke="#e0a800" stroke-width="2" stroke-linecap="round"/>
    <path d="M58 40 L60 37" ${ST}/>`,
  vgrad('c', '#ffe14d', 0.3, -0.1));
}

function orangeFruit() {
  return item(`${groundShadow(32, 59, 18)}
    <circle cx="32" cy="38" r="19" fill="url(#c)" ${ST}/>
    ${[[24, 34], [38, 30], [34, 46], [43, 40], [26, 45]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.9" fill="#d96a00" opacity="0.6"/>`).join('')}
    <path d="M32 19 Q34 13 40 12 Q40 19 32 21Z" fill="#5fbf45" ${ST2}/>
    <circle cx="32" cy="20" r="1.8" fill="#6b4426"/>${shine(24, 30, 3.4, 5.5, 30)}`,
  rgrad('c', '#ff9a1f', 0.38, -0.2));
}

function milk() {
  return item(`${groundShadow(32, 60, 16)}
    <path d="M18 22 L32 12 L46 22 L46 58 L18 58Z" fill="url(#c)" ${ST}/>
    <path d="M18 22 L32 12 L46 22" fill="none" ${ST}/>
    <path d="M24 17.5 L28 6 L36 6 L40 17.5" fill="#f4f6ff" ${ST}/>
    <rect x="18" y="32" width="28" height="16" fill="#3d8bf2"/>
    <path d="M18 32 H46 M18 48 H46" ${ST2}/>
    <path d="M32 35 Q27 41 29 44 Q32 47 35 44 Q37 41 32 35Z" fill="#fff"/>
    <rect x="20" y="24" width="4" height="6" rx="2" fill="#fff" opacity="0.7"/>`,
  vgrad('c', '#ffffff', 0, -0.1));
}

function bread() {
  return item(`${groundShadow(32, 59, 23)}
    <path d="M8 54 L8 34 Q8 18 32 18 Q56 18 56 34 L56 54 Q56 57 52 57 L12 57 Q8 57 8 54Z" fill="url(#c)" ${ST}/>
    <path d="M18 30 L24 24 M29 30 L35 24 M40 30 L46 24" stroke="#ffe0a6" stroke-width="3.5" stroke-linecap="round"/>
    ${shine(16, 30, 3, 6, 10)}`,
  vgrad('c', '#d98a3a', 0.3, -0.2));
}

function egg() {
  return item(`${groundShadow(32, 60, 15)}
    <path d="M32 12 Q48 14 49 38 Q49 58 32 58 Q15 58 15 38 Q16 14 32 12Z" fill="url(#c)" ${ST}/>
    ${shine(25, 28, 3.4, 7, 15)}`,
  rgrad('c', '#fffaf0', 0.2, -0.12));
}

function cake() {
  return item(`${groundShadow(32, 60, 24)}
    <ellipse cx="32" cy="55" rx="27" ry="5" fill="#f4f6ff" ${ST}/>
    <path d="M10 36 L10 52 Q32 60 54 52 L54 36Z" fill="url(#c)" ${ST}/>
    <path d="M10 44 Q32 50 54 44" fill="none" stroke="#fff3c4" stroke-width="3"/>
    <ellipse cx="32" cy="36" rx="22" ry="7" fill="#fff8fb" ${ST}/>
    <path d="M12 37 Q14 44 17 39 Q20 46 23 41 Q27 46 31 42 Q35 47 38 41 Q42 46 45 40 Q49 45 52 37" fill="#fff8fb" stroke="none"/>
    <circle cx="32" cy="27" r="5.5" fill="url(#ch)" ${ST2}/>
    <path d="M32 22 Q34 15 39 14" fill="none" stroke="#3f8f2f" stroke-width="2.2" stroke-linecap="round"/>
    ${[[20, 34], [44, 34], [28, 38], [38, 38]].map(([x, y], i) => `<rect x="${x}" y="${y}" width="3.4" height="1.6" rx="0.8" fill="${['#ff6f91', '#3d8bf2', '#ffd23f', '#5fbf45'][i]}" transform="rotate(${i * 40} ${x} ${y})"/>`).join('')}`,
  vgrad('c', '#ffb5cf', 0.25, -0.12) + rgrad('ch', '#e53935', 0.4, -0.2));
}

// ---------- посуда ----------
function cup(base: string) {
  return item(`${groundShadow(30, 60, 18)}
    <path d="M24 14 Q20 10 24 6 M32 14 Q28 10 32 6" fill="none" stroke="#b9c3d6" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M42 28 Q56 28 54 40 Q52 50 40 48" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
    <path d="M42 28 Q56 28 54 40 Q52 50 40 48" fill="none" stroke="${base}" stroke-width="4" stroke-linecap="round"/>
    <path d="M12 20 L44 20 L42 54 Q41 58 37 58 L19 58 Q15 58 14 54Z" fill="url(#c)" ${ST}/>
    <ellipse cx="28" cy="20" rx="16" ry="4" fill="${tint(base, -0.25)}" ${ST}/>
    <ellipse cx="28" cy="21" rx="12" ry="2.4" fill="#8a5a33"/>
    <rect x="17" y="26" width="5" height="22" rx="2.5" fill="#fff" opacity="0.4"/>`,
  `<linearGradient id="c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${tint(base, 0.25)}"/><stop offset="1" stop-color="${tint(base, -0.18)}"/></linearGradient>`);
}

function plate(base: string) {
  return item(`${groundShadow(32, 52, 28, 6)}
    <ellipse cx="32" cy="42" rx="28" ry="12" fill="url(#c)" ${ST}/>
    <ellipse cx="32" cy="41" rx="18" ry="7" fill="#f4f8ff" ${ST2}/>
    <ellipse cx="26" cy="38" rx="6" ry="1.8" fill="#fff" opacity="0.8"/>`,
  vgrad('c', base, 0.3, -0.15));
}

// ---------- игрушки ----------
function ball(base: string) {
  return item(`${groundShadow(32, 60, 18)}
    <circle cx="32" cy="38" r="20" fill="url(#c)" ${ST}/>
    <path d="M13 34 Q32 46 51 34" fill="none" stroke="#fff" stroke-width="5"/>
    <path d="M13 34 Q32 46 51 34" fill="none" ${ST2} opacity="0.5"/>
    <path d="M32 18 Q24 38 32 58" fill="none" stroke="${tint(base, -0.25)}" stroke-width="2.2"/>
    ${shine(24, 27, 4, 6, 35)}`,
  rgrad('c', base, 0.35, -0.22));
}

// ---------- школьные вещи ----------
function book(base: string) {
  return item(`${groundShadow(32, 60, 24)}
    <path d="M12 14 L50 10 L54 50 L16 54Z" fill="#fffdf4" ${ST}/>
    <path d="M16 54 L54 50 L54 56 L16 59Z" fill="#f1ead6" ${ST2}/>
    <path d="M10 12 L48 8 L52 48 L14 52Z" fill="url(#c)" ${ST}/>
    <path d="M14 11.6 L18 51.6" stroke="${tint(base, -0.3)}" stroke-width="3"/>
    <path d="M24 19 L42 17 L43 27 L25 29Z" fill="#fff6c9" ${ST2}/>
    <path d="M28 22 L39 21 M28 25 L36 24.5" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity="0.6"/>`,
  vgrad('c', base, 0.25, -0.15));
}

function pencil(base: string) {
  return item(`${groundShadow(32, 58, 22, 4)}
    <g transform="rotate(-38 32 32)">
      <rect x="10" y="27" width="34" height="10" fill="url(#c)" ${ST}/>
      <path d="M12 30 H42" stroke="#fff" stroke-width="1.6" opacity="0.5"/>
      <path d="M44 27 L56 32 L44 37Z" fill="#f2c58f" ${ST}/>
      <path d="M52.5 30.5 L56 32 L52.5 33.5Z" fill="${INK}"/>
      <rect x="4" y="27" width="6" height="10" rx="2.5" fill="#ff9fb4" ${ST}/>
      <rect x="9" y="26.5" width="3.5" height="11" fill="#c9ced8" ${ST2}/>
    </g>`,
  vgrad('c', base, 0.3, -0.18));
}

function pen(base: string) {
  return item(`${groundShadow(32, 58, 22, 4)}
    <g transform="rotate(-38 32 32)">
      <rect x="20" y="28" width="26" height="8" rx="2" fill="#e8ecf4" ${ST}/>
      <path d="M46 28 L56 32 L46 36Z" fill="#c9ced8" ${ST}/>
      <path d="M53 31 L56 32 L53 33Z" fill="${INK}"/>
      <rect x="6" y="27" width="18" height="10" rx="3.5" fill="url(#c)" ${ST}/>
      <path d="M12 26 L12 22 L26 22 L26 26" fill="none" stroke="${tint(base, -0.2)}" stroke-width="2.5"/>
    </g>`,
  vgrad('c', base, 0.3, -0.18));
}

function ruler(base: string) {
  const ticks = Array.from({ length: 11 }, (_, i) => `<path d="M${10 + i * 4.4} 22 v${i % 2 ? 4 : 7}" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`).join('');
  return item(`${groundShadow(32, 50, 28, 5)}
    <g transform="rotate(-12 32 32)">
      <rect x="6" y="22" width="52" height="16" rx="2.5" fill="url(#c)" ${ST}/>${ticks}
      <rect x="9" y="33" width="46" height="2" rx="1" fill="#fff" opacity="0.4"/>
    </g>`,
  vgrad('c', base, 0.3, -0.12));
}

// ---------- украшение ----------
function lamp(base: string) {
  return item(`${groundShadow(32, 60, 16)}
    <ellipse cx="32" cy="56" rx="13" ry="4" fill="#c9a06a" ${ST}/>
    <rect x="29.5" y="30" width="5" height="25" fill="#c9a06a" ${ST2}/>
    <path d="M16 32 L22 8 L42 8 L48 32Z" fill="url(#c)" ${ST}/>
    <path d="M18 27 H46" stroke="#fff" stroke-width="2" opacity="0.45"/>
    <ellipse cx="32" cy="34" rx="9" ry="2.5" fill="#fff4b0" opacity="0.9"/>`,
  vgrad('c', base, 0.3, -0.15));
}

function apples3() {
  return item(`${groundShadow(32, 60, 26)}${apple(20, 44, 0.62)}${apple(44, 44, 0.62)}${apple(32, 25, 0.62)}`, appleDefs);
}

// ---------- юнит 2: площадка ----------
function kite(base: string) {
  return item(`${groundShadow(36, 60, 14, 3)}
    <path d="M32 40 Q26 48 32 52 Q38 56 34 62" fill="none" stroke="${INK}" stroke-width="1.8"/>
    <path d="M27 48 l-4 -2 l1 4Z M35 55 l4 -2 l-1 4Z" fill="${tint(base, -0.1)}" ${ST2}/>
    <path d="M32 4 L50 22 L32 40 L14 22Z" fill="url(#c)" ${ST}/>
    <path d="M32 4 V40 M14 22 H50" stroke="${tint(base, -0.35)}" stroke-width="2"/>
    <path d="M32 4 L50 22 L32 22Z" fill="#fff" opacity="0.25"/>`,
  vgrad('c', base, 0.3, -0.12));
}

function bike(base: string) {
  const wheel = (cx: number) => `<circle cx="${cx}" cy="44" r="11" fill="none" stroke="${INK}" stroke-width="5"/><circle cx="${cx}" cy="44" r="11" fill="none" stroke="#4a4f5c" stroke-width="2.5"/><circle cx="${cx}" cy="44" r="2.5" fill="${INK}"/><path d="M${cx - 9} 44 H${cx + 9} M${cx} 35 V53" stroke="#9aa6b8" stroke-width="1.2"/>`;
  return item(`${groundShadow(32, 58, 26, 4)}${wheel(15)}${wheel(49)}
    <path d="M15 44 L27 26 L44 26 L49 44 M27 26 L32 44 L44 26 M32 44 L15 44" fill="none" stroke="${INK}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M15 44 L27 26 L44 26 L49 44 M27 26 L32 44 L44 26 M32 44 L15 44" fill="none" stroke="${base}" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M24 20 H32" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M27 26 L26 20" stroke="${INK}" stroke-width="2.5"/>
    <path d="M44 26 L42 16 L48 14" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`);
}

function iceCream() {
  return item(`${groundShadow(32, 60, 10)}
    <path d="M20 30 L32 60 L44 30Z" fill="url(#w)" ${ST}/>
    <path d="M24 36 L38 50 M30 32 L42 42 M22 34 L34 46" stroke="#b07a3a" stroke-width="1.6" opacity="0.8"/>
    <circle cx="32" cy="22" r="14" fill="url(#c)" ${ST}/>
    <path d="M18 26 Q22 32 26 27 Q30 33 34 28 Q38 33 42 27 Q45 30 46 25" fill="url(#c)" ${ST2}/>
    <circle cx="32" cy="8" r="4.5" fill="#e53935" ${ST2}/>
    ${[[25, 18, '#3d8bf2'], [36, 16, '#ffd23f'], [30, 24, '#5fbf45'], [39, 23, '#fff']].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="4" height="1.8" rx="0.9" fill="${c}"/>`).join('')}
    ${shine(26, 16, 2.6, 4.5, 30)}`,
  rgrad('c', '#ff9ec4', 0.3, -0.12) + vgrad('w', '#f2b968', 0.2, -0.15));
}

function bananas3() {
  const b = (dx: number, rot: number) => `<g transform="rotate(${rot} 32 54) translate(${dx} 0)"><path d="M28 54 Q22 34 30 14 Q34 12 35 15 Q30 34 36 54Z" fill="url(#c)" ${ST}/></g>`;
  return item(`${groundShadow(32, 60, 20)}${b(-8, -18)}${b(8, 18)}${b(0, 0)}
    <rect x="27" y="50" width="10" height="8" rx="3" fill="#8a6a2a" ${ST2}/>`, vgrad('c', '#ffe14d', 0.3, -0.12));
}

const BLUE = '#2f7de1', RED = '#e53935', GREEN = '#3dae4a', YELLOW = '#ffcc1f';

export const ITEM_ART = {
  duck, cat_black: () => cat('#4a4a5c', '#c6f26b'), cat_white: () => cat('#fbfbff', '#7cc7ff'),
  dog_black: () => dog('#45455a', '#2d2d3b'), dog_brown: () => dog('#b9773f', '#7e4b23'),
  bird_blue: bird, rabbit_white: rabbit, frog_green: frog,
  apple_red: () => item(`${groundShadow(32, 60, 18)}${apple()}`, appleDefs), apples_three: apples3, banana, orange_fruit: orangeFruit, milk, bread, egg,
  pencil_red: () => pencil(RED), pencil_blue: () => pencil(BLUE), pen_red: () => pen(RED),
  ruler_green: () => ruler(GREEN),
  book_blue: () => book(BLUE), book_yellow: () => book(YELLOW),
  cup_blue: () => cup(BLUE),
  cup_red: () => cup(RED),
  cup_green: () => cup(GREEN),
  plate_blue: () => plate(BLUE),
  ball_red: () => ball(RED),
  ball_blue: () => ball(BLUE),
  book_green: () => book(GREEN),
  book_red: () => book(RED),
  cake,
  lamp_blue: () => lamp(BLUE),
  kite_red: () => kite(RED), kite_blue: () => kite(BLUE), kite_yellow: () => kite(YELLOW),
  bike_red: () => bike(RED), bike_blue: () => bike(BLUE),
  ice_cream: iceCream, bananas_three: bananas3,
  ...Object.fromEntries(ANIMALS.map((k) => [k, () => animal(k)])) as Record<AnimalKind, () => Art>,
};
export type ItemArtKey = keyof typeof ITEM_ART;
