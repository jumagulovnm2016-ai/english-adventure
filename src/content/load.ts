// Загрузка контента из content/*.json. Vite встраивает JSON в сборку, поэтому игра работает офлайн.
import vocabulary from '../../content/vocabulary.json';
import phrases from '../../content/phrases.json';
import items from '../../content/items.json';
import npcs from '../../content/npcs.json';
import canDo from '../../content/can_do.json';
import { ContentRegistry } from './registry';
import type { DialogueDef, QuestDef, RawContent } from './types';

const questFiles = import.meta.glob('../../content/quests/*.json', { eager: true, import: 'default' });
const dialogueFiles = import.meta.glob('../../content/dialogues/*.json', { eager: true, import: 'default' });

export function loadContent(): ContentRegistry {
  return new ContentRegistry({
    vocabulary, phrases, items, npcs, canDo,
    quests: Object.values(questFiles) as QuestDef[],
    dialogues: Object.values(dialogueFiles) as DialogueDef[],
  } as RawContent);
}
