// Растеризация векторной графики и регистрация текстур в Phaser.
// Спрайты готовятся один раз при запуске (prepareArt), пол — для каждой локации отдельно
// перед её открытием (prepareFloor): так в памяти держится только пол текущей карты.
import type Phaser from 'phaser';
import { allSprites, DIRS, kidFrameKey, blinkKey } from './catalog';
import { LOOKS, drawPerson, drawPip, type Dir } from './character';
import { ITEM_ART, type ItemArtKey } from './items';
import { floorArt } from './floor';
import { artDataUrl, RES, type Art } from './svg';
import type { MapDef } from '../maps/types';

export { kidFrameKey, blinkKey };

/** Масштаб, с которым спрайт выводится в мире (текстура нарисована с запасом в RES раз). */
export const ART_SCALE = 1 / RES;

const ready = new Map<string, { canvas: HTMLCanvasElement; scale: number }>();

async function raster(a: Art): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.decoding = 'async';
  img.src = artDataUrl(a);
  await img.decode();
  const c = document.createElement('canvas');
  c.width = Math.round(a.w * a.res);
  c.height = Math.round(a.h * a.res);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** Растеризовать все спрайты (один раз). */
export async function prepareArt(): Promise<void> {
  if (ready.size) return;
  const entries = Object.entries(allSprites());
  // порциями, чтобы не держать сотни декодеров разом на слабом телефоне
  for (let i = 0; i < entries.length; i += 24) {
    await Promise.all(entries.slice(i, i + 24).map(async ([k, a]) => { ready.set(k, { canvas: await raster(a), scale: 1 / a.res }); }));
  }
}

let floorKey: string | null = null;
/** Пол карты — перед её открытием. Пол предыдущей карты освобождается в registerTextures. */
export async function prepareFloor(map: MapDef): Promise<void> {
  const key = `floor_${map.id}`;
  if (!ready.has(key)) { const a = floorArt(map); ready.set(key, { canvas: await raster(a), scale: 1 / a.res }); }
}

export function artScale(key: string): number { return ready.get(key)?.scale ?? ART_SCALE; }

export function registerTextures(scene: Phaser.Scene, mapId: string) {
  const want = `floor_${mapId}`;
  if (floorKey && floorKey !== want) {
    if (scene.textures.exists(floorKey)) scene.textures.remove(floorKey);
    ready.delete(floorKey);
  }
  floorKey = want;
  for (const [k, { canvas }] of ready) if (!scene.textures.exists(k)) scene.textures.addCanvas(k, canvas);
  for (const look of Object.keys(LOOKS)) for (const dir of DIRS) {
    const key = `${look}_walk_${dir}`;
    if (scene.anims.exists(key)) continue;
    scene.anims.create({ key, frames: [1, 0, 2, 0].map((fr) => ({ key: kidFrameKey(look, dir, fr) })), frameRate: 8, repeat: -1 });
  }
}

// ---------- картинки для HTML-интерфейса ----------
const urlCache = new Map<string, string>();
export function itemImageUrl(sprite: string): string {
  const k = `item_${sprite}`;
  if (!urlCache.has(k)) { const f = ITEM_ART[sprite as ItemArtKey]; urlCache.set(k, f ? artDataUrl(f()) : ''); }
  return urlCache.get(k)!;
}
export function pipImageUrl(): string {
  if (!urlCache.has('pip')) urlCache.set('pip', artDataUrl(drawPip(0, true)));
  return urlCache.get('pip')!;
}
export function personImageUrl(look: string, dir: Dir = 'down'): string {
  const k = `${look}_${dir}`;
  if (!urlCache.has(k)) urlCache.set(k, artDataUrl(drawPerson(look, dir, 0)));
  return urlCache.get(k)!;
}
