// IndexedDB: хранилища по docs/ARCHITECTURE.md §5.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Clock } from '../core/clock';
import { DEFAULT_PROFILE, sanitizeSettings, type Profile, type WorldState } from './types';
import type { ItemState, LearnEvent } from '../learning/types';
import { MAX_EVENTS, MemoryLearningRepo, type LearningRepo } from '../learning/learningService';
import type { QuestState } from '../quests/questRunner';

export const DB_NAME = 'english-adventure';
export const SCHEMA_VERSION = 1;

interface GameDB extends DBSchema {
  profile: { key: string; value: Profile };
  items: { key: string; value: ItemState };
  events: { key: number; value: LearnEvent };
  quests: { key: string; value: QuestState };
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
  getMeta<T>(key: string): Promise<T | undefined>;
  setMeta(key: string, value: unknown): Promise<void>;
  getQuests(): Promise<Map<string, QuestState>>;
  saveQuest(id: string, q: QuestState): Promise<void>;
  /** Хранилище учебного прогресса (состояния слов и журнал событий). */
  learning: LearningRepo;
  /** Секунды игры по дням (ключ — местная дата YYYY-MM-DD). */
  getPlaytime(): Promise<Map<string, number>>;
  addPlaytime(day: string, seconds: number): Promise<number>;
  /** Всё содержимое — для выгрузки в файл. */
  dumpAll(): Promise<Dump>;
  /** Заменить всё содержимое (загрузка из файла). */
  loadAll(d: Dump): Promise<void>;
  clearAll(): Promise<void>;
}

export interface Dump {
  profile: Profile;
  world: WorldState | null;
  items: Map<string, ItemState>;
  events: LearnEvent[];
  quests: Map<string, QuestState>;
  playtime: Map<string, number>;
  meta: Record<string, unknown>;
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
  readonly learning: LearningRepo;
  constructor(private db: IDBPDatabase<GameDB>) {
    this.learning = {
      loadStates: async () => {
        const tx = db.transaction('items');
        const [keys, vals] = await Promise.all([tx.store.getAllKeys(), tx.store.getAll()]);
        return new Map(keys.map((k, i) => [k, vals[i]]));
      },
      saveState: async (id, st) => { await db.put('items', st, id); },
      loadEvents: async () => db.getAll('events'),
      appendEvent: async (e) => {
        const tx = db.transaction('events', 'readwrite');
        await tx.store.add(e);
        // кольцевой буфер: храним последние MAX_EVENTS событий
        const count = await tx.store.count();
        if (count > MAX_EVENTS) {
          let cur = await tx.store.openCursor();
          for (let i = 0; i < count - MAX_EVENTS && cur; i++) { await cur.delete(); cur = await cur.continue(); }
        }
        await tx.done;
      },
    };
  }
  async getMeta<T>(key: string) { return (await this.db.get('meta', key)) as T | undefined; }
  async setMeta(key: string, value: unknown) { await this.db.put('meta', value, key); }
  async getQuests() {
    const tx = this.db.transaction('quests');
    const [keys, vals] = await Promise.all([tx.store.getAllKeys(), tx.store.getAll()]);
    return new Map(keys.map((k, i) => [k, vals[i]]));
  }
  async saveQuest(id: string, q: QuestState) { await this.db.put('quests', q, id); }
  async getPlaytime() {
    const tx = this.db.transaction('playtime');
    const [keys, vals] = await Promise.all([tx.store.getAllKeys(), tx.store.getAll()]);
    return new Map(keys.map((k, i) => [k, vals[i]]));
  }
  async addPlaytime(day: string, seconds: number) {
    const tx = this.db.transaction('playtime', 'readwrite');
    const v = ((await tx.store.get(day)) ?? 0) + seconds;
    await tx.store.put(v, day);
    await tx.done;
    return v;
  }
  async dumpAll(): Promise<Dump> {
    const metaTx = this.db.transaction('meta');
    const [mk, mv] = await Promise.all([metaTx.store.getAllKeys(), metaTx.store.getAll()]);
    return {
      profile: await this.getProfile(), world: await this.getWorld(),
      items: await this.learning.loadStates(), events: await this.learning.loadEvents(),
      quests: await this.getQuests(), playtime: await this.getPlaytime(),
      meta: Object.fromEntries(mk.map((k, i) => [k, mv[i]])),
    };
  }
  async loadAll(d: Dump) {
    await this.clearAll();
    const tx = this.db.transaction(['profile', 'world', 'items', 'events', 'quests', 'playtime', 'meta'], 'readwrite');
    const w: Promise<unknown>[] = [tx.objectStore('profile').put({ ...d.profile, settings: sanitizeSettings(d.profile.settings) }, 'main')];
    if (d.world) w.push(tx.objectStore('world').put(d.world, 'main'));
    for (const [k, v] of d.items) w.push(tx.objectStore('items').put(v, k));
    for (const e of d.events) w.push(tx.objectStore('events').add(e));
    for (const [k, v] of d.quests) w.push(tx.objectStore('quests').put(v, k));
    for (const [k, v] of d.playtime) w.push(tx.objectStore('playtime').put(v, k));
    for (const [k, v] of Object.entries(d.meta)) w.push(tx.objectStore('meta').put(v, k));
    await Promise.all([...w, tx.done]);
  }
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
  learning = new MemoryLearningRepo();
  private quests = new Map<string, QuestState>();
  private meta = new Map<string, unknown>();
  private playtime = new Map<string, number>();
  async getPlaytime() { return new Map(this.playtime); }
  async addPlaytime(day: string, seconds: number) { const v = (this.playtime.get(day) ?? 0) + seconds; this.playtime.set(day, v); return v; }
  async dumpAll(): Promise<Dump> {
    return { profile: await this.getProfile(), world: this.world, items: await this.learning.loadStates(), events: await this.learning.loadEvents(),
      quests: new Map(this.quests), playtime: new Map(this.playtime), meta: Object.fromEntries(this.meta) };
  }
  async loadAll(d: Dump) {
    await this.clearAll();
    this.profile = d.profile; this.world = d.world; this.quests = new Map(d.quests); this.playtime = new Map(d.playtime);
    this.meta = new Map(Object.entries(d.meta));
    for (const [k, v] of d.items) await this.learning.saveState(k, v);
    for (const e of d.events) await this.learning.appendEvent(e);
  }
  async getMeta<T>(key: string) { return this.meta.get(key) as T | undefined; }
  async setMeta(key: string, value: unknown) { this.meta.set(key, value); }
  async getQuests() { return new Map(this.quests); }
  async saveQuest(id: string, q: QuestState) { this.quests.set(id, q); }
  private profile: Profile | undefined;
  private world: WorldState | null = null;
  async getProfile() { return normalizeProfile(this.profile); }
  async saveProfile(p: Profile) { this.profile = { ...p, settings: sanitizeSettings(p.settings) }; }
  async getWorld() { return this.world; }
  async saveWorld(w: WorldState) { this.world = w; }
  async clearAll() { this.profile = undefined; this.world = null; this.quests.clear(); this.meta.clear(); this.playtime.clear(); this.learning = new MemoryLearningRepo(); }
}

/** Просим браузер не удалять данные (важно для Safari, см. RISKS R5). */
export async function requestPersistentStorage(): Promise<boolean> {
  try { return (await navigator.storage?.persist?.()) ?? false; } catch { return false; }
}
