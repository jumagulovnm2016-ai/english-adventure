// Какой режим ответа дать ребёнку (docs/ARCHITECTURE.md §3, «Выбор режима ответа»).
import type { ItemState, TaskMode } from './types';

export interface ModeContext {
  ageMode: 'junior' | 'senior';
  /** Есть ли проверенное распознавание речи на устройстве и включён ли микрофон. */
  canListen: boolean;
  /** Есть ли у фразы куски для сборки. */
  hasPieces: boolean;
  isWord: boolean;
}

export function selectMode(state: ItemState, requested: TaskMode | 'auto', allowed: TaskMode[] | undefined, ctx: ModeContext): TaskMode {
  const feasible = (m: TaskMode) =>
    (m !== 'say_aloud' || ctx.canListen) &&
    (m !== 'type_word' || (ctx.ageMode === 'senior' && ctx.isWord)) &&
    (m !== 'build_phrase' || ctx.hasPieces) &&
    (!allowed || allowed.includes(m));

  if (requested !== 'auto') return feasible(requested) ? requested : 'listen_choose';

  const box = state.status === 'new' ? 0 : state.box;
  const prefs: TaskMode[] =
    box <= 1 ? ['listen_choose'] :
    box === 2 ? ['build_phrase', 'listen_choose'] :
    ctx.ageMode === 'senior' ? ['say_aloud', 'type_word', 'build_phrase', 'listen_choose'] :
    ['say_aloud', 'build_phrase', 'listen_choose'];
  return prefs.find(feasible) ?? 'listen_choose';
}
