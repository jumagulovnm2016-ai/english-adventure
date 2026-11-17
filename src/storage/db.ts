// IndexedDB: хранилища по docs/ARCHITECTURE.md §5.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Clock } from '../core/clock';
import { DEFAULT_PROFILE, sanitizeSettings, type Profile, type WorldState } from './types';

export const DB_NAME = 'english-adventure';
export const SCHEMA_VERSION = 1;

interface GameDB extends DBSchema {
  profile: { key: string; value: Profile };
  items: { key: string; value: unknown };
  events: { key: number; value: unknown };
  quests: { key: string; value: unknown };
  world: { key: string; value: WorldState };
  canDo: { key: string; value: unknown };
  playtime: { key: string; value: number };
  meta: { key: string; value: unknown };
}

/** Хранилище прогресса. Если IndexedDB недоступна (приватный режим, песочница) — работает в памяти и сообщает об этом. */
export interface Store {
  readonly persistent: boolean;
  getProfile(): Promise<Profile>;
  saveProfile(p: Profile): Promise<void>;
  getWorld(): Promise<WorldState | null>;
  saveWorld(w: WorldState): Promise<void>;
  clearAll(): Promise<void>;
}

export async function openStore(clock: Clock): Promise<Store> {
  try {
    const db = await openDB<GameDB>(DB_NAME, SCHEMA_VERSION, {
      upgrade(db) {
        for (const name of ['profile', 'items', 'quests', 'world', 'canDo', 'playtime', 'meta'] as const) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
        }
        if (!db.objectStoreNames.contains('events')) db.createObjectStore('events', { autoIncrement: true });
      },
    });
    if (!(await db.get('meta', 'installedAt'))) {
      await db.put('meta', clock.now().toISOString(), 'installedAt');
      await db.put('meta', SCHEMA_VERSION, 'schemaVersion');
    }
    return new IdbStore(db);
  } catch (e) {
    console.warn('IndexedDB недоступна, прогресс не сохранится между сессиями', e);
    return new MemoryStore();
  }
}

function normalizeProfile(p: Profile | undefined): Profile {
  if (!p) return structuredClone(DEFAULT_PROFILE);
  return { ...DEFAULT_PROFILE, ...p, settings: sanitizeSettings(p.settings) };
}

class IdbStore implements Store {
  readonly persistent = true;
  constructor(private db: IDBPDatabase<GameDB>) {}
  async getProfile() { return normalizeProfile(await this.db.get('profile', 'main')); }
  async saveProfile(p: Profile) { await this.db.put('profile', { ...p, settings: sanitizeSettings(p.settings) }, 'main'); }
  async getWorld() { return (await this.db.get('world', 'main')) ?? null; }
  async saveWorld(w: WorldState) { await this.db.put('world', w, 'main'); }
  async clearAll() {
    const names = Array.from(this.db.objectStoreNames);
    const tx = this.db.transaction(names, 'readwrite');
    await Promise.all([...names.map((n) => tx.objectStore(n).clear()), tx.done]);
  }
}

class MemoryStore implements Store {
  readonly persistent = false;
  private profile: Profile | undefined;
  private world: WorldState | null = null;
  async getProfile() { return normalizeProfile(this.profile); }
  async saveProfile(p: Profile) { this.profile = { ...p, settings: sanitizeSettings(p.settings) }; }
  async getWorld() { return this.world; }
  async saveWorld(w: WorldState) { this.world = w; }
  async clearAll() { this.profile = undefined; this.world = null; }
}

/** Просим браузер не удалять данные (важно для Safari, см. RISKS R5). */
export async function requestPersistentStorage(): Promise<boolean> {
  try { return (await navigator.storage?.persist?.()) ?? false; } catch { return false; }
}
