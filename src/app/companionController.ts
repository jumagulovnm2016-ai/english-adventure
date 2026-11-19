// Спутник Пип: подсказывает, если ребёнок долго ничего не делает, и иногда предлагает «вопрос» —
// повторение прямо в мире (D-этап 3). Частота — из настроек: редко / нормально / часто.
import type { EventBus, GameEvents } from '../core/events';
import type { ContentRegistry } from '../content/registry';
import type { LearningService } from '../learning/learningService';
import type { AudioPlayer } from '../speech/audioPlayer';
import type { WorldScene } from '../game/scenes/WorldScene';
import type { QuestController } from './questController';
import type { TaskController } from './taskController';
import type { AgeMode } from './ageText';
import { toast } from '../ui/questUi';

export type Chatter = 'rare' | 'normal' | 'often';
/** Через сколько секунд бездействия подсказать и как часто предлагать вопрос. */
export const CHATTER: Record<Chatter, { hintAfterSec: number; reviewEverySec: number }> = {
  rare: { hintAfterSec: 75, reviewEverySec: 420 },
  normal: { hintAfterSec: 40, reviewEverySec: 200 },
  often: { hintAfterSec: 25, reviewEverySec: 90 },
};

export interface CompanionDeps {
  bus: EventBus<GameEvents>;
  content: ContentRegistry;
  learning: LearningService;
  audio: AudioPlayer;
  quests: QuestController;
  tasks: TaskController;
  chatter: () => Chatter;
  ageMode: () => AgeMode;
  canListen: () => boolean;
  /** Сейчас открыто какое-то окно — Пип молчит. */
  uiBusy: () => boolean;
  now?: () => number;
}

export class CompanionController {
  private scene: WorldScene | null = null;
  private lastActivity: number;
  private lastHint = 0;
  private lastReviewOffer: number;
  private question: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private now: () => number;

  constructor(private d: CompanionDeps) {
    this.now = d.now ?? (() => Date.now());
    this.lastActivity = this.now();
    this.lastReviewOffer = this.now();
    d.bus.on('interact', (t) => {
      this.activity();
      if (t.kind === 'companion') void this.onTap();
    });
  }

  attach(scene: WorldScene) {
    this.scene = scene;
    scene.setCompanionMarker(!!this.question);
    if (!this.timer) this.timer = setInterval(() => this.tick(), 1000);
  }

  /** Игрок что-то делает — подсказка не нужна. */
  activity() { this.lastActivity = this.now(); }

  /** Раз в секунду: не пора ли подсказать или задать вопрос. */
  tick() {
    if (!this.scene || this.d.uiBusy() || this.d.quests.isBusy()) { this.lastActivity = Math.max(this.lastActivity, this.now() - 5000); return; }
    const cfg = CHATTER[this.d.chatter()];
    const t = this.now();
    if (t - this.lastActivity > cfg.hintAfterSec * 1000 && t - this.lastHint > cfg.hintAfterSec * 1000) {
      const h = this.d.quests.companionHint();
      if (h) {
        this.lastHint = t;
        toast(`🦊 Пип: ${h.text}`, 4500);
        if (h.say) void this.d.audio.speak(h.say.id, h.say.text);
      }
    }
    if (!this.question && t - this.lastReviewOffer > cfg.reviewEverySec * 1000) {
      this.lastReviewOffer = t;
      const due = this.d.learning.dueForReview(1, { topicOf: (id) => this.d.content.topicOf(id) });
      if (due.length) {
        this.question = due[0];
        this.scene.setCompanionMarker(true);
        toast('🦊 Пип: У меня есть вопрос! Нажми на меня.', 3500);
      }
    }
  }

  private async onTap() {
    if (this.d.quests.isBusy() || this.d.uiBusy()) return;
    if (this.question) {
      const id = this.question;
      this.question = null;
      this.scene?.setCompanionMarker(false);
      await this.d.quests.withBusy(() => this.d.tasks.run({ type: 'auto', target: id }, {
        context: `review.${this.scene?.location ?? 'home'}`, ageMode: this.d.ageMode(), canListen: this.d.canListen(),
      }));
      toast('🦊 Пип: Отлично! 🎉', 2000);
      return;
    }
    const h = this.d.quests.companionHint();
    if (h) {
      toast(`🦊 Пип: ${h.text}`, 4500);
      if (h.say) void this.d.audio.speak(h.say.id, h.say.text);
    } else toast(this.d.ageMode() === 'senior' ? '🦊 Пип: Всё сделано. Завтра жители дадут новые поручения.' : '🦊 Пип: Всё сделано! Ты молодец! Завтра будут новые поручения!', 3000);
  }

  /** Для автотестов. */
  debugState() { return { question: this.question }; }
  /** Для автотестов: «прошло много времени». */
  debugForceReviewOffer() { this.lastReviewOffer = 0; this.tick(); }
}
