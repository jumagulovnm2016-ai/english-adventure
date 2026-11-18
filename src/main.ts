// Точка входа: загрузка контента и прогресса, первый запуск, мир из нескольких локаций, интерфейс, квесты, спутник.
import Phaser from 'phaser';
// шрифт Nunito — округлый, дружелюбный, с кириллицей; лежит в сборке и работает офлайн
import '@fontsource/nunito/cyrillic-600.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/cyrillic-700.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/cyrillic-800.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/cyrillic-900.css';
import '@fontsource/nunito/latin-900.css';
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
import { prepareArt, prepareFloor, personImageUrl, pipImageUrl } from './game/art/textures';
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
import { askAdult, hashPin } from './ui/parentGate';
import { ParentScreen } from './ui/parentScreen';
import { buildReport } from './parent/report';
import { buildSave, parseSave } from './parent/saveFile';
import { PlaytimeTracker, dayKey } from './app/playtime';
import { setupPwa, isIos, isStandalone } from './app/pwa';

/** Имя файла — латиницей: не все браузеры и системы надёжно сохраняют файлы с кириллицей в имени. */
function translit(s: string): string {
  const m: Record<string, string> = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', ң: 'n', о: 'o', ө: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ү: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
  return [...s].map((ch) => { const low = ch.toLowerCase(); const t = m[low]; if (t === undefined) return ch; return ch === low ? t : t.charAt(0).toUpperCase() + t.slice(1); }).join('');
}

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
  // графика растеризуется в фоне, пока ребёнок на стартовом экране
  const artReady = prepareArt();
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

  // ---------- время игры и лимит ----------
  const playtime = await store.getPlaytime();
  let limitExtra = (await store.getMeta<{ day: string; minutes: number }>('limitExtra')) ?? { day: '', minutes: 0 };
  const tracker = new PlaytimeTracker({
    clock,
    initialToday: playtime.get(dayKey(clock.now())) ?? 0,
    add: async (day, sec) => { const v = await store.addPlaytime(day, sec); playtime.set(day, v); return v; },
    limitMin: () => profile.settings.dailyLimitMin,
    extraMin: (day) => (limitExtra.day === day ? limitExtra.minutes : 0),
    onLimit: () => showLimit(),
  });
  let worldStarted = false;
  let blockGame: (b: boolean) => void = () => {};
  function showLimit() {
    const min = Math.round(tracker.todaySeconds() / 60);
    $('limit-text').textContent = `${profile.name ? profile.name + ', ты' : 'Ты'} играл(а) сегодня ${min} мин. Отдохни — Пип будет ждать тебя завтра!`;
    $('limit').hidden = false;
    blockGame(true);
  }
  $('limit-more').addEventListener('click', async () => {
    if (!(await askAdult(() => store.getMeta<string>('parentPin')))) return;
    const day = tracker.todayKey();
    limitExtra = { day, minutes: (limitExtra.day === day ? limitExtra.minutes : 0) + 15 };
    await store.setMeta('limitExtra', limitExtra);
    tracker.check();
    if (!tracker.isLimited()) { $('limit').hidden = true; blockGame(false); }
  });
  setInterval(() => {
    if (worldStarted && !document.hidden && $('parent').hidden && !tracker.isLimited()) void tracker.tick(5);
  }, 5000);

  // ---------- родительский экран ----------
  const parent = new ParentScreen({
    report: () => buildReport({ content, learning, quests: questStates, playtime, now: clock.now(), micEnabled: false }),
    getLimit: () => profile.settings.dailyLimitMin,
    setLimit: (m) => { updateSettings({ dailyLimitMin: m }); tracker.check(); if (!tracker.isLimited()) { $('limit').hidden = true; } },
    todaySeconds: () => tracker.todaySeconds(),
    hasPin: async () => !!(await store.getMeta<string>('parentPin')),
    setPin: async (pin) => store.setMeta('parentPin', pin ? await hashPin(pin) : null),
    exportFile: async () => {
      const save = buildSave(await store.dumpAll(), learning.canDo(content.skills, false), clock.now());
      const who = translit(profile.name || 'progress').replace(/[^A-Za-z0-9_-]+/g, '_') || 'progress';
      return { name: `english-adventure-${who}-${dayKey(clock.now())}.json`, text: JSON.stringify(save, null, 1) };
    },
    importFile: async (text) => {
      const r = parseSave(text);
      if (!r.ok) return { ok: false, error: r.error };
      await store.loadAll(r.dump);
      setTimeout(() => location.reload(), 600);
      return { ok: true };
    },
    reset: async () => { await store.clearAll(); location.reload(); },
  });
  const openParent = async (onClose?: () => void) => {
    if (!(await askAdult(() => store.getMeta<string>('parentPin')))) { onClose?.(); return; }
    parent.open(onClose);
  };
  $('btn-parent-start').addEventListener('click', () => void openParent());

  // ---------- установка и офлайн ----------
  const pwa = setupPwa({
    onInstallable: (install) => {
      const b = $('btn-install');
      b.hidden = false;
      b.onclick = async () => { if (await install()) b.hidden = true; };
    },
    onUpdateReady: () => {
      // не перезагружаем посреди игры — предлагаем
      $('update').hidden = false;
      $('update-go').onclick = () => location.reload();
    },
  });
  if (isIos() && !isStandalone()) $('install-ios').hidden = false;
  void pwa.offlineReady.then((ok) => { if (ok) $('offline-note').hidden = false; });

  // ---------- стартовый экран ----------
  ($('start-hero') as HTMLImageElement).src = personImageUrl(profile.avatar || 'kid_1');
  ($('start-pip') as HTMLImageElement).src = pipImageUrl();
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
    await startWorld();
  }, { once: true });

  async function startWorld() {
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
    $('btn-parent').addEventListener('click', () => {
      // настройки закрываются, родительский экран — поверх игры
      ($('settings').querySelector('[data-close]') as HTMLButtonElement).click();
      block(true);
      void openParent(() => block(tracker.isLimited()));
    });
    blockGame = (b) => block(b);
    worldStarted = true;
    tracker.check();
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

    const loc0: Location = savedWorld?.location && MAPS[savedWorld.location] ? savedWorld.location : 'home';
    await artReady;
    await document.fonts?.load('800 12px Nunito').catch(() => undefined);
    await prepareFloor(MAPS[loc0]);
    // Холст рисуем в физических пикселях экрана (не больше ×2 — дальше разница не видна, а нагрузка растёт),
    // а на странице показываем в CSS-размере: на телефонах картинка чёткая. Если телефон не тянет
    // (меньше 40 кадров в секунду), переходим на обычное разрешение. См. DECISIONS D46.
    let dpr = Math.min(2, Math.max(1, devicePixelRatio || 1));
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      backgroundColor: '#3d2b24',
      antialias: true,
      // сглаживание краёв уже есть в самих рисунках; MSAA холста только тратит видеокарту
      antialiasGL: false,
      scale: { mode: Phaser.Scale.NONE, width: innerWidth * dpr, height: innerHeight * dpr, zoom: 1 / dpr },
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
        onExit: (e: Exit) => void travel(e),
      };
    };

    const applyDpr = () => { game.scale.setZoom(1 / dpr); game.scale.resize(innerWidth * dpr, innerHeight * dpr); };
    addEventListener('resize', applyDpr);
    if (dpr > 1) {
      const checkFps = () => { if (dpr > 1 && game.loop.actualFps < 40) { dpr = 1; applyDpr(); } };
      setTimeout(checkFps, 3000);
      setTimeout(checkFps, 8000);
    }

    const travel = async (e: Exit) => {
      const T = 16;
      await prepareFloor(MAPS[e.to]);
      const start = { x: e.spawn.tx * T + T / 2, y: e.spawn.ty * T + T / 2 + 2 };
      world = { ...world, location: e.to, x: start.x, y: start.y };
      saver.update(world);
      void saver.flush();
      const scene = game.scene.getScene('world') as WorldScene;
      scene.scene.restart(depsFor(e.to, start));
    };

    const start0 = savedWorld && savedWorld.x >= 0 ? { x: savedWorld.x, y: savedWorld.y } : null;
    game.scene.add('world', WorldScene, true, depsFor(loc0, start0));
    // для автотестов
    Object.assign(window as object, { __game: game, __quests: quests, __learning: learning, __tasks: tasks, __companion: companion, __travel: travel, __maps: MAPS, __content: content, __tracker: tracker, __store: store });
  }
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<p style="color:#fff;padding:1rem;font-family:sans-serif">Не удалось запустить игру: ${String(e?.message ?? e)}</p>`);
});
