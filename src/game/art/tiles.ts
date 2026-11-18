// Тайлы пола и стен 16×16.
import { Px, hash } from './pixels';

export const TILE = 16;

function woodFloor(variant: number) {
  const p = new Px(16, 16);
  p.rect(0, 0, 16, 16, 'w');
  for (let row = 0; row < 4; row++) {
    const y = row * 4 + 3;
    p.hline(0, y, 16, 'W');
    // стыки досок смещены по рядам
    const sx = (row * 7 + variant * 5) % 16;
    p.vline(sx, row * 4, 3, 'W');
    for (let x = 0; x < 16; x++) if (hash(x, row, variant + 3) > 0.86) p.px(x, row * 4 + 1, 'W');
  }
  if (variant === 1) p.px(4, 9, 'v');
  return p;
}

function tileFloor() {
  const p = new Px(16, 16);
  p.rect(0, 0, 16, 16, 't');
  p.hline(0, 0, 16, 'T'); p.hline(0, 8, 16, 'T');
  p.vline(0, 0, 16, 'T'); p.vline(8, 0, 16, 'T');
  p.px(3, 3, 'n'); p.px(11, 11, 'n');
  return p;
}

function wallTop() {
  const p = new Px(16, 16);
  p.rect(0, 0, 16, 16, 'Q');
  p.hline(0, 15, 16, 'P');
  for (let x = 0; x < 16; x += 4) p.px(x + 1, 5, 'P');
  return p;
}

function wallFace() {
  const p = new Px(16, 16);
  p.rect(0, 0, 16, 16, 'p');
  for (let x = 0; x < 16; x++) for (let y = 0; y < 12; y++) if (hash(x, y, 9) > 0.93) p.px(x, y, 'q');
  p.rect(0, 12, 16, 4, 'W'); // плинтус
  p.hline(0, 12, 16, 'v');
  return p;
}

function wallWindow() {
  const p = wallFace();
  p.rect(3, 2, 10, 8, 'v');
  p.rect(4, 3, 8, 6, 'u');
  p.rect(4, 3, 3, 2, 'U');
  p.vline(8, 3, 6, 'v'); p.hline(4, 6, 8, 'v');
  return p;
}

function door() {
  const p = new Px(16, 16);
  p.rect(0, 0, 16, 16, 'p');
  p.rect(2, 0, 12, 16, 'D');
  p.rect(3, 1, 10, 15, 'd');
  p.rect(4, 2, 8, 5, 'D'); p.rect(4, 9, 8, 5, 'D');
  p.rect(5, 3, 6, 3, 'd'); p.rect(5, 10, 6, 3, 'd');
  p.px(11, 8, 'y');
  return p;
}

function grass(variant: number) {
  const p = new Px(16, 16);
  p.rect(0, 0, 16, 16, 'A');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (hash(x, y, 20 + variant) > 0.9) p.px(x, y, 'F');
  if (variant === 1) { for (const [x, y] of [[3, 4], [11, 9], [6, 12]]) { p.px(x, y, 'F'); p.px(x + 1, y - 1, 'F'); p.px(x - 1, y - 1, 'F'); } }
  if (variant === 2) { p.px(4, 5, 'n'); p.px(5, 4, 'n'); p.px(3, 4, 'n'); p.px(4, 3, 'n'); p.px(4, 4, 'y'); p.px(11, 11, 'e'); p.px(12, 10, 'e'); p.px(10, 10, 'e'); p.px(11, 9, 'e'); p.px(11, 10, 'y'); }
  return p;
}

function path() {
  const p = new Px(16, 16);
  p.rect(0, 0, 16, 16, 'I');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (hash(x, y, 31) > 0.88) p.px(x, y, 'K');
  return p;
}

function water() {
  const p = new Px(16, 16);
  p.rect(0, 0, 16, 16, 'L');
  for (const [x, y] of [[2, 3], [9, 7], [4, 12], [12, 13]]) p.hline(x, y, 3, 'V');
  return p;
}

function hedge() {
  const p = new Px(16, 16);
  p.rect(0, 0, 16, 16, 'G');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const h = hash(x, y, 41);
    if (h > 0.75) p.px(x, y, 'g'); else if (h < 0.1) p.px(x, y, 'k');
  }
  return p;
}

export const TILE_ART = {
  grass_0: () => grass(0),
  grass_1: () => grass(1),
  grass_2: () => grass(2),
  path,
  water,
  hedge,
  floor_wood_0: () => woodFloor(0),
  floor_wood_1: () => woodFloor(1),
  floor_tile: tileFloor,
  wall_top: wallTop,
  wall_face: wallFace,
  wall_window: wallWindow,
  door,
};
export type TileArtKey = keyof typeof TILE_ART;
