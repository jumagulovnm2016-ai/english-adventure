// Файл прогресса: выгрузка (резервная копия, перенос на другое устройство) и загрузка с проверкой по schemas/save.schema.json.
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import common from '../../schemas/common.schema.json';
import saveSchema from '../../schemas/save.schema.json';
import type { Dump } from '../storage/db';
import type { CanDoResult } from '../learning/canDo';
import { SCHEMA_VERSION } from '../storage/db';

export const SAVE_FORMAT = 'english-adventure-save';

export interface SaveFile {
  format: typeof SAVE_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  profile: Dump['profile'];
  items: Record<string, unknown>;
  events: unknown[];
  quests: Record<string, unknown>;
  world: NonNullable<Dump['world']>;
  canDo: Record<string, { status: CanDoResult['status']; confirmedAt: string | null; withoutVoice: boolean }>;
  playtime: Record<string, number>;
  meta: { installedAt: string; placement: unknown };
}

let validator: ReturnType<Ajv2020['compile']> | null = null;
function validate(v: unknown) {
  if (!validator) {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    ajv.addSchema(common);
    validator = ajv.compile(saveSchema);
  }
  const ok = validator(v);
  return { ok: !!ok, errors: (validator.errors ?? []).slice(0, 3).map((e) => `${e.instancePath || '/'} ${e.message}`) };
}

export function buildSave(d: Dump, canDo: Map<string, CanDoResult>, now: Date): SaveFile {
  const world = d.world ?? { location: 'home', x: -1, y: -1, inventory: [], roomDecor: [] };
  return {
    format: SAVE_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    profile: d.profile,
    items: Object.fromEntries(d.items),
    events: d.events,
    quests: Object.fromEntries(d.quests),
    world: { ...world, x: Math.max(-1, world.x), y: Math.max(-1, world.y) },
    canDo: Object.fromEntries([...canDo].map(([k, v]) => [k, { status: v.status, confirmedAt: v.confirmedAt, withoutVoice: v.withoutVoice }])),
    playtime: Object.fromEntries(d.playtime),
    meta: { installedAt: String(d.meta.installedAt ?? now.toISOString()), placement: d.meta.placement ?? null },
  };
}

/** Проверить файл и превратить его в содержимое хранилища. Ошибка — понятным текстом для родителя. */
export function parseSave(text: string): { ok: true; dump: Dump; save: SaveFile } | { ok: false; error: string } {
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { ok: false, error: 'Это не файл прогресса (не читается).' }; }
  const f = data as Partial<SaveFile>;
  if (f?.format !== SAVE_FORMAT) return { ok: false, error: 'Это не файл прогресса English Adventure.' };
  if (typeof f.schemaVersion !== 'number' || f.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, error: 'Файл сохранён более новой версией игры. Обновите игру и попробуйте снова.' };
  }
  // миграций пока нет: единственная версия формата — 1
  const v = validate(data);
  if (!v.ok) return { ok: false, error: `Файл повреждён: ${v.errors.join('; ')}` };
  const s = data as SaveFile;
  const dump: Dump = {
    profile: s.profile,
    world: s.world,
    items: new Map(Object.entries(s.items)) as Dump['items'],
    events: s.events as Dump['events'],
    quests: new Map(Object.entries(s.quests)) as Dump['quests'],
    playtime: new Map(Object.entries(s.playtime)),
    meta: { installedAt: s.meta.installedAt, placement: s.meta.placement, onboarded: true, schemaVersion: SCHEMA_VERSION },
  };
  return { ok: true, dump, save: s };
}
