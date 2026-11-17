// Герой: 4 направления × 3 кадра (стоит, шаг левой, шаг правой). Цвета параметризованы —
// позже из этого же кода получатся 6–8 персонажей на выбор.
import { Px } from './pixels';

export type Dir = 'down' | 'up' | 'right' | 'left';
export const CHAR_W = 16;
export const CHAR_H = 22;

export interface KidLook {
  skin: string; skinShade: string; hair: string; hairDark: string;
  shirt: string; shirtDark: string; pants: string; pantsDark: string;
  longHair?: boolean;
}

export const LOOKS: Record<string, KidLook> = {
  kid_1: { skin: 's', skinShade: 'S', hair: 'h', hairDark: 'H', shirt: 'c', shirtDark: 'C', pants: 'j', pantsDark: 'J' },
};

const O = 1; // отступ сверху под контур

function legs(p: Px, look: KidLook, frame: number, side: boolean) {
  const y0 = 15 + O;
  if (!side) {
    // левая нога x5..7, правая x8..10
    const lift = [0, frame === 1 ? 1 : 0, frame === 2 ? 1 : 0];
    p.rect(5, y0, 3, 3 - lift[1], look.pants); p.rect(5, y0 + 3 - lift[1], 3, 2, 'f');
    p.rect(8, y0, 3, 3 - lift[2], look.pants); p.rect(8, y0 + 3 - lift[2], 3, 2, 'f');
    p.vline(7, y0, 2, look.pantsDark);
  } else {
    if (frame === 0) {
      p.rect(6, y0, 4, 3, look.pants); p.rect(6, y0 + 3, 5, 2, 'f');
    } else {
      const front = frame === 1 ? 9 : 4;
      const back = frame === 1 ? 4 : 8;
      p.rect(back, y0, 3, 3, look.pantsDark); p.rect(back, y0 + 3, 3, 2, 'f');
      p.rect(front - 1, y0, 3, 3, look.pants); p.rect(front - 1, y0 + 3, 4, 2, 'f');
    }
  }
}

function body(p: Px, look: KidLook, frame: number, side: boolean) {
  const y0 = 10 + O;
  if (!side) {
    p.rect(4, y0, 8, 5, look.shirt);
    p.vline(4, y0, 5, look.shirtDark); p.vline(11, y0, 5, look.shirtDark);
    const lh = frame === 1 ? -1 : 0, rh = frame === 2 ? -1 : 0;
    p.rect(3, y0, 1, 4 + lh, look.shirt); p.px(3, y0 + 4 + lh, look.skin);
    p.rect(12, y0, 1, 4 + rh, look.shirt); p.px(12, y0 + 4 + rh, look.skin);
  } else {
    p.rect(5, y0, 6, 5, look.shirt);
    p.vline(5, y0, 5, look.shirtDark);
    const swing = frame === 0 ? 0 : frame === 1 ? 1 : -1;
    p.rect(7 + swing, y0 + 1, 2, 3, look.shirtDark); p.rect(7 + swing, y0 + 4, 2, 1, look.skin);
  }
}

function head(p: Px, look: KidLook, dir: Dir) {
  const y = O;
  if (dir === 'down' || dir === 'up') {
    p.rect(5, y, 6, 1, look.hair); p.rect(4, y + 1, 8, 1, look.hair); p.rect(3, y + 2, 10, 2, look.hair);
    p.rect(4, y + 4, 8, 5, dir === 'down' ? look.skin : look.hair);
    p.vline(3, y + 4, 3, look.hair); p.vline(12, y + 4, 3, look.hair);
    if (dir === 'down') {
      p.hline(4, y + 4, 8, look.hair);             // чёлка
      p.px(6, y + 6, 'i'); p.px(9, y + 6, 'i');     // глаза
      p.px(5, y + 7, 'e'); p.px(10, y + 7, 'e');    // румянец
      p.hline(7, y + 8, 2, look.skinShade);         // рот
    } else {
      p.hline(4, y + 8, 8, look.hairDark);
    }
    if (look.longHair) { p.vline(3, y + 7, 4, look.hair); p.vline(12, y + 7, 4, look.hair); }
    p.rect(7, y + 9, 2, 1, look.skinShade);         // шея
  } else {
    p.rect(5, y, 6, 1, look.hair); p.rect(4, y + 1, 8, 3, look.hair);
    p.rect(5, y + 4, 7, 5, look.skin);
    p.rect(4, y + 4, 4, 3, look.hair);               // волосы сзади
    p.hline(8, y + 4, 4, look.hair);                 // чёлка
    p.px(10, y + 6, 'i');
    p.px(12, y + 7, look.skin);                      // нос
    p.px(10, y + 8, look.skinShade);
    if (look.longHair) p.vline(4, y + 7, 4, look.hair);
    p.rect(7, y + 9, 2, 1, look.skinShade);
  }
}

export function drawKid(look: KidLook, dir: Dir, frame: 0 | 1 | 2): Px {
  if (dir === 'left') return drawKid(look, 'right', frame).flipX();
  const p = new Px(CHAR_W, CHAR_H);
  const side = dir === 'right';
  legs(p, look, frame, side);
  body(p, look, frame, side);
  head(p, look, dir);
  return p.outline();
}

/** Тень под персонажем. */
export function shadow(): Px {
  const p = new Px(12, 4);
  p.rect(2, 0, 8, 4, 'M'); p.rect(0, 1, 12, 2, 'M');
  return p;
}
