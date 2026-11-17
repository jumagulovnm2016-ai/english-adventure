import 'fake-indexeddb/auto';
import { describe, it, expect, vi } from 'vitest';
import { loadContent } from '../src/content/load';
import { agreeAdjective } from '../src/content/registry';
import { openStore } from '../src/storage/db';
import { AutoSaver } from '../src/storage/autosave';
import { DEFAULT_SETTINGS, sanitizeSettings } from '../src/storage/types';
import { fixedClock } from '../src/core/clock';
import { EventBus } from '../src/core/events';
import { pickVoice, voiceGender } from '../src/speech/audioPlayer';
import { ITEM_ART } from '../src/game/art/items';
import { FURNITURE_ART } from '../src/game/art/furniture';
import { TILE_ART } from '../src/game/art/tiles';
import { drawKid, LOOKS } from '../src/game/art/character';
import { PALETTE } from '../src/game/art/pixels';

describe('Контент', () => {
  const c = loadContent();
  it('названия предметов на английском: прилагательное перед существительным', () => {
    expect(c.itemNameEn('it.cup_blue')).toBe('blue cup');
    expect(c.itemNameEn('it.ball_red')).toBe('red ball');
    expect(c.itemNameEn('it.cake')).toBe('cake');
  });
  it('русские названия согласованы по роду', () => {
    expect(c.itemNameRu('it.cup_blue')).toBe('синяя чашка');
    expect(c.itemNameRu('it.ball_red')).toBe('красный мяч');
    expect(c.itemNameRu('it.book_green')).toBe('зелёная книга');
    expect(c.itemNameRu('it.plate_blue')).toBe('синяя тарелка');
  });
  it('согласование прилагательных', () => {
    expect(agreeAdjective('синий', 'чашка')).toBe('синяя');
    expect(agreeAdjective('синий', 'окно')).toBe('синее');
    expect(agreeAdjective('красный', 'яблоко')).toBe('красное');
    expect(agreeAdjective('жёлтый', 'дверь')).toBe('жёлтая');
    expect(agreeAdjective('зелёный', 'мяч')).toBe('зелёный');
  });
  it('у каждого предмета есть картинка', () => {
    for (const id of ['it.cup_blue', 'it.cup_red', 'it.cup_green', 'it.plate_blue', 'it.ball_red', 'it.book_green', 'it.cake', 'it.decor_blue_lamp']) {
      expect(ITEM_ART[c.item(id).sprite as keyof typeof ITEM_ART], id).toBeTypeOf('function');
    }
  });
  it('неизвестный id — понятная ошибка', () => {
    expect(() => c.item('it.dragon')).toThrow(/Нет предмета/);
  });
});

describe('Графика', () => {
  const all = [
    ...Object.entries(ITEM_ART).map(([k, f]) => [`item ${k}`, f()] as const),
    ...Object.entries(FURNITURE_ART).map(([k, f]) => [`furniture ${k}`, f()] as const),
    ...Object.entries(TILE_ART).map(([k, f]) => [`tile ${k}`, f()] as const),
    ...(['down', 'up', 'left', 'right'] as const).flatMap((d) => [0, 1, 2].map((fr) => [`kid ${d} ${fr}`, drawKid(LOOKS.kid_1, d, fr as 0 | 1 | 2)] as const)),
  ];
  it('все пиксели — цвета из палитры', () => {
    for (const [name, px] of all) for (const row of px.data()) for (const ch of row) {
      if (ch !== '.') expect(PALETTE[ch], `${name}: неизвестный цвет «${ch}»`).toBeDefined();
    }
  });
  it('тайлы ровно 16×16', () => {
    for (const [k, f] of Object.entries(TILE_ART)) { const p = f(); expect([p.w, p.h], k).toEqual([16, 16]); }
  });
  it('кадры ходьбы отличаются от стоячего', () => {
    for (const d of ['down', 'up', 'right'] as const) {
      const stand = drawKid(LOOKS.kid_1, d, 0).data().join('');
      expect(drawKid(LOOKS.kid_1, d, 1).data().join('')).not.toBe(stand);
      expect(drawKid(LOOKS.kid_1, d, 2).data().join('')).not.toBe(stand);
    }
  });
});

