// Квестовый контроллер: связывает сцену (персонажи, предметы), интерфейс (диалоги, задания) и учебное ядро.
// Квест может идти через несколько локаций: сцена меняется, контроллер остаётся и при каждом входе
// в локацию заново «раскладывает» то, что нужно для текущего шага.
import type { EventBus, GameEvents } from '../core/events';
import type { Clock } from '../core/clock';
import type { ContentRegistry } from '../content/registry';
import type { DialogueNode, Location, QuestDef, StepDef } from '../content/types';
import type { LearningService } from '../learning/learningService';
import { DialogueRunner } from '../quests/dialogueRunner';
import { HelpLadder } from '../quests/helpLadder';
import { QuestRunner, questForNpc, questStatus, type QuestState } from '../quests/questRunner';
import type { WorldScene } from '../game/scenes/WorldScene';
import { MAPS, locationOfSpots, locationOfZone } from '../game/maps';
import type { DialogueBox } from '../ui/dialogueBox';
import type { TaskController } from './taskController';
import { QuestHud, showQuestIntro, showReward, toast } from '../ui/questUi';
import { sfx } from '../speech/sfx';
import type { AudioPlayer } from '../speech/audioPlayer';
import { shuffle } from '../learning/options';
import { ageText, type AgeMode } from './ageText';

export interface QuestDeps {
  content: ContentRegistry;
  learning: LearningService;
  bus: EventBus<GameEvents>;
  clock: Clock;
  audio: AudioPlayer;
  dialogue: DialogueBox;
  tasks: TaskController;
  hud: QuestHud;
  states: Map<string, QuestState>;
  saveQuest: (id: string, s: QuestState) => Promise<void>;
  inventory: () => string[];
  setInventory: (items: string[]) => void;
  ageMode: () => AgeMode;
  ruHints: () => boolean;
  canListen: () => boolean;
  /** Заблокировать управление героем на время диалога/задания. */
  block: (on: boolean) => void;
  /** Игрок что-то сделал по квесту (для спутника: сбросить таймер подсказки). */
  onProgress?: () => void;
  /** Требования, снятые для знающего ребёнка (см. D50). */
  waived?: () => ReadonlySet<string>;
  /** Где сейчас герой — подсказка сначала предлагает задание рядом. */
  location?: () => Location;
}

const placeName = (l: Location) => `${MAPS[l].title.ru} (${MAPS[l].title.en.toUpperCase()})`;

export class QuestController {
  private scene: WorldScene | null = null;
  private active: { def: QuestDef; runner: QuestRunner } | null = null;
  private resumed = false;
  private busy = false;
  /** Ожидание выбора предмета в шаге «найди». */
  private findState: { step: StepDef; ladder: HelpLadder } | null = null;

  constructor(private d: QuestDeps) {
    d.bus.on('interact', (t) => {
      if (this.busy || !this.scene) return;
      if (t.kind === 'npc') void this.onNpc(t.id);
      else if (t.kind === 'pick') void this.onPick(t.id);
    });
  }

  /** Сцена (новая локация) готова. */
  attach(scene: WorldScene) {
    this.scene = scene;
    this.findState = null;
    const quests = this.d.content.quests();
    for (const q of quests) if (this.d.states.get(q.id)?.status === 'done') for (const it of q.rewards.decor ?? []) scene.addDecor(it);
    if (!this.resumed) {
      this.resumed = true;
      const act = quests.find((q) => this.d.states.get(q.id)?.status === 'active');
      if (act) {
        const runner = new QuestRunner(act, this.d.states.get(act.id)!.step);
        runner.resume(this.d.inventory());
        this.active = { def: act, runner };
        void this.persistActive();
      }
    }
    // предмет квеста в руках виден в любой локации
    const carried = this.active ? this.d.inventory().find((i) => this.active!.def.steps.some((s) => s.type === 'give_item' && s.item === i)) : undefined;
    scene.setCarried(carried ?? null);
    this.prepareStep();
    this.refreshWorld();
    void this.checkGoTo();
  }

  isBusy() { return this.busy; }
  totalStars() { return [...this.d.states.values()].reduce((s, q) => s + (q.status === 'done' ? q.stars : 0), 0); }

