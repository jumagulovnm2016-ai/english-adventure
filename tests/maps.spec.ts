// Все карты: проходимость, двери, места для предметов, персонажи квестов.
import { describe, it, expect } from 'vitest';
import { Grid } from '../src/game/world/grid';
import { MAPS, locationOfSpots, locationOfZone } from '../src/game/maps';
import { loadContent } from '../src/content/load';

const content = loadContent();
const quests = content.quests();

for (const map of Object.values(MAPS)) {
  describe(`Карта «${map.title.ru}»`, () => {
    const g = new Grid(map);
    const spawn = { tx: map.spawn.tx, ty: map.spawn.ty };
    // всё, что может стоять на полу одновременно
    const full = new Grid(map);
    for (const n of map.npcs) full.setDynamic(n.tx, n.ty, true);
    for (const set of Object.values(map.spots)) for (const s of set) if (!s.onFurniture) full.setDynamic(s.tx, s.ty, true);
    for (const d of Object.values(map.decor)) full.setDynamic(d.tx, d.ty, true);
    const reach = full.reachableFrom(spawn);

    it('точка появления проходима', () => expect(g.isBlocked(spawn.tx, spawn.ty)).toBe(false));
    it('все клетки пола связаны', () => {
      const r = g.reachableFrom(spawn);
      for (let ty = 0; ty < g.rows; ty++) for (let tx = 0; tx < g.cols; tx++)
        if (!g.isBlocked(tx, ty)) expect(r.has(g.key({ tx, ty })), `${tx},${ty}`).toBe(true);
    });
    it('к каждому персонажу, месту и предмету можно подойти, даже когда всё расставлено', () => {
      const ok = (name: string, tx: number, ty: number) =>
        expect(full.standCellsAround(tx, ty, 1, 1).some((c) => reach.has(full.key(c))), `${name}: не подойти`).toBe(true);
      for (const n of map.npcs) ok(n.npcId, n.tx, n.ty);
      // места для «найди» — подходим к каждому; места только для показа (утки на пруду) — не обязательно
      const pickZones = new Set(quests.flatMap((q) => q.steps.filter((s) => s.type === 'find_item').map((s) => s.zone!)));
      for (const [k, set] of Object.entries(map.spots)) if (pickZones.has(k)) set.forEach((s, i) => ok(`${k}[${i}]`, s.tx, s.ty));
      for (const it of map.items) ok(it.itemId, it.tx, it.ty);
    });
    it('двери: проходимы, достижимы, ведут на свободную клетку не в двери', () => {
      for (const e of map.exits) {
        expect(g.isBlocked(e.tx, e.ty), `дверь ${e.tx},${e.ty}`).toBe(false);
        expect(reach.has(g.key({ tx: e.tx, ty: e.ty })), `дверь ${e.tx},${e.ty} недостижима`).toBe(true);
        const target = MAPS[e.to];
        const tg = new Grid(target);
        expect(tg.isBlocked(e.spawn.tx, e.spawn.ty), `${map.id}→${e.to}: появление в стене`).toBe(false);
        expect(target.exits.some((x) => x.tx === e.spawn.tx && x.ty === e.spawn.ty), `${map.id}→${e.to}: появление прямо в двери`).toBe(false);
        // есть дверь обратно
        expect(target.exits.some((x) => x.to === map.id), `из ${e.to} нет двери в ${map.id}`).toBe(true);
      }
    });
    it('места на мебели — на мебели или воде, на полу — на свободном полу', () => {
      for (const set of Object.values(map.spots)) for (const s of set) {
        const onF = map.furniture.some((f) => !f.walkable && s.tx >= f.tx && s.tx < f.tx + f.tw && s.ty >= f.ty && s.ty < f.ty + f.th);
        const onWater = map.tiles[s.ty][s.tx] === '~';
        if (s.onFurniture) expect(onF || onWater, `место ${s.tx},${s.ty}`).toBe(true);
        else expect(g.isBlocked(s.tx, s.ty), `место ${s.tx},${s.ty} занято`).toBe(false);
      }
    });
    it('персонажи на этой карте живут в этой локации', () => {
      for (const n of map.npcs) expect(content.npc(n.npcId).location, n.npcId).toBe(map.id);
    });
  });
}

describe('Квесты и карты', () => {
  it('все места, зоны и персонажи из квестов есть на картах', () => {
    for (const q of quests) {
      for (const s of q.steps) {
        if (s.type === 'find_item') {
          const loc = locationOfSpots(s.zone!);
          expect(loc, `${q.id}/${s.id}: нет мест ${s.zone}`).not.toBeNull();
          expect(MAPS[loc!].spots[s.zone!].length).toBeGreaterThanOrEqual(1 + s.distractors!.length);
        }
        if (s.show) {
          const loc = locationOfSpots(s.show.zone);
          expect(loc, `${q.id}/${s.id}: нет мест для показа ${s.show.zone}`).not.toBeNull();
          expect(MAPS[loc!].spots[s.show.zone].length).toBeGreaterThanOrEqual(s.show.items.length);
        }
        if (s.type === 'go_to') expect(locationOfZone(s.zone!), `${q.id}: нет зоны ${s.zone}`).not.toBeNull();
        const npcs = s.type === 'dialogue' ? [content.dialogue(s.dialogue!).npc] : s.type === 'give_item' ? [s.npc!] : [];
        for (const id of npcs) {
          const loc = content.npc(id).location;
          expect(MAPS[loc].npcs.some((n) => n.npcId === id), `${q.id}: ${id} нет на карте ${loc}`).toBe(true);
        }
      }
      expect(MAPS[content.npc(q.giver).location].npcs.some((n) => n.npcId === q.giver)).toBe(true);
      for (const d of q.rewards.decor ?? []) expect(Object.values(MAPS).some((m) => m.decor[d]), d).toBe(true);
    }
  });
  it('имена зон и наборов мест не повторяются между картами', () => {
    const seen = new Map<string, string>();
    for (const m of Object.values(MAPS)) for (const k of [...Object.keys(m.spots), ...Object.keys(m.zones)]) {
      expect(seen.has(k), `${k} есть и в ${seen.get(k)}, и в ${m.id}`).toBe(false);
      seen.set(k, m.id);
    }
  });
  it('двери открываются по квестам, которые существуют; цепочка квестов проходима от начала до конца', () => {
    for (const m of Object.values(MAPS)) for (const e of m.exits) if (e.requires) expect(() => content.quest(e.requires!)).not.toThrow();
    // все квесты достижимы по требованиям
    const done = new Set<string>();
    let progress = true;
    while (progress) {
      progress = false;
      for (const q of quests) if (!done.has(q.id) && q.requires.every((r) => done.has(r))) { done.add(q.id); progress = true; }
    }
    expect(done.size).toBe(quests.length);
    expect(quests.length).toBeGreaterThanOrEqual(12);
  });
});
