// Сцена локации: пол, мебель, предметы, герой, камера, управление.
import Phaser from 'phaser';
import type { EventBus, GameEvents } from '../../core/events';
import type { ContentRegistry } from '../../content/registry';
import { registerTextures, kidFrameKey } from '../art/textures';
import { CHAR_H } from '../art/character';
import { hash } from '../art/pixels';
import { TILE_LEGEND, type ItemPlacement, type MapDef, type TileChar } from '../maps/types';
import { Grid, TILE, type Point } from '../world/grid';
import { findPath, smoothPath } from '../world/pathfinding';
import { distToRect, facingFor, moveWithCollision, type Facing } from '../world/movement';

export interface WorldSceneDeps {
  map: MapDef;
  content: ContentRegistry;
  bus: EventBus<GameEvents>;
  look: string;
  start: { x: number; y: number } | null;
  onMoved: (p: Point) => void;
}

const SPEED = 62;          // пикселей мира в секунду
const REACH = 12;          // на каком расстоянии от предмета можно взаимодействовать
// сколько клеток минимум видно: на горизонтальном экране 16×11, на вертикальном (телефон) 8×14
const VISIBLE_LANDSCAPE = { w: 16, h: 11 };
const VISIBLE_PORTRAIT = { w: 8, h: 14 };

export class WorldScene extends Phaser.Scene {
  private deps!: WorldSceneDeps;
  private grid!: Grid;
  private pos: Point = { x: 0, y: 0 };
  private facing: Facing = 'down';
  private hero!: Phaser.GameObjects.Sprite;
  private heroShadow!: Phaser.GameObjects.Image;
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'act' | 'act2' | 'act3', Phaser.Input.Keyboard.Key>;
  private path: Point[] = [];
  private pendingInspect: string | null = null;
  private itemSprites = new Map<string, Phaser.GameObjects.Image>();
  private marker!: Phaser.GameObjects.Text;
  private nearby: ItemPlacement | null = null;
  private blocked = false;
  private unblockedAt = 0;
  private tapMark!: Phaser.GameObjects.Image;
  private lastFrameAt = 0;

  constructor() { super('world'); }

  init(deps: WorldSceneDeps) { this.deps = deps; }

  create() {
    const { map, bus } = this.deps;
    registerTextures(this);
    this.grid = new Grid(map);

    this.drawFloor();
    this.drawFurniture();
    this.drawItems();

    // герой
    const start = this.deps.start && !this.grid.isBlockedAt(this.deps.start.x, this.deps.start.y - 2)
      ? this.deps.start
      : this.grid.feetOf({ tx: map.spawn.tx, ty: map.spawn.ty });
    if (!this.deps.start) this.facing = map.spawn.dir;
    this.pos = { ...start };
    this.heroShadow = this.add.image(0, 0, 'shadow').setAlpha(0.35).setOrigin(0.5, 0.5);
    this.hero = this.add.sprite(0, 0, kidFrameKey(this.deps.look, this.facing, 0)).setOrigin(0.5, 1);
    this.syncHero();

    // отметка цели касания
    this.tapMark = this.add.image(0, 0, 'shadow').setTint(0xffe27a).setAlpha(0).setDepth(1);

    // «!» над предметом рядом
    this.marker = this.add.text(0, 0, '!', { fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#fff', stroke: '#2b2232', strokeThickness: 3, fontStyle: 'bold' })
      .setOrigin(0.5, 1).setResolution(4).setVisible(false).setDepth(10000);

    // камера
    const cam = this.cameras.main;
    cam.setRoundPixels(true);
    cam.startFollow(this.hero, true, 0.15, 0.15, 0, CHAR_H / 2);
    this.fitCamera();
    this.scale.on('resize', () => this.fitCamera());

    // клавиатура
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = this.input.keyboard!.addKeys({
      up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, w: K.W, a: K.A, s: K.S, d: K.D,
      act: K.E, act2: K.SPACE, act3: K.ENTER,
    }, false) as typeof this.keys;
    for (const k of ['act', 'act2', 'act3'] as const) this.keys[k].on('down', () => this.tryInspectNearby());

    // касание / мышь
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.blocked) return;
      if (p.getDistance() > 12) return; // это было перетаскивание, а не касание
      this.onTap({ x: p.worldX, y: p.worldY });
    });

