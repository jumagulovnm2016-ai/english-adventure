// Проведение одного задания: выбор режима, варианты, лестница помощи, запись в учебный журнал.
import type { ContentRegistry } from '../content/registry';
import type { AgeText, TaskDef } from '../content/types';
import type { LearningService } from '../learning/learningService';
import type { TaskMode } from '../learning/types';
import { selectMode } from '../learning/modeSelector';
import { buildOptions, shuffle } from '../learning/options';
import { HelpLadder } from '../quests/helpLadder';
import type { Audio, TaskPanel, TaskView } from '../ui/taskPanel';
import { hasPicture, itemPicture, visualFor } from '../ui/visuals';
import { ageText, type AgeMode } from './ageText';

export interface TaskContext {
  context: string;           // id квеста/диалога или review.<локация>
  promptAudio?: Audio;       // вопрос, который только что прозвучал («What colour is it?»)
  title?: AgeText;           // заголовок задания из контента
  ageMode: AgeMode;
  canListen: boolean;
}

export class TaskController {
  /** Текущее задание (для автотестов). */
  lastView: TaskView | null = null;

  constructor(private content: ContentRegistry, private learning: LearningService, private panel: TaskPanel) {}

  /** Режим, который будет выбран (для тестов и отладки). */
  modeFor(task: TaskDef, ctx: Pick<TaskContext, 'ageMode' | 'canListen'>): TaskMode {
    const t = this.content.learnable(task.target);
    return selectMode(this.learning.state(task.target), task.type, task.allowed_types, {
      ageMode: ctx.ageMode, canListen: ctx.canListen, hasPieces: !!t.pieces, isWord: this.content.isWord(task.target),
    });
  }

  buildView(task: TaskDef, ctx: TaskContext, seed = Date.now()): { view: TaskView; mode: TaskMode } {
    const t = this.content.learnable(task.target);
    const isWord = this.content.isWord(task.target);
    const mode = this.modeFor(task, ctx);
    const answerAudio = { id: t.id, text: t.en };
    const prompt = task.prompt?.say ? this.audioOf(task.prompt.say) : ctx.promptAudio;
    const titleFromContent = ageText(task.prompt?.ru_hint ?? ctx.title, ctx.ageMode);
    const picture = task.prompt?.picture ? itemPicture(this.content, task.prompt.picture) : undefined;

    if (mode === 'build_phrase') {
      const pieces = t.pieces!;
      let shuffled = shuffle(pieces, seed);
      if (shuffled.every((p, i) => p === pieces[i])) shuffled = [...pieces.slice(1), pieces[0]];
      const joined = pieces.join(' ');
      const tail = t.en.startsWith(joined) ? t.en.slice(joined.length) : undefined;
      return { mode, view: { mode, title: titleFromContent ?? `Собери: «${t.ru}»`, prompt, picture, pieces, shuffled, answerAudio, tail: tail?.trim() ? tail : undefined } };
    }
    if (mode === 'type_word') {
      // другие настоящие слова (и созвучия для голоса) не считаем опечаткой: «tree» ≠ «three», «for» ≠ «four»
      const asr = this.content.isWord(task.target) ? this.content.word(task.target).asr_accept ?? [] : [];
      const other = [...this.content.allWords().filter((w) => w.id !== task.target).map((w) => w.en), ...asr];
      return { mode, view: { mode, title: titleFromContent ?? `Напиши по-английски: «${t.ru}»`, prompt: prompt ?? answerAudio, picture, expected: t.en, accept: t.accept ?? [], other, answerAudio } };
    }
    if (mode === 'say_aloud') throw new Error('Режим «скажи вслух» включается только после проверки распознавания на устройстве (D7)');

    // listen_choose
    const ids = buildOptions(this.content, task.target, task.options, 3, seed);
    const options = ids.map((id) => {
      const l = this.content.learnable(id);
      return { id, en: l.en, ru: l.ru, visual: visualFor(this.content, id), audio: this.audioOf(id) };
    });
    // Два вида «выбери»:
    //  • «ответь на вопрос» — прозвучал вопрос («What colour is it?», «Поздоровайся!»), варианты подписаны и озвучиваются;
    //  • «послушай и найди» — звучит само слово/инструкция, варианты — картинки без подписей (понимание на слух).
    const pictures = ids.every((id) => hasPicture(this.content, id));
    const question = !!prompt && prompt.id !== task.target;
    const listenPick = !question && (isWord || pictures);
    return {
      mode,
      view: {
        mode, options, correctId: task.target, picture,
        title: titleFromContent ?? (listenPick ? 'Послушай и найди' : question ? 'Выбери ответ' : `Как сказать: «${t.ru}»?`),
        prompt: listenPick ? answerAudio : prompt,
        playPromptFirst: listenPick,
        showText: !listenPick || !pictures,
      },
    };
  }

  /** Провести задание. Возвращает ветку для диалога: correct — справился сам, wrong — понадобился показ ответа. */
  async run(task: TaskDef, ctx: TaskContext): Promise<'correct' | 'wrong'> {
    const t = this.content.learnable(task.target);
    const { view, mode } = this.buildView(task, ctx);
    this.lastView = view;
    const ladder = new HelpLadder();
    this.panel.open(view);
    try {
      for (;;) {
        const ans = await this.panel.ask();
        const info = ladder.attemptInfo();
        // запись в журнал идёт параллельно с реакцией на экране
        const saving = this.learning.record({ item: task.target, mode, result: ans.result, hinted: info.hinted, firstTry: info.firstTry, context: ctx.context, chosen: ans.chosen });
        const step = ladder.answer(ans.result);
        if (step.kind === 'done') { await Promise.all([this.panel.success(ans.chosen), saving]); return step.branch; }
        if (step.kind === 'retry') this.panel.retry(ans.chosen);
        else if (step.kind === 'hint') this.panel.hint(this.content.isWord(task.target) ? `Нужно слово «${t.ru}».` : `Нужно сказать: «${t.ru}».`);
        else if (step.kind === 'model') this.panel.model();
        await saving;
        // fallback возможен только для голоса, а голос пока не включается (D7)
      }
    } finally {
      this.panel.close();
      this.lastView = null;
    }
  }

  audioOf(id: string): Audio {
    const l = this.content.learnable(id);
    return { id, text: l.en.replace(/…/g, '').trim() };
  }
}
