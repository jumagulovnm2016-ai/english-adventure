// Подтверждение навыков «Что ребёнок умеет» по журналу событий (правила — в content/can_do.json).
import type { Kind, LearnEvent } from './types';

export type CanDoRule =
  | { type: 'uses_in_contexts'; items: string[]; kinds: Kind[]; min_successes: number; min_distinct_contexts: number; min_distinct_days: number; min_spoken?: number }
  | { type: 'accuracy_after_delay'; items: string[]; kinds: Kind[]; min_correct_items: number; min_days_since_first_seen: number }
  | { type: 'streak'; items: string[]; kinds: Kind[]; consecutive_correct: number; min_distinct_contexts: number };

export interface CanDoSkill { id: string; order: number; title_ru: string; explain_ru: string; rule: CanDoRule }

export interface CanDoResult {
  status: 'not_started' | 'in_progress' | 'confirmed';
  confirmedAt: string | null;
  withoutVoice: boolean;
  /** Прогресс 0..1 — для отчёта родителю. */
  progress: number;
}

/** Календарный день по часовому поясу устройства. */
export function localDay(iso: string, tzOffsetMin = new Date(iso).getTimezoneOffset()): string {
  const d = new Date(new Date(iso).getTime() - tzOffsetMin * 60000);
  return d.toISOString().slice(0, 10);
}

const counts = (e: LearnEvent) => e.context !== 'placement';
const DAY = 864e5;

export function evaluateCanDo(skill: CanDoSkill, all: LearnEvent[], micEnabled: boolean, tzOffsetMin?: number): CanDoResult {
  const r = skill.rule;
  const relevant = all.filter((e) => r.items.includes(e.item) && r.kinds.includes(e.kind) && counts(e))
    .sort((a, b) => a.t.localeCompare(b.t));
  if (!relevant.length) {
    // ребёнок уже встречал эти слова/фразы, но пока только узнаёт (а навык требует, например, сказать сам)
    const touched = all.some((e) => r.items.includes(e.item) && counts(e));
    return { status: touched ? 'in_progress' : 'not_started', confirmedAt: null, withoutVoice: false, progress: touched ? 0.05 : 0 };
  }
  const good = relevant.filter((e) => e.result === 'correct' && !e.hinted);

  if (r.type === 'uses_in_contexts') {
    const needSpoken = micEnabled ? (r.min_spoken ?? 0) : 0;
    // ищем момент, когда все условия выполнились впервые
    const ctx = new Set<string>(), days = new Set<string>();
    let n = 0, spoken = 0;
    for (const e of good) {
      n++; ctx.add(e.context); days.add(localDay(e.t, tzOffsetMin)); if (e.kind === 'spoken') spoken++;
      if (n >= r.min_successes && ctx.size >= r.min_distinct_contexts && days.size >= r.min_distinct_days && spoken >= needSpoken) {
        return { status: 'confirmed', confirmedAt: e.t, withoutVoice: !micEnabled && (r.min_spoken ?? 0) > 0, progress: 1 };
      }
    }
    const parts = [n / r.min_successes, ctx.size / r.min_distinct_contexts, days.size / r.min_distinct_days];
    if (needSpoken) parts.push(spoken / needSpoken);
    return { status: 'in_progress', confirmedAt: null, withoutVoice: false, progress: Math.min(...parts.map((p) => Math.min(1, p))) * 0.99 };
  }

  if (r.type === 'accuracy_after_delay') {
    const first = new Map<string, number>();
    for (const e of relevant) if (!first.has(e.item)) first.set(e.item, new Date(e.t).getTime());
    // последняя «отложенная» попытка по каждому элементу
    const last = new Map<string, LearnEvent>();
    for (const e of relevant) {
      if (e.hinted) continue;
      if (new Date(e.t).getTime() - first.get(e.item)! >= r.min_days_since_first_seen * DAY) last.set(e.item, e);
    }
    const okItems = [...last.values()].filter((e) => e.result === 'correct');
    if (okItems.length >= r.min_correct_items) {
      const at = okItems.map((e) => e.t).sort()[r.min_correct_items - 1];
      return { status: 'confirmed', confirmedAt: at, withoutVoice: false, progress: 1 };
    }
    return { status: 'in_progress', confirmedAt: null, withoutVoice: false, progress: Math.min(0.99, okItems.length / r.min_correct_items) };
  }

  // streak
  let run = 0;
  let ctx = new Set<string>();
  let best = 0;
  for (const e of relevant) {
    if (e.result === 'unsure') continue;
    if (e.result === 'correct' && !e.hinted) { run++; ctx.add(e.context); } else { run = 0; ctx = new Set(); }
    best = Math.max(best, run);
    if (run >= r.consecutive_correct && ctx.size >= r.min_distinct_contexts) return { status: 'confirmed', confirmedAt: e.t, withoutVoice: false, progress: 1 };
  }
  return { status: 'in_progress', confirmedAt: null, withoutVoice: false, progress: Math.min(0.99, best / r.consecutive_correct) };
}