  /** Можно ли пройти в дверь (требование — выполненный квест). */
  canEnter(requires?: string) { return !requires || this.d.states.get(requires)?.status === 'done' || this.waived.has(requires); }
  /** Следующее доступное задание для подсказки в шапке. Знающему ребёнку — сначала новое (площадка, зоопарк). */
  private nextAvailable() {
    const avail = this.d.content.quests().filter((q) => questStatus(q, this.d.states, this.waived) === 'available');
    const here = this.d.location?.();
    const giverHere = (q: (typeof avail)[number]) => this.d.content.npc(q.giver).location === here;
    return avail.find(giverHere)
      ?? (this.waived.size ? avail.find((q) => q.location === 'playground' || q.location === 'zoo') : undefined)
      ?? avail[0];
  }
  private get waived(): ReadonlySet<string> { return this.d.waived?.() ?? new Set(); }

  /** Что подсказать спутнику: короткий текст и, если есть, фраза для озвучки. */
  companionHint(): { text: string; say?: { id: string; text: string } } | null {
    if (!this.active) {
      const next = this.nextAvailable();
      if (!next) return null;
      const npc = this.d.content.npc(next.giver);
      const where = npc.location !== this.scene?.location ? ` Это в локации «${placeName(npc.location)}».` : '';
      return { text: `Кажется, ${npc.name_ru} хочет поговорить! Над ${npc.gender === 'f' ? 'ней' : 'ним'} «!».${where}` };
    }
    const s = this.active.runner.step;
    if (!s) return null;
    const mode = this.d.ageMode();
    if (s.type === 'find_item') {
      const loc = locationOfSpots(s.zone!);
      if (loc && loc !== this.scene?.location) return { text: `Нам нужно в «${placeName(loc)}».` };
      return { text: ageText(s.hint?.ru, mode) ?? 'Найди то, о чём просили!', say: this.d.tasks.audioOf(s.instruction!) };
    }
    if (s.type === 'give_item') {
      const npc = this.d.content.npc(s.npc!);
      const where = npc.location !== this.scene?.location ? ` Это в локации «${placeName(npc.location)}».` : '';
      return { text: `Отнеси ${this.d.content.itemNameEn(s.item!)} — ${npc.ru_to}.${where}` };
    }
    if (s.type === 'go_to') return { text: ageText(s.hint?.ru, mode) ?? 'Пойдём дальше!' };
    if (s.type === 'dialogue') {
      const npc = this.d.content.npc(this.d.content.dialogue(s.dialogue!).npc);
      const where = npc.location !== this.scene?.location ? ` Это в локации «${placeName(npc.location)}».` : '';
      return { text: `Поговори ${npc.ru_with}.${where}` };
    }
    return null;
  }

  // ---------- персонажи и подсказки в мире ----------

  /** Персонажи, которые участвуют в открытых квестах (их видно на карте). */
  private involvedNpcs(): Set<string> {
    const out = new Set<string>();
    for (const q of this.d.content.quests()) {
      if (questStatus(q, this.d.states, this.waived) === 'locked') continue;
      out.add(q.giver);
      for (const s of q.steps) {
        if (s.type === 'dialogue') out.add(this.d.content.dialogue(s.dialogue!).npc);
        if (s.type === 'give_item') out.add(s.npc!);
      }
    }
    return out;
  }

  private refreshWorld() {
    const scene = this.scene;
    if (!scene) return;
    const involved = this.involvedNpcs();
    for (const n of this.d.content.npcsIn(scene.location)) {
      const visible = involved.has(n.id) && scene.hasNpc(n.id);
      scene.setNpcVisible(n.id, visible);
      scene.setNpcMarker(n.id, visible && this.npcWantsTalk(n.id));
    }
    this.d.hud.setStars(this.totalStars());
    this.updateGoal();
  }

  private npcWantsTalk(npcId: string): boolean {
    if (this.active) {
      const s = this.active.runner.step;
      if (!s) return false;
      if (s.type === 'dialogue') return this.d.content.dialogue(s.dialogue!).npc === npcId;
      if (s.type === 'give_item') return s.npc === npcId && this.d.inventory().includes(s.item!);
      return false;
    }
    return !!questForNpc(npcId, this.d.content.quests(), this.d.states, this.waived);
  }