    bus.on('input-blocked', ({ blocked }) => {
      this.blocked = blocked;
      if (blocked) this.stopWalking(); else this.unblockedAt = this.time.now;
    });
    bus.on('inspect-item', () => this.stopWalking());
  }

  /** Масштаб — целое число (пиксели остаются чёткими). Если комната меньше экрана — она по центру, а не прижата к углу. */
  private fitCamera() {
    const w = this.scale.width, h = this.scale.height;
    const vis = w >= h ? VISIBLE_LANDSCAPE : VISIBLE_PORTRAIT;
    const z = Math.max(2, Math.min(6, Math.floor(Math.min(w / (vis.w * TILE), h / (vis.h * TILE)))));
    const cam = this.cameras.main;
    cam.setZoom(z);
    const W = this.grid.cols * TILE, H = this.grid.rows * TILE;
    const viewW = w / z, viewH = h / z;
    const bx = viewW > W ? -(viewW - W) / 2 : 0;
    const by = viewH > H ? -(viewH - H) / 2 : 0;
    cam.setBounds(bx, by, Math.max(W, viewW), Math.max(H, viewH));
  }

  private drawFloor() {
    const { map } = this.deps;
    const rt = this.add.renderTexture(0, 0, this.grid.cols * TILE, this.grid.rows * TILE).setOrigin(0, 0).setDepth(-1000);
    for (let ty = 0; ty < this.grid.rows; ty++) for (let tx = 0; tx < this.grid.cols; tx++) {
      const ch = map.tiles[ty][tx] as TileChar;
      let art: string = TILE_LEGEND[ch].art;
      if (art === 'floor_wood') art = hash(tx, ty, 5) > 0.7 ? 'floor_wood_1' : 'floor_wood_0';
      rt.draw(`tile_${art}`, tx * TILE, ty * TILE);
    }
  }

  private drawFurniture() {
    for (const f of this.deps.map.furniture) {
      const cx = (f.tx + f.tw / 2) * TILE;
      const bottom = (f.ty + f.th) * TILE;
      const img = this.add.image(cx, bottom, `furn_${f.key}`).setOrigin(0.5, 1);
      if (f.walkable) {
        img.setOrigin(0, 0).setPosition(f.tx * TILE, f.ty * TILE).setDepth(-500);
      } else {
        img.setDepth(bottom);
      }
    }
  }

  private drawItems() {
    for (const it of this.deps.map.items) {
      const item = this.deps.content.item(it.itemId);
      const img = this.add.image(it.px, it.py, `item_${item.sprite}`).setOrigin(0.5, 1).setDepth((it.ty + it.th) * TILE + 1);
      img.setInteractive({ useHandCursor: true, pixelPerfect: false });
      this.itemSprites.set(it.itemId, img);
      // лёгкое «дыхание», чтобы предметы были заметны
      this.tweens.add({ targets: img, scaleY: 1.06, yoyo: true, repeat: -1, duration: 900 + hash(it.tx, it.ty) * 400, ease: 'Sine.inOut' });
    }
  }

  private onTap(world: Point) {
    // нажали на предмет → идём к нему и смотрим
    for (const it of this.deps.map.items) {
      const img = this.itemSprites.get(it.itemId)!;
      const b = img.getBounds();
      Phaser.Geom.Rectangle.Inflate(b, 4, 4);
      if (b.contains(world.x, world.y)) { this.walkToItem(it); return; }
    }
    const cell = this.grid.nearestWalkable(this.grid.cellOf(world), world);
    if (!cell) return;
    this.pendingInspect = null;
    const goalExact = !this.grid.isBlockedAt(world.x, world.y) ? { x: world.x, y: world.y + 4 } : null;
    this.walkTo(cell, goalExact);
  }

  private walkToItem(it: ItemPlacement) {
    if (distToRect(this.pos, it.tx, it.ty, it.tw, it.th) <= REACH) {
      this.faceTowards(it);
      this.inspect(it.itemId);
      return;
    }
    const stands = this.grid.standCellsAround(it.tx, it.ty, it.tw, it.th);
    let best: Point[] | null = null;
    let bestLen = Infinity;
    for (const s of stands) {
      const cells = findPath(this.grid, this.heroCell(), s);
      if (cells && cells.length < bestLen) { bestLen = cells.length; best = smoothPath(this.grid, this.pos, cells); }
    }
    if (!best) return;
    this.path = best;
    this.pendingInspect = it.itemId;
    this.showTapMark(best[best.length - 1]);
  }

  private walkTo(cell: { tx: number; ty: number }, exact: Point | null) {
    const cells = findPath(this.grid, this.heroCell(), cell);
    if (!cells) return;
    const pts = smoothPath(this.grid, this.pos, cells);
    if (exact && pts.length) pts[pts.length - 1] = exact;
    this.path = pts;
    this.showTapMark(pts[pts.length - 1] ?? this.pos);
  }

  private heroCell() {
    const c = this.grid.cellOf({ x: this.pos.x, y: this.pos.y - 2 });
    return this.grid.nearestWalkable(c, this.pos) ?? c;
  }

  private showTapMark(p: Point) {
    this.tapMark.setPosition(p.x, p.y).setAlpha(0.9).setScale(1);
    this.tweens.killTweensOf(this.tapMark);
    this.tweens.add({ targets: this.tapMark, alpha: 0, scale: 1.6, duration: 600 });
  }

  private stopWalking() {
    this.path = [];
    this.pendingInspect = null;
  }

  update() {
    // Время берём по реальным часам: Phaser сглаживает время кадра и при низком FPS занижает его —
    // тогда на слабых устройствах герой ходил бы медленнее. Предел 100 мс: шаг ≤ 6 px, сквозь стену (16 px) не проскочить.
    const now = performance.now();
    const dt = this.lastFrameAt ? Math.min(now - this.lastFrameAt, 100) / 1000 : 0;
    this.lastFrameAt = now;
    let dx = 0, dy = 0;
    if (!this.blocked) {
      const k = this.keys;
      dx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
      dy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    }
    let moving = false;
    if (dx || dy) {
      this.stopWalking();
      const len = Math.hypot(dx, dy);
      this.step((dx / len) * SPEED * dt, (dy / len) * SPEED * dt);
      moving = true;
    } else if (this.path.length) {
      const target = this.path[0];
      const vx = target.x - this.pos.x, vy = target.y - this.pos.y;
      const dist = Math.hypot(vx, vy);
      const stepLen = SPEED * dt;
      if (dist <= stepLen) {
        const before = { ...this.pos };
        this.step(vx, vy);
        this.path.shift();
        if (this.pos.x === before.x && this.pos.y === before.y && dist > 0.5) this.path = []; // упёрлись
      } else {
        const before = { ...this.pos };
        this.step((vx / dist) * stepLen, (vy / dist) * stepLen);
        if (Math.hypot(this.pos.x - before.x, this.pos.y - before.y) < stepLen * 0.2) this.path = []; // застряли
      }
      moving = true;
      if (!this.path.length && this.pendingInspect) {
        const it = this.deps.map.items.find((i) => i.itemId === this.pendingInspect)!;
        this.pendingInspect = null;
        if (distToRect(this.pos, it.tx, it.ty, it.tw, it.th) <= REACH + 4) { this.faceTowards(it); this.inspect(it.itemId); }
      }
    }

    const anim = `${this.deps.look}_walk_${this.facing}`;
    if (moving) {
      if (this.hero.anims.currentAnim?.key !== anim || !this.hero.anims.isPlaying) this.hero.play(anim);
    } else {
      this.hero.anims.stop();
      this.hero.setTexture(kidFrameKey(this.deps.look, this.facing, 0));
    }
    this.syncHero();
    this.updateNearby();
  }

  private step(dx: number, dy: number) {
    this.facing = facingFor(dx, dy, this.facing);
    const next = moveWithCollision(this.grid, this.pos, dx, dy);
    if (next.x !== this.pos.x || next.y !== this.pos.y) {
      this.pos = next;
      this.deps.onMoved(this.pos);
    }
  }

  private syncHero() {
    this.hero.setPosition(Math.round(this.pos.x), Math.round(this.pos.y) + 1).setDepth(this.pos.y);
    this.heroShadow.setPosition(Math.round(this.pos.x), Math.round(this.pos.y)).setDepth(this.pos.y - 0.5);
  }

  private faceTowards(it: ItemPlacement) {
    const cx = (it.tx + it.tw / 2) * TILE, cy = (it.ty + it.th / 2) * TILE;
    this.facing = facingFor(cx - this.pos.x, cy - (this.pos.y - 4), this.facing);
  }

  private updateNearby() {
    let best: ItemPlacement | null = null;
    let bestD = REACH;
    for (const it of this.deps.map.items) {
      const d = distToRect(this.pos, it.tx, it.ty, it.tw, it.th);
      if (d <= bestD) { bestD = d; best = it; }
    }
    if (best !== this.nearby) {
      if (this.nearby) this.itemSprites.get(this.nearby.itemId)?.clearTint();
      this.nearby = best;
      if (best) this.itemSprites.get(best.itemId)?.setTint(0xfff3b0);
      this.deps.bus.emit('nearby-item', { itemId: best?.itemId ?? null });
    }
    if (best) {
      const img = this.itemSprites.get(best.itemId)!;
      const bob = Math.round(Math.sin(this.time.now / 180) * 1.5);
      this.marker.setVisible(true).setPosition(img.x, img.y - img.height - 2 + bob);
    } else {
      this.marker.setVisible(false);
    }
  }

  private tryInspectNearby() {
    // клавиша, закрывшая карточку, не должна сразу открыть её снова
    if (this.blocked || !this.nearby || this.time.now - this.unblockedAt < 250) return;
    this.faceTowards(this.nearby);
    this.inspect(this.nearby.itemId);
  }

  private inspect(itemId: string) {
    this.deps.bus.emit('inspect-item', { itemId });
  }

  /** Для отладки и автотестов. */
  debugState() {
    return { x: this.pos.x, y: this.pos.y, facing: this.facing, nearby: this.nearby?.itemId ?? null, walking: this.path.length > 0 };
  }
}
