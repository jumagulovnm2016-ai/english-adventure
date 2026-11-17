// Загрузка контента из content/*.json. Vite встраивает JSON в сборку, поэтому игра работает офлайн.
import vocabulary from '../../content/vocabulary.json';
import phrases from '../../content/phrases.json';
import items from '../../content/items.json';
import npcs from '../../content/npcs.json';
import { ContentRegistry } from './registry';
import type { RawContent } from './types';

export function loadContent(): ContentRegistry {
  return new ContentRegistry({ vocabulary, phrases, items, npcs } as RawContent);
}