describe('Хранение', () => {
  it('новый игрок получает настройки по умолчанию, сохранение и чтение работают', async () => {
    const store = await openStore(fixedClock(new Date('2026-11-20T10:00:00Z')));
    expect(store.persistent).toBe(true);
    const p = await store.getProfile();
    expect(p.settings).toEqual(DEFAULT_SETTINGS);
    await store.saveProfile({ ...p, settings: { ...p.settings, uiScale: 1.5, accent: 'us' } });
    expect((await store.getProfile()).settings.uiScale).toBe(1.5);
    expect(await store.getWorld()).toBeNull();
    await store.saveWorld({ location: 'home', x: 100, y: 120, inventory: [], roomDecor: [] });
    expect((await store.getWorld())?.x).toBe(100);
    await store.clearAll();
    expect(await store.getWorld()).toBeNull();
  });
  it('испорченные настройки исправляются', () => {
    const s = sanitizeSettings({ volume: 7, uiScale: -3, accent: 'fr' as never, dailyLimitMin: 1 });
    expect(s.volume).toBe(1);
    expect(s.uiScale).toBe(0.75);
    expect(s.accent).toBe('uk');
    expect(s.dailyLimitMin).toBe(null);
  });
  it('автосохранение не чаще раза в 5 секунд, flush сохраняет сразу', async () => {
    vi.useFakeTimers();
    let t = 0;
    const saved: number[] = [];
    const s = new AutoSaver<number>(async (v) => { saved.push(v); }, 5000, () => t);
    s.update(1); s.update(2); s.update(3);
    await vi.advanceTimersByTimeAsync(0);
    expect(saved).toEqual([3]);           // первое сохранение сразу, последним значением
    t = 1000; s.update(4); s.update(5);
    await vi.advanceTimersByTimeAsync(1000);
    expect(saved).toEqual([3]);           // ещё рано
    t = 5000; await vi.advanceTimersByTimeAsync(4000);
    expect(saved).toEqual([3, 5]);
    t = 6000; s.update(6); await s.flush();
    expect(saved).toEqual([3, 5, 6]);
    vi.useRealTimers();
  });
});

describe('Шина событий', () => {
  it('подписка и отписка', () => {
    const bus = new EventBus<{ a: number }>();
    const got: number[] = [];
    const off = bus.on('a', (v) => got.push(v));
    bus.emit('a', 1); off(); bus.emit('a', 2);
    expect(got).toEqual([1]);
  });
});

describe('Выбор голоса', () => {
  const v = (name: string, lang: string, localService = true) => ({ name, lang, localService, default: false, voiceURI: name }) as SpeechSynthesisVoice;
  const voices = [
    v('Microsoft David - English (United States)', 'en-US'),
    v('Microsoft Zira - English (United States)', 'en-US'),
    v('Google UK English Female', 'en-GB', false),
    v('Google UK English Male', 'en-GB', false),
    v('Microsoft Irina - Russian', 'ru-RU'),
  ];
  it('пол по имени голоса', () => {
    expect(voiceGender('Google UK English Female')).toBe('f');
    expect(voiceGender('Google UK English Male')).toBe('m');
    expect(voiceGender('Microsoft Zira')).toBe('f');
    expect(voiceGender('Daniel')).toBe('m');
    expect(voiceGender('Something')).toBeNull();
  });
  it('британский женский', () => expect(pickVoice(voices, 'uk', 'f')?.name).toBe('Google UK English Female'));
  it('британский мужской', () => expect(pickVoice(voices, 'uk', 'm')?.name).toBe('Google UK English Male'));
  it('американский женский', () => expect(pickVoice(voices, 'us', 'f')?.name).toContain('Zira'));
  it('нет нужного акцента — берём любой английский', () => {
    expect(pickVoice(voices.filter((x) => x.lang === 'en-US'), 'uk', 'f')?.lang).toBe('en-US');
  });
  it('нет английских голосов — null', () => expect(pickVoice([voices[4]], 'uk', 'f')).toBeNull());
});