  private updateGoal() {
    const mode = this.d.ageMode();
    const here = this.scene?.location;
    const where = (l: Location) => (l !== here ? ` → ${placeName(l)}` : '');
    if (!this.active) {
      const next = this.nextAvailable();
      if (!next) { this.d.hud.setGoal(null); return; }
      const npc = this.d.content.npc(next.giver);
      this.d.hud.setGoal({ title: 'Новое задание', text: `Поговори ${npc.ru_with} — над ${npc.gender === 'f' ? 'ней' : 'ним'} «!»${where(npc.location)}` });
      return;
    }
    const { def, runner } = this.active;
    const s = runner.step;
    const title = ageText(def.title, mode)!;
    if (!s) { this.d.hud.setGoal(null); return; }
    const npc = (id: string) => this.d.content.npc(id);
    if (s.type === 'dialogue') {
      const n = npc(this.d.content.dialogue(s.dialogue!).npc);
      this.d.hud.setGoal({ title, text: `Поговори ${n.ru_with}${where(n.location)}` });
    } else if (s.type === 'find_item') {
      const loc = locationOfSpots(s.zone!) ?? here!;
      this.d.hud.setGoal({ title, text: `Найди то, о чём просят${where(loc)}. Не помнишь? Послушай →`, say: this.d.tasks.audioOf(s.instruction!) });
    } else if (s.type === 'give_item') {
      const n = npc(s.npc!);
      this.d.hud.setGoal({ title, text: `Отнеси ${this.d.content.itemNameEn(s.item!)} ${n.ru_to}${where(n.location)}` });
    } else if (s.type === 'go_to') {
      const loc = locationOfZone(s.zone!) ?? here!;
      this.d.hud.setGoal({ title, text: ageText(s.hint?.ru, mode) ?? `Иди${where(loc)}` });
    } else this.d.hud.setGoal({ title, text: '…' });
  }

  // ---------- начало и шаги квеста ----------

  private async onNpc(npcId: string) {
    const scene = this.scene!;
    scene.npcReact(npcId);
    this.d.onProgress?.();
    if (this.active) {
      const s = this.active.runner.step!;
      if (s.type === 'dialogue' && this.d.content.dialogue(s.dialogue!).npc === npcId) return this.runCurrentStep(npcId);
      if (s.type === 'give_item' && s.npc === npcId) {
        if (this.d.inventory().includes(s.item!)) { await this.completeStep(npcId); return; }
        return this.say(npcId, this.findInstruction() ?? 'p.hello_mum');
      }
      if (s.type === 'find_item' && this.active.def.giver === npcId) return this.say(npcId, s.instruction!);
      return this.say(npcId, 'p.hello_mum');
    }
    const q = questForNpc(npcId, this.d.content.quests(), this.d.states, this.waived);
    if (!q) return this.say(npcId, 'p.hello_mum');
    await this.startQuest(q, npcId);
  }

  private findInstruction(): string | undefined {
    return this.active?.def.steps.find((x) => x.type === 'find_item')?.instruction;
  }

  private async say(npcId: string, phraseId: string) {
    await this.withBusy(async () => {
      const p = this.d.content.learnable(phraseId);
      await this.d.dialogue.show({ speaker: this.d.content.npc(npcId).name_en, en: p.en, ru: this.d.ruHints() ? p.ru : undefined, audio: this.d.tasks.audioOf(phraseId) });
      this.d.dialogue.hide();
    });
  }

  private async startQuest(q: QuestDef, npcId: string) {
    const mode = this.d.ageMode();
    await this.withBusy(() => showQuestIntro(ageText(q.title, mode)!, ageText(q.intro, mode)!));
    await this.d.learning.introduce(q.introduces);
    this.active = { def: q, runner: new QuestRunner(q) };
    await this.persistActive();
    this.refreshWorld();
    await this.runCurrentStep(npcId);
  }

  private async persistActive() {
    if (!this.active) return;
    const { def, runner } = this.active;
    const st: QuestState = { status: 'active', step: runner.step?.id ?? null, stars: 0, completedAt: null };
    this.d.states.set(def.id, st);
    await this.d.saveQuest(def.id, st);
  }

  /** Подготовить мир к текущему шагу в текущей локации (разложить предметы, показать уток и т. п.). */
  private prepareStep() {
    const scene = this.scene;
    if (!scene) return;
    this.findState = null;
    scene.clearPickables();
    const s = this.active?.runner.step;
    if (s?.show && scene.hasSpots(s.show.zone)) scene.showProps(s.show.items, s.show.zone);
    else scene.clearProps();
    if (s?.type === 'find_item') {
      if (!s.zone) throw new Error(`Шаг ${s.id}: не указана зона для предметов`);
      if (scene.hasSpots(s.zone)) scene.spawnPickables(shuffle([s.target!, ...s.distractors!], Date.now()), s.zone);
      this.findState = { step: s, ladder: new HelpLadder() };
    }
  }

