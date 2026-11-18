// Как показать слово в вариантах ответа: цветом, картинкой предмета, цифрой или текстом.
import type { ContentRegistry } from '../content/registry';
import { ITEM_ART, type ItemArtKey } from '../game/art/items';
import { PALETTE } from '../game/art/pixels';
import { pxToDataUrl } from '../game/art/textures';

const COLOURS: Record<string, string> = {
  'w.red': PALETTE.e, 'w.blue': PALETTE.b, 'w.green': PALETTE.g, 'w.yellow': '#f5d33a', 'w.pink': '#f49ac1',
  'w.orange': PALETTE.o, 'w.brown': '#8a5a33', 'w.black': '#1f1b24', 'w.white': '#ffffff', 'w.purple': '#7d5cb5',
};
// картинка для существительного — нейтральный вариант предмета
const NOUN_SPRITES: Record<string, ItemArtKey> = {
  'w.cup': 'cup_blue', 'w.plate': 'plate_blue', 'w.ball': 'ball_red', 'w.book': 'book_green', 'w.cake': 'cake', 'w.lamp': 'lamp_blue',
  'w.duck': 'duck', 'w.cat': 'cat_white', 'w.dog': 'dog_brown', 'w.bird': 'bird_blue', 'w.rabbit': 'rabbit_white', 'w.frog': 'frog_green',
  'w.apple': 'apple_red', 'w.banana': 'banana', 'w.orange_fruit': 'orange_fruit', 'w.milk': 'milk', 'w.bread': 'bread', 'w.egg': 'egg',
  'w.pencil': 'pencil_blue', 'w.pen': 'pen_red', 'w.ruler': 'ruler_green',
};
// инструкции учителя — понятные картинки-значки
const EMOJI: Record<string, string> = {
  'p.stand_up': '🧍', 'p.sit_down': '🪑', 'p.open_your_book': '📖', 'p.close_your_book': '📕',
};
const DIGITS: Record<string, string> = {
  'w.one': '1', 'w.two': '2', 'w.three': '3', 'w.four': '4', 'w.five': '5', 'w.six': '6', 'w.seven': '7', 'w.eight': '8', 'w.nine': '9', 'w.ten': '10',
};

export type Visual = { kind: 'swatch'; color: string } | { kind: 'image'; src: string } | { kind: 'digit'; text: string } | { kind: 'emoji'; text: string } | { kind: 'text' };

const cache = new Map<string, string>();
export function visualFor(_c: ContentRegistry, id: string): Visual {
  if (COLOURS[id]) return { kind: 'swatch', color: COLOURS[id] };
  if (DIGITS[id]) return { kind: 'digit', text: DIGITS[id] };
  if (EMOJI[id]) return { kind: 'emoji', text: EMOJI[id] };
  const sp = NOUN_SPRITES[id];
  if (sp) {
    if (!cache.has(sp)) cache.set(sp, pxToDataUrl(ITEM_ART[sp](), 6));
    return { kind: 'image', src: cache.get(sp)! };
  }
  return { kind: 'text' };
}

/** Картинка предмета по id (для заголовка задания «What's this?»). */
export function itemPicture(c: ContentRegistry, itemId: string): string {
  const sp = c.item(itemId).sprite as ItemArtKey;
  const key = `item:${sp}`;
  if (!cache.has(key)) cache.set(key, pxToDataUrl(ITEM_ART[sp](), 8));
  return cache.get(key)!;
}

/** Есть ли у слова картинка (тогда «послушай и выбери» можно проходить без чтения). */
export const hasPicture = (c: ContentRegistry, id: string) => visualFor(c, id).kind !== 'text';
