import { describe, it, expect } from 'vitest';
import { loadContent } from '../src/content/load';
import { planErrands, ERRAND_PLACES, isErrand } from '../src/quests/errands';
import { MAPS } from '../src/game/maps';
import { QuestRunner } from '../src/quests/questRunner';
import type { Location } from '../src/content/types';

const c = loadContent();
const ALL: Location[] = ['home', 'street', 'shop', 'school', 'playground', 'zoo'];

describe('Ежедневные поручения', () => {
  it('в каждой локации есть место минимум на 4 предмета, предметы существуют и их можно взять', () => {
    for (const l of ALL) {
      const p = ERRAND_PLACES[l];
      expect(MAPS[l].spots[p.zone]?.length ?? 0, `${l}/${p.zone}`).toBeGreaterThanOrEqual(4);
      for (const i of p.items) expect(c.item(i).pickable, i).toBe(true);
    }
  });

  it('3 поручения: 2 «найди и принеси» в разных местах и 1 викторина', () => {
    const plan = planErrands({ date: '2026-11-20', content: c, visited: ALL, due: ['w.bike', 'w.kite', 'w.blue'], inventory: [] });
    expect(plan.quests).toHaveLength(3);
    const finds = plan.quests.filter((q) => q.steps.some((s) => s.type === 'find_item'));
    expect(finds).toHaveLength(2);
    expect(new Set(finds.map((q) => q.location)).size).toBe(2);
    expect(plan.quests.some((q) => q.steps.some((s) => s.type === 'review_slot'))).toBe(true);
    // слова, которые пора повторить, тянут поручение на площадку
    expect(finds.some((q) => q.location === 'playground')).toBe(true);
    expect(plan.quests.every((q) => isErrand(q.id) && q.requires.length === 0)).toBe(true);
  });

  it('один и тот же день — один и тот же план; другой день — другой', () => {
    const a = planErrands({ date: '2026-11-20', content: c, visited: ALL, due: [], inventory: [] });
    const b = planErrands({ date: '2026-11-20', content: c, visited: ALL, due: [], inventory: [] });
    const d = planErrands({ date: '2026-11-21', content: c, visited: ALL, due: [], inventory: [] });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(d));
  });

  it('поручения дают только там, где ребёнок уже был; без посещённых мест — ничего', () => {
    expect(planErrands({ date: '2026-11-20', content: c, visited: [], due: [], inventory: [] }).quests).toHaveLength(0);
    const plan = planErrands({ date: '2026-11-20', content: c, visited: ['home'], due: [], inventory: [] });
    expect(plan.quests.every((q) => q.location === 'home')).toBe(true);
  });

  it('всё, на что ссылаются поручения, существует; квест проходится движком', () => {
    for (const date of ['2026-11-20', '2026-11-22', '2026-12-01', '2027-01-05']) {
      const plan = planErrands({ date, content: c, visited: ALL, due: [], inventory: [] });
      c.setDynamic({ quest: 'q.daily.', dialogue: 'd.daily.', phrase: 'p.daily.' }, plan);
      for (const q of plan.quests) {
        expect(c.quest(q.id)).toBe(q);
        for (const s of q.steps) {
          if (s.dialogue) {
            const d = c.dialogue(s.dialogue);
            for (const n of Object.values(d.nodes)) {
              if (n.say) expect(() => c.learnable(n.say!), `${d.id}: ${n.say}`).not.toThrow();
              if (n.task) { c.learnable(n.task.target); for (const o of n.task.options ?? []) c.learnable(o); expect(n.task.options ?? [n.task.target]).toContain(n.task.target); }
              for (const nx of [n.next, n.on_correct, n.on_wrong]) if (nx && nx !== 'end') expect(d.nodes[nx], `${d.id} → ${nx}`).toBeDefined();
            }
          }
          if (s.type === 'find_item') {
            expect(s.distractors).toHaveLength(3);
            expect(s.distractors).not.toContain(s.target);
            expect(c.learnable(s.instruction!).en).toMatch(/^Find .+, please\.$/);
          }
        }
        // проходится: каждый шаг завершается
        const r = new QuestRunner(q, null);
        let guard = 0;
        while (!r.finished && guard++ < 10) r.next();
        expect(r.finished).toBe(true);
      }
    }
  });

  it('поручение не дают жителю, у которого ждёт свой сюжетный квест', () => {
    const plan = planErrands({ date: '2026-11-20', content: c, visited: ['street'], due: [], inventory: [], busyNpcs: ['npc.mrs_brown'] });
    expect(plan.quests.length).toBeGreaterThan(0);
    expect(plan.quests.every((q) => q.giver === 'npc.ben')).toBe(true);
    expect(planErrands({ date: '2026-11-20', content: c, visited: ['street'], due: [], inventory: [], busyNpcs: ['npc.mrs_brown', 'npc.ben'] }).quests).toHaveLength(0);
  });

  it('предмет из рюкзака не прячут ещё раз', () => {
    const plan = planErrands({ date: '2026-11-20', content: c, visited: ['home'], due: ['w.cup'], inventory: ['it.cup_blue', 'it.cup_red'] });
    for (const q of plan.quests) for (const s of q.steps) if (s.type === 'find_item') expect(['it.cup_blue', 'it.cup_red']).not.toContain(s.target);
  });
});
