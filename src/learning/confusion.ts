// Учёт путаницы: какие пары слов ребёнок путает чаще всего.
import type { LearnEvent } from './types';

export function confusionPairs(events: LearnEvent[]): { a: string; b: string; count: number }[] {
  const m = new Map<string, number>();
  for (const e of events) {
    if (e.result !== 'wrong' || !e.chosen || e.chosen === e.item) continue;
    const [a, b] = [e.item, e.chosen].sort();
    const k = `${a}|${b}`;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([k, count]) => { const [a, b] = k.split('|'); return { a, b, count }; })
    .sort((x, y) => y.count - x.count || x.a.localeCompare(y.a));
}

export function confusionScore(events: LearnEvent[], item: string): number {
  return confusionPairs(events).filter((p) => p.a === item || p.b === item).reduce((s, p) => s + p.count, 0);
}
