// Квестовый контроллер: связывает сцену (персонажи, предметы), интерфейс (диалоги, задания) и учебное ядро.
import type { EventBus, GameEvents } from '../core/events';
import type { Clock } from '../core/clock';
import type { ContentRegistry } from '../content/registry';
import type { DialogueNode, QuestDef, StepDef } from '../content/types';
import type { LearningService } from '../learning/learningService';
import { DialogueRunner } from '../quests/dialogueRunner';
import { HelpLadder } from '../quests/helpLadder';
import { QuestRunner, questForNpc, questStatus, type QuestState } from '../quests/questRunner';
import type { WorldScene } from '../game/scenes/WorldScene';
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
  /** Заблокировать управление героем на время диалога/задания. */
  block: (on: boolean) => void;
}

export class QuestController {
  private scene!: WorldScene;
  private active: { def: QuestDef; runner: QuestRunner } | null = null;
  private busy = false;
  /** Ожидание выбора предмета в шаге «найди». */
  private findState: { step: StepDef; ladder: HelpLadder } | null = null;

  constructor(private d: QuestDeps) {}

  attach(scene: WorldScene) {
    this.scene = scene;
    const quests = this.d.content.quests();
    // украшения за выполненные квесты
    for (const q of quests) if (this.d.states.get(q.id)?.status === 'done') for (const it of q.rewards.decor ?? []) scene.addDecor(it);
    // продолжить активный квест
    const act = quests.find((q) => this.d.states.get(q.id)?.status === 'active');
    if (act) {
      const runner = new QuestRunner(act, this.d.states.get(act.id)!.step);
      runner.resume(this.d.inventory());
      this.active = { def: act, runner };
      const carried = this.d.inventory().find((i) => act.steps.some((s) => s.type === 'give_item' && s.item === i));
      scene.setCarried(carried ?? null);
      void this.persistActive();
      this.prepareStep();
    }
    this.refreshWorld();
    this.d.bus.on('interact', (t) => {
      if (this.busy) return;
      if (t.kind === 'npc') void this.onNpc(t.id);
      else if (t.kind === 'pick') void this.onPick(t.id);
    });
  }

  totalStars() { return [...this.d.states.values()].reduce((s, q) => s + (q.status === 'done' ? q.stars : 0), 0); }

  // ---------- персонажи и подсказки в мире ----------

