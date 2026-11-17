// Типы сохранённых данных. Соответствуют schemas/save.schema.json.
import type { Accent, Gender, Location } from '../content/types';

export interface Settings {
  accent: Accent;
  narrator: Gender;
  volume: number;          // 0..1
  uiScale: number;         // 0.75..2
  microphone: boolean;
  companionChatter: 'rare' | 'normal' | 'often';
  ruHints: boolean;
  dailyLimitMin: number | null;
}

export interface Profile {
  name: string;
  avatar: string;
  ageMode: 'junior' | 'senior';
  settings: Settings;
}

export interface WorldState {
  location: Location;
  x: number;
  y: number;
  inventory: string[];
  roomDecor: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  accent: 'uk',
  narrator: 'f',
  volume: 0.8,
  uiScale: 1,
  microphone: false,
  companionChatter: 'normal',
  ruHints: true,
  dailyLimitMin: null,
};

export const DEFAULT_PROFILE: Profile = {
  name: '',
  avatar: 'kid_1',
  ageMode: 'junior',
  settings: DEFAULT_SETTINGS,
};

/** Ограничивает значения настроек допустимыми диапазонами (защита от испорченных данных). */
export function sanitizeSettings(s: Partial<Settings> | undefined): Settings {
  const d = DEFAULT_SETTINGS;
  const num = (v: unknown, lo: number, hi: number, def: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def;
  return {
    accent: s?.accent === 'us' || s?.accent === 'uk' ? s.accent : d.accent,
    narrator: s?.narrator === 'm' || s?.narrator === 'f' ? s.narrator : d.narrator,
    volume: num(s?.volume, 0, 1, d.volume),
    uiScale: num(s?.uiScale, 0.75, 2, d.uiScale),
    microphone: typeof s?.microphone === 'boolean' ? s.microphone : d.microphone,
    companionChatter: s?.companionChatter === 'rare' || s?.companionChatter === 'often' || s?.companionChatter === 'normal' ? s.companionChatter : d.companionChatter,
    ruHints: typeof s?.ruHints === 'boolean' ? s.ruHints : d.ruHints,
    dailyLimitMin: s?.dailyLimitMin === null || (typeof s?.dailyLimitMin === 'number' && s.dailyLimitMin >= 5) ? (s?.dailyLimitMin ?? null) : d.dailyLimitMin,
  };
}