  /** Шаг «дойди до»: засчитывается, как только герой оказался в нужной области. */
  async checkGoTo() {
    const s = this.active?.runner.step;
    if (s?.type !== 'go_to' || !this.scene || this.busy) return;
    if (this.scene.inZone(s.zone!)) await this.completeStep();
  }

  /**
   * Выполнить текущий шаг. Диалог запускается сразу, только если игрок уже разговаривает
   * с этим персонажем (npcId); иначе ждём, пока подойдёт сам — так не бывает «разговоров с порога».
   */
  private async runCurrentStep(withNpc?: string) {
    if (!this.active) return;
    const s = this.active.runner.step;
    if (!s) return this.finishQuest();
    this.prepareStep();
    this.refreshWorld();
    if (s.type === 'dialogue') {
      const npc = this.d.content.dialogue(s.dialogue!).npc;
      if (npc !== withNpc || !this.scene?.hasNpc(npc)) return;
      await this.withBusy(() => this.runDialogue(s.dialogue!));
      return this.completeStep(npc);
    }
    if (s.type === 'task') {
      await this.withBusy(() => this.d.tasks.run(s.task!, { context: this.active!.def.id, ageMode: this.d.ageMode(), canListen: this.d.canListen() }));
      return this.completeStep(withNpc);
    }
    if (s.type === 'review_slot') {
      await this.runReview(s);
      return this.completeStep(withNpc);
    }
    if (s.type === 'go_to') return this.checkGoTo();
    // find_item, give_item — ждём действий игрока в мире
  }

  private async completeStep(withNpc?: string) {
    if (!this.active) return;
    this.d.onProgress?.();
    this.active.runner.next();
    await this.persistActive();
    await this.runCurrentStep(withNpc);
  }

  private async finishQuest() {
    const { def } = this.active!;
    this.active = null;
    this.scene?.clearPickables();
    this.scene?.clearProps();
    const st: QuestState = { status: 'done', step: null, stars: def.rewards.stars, completedAt: this.d.clock.now().toISOString() };
    this.d.states.set(def.id, st);
    await this.d.saveQuest(def.id, st);
    for (const it of def.rewards.decor ?? []) this.scene?.addDecor(it);
    const words = def.introduces.map((id) => { const l = this.d.content.learnable(id); return { en: l.en, ru: l.ru, say: () => void this.d.audio.speak(id, this.d.tasks.audioOf(id).text) }; });
    const decor = def.rewards.decor?.length ? `В твоей комнате появилось украшение: ${def.rewards.decor.map((i) => this.d.content.itemNameRu(i)).join(', ')}.` : undefined;
    await this.withBusy(() => showReward({ stars: def.rewards.stars, quest: `«${ageText(def.title, this.d.ageMode())}» — выполнено! Новые слова:`, words, extra: decor }));
    this.refreshWorld();
  }

  // ---------- диалог ----------

  private async runDialogue(dialogueId: string) {
    const def = this.d.content.dialogue(dialogueId);
    const run = new DialogueRunner(def);
    let lastNpcAudio: { id: string; text: string } | undefined;
    try {
      while (!run.ended) {
        const n = run.current()!;
        this.applyAction(n, def.npc);
        if (n.task) {
          this.d.dialogue.hide();
          const branch = await this.d.tasks.run(n.task, {
            context: dialogueId, promptAudio: lastNpcAudio, title: n.ru_hint, ageMode: this.d.ageMode(), canListen: this.d.canListen(),
          });
          run.advance(branch);
          continue;
        }
        const p = this.d.content.learnable(n.say!);
        const audio = this.d.tasks.audioOf(n.say!);
        const isNpc = n.speaker.startsWith('npc.');
        const ru = this.d.ruHints() ? (ageText(n.ru_hint, this.d.ageMode()) ?? p.ru) : undefined;
        await this.d.dialogue.show({ speaker: isNpc ? this.d.content.npc(n.speaker).name_en : 'Ты', en: p.en, ru, audio, player: !isNpc });
        lastNpcAudio = audio;
        run.advance();
      }
    } finally {
      this.d.dialogue.hide();
    }
  }