  private refreshWorld() {
    const quests = this.d.content.quests();
    const npcIds = new Set(this.scene ? quests.map((q) => q.giver) : []);
    for (const npcId of npcIds) {
      // персонаж появляется, когда открыт хотя бы один его квест (Эми приходит после первого квеста)
      const visible = quests.some((q) => q.giver === npcId && questStatus(q, this.d.states) !== 'locked');
      this.scene.setNpcVisible(npcId, visible);
      this.scene.setNpcMarker(npcId, visible && this.npcWantsTalk(npcId));
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
    return !!questForNpc(npcId, this.d.content.quests(), this.d.states);
  }

  private updateGoal() {
    const mode = this.d.ageMode();
    if (!this.active) {
      const next = this.d.content.quests().find((q) => questStatus(q, this.d.states) === 'available');
      this.d.hud.setGoal(next
        ? { title: 'Новое задание', text: `Поговори ${this.d.content.npc(next.giver).ru_with} — над ${this.d.content.npc(next.giver).gender === 'f' ? 'ней' : 'ним'} «!»` }
        : null);
      return;
    }
    const { def, runner } = this.active;
    const s = runner.step;
    const title = ageText(def.title, mode)!;
    if (!s) { this.d.hud.setGoal(null); return; }
    const npc = (id: string) => this.d.content.npc(id);
    if (s.type === 'dialogue') this.d.hud.setGoal({ title, text: `Поговори ${npc(this.d.content.dialogue(s.dialogue!).npc).ru_with}` });
    else if (s.type === 'find_item') this.d.hud.setGoal({ title, text: 'Найди то, о чём просят. Не помнишь? Послушай ещё раз →', say: this.d.tasks.audioOf(s.instruction!) });
    else if (s.type === 'give_item') this.d.hud.setGoal({ title, text: `Отнеси ${this.d.content.itemNameEn(s.item!)} ${npc(s.npc!).ru_to}` });
    else this.d.hud.setGoal({ title, text: '…' });
  }

  // ---------- начало и шаги квеста ----------

  private async onNpc(npcId: string) {
    this.scene.npcReact(npcId);
    if (this.active) {
      const s = this.active.runner.step!;
      if (s.type === 'dialogue' && this.d.content.dialogue(s.dialogue!).npc === npcId) return this.runCurrentStep();
      if (s.type === 'give_item' && s.npc === npcId) {
        if (this.d.inventory().includes(s.item!)) { await this.completeStep(); return; }
        return this.say(npcId, this.findInstruction() ?? 'p.hello_mum');
      }
      if (s.type === 'find_item' && this.active.def.giver === npcId) return this.say(npcId, s.instruction!);
      return this.say(npcId, 'p.hello_mum');
    }
    const q = questForNpc(npcId, this.d.content.quests(), this.d.states);
    if (!q) return this.say(npcId, 'p.hello_mum');
    await this.startQuest(q);
  }

  private findInstruction(): string | undefined {
    if (!this.active) return undefined;
    return this.active.def.steps.find((x) => x.type === 'find_item')?.instruction;
  }

  private async say(npcId: string, phraseId: string) {
    await this.withBusy(async () => {
      const p = this.d.content.learnable(phraseId);
      await this.d.dialogue.show({ speaker: this.d.content.npc(npcId).name_en, en: p.en, ru: this.d.ruHints() ? p.ru : undefined, audio: this.d.tasks.audioOf(phraseId) });
      this.d.dialogue.hide();
    });
  }

  private async startQuest(q: QuestDef) {
    const mode = this.d.ageMode();
    await this.withBusy(() => showQuestIntro(ageText(q.title, mode)!, ageText(q.intro, mode)!));
    await this.d.learning.introduce(q.introduces);
    this.active = { def: q, runner: new QuestRunner(q) };
    await this.persistActive();
    this.refreshWorld();
    await this.runCurrentStep();
  }

  private async persistActive() {
    if (!this.active) return;
    const { def, runner } = this.active;
    const st: QuestState = { status: 'active', step: runner.step?.id ?? null, stars: 0, completedAt: null };
    this.d.states.set(def.id, st);
    await this.d.saveQuest(def.id, st);
  }

  /** Подготовить мир к текущему шагу (разложить предметы и т. п.) без блокировки. */
  private prepareStep() {
    const s = this.active?.runner.step;
    this.findState = null;
    if (!s) return;
    if (s.type === 'find_item') {
      const items = shuffle([s.target!, ...s.distractors!], Date.now());
      if (!s.zone) throw new Error(`Шаг ${s.id}: не указана зона для предметов`);
      this.scene.spawnPickables(items, s.zone);
      this.findState = { step: s, ladder: new HelpLadder() };
    }
  }

  private async runCurrentStep() {
    if (!this.active) return;
    const s = this.active.runner.step;
    if (!s) return this.finishQuest();
    this.updateGoal();
    if (s.type === 'dialogue') {
      await this.withBusy(() => this.runDialogue(s.dialogue!));
      return this.completeStep();
    }
    if (s.type === 'task') {
      await this.withBusy(() => this.d.tasks.run(s.task!, { context: this.active!.def.id, ageMode: this.d.ageMode(), canListen: false }));
      return this.completeStep();
    }
    if (s.type === 'review_slot') {
      await this.runReview(s);
      return this.completeStep();
    }
    // find_item, give_item, go_to — ждём действий игрока в мире
    this.prepareStep();
    this.refreshWorld();
  }

  private async completeStep() {
    if (!this.active) return;
    this.active.runner.next();
    await this.persistActive();
    this.refreshWorld();
    await this.runCurrentStep();
  }

  private async finishQuest() {
    const { def } = this.active!;
    this.active = null;
    this.scene.clearPickables();
    const st: QuestState = { status: 'done', step: null, stars: def.rewards.stars, completedAt: this.d.clock.now().toISOString() };
    this.d.states.set(def.id, st);
    await this.d.saveQuest(def.id, st);
    for (const it of def.rewards.decor ?? []) this.scene.addDecor(it);
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
            context: dialogueId, promptAudio: lastNpcAudio, title: n.ru_hint, ageMode: this.d.ageMode(), canListen: false,
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
    if (a.type === 'emote') this.scene.npcReact(npcId, a.emote);
    if (a.type === 'take_player_item' && a.item) {
      this.d.setInventory(this.d.inventory().filter((i) => i !== a.item));
      this.scene.setCarried(null);
    }
    if (a.type === 'give_player_item' && a.item) {
      this.d.setInventory([...this.d.inventory(), a.item]);
      toast(`🎁 Тебе дали: ${this.d.content.itemNameEn(a.item)} (${this.d.content.itemNameRu(a.item)})`);
    }
  }

  // ---------- «найди» ----------

  private async onPick(itemId: string) {
    const f = this.findState;
    if (!f || !this.active) return;
    const s = f.step;
    const target = s.target!;
    const info = f.ladder.attemptInfo();
    // реакция ребёнку — сразу, запись в журнал — параллельно (иначе заметная задержка на медленных устройствах)
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
      this.scene.clearPickables();
      this.scene.setCarried(itemId);
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
      this.scene.highlightPickable(target);
      toast(`👉 Вот ${this.d.content.itemNameEn(target)} — ${this.d.content.itemNameRu(target)}! Возьми его.`, 3500);
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
    const loc = this.active?.def.location ?? 'home';
    toast('🔁 Повторим то, что уже знаешь!');
    await this.withBusy(async () => {
      for (const id of ids) {
        await this.d.tasks.run({ type: 'auto', target: id }, { context: `review.${loc}`, ageMode: this.d.ageMode(), canListen: false });
      }
    });
  }

  private async withBusy<T>(fn: () => Promise<T>): Promise<T> {
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
