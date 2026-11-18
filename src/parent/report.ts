// Отчёт для родителя: только подтверждённое реальными ответами, а не «сколько пройдено уроков».
import type { ContentRegistry } from '../content/registry';
import type { LearningService } from '../learning/learningService';
import type { QuestState } from '../quests/questRunner';
import type { CanDoResult } from '../learning/canDo';
import type { Status } from '../learning/types';
import { dayKey } from '../app/playtime';

export interface WordRow { id: string; en: string; ru: string; status: Status; correct: number; wrong: number; phrase: boolean }
export interface SkillRow extends CanDoResult { id: string; title: string; explain: string }

export interface Report {
  summary: { questsDone: number; questsTotal: number; stars: number; learned: number; learning: number; familiar: number; minutesWeek: number; daysPlayed14: number };
  skills: SkillRow[];
  words: { learned: WordRow[]; learning: WordRow[]; familiar: WordRow[] };
  hard: WordRow[];
  confusions: { a: string; b: string; aRu: string; bRu: string; count: number }[];
  days: { day: string; minutes: number }[];
}

export function buildReport(args: {
  content: ContentRegistry; learning: LearningService; quests: Map<string, QuestState>;
  playtime: Map<string, number>; now: Date; micEnabled: boolean;
}): Report {
  const { content, learning, quests, playtime, now } = args;
  const nameOf = (id: string) => { try { const l = content.learnable(id); return { en: l.en.replace(/…/g, '').trim(), ru: l.ru }; } catch { return { en: id, ru: '' }; } };

  // слова и фразы, которые ребёнок уже встречал
  const rows: WordRow[] = [];
  for (const [id, st] of learning.allStates()) {
    if (st.status === 'new') continue;
    const n = nameOf(id);
    rows.push({ id, ...n, status: st.status, correct: st.correct, wrong: st.wrong, phrase: id.startsWith('p.') });
  }
  rows.sort((a, b) => a.en.localeCompare(b.en));
  const by = (s: Status) => rows.filter((r) => r.status === s);

  const canDo = learning.canDo(content.skills, args.micEnabled);
  const skills: SkillRow[] = content.skills.map((s) => ({ id: s.id, title: s.title_ru, explain: s.explain_ru, ...canDo.get(s.id)! }));

  // 14 дней, начиная с сегодняшнего назад
  const days: { day: string; minutes: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = dayKey(new Date(now.getTime() - i * 864e5));
    days.push({ day: d, minutes: Math.round((playtime.get(d) ?? 0) / 60) });
  }
  const questsAll = content.quests();
  const done = questsAll.filter((q) => quests.get(q.id)?.status === 'done');

  return {
    summary: {
      questsDone: done.length, questsTotal: questsAll.length,
      stars: done.reduce((s, q) => s + (quests.get(q.id)?.stars ?? 0), 0),
      learned: by('learned').length, learning: by('learning').length, familiar: by('familiar_pending').length,
      minutesWeek: days.slice(-7).reduce((s, d) => s + d.minutes, 0),
      daysPlayed14: days.filter((d) => d.minutes > 0).length,
    },
    skills,
    words: { learned: by('learned'), learning: by('learning'), familiar: by('familiar_pending') },
    // «сложные»: ошибок не меньше двух и больше, чем верных ответов
    hard: rows.filter((r) => r.wrong >= 2 && r.wrong > r.correct).sort((a, b) => b.wrong - a.wrong).slice(0, 6),
    confusions: learning.confusions().slice(0, 5).map((c) => ({ ...c, a: nameOf(c.a).en, b: nameOf(c.b).en, aRu: nameOf(c.a).ru, bRu: nameOf(c.b).ru })),
    days,
  };
}
