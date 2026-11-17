// Что повторить сейчас: элементы, у которых подошёл срок; сначала те, что чаще путают и дольше ждут.
import type { ItemState, LearnEvent } from './types';
import type { Scheduler } from './scheduler';
import { confusionScore } from './confusion';

export interface PickArgs {
  states: Map<string, ItemState>;
  events: LearnEvent[];
  now: Date;
  count: number;
  exclude?: string[];
  topicOf?: (id: string) => string | undefined;
  preferTopics?: string[];
}

export function pickForReview(s: Scheduler, a: PickArgs): string[] {
  const candidates = [...a.states.entries()]
    .filter(([id, st]) => !a.exclude?.includes(id) && s.isDue(st, a.now));
  const score = (id: string, st: ItemState) => {
    const overdueDays = st.due ? (a.now.getTime() - new Date(st.due).getTime()) / 864e5 : 0;
    const topicBonus = a.preferTopics?.length && a.topicOf && a.preferTopics.includes(a.topicOf(id) ?? '') ? 2 : 0;
    return confusionScore(a.events, id) * 3 + Math.min(overdueDays, 7) + topicBonus + (st.box === 0 ? 1 : 0);
  };
  return candidates.sort((x, y) => score(y[0], y[1]) - score(x[0], x[1]) || x[0].localeCompare(y[0]))
    .slice(0, a.count).map(([id]) => id);
}
