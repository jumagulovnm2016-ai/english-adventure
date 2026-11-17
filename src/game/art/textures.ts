// Регистрация всех нарисованных кодом текстур в Phaser.
import type Phaser from 'phaser';
import { PALETTE, Px } from './pixels';
import { TILE_ART } from './tiles';
import { FURNITURE_ART } from './furniture';
import { ITEM_ART } from './items';
import { LOOKS, drawPerson, shadow, type Dir } from './character';

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];

function gen(scene: Phaser.Scene, key: string, px: Px) {
  if (scene.textures.exists(key)) return;
  scene.textures.generate(key, { data: px.data(), pixelWidth: 1, palette: PALETTE as unknown as Phaser.Types.Create.Palette });
}

export function kidFrameKey(look: string, dir: Dir, frame: number) { return `${look}_${dir}_${frame}`; }

export function registerTextures(scene: Phaser.Scene) {
  for (const [k, f] of Object.entries(TILE_ART)) gen(scene, `tile_${k}`, f());
  for (const [k, f] of Object.entries(FURNITURE_ART)) gen(scene, `furn_${k}`, f());
  for (const [k, f] of Object.entries(ITEM_ART)) gen(scene, `item_${k}`, f());
  gen(scene, 'shadow', shadow());
  for (const look of Object.keys(LOOKS)) {
    for (const dir of DIRS) for (const fr of [0, 1, 2] as const) gen(scene, kidFrameKey(look, dir, fr), drawPerson(look, dir, fr));
    for (const dir of DIRS) {
      const key = `${look}_walk_${dir}`;
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: [1, 0, 2, 0].map((fr) => ({ key: kidFrameKey(look, dir, fr) })),
        frameRate: 8,
        repeat: -1,
      });
    }
  }
}

/** Картинка спрайта для HTML-интерфейса (карточка предмета). */
export function pxToDataUrl(px: Px, scale = 6): string {
  const c = document.createElement('canvas');
  c.width = px.w * scale; c.height = px.h * scale;
  const ctx = c.getContext('2d')!;
  px.rows.forEach((row, y) => row.forEach((ch, x) => {
    const col = PALETTE[ch];
    if (!col) return;
    ctx.fillStyle = col;
    ctx.fillRect(x * scale, y * scale, scale, scale);
  }));
  return c.toDataURL();
}
