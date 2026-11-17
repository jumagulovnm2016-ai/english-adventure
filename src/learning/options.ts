// Варианты ответа для «послушай и выбери»: правильный + похожие (из confusable и той же темы).
import type { ContentRegistry } from '../content/registry';

/** Детерминированное перемешивание (seed), чтобы тесты были воспроизводимы. */
export function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed >>> 0 || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildOptions(content: ContentRegistry, target: string, given: string[] | undefined, count: number, seed: number): string[] {
  if (given?.length) return shuffle(given.includes(target) ? given : [target, ...given], seed);
  const picked: string[] = [target];
  const add = (id: string) => { if (!picked.includes(id) && picked.length < count) picked.push(id); };
  if (target.startsWith('w.')) {
    const w = content.word(target);
    for (const c of w.confusable ?? []) add(c);
    for (const o of shuffle(content.wordsByTopic(w.topic).map((x) => x.id), seed)) add(o);
  } else {
    // для фраз — другие фразы, которые ребёнок должен уметь говорить
    for (const o of shuffle(content.productivePhrases().map((x) => x.id), seed)) add(o);
  }
  return shuffle(picked, seed + 7);
}
