// Сравнение ответа с ожидаемым: для голоса (по распознанному тексту) и для ввода слова.
import type { Result } from './types';

export function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Расстояние редактирования; перестановка соседних букв («bleu» → «blue») считается одной ошибкой. */
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[m][n];
}

/** Набранное слово: допускаем одну опечатку, если слово длиннее 3 букв. */
export function matchTyped(input: string, expected: string, accept: string[] = []): Result {
  const got = normalize(input);
  if (!got) return 'unsure';
  const targets = [expected, ...accept].map(normalize);
  if (targets.includes(got)) return 'correct';
  if (targets.some((t) => t.length > 3 && levenshtein(got, t) <= 1)) return 'correct';
  return 'wrong';
}

/**
 * Распознанная речь (варианты от распознавателя, лучший первый).
 * correct — есть точное совпадение с допустимым вариантом (или вариант содержит его целиком);
 * unsure — распознаватель ничего внятного не дал или он не уверен;
 * wrong — внятно сказано другое слово из того же набора вариантов (например, перепутал цвет).
 */
export function matchSpoken(alternatives: { text: string; confidence?: number }[], expected: string, accept: string[] = [], competitors: string[] = []): Result {
  const targets = [expected, ...accept].map(normalize).filter(Boolean);
  const alts = alternatives.map((a) => ({ text: normalize(a.text), conf: a.confidence ?? 1 })).filter((a) => a.text);
  if (!alts.length) return 'unsure';
  const has = (text: string, t: string) => text === t || ` ${text} `.includes(` ${t} `);
  if (alts.some((a) => targets.some((t) => has(a.text, t)))) return 'correct';
  const comp = competitors.map(normalize).filter(Boolean);
  const best = alts[0];
  if (best.conf >= 0.6 && comp.some((c) => has(best.text, c))) return 'wrong';
  return 'unsure';
}

/** Собранная фраза из кусков. */
export function matchPieces(chosen: string[], pieces: string[]): Result {
  return chosen.length === pieces.length && chosen.every((p, i) => p === pieces[i]) ? 'correct' : 'wrong';
}
