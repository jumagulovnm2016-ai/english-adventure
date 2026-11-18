// Полный каталог текстур: ключ текстуры Phaser → рисунок.
import type { Art } from './svg';
import { ITEM_ART } from './items';
import { FURNITURE_ART } from './furniture';
import { floorArt } from './floor';
import { MAPS } from '../maps';
import { LOOKS, drawPerson, drawPip, shadow, type Dir } from './character';

export const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
export function kidFrameKey(look: string, dir: Dir, frame: number) { return `${look}_${dir}_${frame}`; }

/** Все спрайты, кроме пола карт. */
export function allSprites(): Record<string, Art> {
  const out: Record<string, Art> = {};
  for (const [k, f] of Object.entries(ITEM_ART)) out[`item_${k}`] = f();
  for (const [k, f] of Object.entries(FURNITURE_ART)) out[`furn_${k}`] = f();
  for (const look of Object.keys(LOOKS)) for (const d of DIRS) for (const fr of [0, 1, 2] as const) out[kidFrameKey(look, d, fr)] = drawPerson(look, d, fr);
  out.pip_0 = drawPip(0); out.pip_1 = drawPip(1); out.pip_0_l = drawPip(0, true); out.pip_1_l = drawPip(1, true);
  out.shadow = shadow();
  return out;
}

/** Спрайты и пол всех карт (для превью и тестов). */
export function allArt(): Record<string, Art> {
  const out = allSprites();
  for (const m of Object.values(MAPS)) out[`floor_${m.id}`] = floorArt(m);
  return out;
}
