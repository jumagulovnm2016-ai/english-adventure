// Сцена локации: пол, мебель, персонажи, предметы, герой, камера, управление.
// Сцена ничего не знает об обучении: она сообщает «игрок хочет взаимодействовать с X» через шину,
// а квестовый контроллер вызывает её методы (показать предметы, поставить «!» над персонажем и т. п.).
import Phaser from 'phaser';
import type { EventBus, GameEvents, TargetKind } from '../../core/events';
import type { ContentRegistry } from '../../content/registry';
import { registerTextures, kidFrameKey, blinkKey, ART_SCALE, artScale } from '../art/textures';
import { CHAR_H } from '../art/character';
import { sfx } from '../../speech/sfx';
import { hash } from '../art/svg';
import type { Exit, MapDef } from '../maps/types';
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
  onReady: (scene: WorldScene) => void;
  /** Можно ли пройти в дверь: null — можно, иначе текст «почему нельзя». */
  canExit: (e: Exit) => string | null;
  onExit: (e: Exit) => void;
  onLocked: (text: string) => void;
  /** Показывать ли спутника. */
  companion: boolean;
}

interface Target {
  kind: TargetKind;
  id: string;
  tx: number; ty: number; tw: number; th: number;
  obj: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  /** клетка была занята этим объектом (снять при удалении) */
  dynamicCell?: { tx: number; ty: number };
}

const SPEED = 62;
const REACH = 12;
const NPC_REACH = 14;
const VISIBLE_LANDSCAPE = { w: 16, h: 11 };
const VISIBLE_PORTRAIT = { w: 8, h: 14 };

export class WorldScene extends Phaser.Scene {
  private deps!: WorldSceneDeps;
  private grid!: Grid;
  private pos: Point = { x: 0, y: 0 };
  private facing: Facing = 'down';
  private hero!: Phaser.GameObjects.Sprite;
  private heroShadow!: Phaser.GameObjects.Image;
  private carried: Phaser.GameObjects.Image | null = null;
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'act' | 'act2' | 'act3', Phaser.Input.Keyboard.Key>;
  private path: Point[] = [];
  private pendingTarget: Target | null = null;
  private targets: Target[] = [];
  private npcMarkers = new Map<string, Phaser.GameObjects.Image>();
  private marker!: Phaser.GameObjects.Image;
  private nearby: Target | null = null;
  private blocked = false;
  private unblockedAt = 0;
  private tapMark!: Phaser.GameObjects.Image;
  private lastFrameAt = 0;
  private highlighted: string | null = null;
  private lastCellKey = -1;
  private leaving = false;
  private pip: Phaser.GameObjects.Image | null = null;
  private pipMarker: Phaser.GameObjects.Image | null = null;
  /** «Живость»: моргание героя, пыль из-под ног; calm — у ребёнка включено «меньше движения». */
  private heroBlinkUntil = 0;
  private heroNextBlink = 0;
  private lastPuff = 0;
  private calm = false;
  private trail: Point[] = [];
  private props: Phaser.GameObjects.Image[] = [];
  private pipPos: Point = { x: 0, y: 0 };

  constructor() { super('world'); }

