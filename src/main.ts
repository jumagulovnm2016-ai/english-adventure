// Точка входа: загрузка контента и прогресса, стартовый экран, запуск мира, интерфейс.
import Phaser from 'phaser';
import { systemClock } from './core/clock';
import { EventBus, type GameEvents } from './core/events';
import { loadContent } from './content/load';
import { openStore, requestPersistentStorage } from './storage/db';
import { AutoSaver } from './storage/autosave';
import type { Profile, Settings, WorldState } from './storage/types';
import { BrowserAudioPlayer } from './speech/audioPlayer';
import { WorldScene, type WorldSceneDeps } from './game/scenes/WorldScene';
import { HOME } from './game/maps/home';
import { ItemCard } from './ui/itemCard';
import { SettingsPanel } from './ui/settingsPanel';
import { $, isTouch } from './ui/dom';

async function boot() {
  const clock = systemClock;
  const content = loadContent();
  const store = await openStore(clock);
  let profile: Profile = await store.getProfile();
  const savedWorld = await store.getWorld();
  const bus = new EventBus<GameEvents>();
  const audio = new BrowserAudioPlayer(import.meta.env.VITE_AUDIO_FILES === '1');

  const applySettings = (s: Settings) => {
    document.documentElement.style.setProperty('--ui-scale', String(s.uiScale));
    audio.setVoice({ accent: s.accent, narrator: s.narrator, volume: s.volume });
    card.setRuHints(s.ruHints);
  };
  const card = new ItemCard(content, audio);
  const updateSettings = (patch: Partial<Settings>) => {
    profile = { ...profile, settings: { ...profile.settings, ...patch } };
    applySettings(profile.settings);
    void store.saveProfile(profile);
  };
  applySettings(profile.settings);
  const settings = new SettingsPanel(() => profile.settings, updateSettings, audio, store.persistent);

  // ---------- стартовый экран ----------
  const notes: string[] = [];
  if (!store.persistent) notes.push('⚠ В этом окне прогресс не сохранится.');
  if (savedWorld) notes.push('Продолжим с того места, где остановились.');
  $('start-notes').textContent = notes.join(' ');
  if (savedWorld) $('btn-play').textContent = '▶ Продолжить';

  $('btn-play').addEventListener('click', () => {
    void requestPersistentStorage();
    // iOS разрешает звук только после нажатия — «будим» синтез речи тихой фразой
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch { /* нет синтеза */ }
    $('start').hidden = true;
    startWorld();
  }, { once: true });

  function startWorld() {
    let world: WorldState = savedWorld ?? { location: 'home', x: -1, y: -1, inventory: [], roomDecor: [] };
    const saver = new AutoSaver<WorldState>((w) => store.saveWorld(w), 5000);
    const flush = () => void saver.flush();
    addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

    const deps: WorldSceneDeps = {
      map: HOME,
      content,
      bus,
      look: 'kid_1',
      start: savedWorld && savedWorld.location === 'home' ? { x: savedWorld.x, y: savedWorld.y } : null,
      onMoved: (p) => { world = { ...world, x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }; saver.update(world); },
    };

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      backgroundColor: '#1b1626',
      pixelArt: true,
      roundPixels: true,
      scale: { mode: Phaser.Scale.RESIZE, width: innerWidth, height: innerHeight },
      input: { activePointers: 2 },
      banner: false,
    });
    game.scene.add('world', WorldScene, true, deps);
    (window as unknown as { __game: Phaser.Game }).__game = game; // для автотестов

    // ---------- интерфейс поверх игры ----------
    $('hud').hidden = false;
    const help = $('help');
    help.textContent = isTouch()
      ? 'Нажми на пол — герой пойдёт туда. Нажми на предмет — узнаешь, как он называется.'
      : 'Ходи стрелками или WASD (можно мышкой). Подойди к предмету и нажми E или пробел.';
    help.hidden = false;

    const action = $('btn-action');
    let nearby: string | null = null;
    bus.on('nearby-item', ({ itemId }) => { nearby = itemId; action.hidden = !itemId || card.isOpen() || settings.isOpen(); });
    action.addEventListener('click', () => { if (nearby) bus.emit('inspect-item', { itemId: nearby }); });

    const block = (b: boolean) => { bus.emit('input-blocked', { blocked: b }); action.hidden = b || !nearby; };
    bus.on('inspect-item', ({ itemId }) => {
      if (card.isOpen()) return;
      help.hidden = true;
      block(true);
      card.open(itemId, () => block(false));
    });
    $('btn-settings').addEventListener('click', () => { block(true); settings.open(() => block(false)); });
  }
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<p style="color:#fff;padding:1rem;font-family:sans-serif">Не удалось запустить игру: ${String(e?.message ?? e)}</p>`);
});
