// Как показать слово в вариантах ответа: цветом, картинкой предмета, цифрой или текстом.
import type { ContentRegistry } from '../content/registry';
import type { ItemArtKey } from '../game/art/items';
import { itemImageUrl, iconImageUrl } from '../game/art/textures';

const COLOURS: Record<string, string> = {
  'w.red': '#e53935', 'w.blue': '#2f7de1', 'w.green': '#3dae4a', 'w.yellow': '#ffcc1f', 'w.pink': '#f49ac1',
  'w.orange': '#ff8a1f', 'w.brown': '#8a5a33', 'w.black': '#1f1b24', 'w.white': '#ffffff', 'w.purple': '#7d5cb5',
};
// картинка для существительного — нейтральный вариант предмета
const NOUN_SPRITES: Record<string, ItemArtKey> = {
  'w.cup': 'cup_blue', 'w.plate': 'plate_blue', 'w.ball': 'ball_red', 'w.book': 'book_green', 'w.cake': 'cake', 'w.lamp': 'lamp_blue',
  'w.duck': 'duck', 'w.cat': 'cat_white', 'w.dog': 'dog_brown', 'w.bird': 'bird_blue', 'w.rabbit': 'rabbit_white', 'w.frog': 'frog_green',
  'w.apple': 'apple_red', 'w.banana': 'banana', 'w.orange_fruit': 'orange_fruit', 'w.milk': 'milk', 'w.bread': 'bread', 'w.egg': 'egg',
  'w.pencil': 'pencil_blue', 'w.pen': 'pen_red', 'w.ruler': 'ruler_green',
  // юнит 2
  'w.kite': 'kite_yellow', 'w.bike': 'bike_red', 'w.ice_cream': 'ice_cream',
  'w.lion': 'lion', 'w.tiger': 'tiger', 'w.elephant': 'elephant', 'w.monkey': 'monkey', 'w.giraffe': 'giraffe', 'w.zebra': 'zebra',
  'w.bear': 'bear', 'w.snake': 'snake', 'w.penguin': 'penguin', 'w.hippo': 'hippo', 'w.crocodile': 'crocodile', 'w.parrot': 'parrot',
};
// значки для слов без предмета: действия, погода, части тела, описание, площадка
const ICONS: Record<string, string> = {
  'w.run': 'run', 'w.jump': 'jump', 'w.swim': 'swim', 'w.fly': 'fly', 'w.climb': 'climb', 'w.sing': 'sing', 'w.dance': 'dance', 'w.ride': 'ride',
  'w.sunny': 'sunny', 'w.rainy': 'rainy', 'w.hot': 'hot', 'w.cold': 'cold',
  'w.head': 'head', 'w.eyes': 'eyes', 'w.ears': 'ears', 'w.nose': 'nose', 'w.mouth': 'mouth', 'w.legs': 'legs', 'w.tail': 'tail', 'w.neck': 'neck',
  'w.big': 'big', 'w.small': 'small', 'w.long': 'long',
  'w.swing': 'swing', 'w.slide': 'slide', 'w.tree': 'tree', 'w.flower': 'flower',
  // фразы-действия: «I can …», «Touch your …» — той же картинкой
  'p.i_can_run': 'run', 'p.i_can_jump': 'jump', 'p.i_can_swim': 'swim', 'p.i_can_climb': 'climb', 'p.i_can_sing': 'sing', 'p.i_can_dance': 'dance',
  'p.touch_your_head': 'head', 'p.touch_your_eyes': 'eyes', 'p.touch_your_ears': 'ears', 'p.touch_your_nose': 'nose', 'p.touch_your_mouth': 'mouth', 'p.touch_your_legs': 'legs',
  'p.its_sunny': 'sunny', 'p.its_raining': 'rainy', 'p.its_hot': 'hot', 'p.its_cold': 'cold',
};
// инструкции учителя — понятные картинки-значки
const EMOJI: Record<string, string> = {
  'p.stand_up': '🧍', 'p.sit_down': '🪑', 'p.open_your_book': '📖', 'p.close_your_book': '📕',
};
const DIGITS: Record<string, string> = {
  'w.one': '1', 'w.two': '2', 'w.three': '3', 'w.four': '4', 'w.five': '5', 'w.six': '6', 'w.seven': '7', 'w.eight': '8', 'w.nine': '9', 'w.ten': '10',
};

export type Visual = { kind: 'swatch'; color: string } | { kind: 'image'; src: string } | { kind: 'digit'; text: string } | { kind: 'emoji'; text: string } | { kind: 'text' };

export function visualFor(_c: ContentRegistry, id: string): Visual {
  if (COLOURS[id]) return { kind: 'swatch', color: COLOURS[id] };
  if (DIGITS[id]) return { kind: 'digit', text: DIGITS[id] };
  if (EMOJI[id]) return { kind: 'emoji', text: EMOJI[id] };
  if (ICONS[id]) return { kind: 'image', src: iconImageUrl(ICONS[id]) };
  const sp = NOUN_SPRITES[id];
  if (sp) {
    return { kind: 'image', src: itemImageUrl(sp) };
  }
  return { kind: 'text' };
}

/** Картинка предмета по id (для заголовка задания «What's this?»). */
export function itemPicture(c: ContentRegistry, itemId: string): string {
  return itemImageUrl(c.item(itemId).sprite);
}

/** Есть ли у слова картинка (тогда «послушай и выбери» можно проходить без чтения). */
export const hasPicture = (c: ContentRegistry, id: string) => visualFor(c, id).kind !== 'text';
