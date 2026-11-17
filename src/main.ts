// Точка входа: загрузка контента и прогресса, стартовый экран, запуск мира, интерфейс, квесты.
import Phaser from 'phaser';
import { systemClock } from './core/clock';
import { EventBus, type GameEvents } from './core/events';
import { loadContent } from './content/load';
import { openStore, requestPersistentStorage } from './storage/db';
import { AutoSaver } from './storage/autosave';
import type { Profile, Settings, WorldState } from './storage/types';
import { BrowserAudioPlayer } from './speech/audioPlayer';
import { setSfxVolume } from './speech/sfx';
import { LearningService } from './learning/learningService';
import { WorldScene, type WorldSceneDeps } from './game/scenes/WorldScene';
import { HOME } from './game/maps/home';
import { ItemCard } from './ui/itemCard';
import { SettingsPanel } from './ui/settingsPanel';
import { DialogueBox } from './ui/dialogueBox';
import { TaskPanel } from './ui/taskPanel';
import { QuestHud, isAnyModalOpen } from './ui/questUi';
import { TaskController } from './app/taskController';
import { QuestController } from './app/questController';
import { $, isTouch } from './ui/dom';

async function boot() {
  const clock = systemClock;
  const content = loadContent();
  const store = await openStore(clock);
  let profile: Profile = await store.getProfile();
  const savedWorld = await store.getWorld();
  const questStates = await store.getQuests();
  const learning = await LearningService.create(store.learning, clock);
  const bus = new EventBus<GameEvents>();
  const audio = new BrowserAudioPlayer(import.meta.env.VITE_AUDIO_FILES === '1');

  const card = new ItemCard(content, audio);
  const applySettings = (s: Settings) => {
    document.documentElement.style.setProperty('--ui-scale', String(s.uiScale));
    audio.setVoice({ accent: s.accent, narrator: s.narrator, volume: s.volume });
    setSfxVolume(s.volume);
    card.setRuHints(s.ruHints);
  };
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

    // ---------- интерфейс ----------
    $('hud').hidden = false;
    const help = $('help');
    help.textContent = isTouch()
      ? 'Нажми на персонажа с «!» — он попросит о помощи. Нажми на пол, чтобы идти.'
      : 'Ходи стрелками или WASD (можно мышкой). Подойди к персонажу с «!» и нажми E или пробел.';
    help.hidden = false;

    const action = $('btn-action');
    const actionLabel = action.querySelector('span')!;
    let nearby: GameEvents['nearby-target'] = null;
    let inputBlocked = false;
    const refreshAction = () => { action.hidden = !nearby || inputBlocked || isAnyModalOpen(); };
    const LABELS = { item: ['👀', 'Посмотреть'], npc: ['💬', 'Поговорить'], pick: ['✋', 'Взять'] } as const;
    bus.on('nearby-target', (t) => {
      nearby = t;
      if (t) { action.firstChild!.textContent = `${LABELS[t.kind][0]} `; actionLabel.textContent = LABELS[t.kind][1]; }
      refreshAction();
    });
    action.addEventListener('click', () => { if (nearby) bus.emit('interact', nearby); });

    const block = (b: boolean) => { inputBlocked = b; bus.emit('input-blocked', { blocked: b }); refreshAction(); };
    bus.on('interact', ({ kind, id }) => {
      help.hidden = true;
      if (kind !== 'item' || card.isOpen()) return;
      block(true);
      card.open(id, () => block(false));
    });
    $('btn-settings').addEventListener('click', () => { block(true); settings.open(() => block(false)); });

    const tasks = new TaskController(content, learning, new TaskPanel(audio));
    const quests = new QuestController({
      content, learning, bus, clock, audio, tasks,
      dialogue: new DialogueBox(audio),
      hud: new QuestHud(audio),
      states: questStates,
      saveQuest: (id, s) => store.saveQuest(id, s),
      inventory: () => world.inventory,
      setInventory: (items) => { world = { ...world, inventory: items }; saver.update(world); void saver.flush(); },
      ageMode: () => profile.ageMode,
      ruHints: () => profile.settings.ruHints,
      block,
    });

    const deps: WorldSceneDeps = {
      map: HOME,
      content,
      bus,
      look: 'kid_1',
      start: savedWorld && savedWorld.location === 'home' && savedWorld.x >= 0 ? { x: savedWorld.x, y: savedWorld.y } : null,
      onMoved: (p) => { world = { ...world, x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }; saver.update(world); },
      onReady: (scene) => quests.attach(scene),
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
    // для автотестов
    Object.assign(window as object, { __game: game, __quests: quests, __learning: learning, __tasks: tasks });
  }
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<p style="color:#fff;padding:1rem;font-family:sans-serif">Не удалось запустить игру: ${String(e?.message ?? e)}</p>`);
});