  private applyAction(n: DialogueNode, npcId: string) {
    const a = n.action;
    if (!a) return;
    if (a.type === 'emote') this.scene?.npcReact(npcId, a.emote);
    if (a.type === 'weather' && a.weather) this.scene?.setWeather(a.weather);
    if (a.type === 'take_player_item' && a.item) {
      this.d.setInventory(this.d.inventory().filter((i) => i !== a.item));
      this.scene?.setCarried(null);
    }
    if (a.type === 'give_player_item' && a.item) {
      this.d.setInventory([...this.d.inventory(), a.item]);
      // если этот предмет потом нужно отнести — герой несёт его в руках
      if (this.active?.def.steps.some((s) => s.type === 'give_item' && s.item === a.item)) this.scene?.setCarried(a.item);
      toast(`🎁 Тебе дали: ${this.d.content.itemNameEn(a.item)} (${this.d.content.itemNameRu(a.item)})`);
    }
  }

  // ---------- «найди» ----------

  private async onPick(itemId: string) {
    const f = this.findState;
    if (!f || !this.active) return;
    this.d.onProgress?.();
    const s = f.step;
    const target = s.target!;
    const info = f.ladder.attemptInfo();
    // реакция ребёнку — сразу, запись в журнал — параллельно (D24)
    const saving = this.d.learning.recordFind({
      targetWords: this.d.content.item(target).words,
      chosenWords: this.d.content.item(itemId).words,
      posOf: (w) => this.d.content.word(w).pos,
      context: this.active.def.id, firstTry: info.firstTry, hinted: info.hinted,
    });
    const step = f.ladder.answer(itemId === target ? 'correct' : 'wrong');
    const name = this.d.content.itemNameEn(itemId);
    if (step.kind === 'done') {
      sfx.pick();
      this.findState = null;
      this.scene?.clearPickables();
      this.scene?.setCarried(itemId);
      this.d.setInventory([...this.d.inventory(), itemId]);
      toast(`✋ ${name} — ${this.d.content.itemNameRu(itemId)}`);
      void this.d.audio.speak(itemId, name);
      await saving;
      await this.completeStep();
      return;
    }
    sfx.wrong();
    void this.d.audio.speak(itemId, name);
    if (step.kind === 'retry') toast(`Это ${name} (${this.d.content.itemNameRu(itemId)}). Нужно другое!`);
    else if (step.kind === 'hint') {
      const hint = ageText(s.hint?.ru, this.d.ageMode());
      await this.withBusy(async () => {
        await this.d.dialogue.show({ speaker: '💡 Подсказка', en: this.d.content.learnable(s.instruction!).en, ru: hint, audio: this.d.tasks.audioOf(s.instruction!) });
        this.d.dialogue.hide();
      });
    } else if (step.kind === 'model') {
      this.scene?.highlightPickable(target);
      toast(`👉 Вот ${this.d.content.itemNameEn(target)} — ${this.d.content.itemNameRu(target)}! Возьми.`, 3500);
      void this.d.audio.speak(target, this.d.content.itemNameEn(target));
    }
    await saving;
  }

  // ---------- повторение ----------

  private async runReview(s: StepDef) {
    const ids = this.d.learning.dueForReview(s.count ?? 1, {
      exclude: this.active?.def.introduces, topicOf: (id) => this.d.content.topicOf(id), preferTopics: s.prefer_topics,
    });
    if (!ids.length) return;
    toast('🔁 Повторим то, что уже знаешь!');
    await this.withBusy(async () => {
      for (const id of ids) await this.d.tasks.run({ type: 'auto', target: id }, { context: `review.${this.scene?.location ?? 'home'}`, ageMode: this.d.ageMode(), canListen: this.d.canListen() });
    });
  }

  async withBusy<T>(fn: () => Promise<T>): Promise<T> {
    const was = this.busy;
    this.busy = true;
    this.d.block(true);
    try { return await fn(); } finally { this.busy = was; if (!was) this.d.block(false); }
  }

  /** Для автотестов. */
  debugState() {
    return {
      active: this.active?.def.id ?? null,
      step: this.active?.runner.step?.id ?? null,
      states: Object.fromEntries(this.d.states),
      inventory: this.d.inventory(),
      busy: this.busy,
    };
  }
}