  init(deps: WorldSceneDeps) {
    // Phaser перезапускает тот же объект сцены при смене локации — сбрасываем всё состояние
    this.deps = deps;
    this.path = []; this.pendingTarget = null; this.targets = []; this.npcMarkers = new Map();
    this.nearby = null; this.blocked = false; this.unblockedAt = 0; this.lastFrameAt = 0;
    this.highlighted = null; this.leaving = false; this.carried = null;
    this.pip = null; this.pipMarker = null; this.trail = []; this.props = [];
    this.heroBlinkUntil = 0; this.heroNextBlink = 0; this.lastPuff = 0;
    this.calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  create() {
    const { map, bus } = this.deps;
    registerTextures(this, map.id);
    this.grid = new Grid(map);

    this.drawFloor();
    this.drawFurniture();
    for (const it of map.items) this.addItemTarget('item', it.itemId, it.px, it.py, { tx: it.tx, ty: it.ty, tw: it.tw, th: it.th }, false);

    const start = this.deps.start && !this.grid.isBlockedAt(this.deps.start.x, this.deps.start.y - 2)
      ? this.deps.start
      : this.grid.feetOf({ tx: map.spawn.tx, ty: map.spawn.ty });
    if (!this.deps.start) this.facing = map.spawn.dir;
    this.pos = { ...start };
    this.heroShadow = this.add.image(0, 0, 'shadow').setAlpha(0.22).setScale(ART_SCALE);
    this.hero = this.add.sprite(0, 0, kidFrameKey(this.deps.look, this.facing, 0)).setOrigin(0.5, 1).setScale(ART_SCALE);
    this.syncHero();

    this.tapMark = this.add.image(0, 0, 'fx_ring').setAlpha(0).setDepth(1).setScale(ART_SCALE);
    this.marker = this.makeBubble('ui_look').setVisible(false);
    // тихие шаги на каждом шаге анимации ходьбы
    this.hero.on('animationupdate', (_a: unknown, f: Phaser.Animations.AnimationFrame) => { if (/_[12]$/.test(f.textureKey)) sfx.step(); });
    this.startRipples();

    const cam = this.cameras.main;
    cam.setRoundPixels(true);
    cam.startFollow(this.hero, true, 0.15, 0.15, 0, CHAR_H / 2);
    this.fitCamera();
    this.scale.on('resize', () => this.fitCamera());

    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = this.input.keyboard!.addKeys({
      up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, w: K.W, a: K.A, s: K.S, d: K.D,
      act: K.E, act2: K.SPACE, act3: K.ENTER,
    }, false) as typeof this.keys;
    for (const k of ['act', 'act2', 'act3'] as const) this.keys[k].on('down', () => this.interactNearby());

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.blocked || p.getDistance() > 12 * this.dpr) return;
      this.onTap({ x: p.worldX, y: p.worldY });
    });

    const off = bus.on('input-blocked', ({ blocked }) => {
      this.blocked = blocked;
      if (blocked) this.stopWalking(); else this.unblockedAt = this.time.now;
    });
    // при смене локации сцена перезапускается — снимаем подписки, чтобы они не копились
    this.events.once('shutdown', () => { off(); this.scale.off('resize'); });

    for (const sgn of map.signs) {
      this.add.text(sgn.x, sgn.y, sgn.text, { fontFamily: 'Nunito, system-ui, sans-serif', fontSize: '7px', color: '#ffffff', backgroundColor: '#3d2b24', padding: { x: 4, y: 1 }, fontStyle: '900' })
        .setOrigin(0.5, 0.5).setResolution(10).setDepth(5000);
    }
    this.lastCellKey = this.grid.key(this.grid.cellOf(this.pos));
    if (this.deps.companion) this.createPip();
    this.deps.onReady(this);
  }

  // ---------- API для квестового контроллера ----------

  /** Показать/спрятать персонажа. */
  setNpcVisible(npcId: string, visible: boolean) {
    const existing = this.targets.find((t) => t.kind === 'npc' && t.id === npcId);
    if (visible && !existing) {
      const pl = this.deps.map.npcs.find((n) => n.npcId === npcId);
      if (!pl) throw new Error(`На карте нет ${npcId}`);
      const look = this.deps.content.npc(npcId).sprite;
      const feet = this.grid.feetOf({ tx: pl.tx, ty: pl.ty });
      const spr = this.add.sprite(feet.x, feet.y + 1, kidFrameKey(look, pl.dir, 0)).setOrigin(0.5, 1).setDepth(feet.y).setScale(ART_SCALE);
      spr.setData('look', look).setData('dir', pl.dir).setData('blinkAt', this.time.now + 800 + Math.random() * 4000);
      // еле заметное «дыхание» — жители не стоят как статуи
      if (!this.calm) this.tweens.add({ targets: spr, scaleY: ART_SCALE * 1.025, yoyo: true, repeat: -1, duration: 1100 + Math.random() * 500, ease: 'Sine.inOut' });
      this.add.image(feet.x, feet.y, 'shadow').setAlpha(0.22).setDepth(feet.y - 0.5).setName(`shadow_${npcId}`).setScale(ART_SCALE);
      spr.setInteractive({ useHandCursor: true });
      this.grid.setDynamic(pl.tx, pl.ty, true);
      this.targets.push({ kind: 'npc', id: npcId, tx: pl.tx, ty: pl.ty, tw: 1, th: 1, obj: spr, dynamicCell: { tx: pl.tx, ty: pl.ty } });
      this.pushHeroOut();
    } else if (!visible && existing) {
      this.removeTarget(existing);
      this.children.getByName(`shadow_${npcId}`)?.destroy();
    }
  }

  /** «!» над персонажем: есть, что ему сказать. */
  setNpcMarker(npcId: string, on: boolean) {
    const t = this.targets.find((x) => x.kind === 'npc' && x.id === npcId);
    let m = this.npcMarkers.get(npcId);
    if (on && t && !m) {
      m = this.makeBubble('ui_alert');
      this.npcMarkers.set(npcId, m);
    } else if ((!on || !t) && m) {
      m.destroy();
      this.npcMarkers.delete(npcId);
    }
  }

  /** Повернуть персонажа к герою и «подпрыгнуть» от радости/помахать. */
  npcReact(npcId: string, emote?: string) {
    const t = this.targets.find((x) => x.kind === 'npc' && x.id === npcId);
    if (!t) return;
    const spr = t.obj as Phaser.GameObjects.Sprite;
    const dir = facingFor(this.pos.x - spr.x, this.pos.y - spr.y, 'down');
    spr.setTexture(kidFrameKey(spr.getData('look'), dir, 0)).setData('dir', dir);
    if (emote === 'happy' || emote === 'wave') this.tweens.add({ targets: spr, y: spr.y - 3, yoyo: true, duration: 120, repeat: emote === 'happy' ? 1 : 0 });
    if (emote === 'happy') this.floatUp('fx_heart', spr.x, spr.y - spr.displayHeight, 3);
    else if (emote === 'wave') this.floatUp('fx_star', spr.x, spr.y - spr.displayHeight, 2);
  }

  /** Разложить предметы квеста «найди» по местам набора spotSet. */
  spawnPickables(itemIds: string[], spotSet: string) {
    this.clearPickables();
    const spots = this.deps.map.spots[spotSet];
    if (!spots || spots.length < itemIds.length) throw new Error(`Мест «${spotSet}» не хватает для ${itemIds.length} предметов`);
    itemIds.forEach((id, i) => {
      const s = spots[i];
      this.addItemTarget('pick', id, s.px, s.py, { tx: s.tx, ty: s.ty, tw: 1, th: 1 }, !s.onFurniture);
    });
    this.pushHeroOut();
  }

  clearPickables() {
    for (const t of this.targets.filter((x) => x.kind === 'pick')) this.removeTarget(t);
    this.highlighted = null;
  }

  /** Подсветить предмет (подсказка «вот он»). */
  highlightPickable(itemId: string) {
    this.highlighted = itemId;
    const t = this.targets.find((x) => x.kind === 'pick' && x.id === itemId);
    if (t) this.tweens.add({ targets: t.obj, scale: ART_SCALE * 1.3, yoyo: true, repeat: 3, duration: 250 });
  }

  /** Показать неинтерактивные предметы (утки на пруду, книги на партах) на время шага квеста. */
  showProps(itemIds: string[], spotSet: string) {
    this.clearProps();
    const spots = this.deps.map.spots[spotSet];
    if (!spots || spots.length < itemIds.length) throw new Error(`Мест «${spotSet}» не хватает для показа`);
    itemIds.forEach((id, i) => {
      const s = spots[i];
      const img = this.add.image(s.px, s.py, `item_${this.deps.content.item(id).sprite}`).setOrigin(0.5, 1).setDepth((s.ty + 1) * TILE + 1).setName('prop').setScale(ART_SCALE);
      this.tweens.add({ targets: img, y: s.py - 1, yoyo: true, repeat: -1, duration: 700 + i * 90, ease: 'Sine.inOut' });
      this.props.push(img);
    });
  }

  clearProps() { for (const p of this.props) { this.tweens.killTweensOf(p); p.destroy(); } this.props = []; }

  hasSpots(zone: string) { return !!this.deps.map.spots[zone]; }
  hasNpc(npcId: string) { return this.deps.map.npcs.some((n) => n.npcId === npcId); }
  get location() { return this.deps.map.id; }

  /** Герой внутри именованной области карты. */
  inZone(zone: string) {
    const z = this.deps.map.zones[zone];
    if (!z) return false;
    const c = this.grid.cellOf({ x: this.pos.x, y: this.pos.y - 1 });
    return c.tx >= z.tx && c.tx < z.tx + z.tw && c.ty >= z.ty && c.ty < z.ty + z.th;
  }

  /** Убрать один предмет «найди» (его взяли). */
  removePickable(itemId: string) {
    const t = this.targets.find((x) => x.kind === 'pick' && x.id === itemId);
    if (!t) return;
    const o = t.obj as Phaser.GameObjects.Image;
    this.burst('fx_star', o.x, o.y - o.displayHeight / 2, 7);
    this.removeTarget(t);
  }

  /** Предмет в руках героя (рисуется над головой). */
  setCarried(itemId: string | null) {
    this.carried?.destroy();
    this.carried = null;
    if (itemId) {
      const sprite = this.deps.content.item(itemId).sprite;
      this.carried = this.add.image(0, 0, `item_${sprite}`).setOrigin(0.5, 1).setDepth(9000).setScale(ART_SCALE);
      this.syncHero();
    }
  }

  /** Поставить украшение-награду в комнату. */
  addDecor(itemId: string) {
    const d = this.deps.map.decor[itemId];
    if (!d || this.children.getByName(`decor_${itemId}`)) return;
    const sprite = this.deps.content.item(itemId).sprite;
    this.add.image(d.px, d.py, `item_${sprite}`).setOrigin(0.5, 1).setDepth(d.py).setName(`decor_${itemId}`).setScale(ART_SCALE);
    this.grid.setDynamic(d.tx, d.ty, true);
    this.pushHeroOut();
  }

  /** Экранные координаты точки мира (для автотестов и всплывающих подсказок). */
  worldToScreen(x: number, y: number) {
    const cam = this.cameras.main;
    return { x: ((x - cam.worldView.x) * cam.zoom) / this.dpr, y: ((y - cam.worldView.y) * cam.zoom) / this.dpr };
  }

  /** Где сейчас цель (для автотестов). */
  targetPosition(kind: TargetKind, id: string): Point | null {
    const t = this.targets.find((x) => x.kind === kind && x.id === id);
    if (!t) return null;
    const b = t.obj.getBounds();
    return { x: b.centerX, y: b.centerY };
  }

  // ---------- построение сцены ----------

  /** Пикселей экрана на CSS-пиксель (холст рисуется в повышенном разрешении, см. main.ts). */
  private get dpr() { return 1 / (this.scale.zoom || 1); }

  /** Значок-пузырь над персонажем или предметом; появляется с «пружинкой». */
  private makeBubble(key: 'ui_alert' | 'ui_question' | 'ui_look') {
    const b = this.add.image(0, 0, key).setOrigin(0.5, 1).setDepth(10000).setScale(this.calm ? ART_SCALE : 0);
    if (!this.calm) this.tweens.add({ targets: b, scale: ART_SCALE, duration: 260, ease: 'Back.out' });
    return b;
  }

  // ---------- эффекты ----------

  /** Разлёт звёздочек (взял предмет). */
  private burst(key: string, x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const img = this.add.image(x, y, key).setDepth(9500).setScale(ART_SCALE * 0.9);
      this.tweens.add({ targets: img, x: x + Math.cos(a) * 14, y: y + Math.sin(a) * 10 - 6, alpha: 0, scale: ART_SCALE * 0.4, duration: this.calm ? 300 : 650, ease: 'Cubic.out', onComplete: () => img.destroy() });
    }
  }

  /** Сердечки/звёздочки поднимаются над головой (персонаж рад). */
  private floatUp(key: string, x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const img = this.add.image(x + (i - (n - 1) / 2) * 7, y, key).setDepth(9500).setScale(ART_SCALE).setAlpha(0);
      this.tweens.add({ targets: img, y: y - 14 - i * 2, alpha: { from: 1, to: 0 }, duration: 1000, delay: i * 140, ease: 'Sine.out', onComplete: () => img.destroy() });
    }
  }

  /** Облачко пыли из-под ног при ходьбе. */
  private puff(x: number, y: number) {
    const img = this.add.image(x + (Math.random() - 0.5) * 6, y, 'fx_puff').setDepth(y - 1).setScale(ART_SCALE * 0.6).setAlpha(0.7);
    this.tweens.add({ targets: img, y: y - 3, scale: ART_SCALE * 1.1, alpha: 0, duration: 450, onComplete: () => img.destroy() });
  }

  /** Круги на воде пруда. */
  private startRipples() {
    if (this.calm) return;
    const cells: { tx: number; ty: number }[] = [];
    this.deps.map.tiles.forEach((row, ty) => [...row].forEach((ch, tx) => { if (ch === '~') cells.push({ tx, ty }); }));
    if (!cells.length) return;
    this.time.addEvent({ delay: 650, loop: true, callback: () => {
      const c = cells[Math.floor(Math.random() * cells.length)];
      const img = this.add.image(c.tx * TILE + 4 + Math.random() * 8, c.ty * TILE + 4 + Math.random() * 8, 'fx_ripple').setDepth(-900).setScale(ART_SCALE * 0.4).setAlpha(0.9);
      this.tweens.add({ targets: img, scale: ART_SCALE * 1.2, alpha: 0, duration: 1500, ease: 'Sine.out', onComplete: () => img.destroy() });
    } });
  }

  /** Жители моргают в разное время (у стоящих спиной глаз не видно). */
  private updateBlinks() {
    const now = this.time.now;
    for (const t of this.targets) {
      if (t.kind !== 'npc') continue;
      const spr = t.obj as Phaser.GameObjects.Sprite;
      const dir = spr.getData('dir') as Facing;
      if (dir === 'up' || now < (spr.getData('blinkAt') as number)) continue;
      const look = spr.getData('look') as string;
      spr.setTexture(blinkKey(look, dir)).setData('blinkAt', now + 2500 + Math.random() * 3500);
      this.time.delayedCall(130, () => { if (spr.active && spr.getData('dir') === dir) spr.setTexture(kidFrameKey(look, dir, 0)); });
    }
  }

  private addItemTarget(kind: TargetKind, itemId: string, px: number, py: number, cells: { tx: number; ty: number; tw: number; th: number }, blocksFloor: boolean) {
    const item = this.deps.content.item(itemId);
    const img = this.add.image(px, py, `item_${item.sprite}`).setOrigin(0.5, 1).setDepth((cells.ty + cells.th) * TILE + 1).setScale(ART_SCALE);
    img.setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: img, scaleY: ART_SCALE * 1.06, yoyo: true, repeat: -1, duration: 900 + hash(cells.tx, cells.ty) * 400, ease: 'Sine.inOut' });
    const t: Target = { kind, id: itemId, ...cells, obj: img };
    if (blocksFloor) { this.grid.setDynamic(cells.tx, cells.ty, true); t.dynamicCell = { tx: cells.tx, ty: cells.ty }; }
    this.targets.push(t);
  }

  private removeTarget(t: Target) {
    this.tweens.killTweensOf(t.obj);
    t.obj.destroy();
    if (t.dynamicCell) this.grid.setDynamic(t.dynamicCell.tx, t.dynamicCell.ty, false);
    this.targets = this.targets.filter((x) => x !== t);
    if (this.nearby === t) this.nearby = null;
    if (this.pendingTarget === t) this.pendingTarget = null;
  }

  /** Если на героя поставили препятствие — сдвинуть его на ближайшую свободную клетку. */
  private pushHeroOut() {
    const c = this.grid.cellOf({ x: this.pos.x, y: this.pos.y - 2 });
    if (!this.grid.isBlocked(c.tx, c.ty)) return;
    const free = this.grid.nearestWalkable(c, this.pos);
    if (free) { this.pos = this.grid.feetOf(free); this.syncHero(); this.deps.onMoved(this.pos); }
  }

  private fitCamera() {
    const w = this.scale.width, h = this.scale.height;
    const vis = w >= h ? VISIBLE_LANDSCAPE : VISIBLE_PORTRAIT;
    const d = this.dpr;
    const z = Math.max(2 * d, Math.min(6 * d, Math.min(w / (vis.w * TILE), h / (vis.h * TILE))));
    const cam = this.cameras.main;
    cam.setZoom(z);
    const W = this.grid.cols * TILE, H = this.grid.rows * TILE;
    const viewW = w / z, viewH = h / z;
    cam.setBounds(viewW > W ? -(viewW - W) / 2 : 0, viewH > H ? -(viewH - H) / 2 : 0, Math.max(W, viewW), Math.max(H, viewH));
  }

  private drawFloor() {
    const key = `floor_${this.deps.map.id}`;
    this.add.image(0, 0, key).setOrigin(0, 0).setScale(artScale(key)).setDepth(-1000);
  }

  private drawFurniture() {
    for (const f of this.deps.map.furniture) {
      const img = this.add.image((f.tx + f.tw / 2) * TILE, (f.ty + f.th) * TILE, `furn_${f.key}`).setOrigin(0.5, 1).setScale(ART_SCALE);
      if (f.walkable) img.setOrigin(0, 0).setPosition(f.tx * TILE, f.ty * TILE).setDepth(-500);
      else img.setDepth((f.ty + f.th) * TILE);
    }
  }

  // ---------- управление ----------

  private onTap(world: Point) {
    // сначала — персонажи и предметы под пальцем (берём верхний)
    const hit = [...this.targets].sort((a, b) => b.obj.depth - a.obj.depth).find((t) => {
      const b = t.obj.getBounds();
      Phaser.Geom.Rectangle.Inflate(b, 4, 4);
      return b.contains(world.x, world.y);
    });
    if (hit) { this.walkToTarget(hit); return; }
    // Пип — в последнюю очередь: он часто стоит рядом с персонажами и не должен перехватывать касание
    if (this.pip) {
      const b = this.pip.getBounds(); Phaser.Geom.Rectangle.Inflate(b, 2, 2);
      if (b.contains(world.x, world.y)) { this.deps.bus.emit('interact', { kind: 'companion', id: 'pip' }); return; }
    }
    const cell = this.grid.nearestWalkable(this.grid.cellOf(world), world);
    if (!cell) return;
    this.pendingTarget = null;
    const exact = !this.grid.isBlockedAt(world.x, world.y) ? { x: world.x, y: world.y + 4 } : null;
    const cells = findPath(this.grid, this.heroCell(), cell);
    if (!cells) return;
    const pts = smoothPath(this.grid, this.pos, cells);
    if (exact && pts.length) pts[pts.length - 1] = exact;
    this.path = pts;
    this.showTapMark(pts[pts.length - 1] ?? this.pos);
  }

  private reachOf(t: Target) { return t.kind === 'npc' ? NPC_REACH : REACH; }

  private walkToTarget(t: Target) {
    if (distToRect(this.pos, t.tx, t.ty, t.tw, t.th) <= this.reachOf(t)) { this.faceTowards(t); this.interact(t); return; }
    let best: Point[] | null = null;
    let bestLen = Infinity;
    for (const s of this.grid.standCellsAround(t.tx, t.ty, t.tw, t.th)) {
      const cells = findPath(this.grid, this.heroCell(), s);
      if (cells && cells.length < bestLen) { bestLen = cells.length; best = smoothPath(this.grid, this.pos, cells); }
    }
    if (!best) return;
    this.path = best;
    this.pendingTarget = t;
    this.showTapMark(best[best.length - 1]);
  }

  private heroCell() {
    const c = this.grid.cellOf({ x: this.pos.x, y: this.pos.y - 2 });
    return this.grid.nearestWalkable(c, this.pos) ?? c;
  }

  private showTapMark(p: Point) {
    this.tapMark.setPosition(p.x, p.y).setAlpha(0.9).setScale(ART_SCALE);
    this.tweens.killTweensOf(this.tapMark);
    this.tweens.add({ targets: this.tapMark, alpha: 0, scale: ART_SCALE * 1.6, duration: 600 });
  }

  private stopWalking() { this.path = []; this.pendingTarget = null; }

  update() {
    // время по реальным часам (D20); предел 100 мс: шаг ≤ 6 px, сквозь стену не проскочить
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
      const before = { ...this.pos };
      if (dist <= stepLen) {
        this.step(vx, vy);
        this.path.shift();
        if (this.pos.x === before.x && this.pos.y === before.y && dist > 0.5) this.path = [];
      } else {
        this.step((vx / dist) * stepLen, (vy / dist) * stepLen);
        if (stepLen > 0 && Math.hypot(this.pos.x - before.x, this.pos.y - before.y) < stepLen * 0.2) this.path = [];
      }
      moving = true;
      if (!this.path.length && this.pendingTarget) {
        const t = this.pendingTarget;
        this.pendingTarget = null;
        if (this.targets.includes(t) && distToRect(this.pos, t.tx, t.ty, t.tw, t.th) <= this.reachOf(t) + 4) { this.faceTowards(t); this.interact(t); }
      }
    }

    const anim = `${this.deps.look}_walk_${this.facing}`;
    const t = this.time.now;
    if (moving) {
      if (this.hero.anims.currentAnim?.key !== anim || !this.hero.anims.isPlaying) this.hero.play(anim);
      if (!this.calm && t - this.lastPuff > 260) { this.lastPuff = t; this.puff(this.pos.x, this.pos.y); }
    } else {
      this.hero.anims.stop();
      if (t > this.heroNextBlink) { this.heroBlinkUntil = t + 130; this.heroNextBlink = t + 2500 + Math.random() * 3000; }
      const blink = this.facing !== 'up' && t < this.heroBlinkUntil;
      this.hero.setTexture(blink ? blinkKey(this.deps.look, this.facing) : kidFrameKey(this.deps.look, this.facing, 0));
    }
    this.updateBlinks();
    this.syncHero();
    this.checkExit();
    this.updatePip(dt);
    this.updateNearby();
    this.updateMarkers();
  }

  /** Вошёл в клетку-дверь (именно вошёл, а не стоит в ней) — переход или сообщение «закрыто». */
  private checkExit() {
    if (this.leaving) return;
    const c = this.grid.cellOf({ x: this.pos.x, y: this.pos.y - 1 });
    const k = this.grid.key(c);
    if (k === this.lastCellKey) return;
    const prevKey = this.lastCellKey;
    this.lastCellKey = k;
    const ex = this.deps.map.exits.find((e) => e.tx === c.tx && e.ty === c.ty);
    if (!ex) return;
    const locked = this.deps.canExit(ex);
    if (locked) {
      // вернуть на шаг назад
      this.stopWalking();
      const back = { tx: prevKey % this.grid.cols, ty: Math.floor(prevKey / this.grid.cols) };
      const free = this.grid.nearestWalkable(back, this.pos) ?? back;
      this.pos = this.grid.feetOf(free);
      this.lastCellKey = this.grid.key(free);
      this.syncHero();
      this.deps.onLocked(locked);
      return;
    }
    this.leaving = true;
    this.stopWalking();
    this.cameras.main.fadeOut(220, 27, 22, 38);
    this.cameras.main.once('camerafadeoutcomplete', () => this.deps.onExit(ex));
  }

  // ---------- спутник ----------

  private createPip() {
    this.pipPos = { x: this.pos.x - 14, y: this.pos.y };
    this.pip = this.add.image(this.pipPos.x, this.pipPos.y, 'pip_0').setOrigin(0.5, 1).setScale(ART_SCALE).setInteractive({ useHandCursor: true });
    this.trail = [];
  }

  private updatePip(dt: number) {
    if (!this.pip) return;
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(last.x - this.pos.x, last.y - this.pos.y) > 2) this.trail.push({ ...this.pos });
    if (this.trail.length > 12) this.trail.shift();
    const target = this.trail.length > 8 ? this.trail[this.trail.length - 9] : this.trail[0] ?? this.pos;
    const vx = target.x - this.pipPos.x, vy = target.y - this.pipPos.y;
    const d = Math.hypot(vx, vy);
    // держится рядом, но не залезает на героя
    const nearHero = Math.hypot(this.pos.x - this.pipPos.x, this.pos.y - this.pipPos.y) < 15;
    const moving = d > 1 && !nearHero;
    if (moving) { const st = Math.min(d, 70 * dt); this.pipPos = { x: this.pipPos.x + (vx / d) * st, y: this.pipPos.y + (vy / d) * st }; }
    const frame = moving && Math.floor(this.time.now / 160) % 2 ? 1 : 0;
    const left = vx < -0.5 || (!moving && this.pos.x < this.pipPos.x);
    this.pip.setTexture(`pip_${frame}${left ? '_l' : ''}`).setPosition(this.pipPos.x, this.pipPos.y).setDepth(this.pipPos.y);
    if (this.pipMarker) this.pipMarker.setPosition(this.pip.x, this.pip.y - 15 + Math.sin(this.time.now / 180) * 1.2);
  }

  /** «?» над спутником: у него есть вопрос (повторение в мире). */
  setCompanionMarker(on: boolean) {
    if (!this.pip) return;
    if (on && !this.pipMarker) this.pipMarker = this.makeBubble('ui_question');
    else if (!on && this.pipMarker) { this.pipMarker.destroy(); this.pipMarker = null; }
  }

  companionScreenPos() { return this.pip ? this.worldToScreen(this.pip.x, this.pip.y - 6) : null; }

  private step(dx: number, dy: number) {
    this.facing = facingFor(dx, dy, this.facing);
    const next = moveWithCollision(this.grid, this.pos, dx, dy);
    if (next.x !== this.pos.x || next.y !== this.pos.y) { this.pos = next; this.deps.onMoved(this.pos); }
  }

  private syncHero() {
    // без округления до единиц мира: при крупном масштабе оно давало рывки по 5–9 пикселей
    const { x, y } = this.pos;
    this.hero.setPosition(x, y + 1).setDepth(this.pos.y);
    this.heroShadow.setPosition(x, y).setDepth(this.pos.y - 0.5);
    this.carried?.setPosition(x, y - CHAR_H - 1);
  }

  private faceTowards(t: Target) {
    const cx = (t.tx + t.tw / 2) * TILE, cy = (t.ty + t.th / 2) * TILE;
    this.facing = facingFor(cx - this.pos.x, cy - (this.pos.y - 4), this.facing);
  }

  private updateNearby() {
    let best: Target | null = null;
    let bestScore = Infinity;
    for (const t of this.targets) {
      const d = distToRect(this.pos, t.tx, t.ty, t.tw, t.th);
      if (d > this.reachOf(t)) continue;
      const score = d - (t.kind === 'pick' ? 4 : 0); // предметы квеста — в приоритете
      if (score < bestScore) { bestScore = score; best = t; }
    }
    if (best !== this.nearby) {
      if (this.nearby && this.nearby.kind !== 'npc') (this.nearby.obj as Phaser.GameObjects.Image).clearTint();
      this.nearby = best;
      if (best && best.kind !== 'npc') (best.obj as Phaser.GameObjects.Image).setTint(0xfff3b0);
      this.deps.bus.emit('nearby-target', best ? { kind: best.kind, id: best.id } : null);
    }
    const bob = Math.sin(this.time.now / 180) * 1.2;
    if (best && best.kind !== 'npc') {
      this.marker.setVisible(true).setPosition(best.obj.x, best.obj.y - best.obj.displayHeight - 2 + bob);
    } else this.marker.setVisible(false);
  }

  private updateMarkers() {
    const bob = Math.sin(this.time.now / 180) * 1.2;
    for (const [npcId, m] of this.npcMarkers) {
      const t = this.targets.find((x) => x.kind === 'npc' && x.id === npcId);
      if (t) m.setPosition(t.obj.x, t.obj.y - t.obj.displayHeight - 1 + bob);
    }
  }

  private interactNearby() {
    if (this.blocked || !this.nearby || this.time.now - this.unblockedAt < 250) return;
    this.faceTowards(this.nearby);
    this.interact(this.nearby);
  }

  private interact(t: Target) {
    this.deps.bus.emit('interact', { kind: t.kind, id: t.id });
  }

  /** Для отладки и автотестов. */
  debugState() {
    return {
      x: this.pos.x, y: this.pos.y, facing: this.facing,
      nearby: this.nearby ? `${this.nearby.kind}:${this.nearby.id}` : null,
      walking: this.path.length > 0,
      pickables: this.targets.filter((t) => t.kind === 'pick').map((t) => t.id),
      npcs: this.targets.filter((t) => t.kind === 'npc').map((t) => t.id),
      markers: [...this.npcMarkers.keys()],
      highlighted: this.highlighted,
      location: this.deps.map.id,
      props: this.props.length,
      companion: !!this.pip,
      companionMarker: !!this.pipMarker,
    };
  }
}
