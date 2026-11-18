// Точка входа: загрузка контента и прогресса, первый запуск, мир из нескольких локаций, интерфейс, квесты, спутник.
import Phaser from 'phaser';
import { systemClock } from './core/clock';
import { EventBus, type GameEvents } from './core/events';
import { loadContent } from './content/load';
import type { Location } from './content/types';
import { openStore, requestPersistentStorage } from './storage/db';
import { AutoSaver } from './storage/autosave';
import type { Profile, Settings, WorldState } from './storage/types';
import { BrowserAudioPlayer } from './speech/audioPlayer';
import { setSfxVolume } from './speech/sfx';
import { LearningService } from './learning/learningService';
import { WorldScene, type WorldSceneDeps } from './game/scenes/WorldScene';
import { MAPS } from './game/maps';
import type { Exit } from './game/maps/types';
import { ItemCard } from './ui/itemCard';
import { SettingsPanel } from './ui/settingsPanel';
import { DialogueBox } from './ui/dialogueBox';
import { TaskPanel } from './ui/taskPanel';
import { QuestHud, isAnyModalOpen, toast } from './ui/questUi';
import { runOnboarding } from './ui/onboarding';
import { TaskController } from './app/taskController';
import { QuestController } from './app/questController';
import { CompanionController } from './app/companionController';
import { $, isTouch } from './ui/dom';

/** Распознавание речи пока не включается (D7). */
const canListen = () => false;

async function boot() {
  const clock = systemClock;
  const content = loadContent();
  const store = await openStore(clock);
  let profile: Profile = await store.getProfile();
  const savedWorld = await store.getWorld();
  const questStates = await store.getQuests();
  const onboarded = (await store.getMeta<boolean>('onboarded')) ?? !!savedWorld; // у игравших до этапа 3 — уже да
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
  const saveProfile = () => void store.saveProfile(profile);
  const updateSettings = (patch: Partial<Settings>) => {
    profile = { ...profile, settings: { ...profile.settings, ...patch } };
    applySettings(profile.settings);
    saveProfile();
  };
  applySettings(profile.settings);
  const settings = new SettingsPanel(() => profile.settings, updateSettings, audio, store.persistent,
    () => profile.ageMode, (m) => { profile = { ...profile, ageMode: m }; saveProfile(); });

  // ---------- стартовый экран ----------
  const notes: string[] = [];
  if (!store.persistent) notes.push('⚠ В этом окне прогресс не сохранится.');
  if (savedWorld) notes.push(profile.name ? `С возвращением, ${profile.name}!` : 'Продолжим с того места, где остановились.');
  $('start-notes').textContent = notes.join(' ');
  if (savedWorld) $('btn-play').textContent = '▶ Продолжить';

  $('btn-play').addEventListener('click', async () => {
    void requestPersistentStorage();
    // iOS разрешает звук только после нажатия — «будим» синтез речи тихой фразой
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch { /* нет синтеза */ }
    $('start').hidden = true;
    if (!onboarded) {
      const r = await runOnboarding(content, learning, audio, clock);
      profile = { ...profile, avatar: r.avatar, name: r.name, ageMode: r.ageMode };
      saveProfile();
      await store.setMeta('onboarded', true);
      await store.setMeta('placement', r.placement);
    }
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
      ? 'Нажми на персонажа с «!» — он попросит о помощи. Нажми на пол, чтобы идти. 🦊 — твой друг Пип.'
      : 'Ходи стрелками или WASD (можно мышкой). Подойди к персонажу с «!» и нажми E или пробел. 🦊 — твой друг Пип.';
    help.hidden = false;
    setTimeout(() => { help.hidden = true; }, 20000);

    const action = $('btn-action');
    const actionLabel = action.querySelector('span')!;
    let nearby: GameEvents['nearby-target'] = null;
    let inputBlocked = false;
    const refreshAction = () => { action.hidden = !nearby || inputBlocked || isAnyModalOpen(); };
    const LABELS = { item: ['👀', 'Посмотреть'], npc: ['💬', 'Поговорить'], pick: ['✋', 'Взять'], companion: ['🦊', 'Пип'] } as const;
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
    $('btn-pip').addEventListener('click', () => bus.emit('interact', { kind: 'companion', id: 'pip' }));

    const tasks = new TaskController(content, learning, new TaskPanel(audio));
    const quests = new QuestController({
      content, learning, bus, clock, audio, tasks, canListen,
      dialogue: new DialogueBox(audio),
      hud: new QuestHud(audio),
      states: questStates,
      saveQuest: (id, s) => store.saveQuest(id, s),
      inventory: () => world.inventory,
      setInventory: (items) => { world = { ...world, inventory: items }; saver.update(world); void saver.flush(); },
      ageMode: () => profile.ageMode,
      ruHints: () => profile.settings.ruHints,
      block,
      onProgress: () => companion.activity(),
    });
    const companion = new CompanionController({
      bus, content, learning, audio, quests, tasks, canListen,
      chatter: () => profile.settings.companionChatter,
      ageMode: () => profile.ageMode,
      uiBusy: () => isAnyModalOpen() || !$('dialogue').hidden,
    });

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

    /** Собрать параметры сцены для локации. start — позиция «ног» героя или null (точка появления карты). */
    const depsFor = (loc: Location, start: { x: number; y: number } | null): WorldSceneDeps => {
      const map = MAPS[loc];
      $('hud-place-ru').textContent = map.title.ru;
      $('hud-place-en').textContent = map.title.en;
      return {
        map, content, bus, look: profile.avatar, start, companion: true,
        onMoved: (p) => { world = { ...world, location: loc, x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }; saver.update(world); companion.activity(); void quests.checkGoTo(); },
        onReady: (scene) => { quests.attach(scene); companion.attach(scene); },
        canExit: (e: Exit) => (quests.canEnter(e.requires) ? null : e.lockedText ?? 'Пока закрыто'),
        onLocked: (text) => toast(`🔒 ${text}`, 3000),
        onExit: (e: Exit) => travel(e),
      };
    };

    const travel = (e: Exit) => {
      const T = 16;
      const start = { x: e.spawn.tx * T + T / 2, y: e.spawn.ty * T + T / 2 + 2 };
      world = { ...world, location: e.to, x: start.x, y: start.y };
      saver.update(world);
      void saver.flush();
      const scene = game.scene.getScene('world') as WorldScene;
      scene.scene.restart(depsFor(e.to, start));
    };

    const loc0: Location = savedWorld?.location && MAPS[savedWorld.location] ? savedWorld.location : 'home';
    const start0 = savedWorld && savedWorld.x >= 0 ? { x: savedWorld.x, y: savedWorld.y } : null;
    game.scene.add('world', WorldScene, true, depsFor(loc0, start0));
    // для автотестов
    Object.assign(window as object, { __game: game, __quests: quests, __learning: learning, __tasks: tasks, __companion: companion, __travel: travel, __maps: MAPS, __content: content });
  }
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<p style="color:#fff;padding:1rem;font-family:sans-serif">Не удалось запустить игру: ${String(e?.message ?? e)}</p>`);
});
