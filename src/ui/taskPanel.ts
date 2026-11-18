// Панель задания: «послушай и выбери», «собери фразу», «напиши слово».
// Только отображение и ввод. Решения (засчитать, подсказать, показать ответ) принимает TaskController.
import type { AudioPlayer } from '../speech/audioPlayer';
import type { Result } from '../learning/types';
import type { Visual } from './visuals';
import { matchPieces, matchTyped } from '../learning/matcher';
import { sfx } from '../speech/sfx';
import { $ } from './dom';

export interface Audio { id: string; text: string }
export interface OptionView { id: string; en: string; ru: string; visual: Visual; audio: Audio }

export type TaskView =
  | { mode: 'listen_choose'; title: string; prompt?: Audio; picture?: string; playPromptFirst: boolean; options: OptionView[]; showText: boolean; correctId: string }
  | { mode: 'build_phrase'; title: string; prompt?: Audio; picture?: string; pieces: string[]; shuffled: string[]; answerAudio: Audio; tail?: string }
  | { mode: 'type_word'; title: string; prompt?: Audio; picture?: string; expected: string; accept: string[]; answerAudio: Audio };

export interface Answer { result: Result; chosen?: string }

export class TaskPanel {
  private view: TaskView | null = null;
  private pending: ((a: Answer) => void) | null = null;
  private built: number[] = [];

  constructor(private audio: AudioPlayer) {
    $('task-say').addEventListener('click', () => this.playPrompt());
  }

  isOpen() { return !$('task').hidden; }

  open(v: TaskView) {
    this.view = v;
    this.built = [];
    $('task-title').textContent = v.title;
    const pic = $('task-picture') as HTMLImageElement;
    pic.hidden = !v.picture;
    if (v.picture) pic.src = v.picture;
    $('task-hint').hidden = true;
    this.feedback('', '');
    ($('task-say') as HTMLButtonElement).hidden = !v.prompt;
    this.render();
    $('task').hidden = false;
    if (v.mode === 'listen_choose' ? v.playPromptFirst : !!v.prompt) this.playPrompt();
    const first = $('task-body').querySelector<HTMLElement>('button, input');
    first?.focus({ preventScroll: true });
  }

  close() { $('task').hidden = true; this.view = null; this.pending = null; }

  ask(): Promise<Answer> { return new Promise((r) => { this.pending = r; }); }

  private answer(a: Answer) {
    const p = this.pending;
    if (!p) return;
    this.pending = null;
    p(a);
  }

  private playPrompt() { if (this.view?.prompt) void this.audio.speak(this.view.prompt.id, this.view.prompt.text); }

  private feedback(text: string, cls: '' | 'good' | 'bad') {
    const f = $('task-feedback');
    f.textContent = text;
    f.className = `task-feedback ${cls}`;
  }

  // ---------- реакции (вызывает контроллер) ----------

  async success(chosen?: string) {
    sfx.correct();
    if (chosen) $('task-body').querySelector(`[data-id="${CSS.escape(chosen)}"]`)?.classList.add('correct');
    this.feedback('Отлично! 🎉', 'good');
    $('task-body').querySelectorAll('button, input').forEach((b) => ((b as HTMLButtonElement).disabled = true));
    const v = this.view;
    if (v && v.mode !== 'listen_choose') await this.audio.speak(v.answerAudio.id, v.answerAudio.text);
    else if (v && chosen) { const o = v.options.find((x) => x.id === chosen); if (o) await this.audio.speak(o.audio.id, o.audio.text); }
    await new Promise((r) => setTimeout(r, 500));
  }

  retry(chosen?: string) {
    sfx.wrong();
    this.feedback('Почти! Попробуй ещё раз.', 'bad');
    const v = this.view;
    if (v?.mode === 'listen_choose' && chosen) {
      const el = $('task-body').querySelector<HTMLButtonElement>(`[data-id="${CSS.escape(chosen)}"]`);
      if (el) { el.classList.remove('wrong'); void el.offsetWidth; el.classList.add('wrong'); el.disabled = true; }
      const o = v.options.find((x) => x.id === chosen);
      if (o) void this.audio.speak(o.audio.id, o.audio.text); // назвать то, что выбрал: «green»
    } else this.render();
  }

  hint(text: string) {
    sfx.wrong();
    const h = $('task-hint');
    h.textContent = `💡 ${text}`;
    h.hidden = false;
    this.feedback('', '');
    if (this.view?.mode !== 'listen_choose') this.render();
    this.playPrompt();
  }

  /** Показать правильный ответ и попросить повторить его. */
  model() {
    const v = this.view;
    if (!v) return;
    const h = $('task-hint');
    h.hidden = false;
    if (v.mode === 'listen_choose') {
      const o = v.options.find((x) => x.id === v.correctId)!;
      h.textContent = `👉 Правильно: ${o.en} — ${o.ru}. Нажми на него!`;
      const el = $('task-body').querySelector<HTMLButtonElement>(`[data-id="${CSS.escape(v.correctId)}"]`);
      el?.classList.add('model');
      if (el) el.disabled = false;
      void this.audio.speak(o.audio.id, o.audio.text);
    } else if (v.mode === 'build_phrase') {
      h.textContent = `👉 Правильно: ${v.pieces.join(' ')}${v.tail ?? ''}. Собери так же!`;
      this.render();
      void this.audio.speak(v.answerAudio.id, v.answerAudio.text);
    } else {
      h.textContent = `👉 Правильно: ${v.expected}. Напиши так же!`;
      this.render();
      void this.audio.speak(v.answerAudio.id, v.answerAudio.text);
    }
    this.feedback('', '');
  }

  // ---------- отрисовка ----------

  private render() {
    const v = this.view!;
    const body = $('task-body');
    body.replaceChildren();
    if (v.mode === 'listen_choose') this.renderChoose(body, v);
    else if (v.mode === 'build_phrase') this.renderBuild(body, v);
    else this.renderType(body, v);
  }

  private renderChoose(body: HTMLElement, v: Extract<TaskView, { mode: 'listen_choose' }>) {
    const grid = document.createElement('div');
    grid.className = 'options';
    for (const o of v.options) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt';
      b.dataset.id = o.id;
      const vis = o.visual;
      if (vis.kind === 'swatch') b.insertAdjacentHTML('beforeend', `<span class="swatch" style="background:${vis.color}"></span>`);
      else if (vis.kind === 'image') { const img = document.createElement('img'); img.src = vis.src; img.alt = ''; b.append(img); }
      else if (vis.kind === 'digit' || vis.kind === 'emoji') { const d = document.createElement('span'); d.className = 'digit'; d.textContent = vis.text; b.append(d); }
      if (v.showText || vis.kind === 'text') { const t = document.createElement('span'); t.textContent = o.en; b.append(t); }
      b.setAttribute('aria-label', o.en);
      // кнопка «послушать вариант» — для вариантов-фраз (ребёнок может не уметь читать)
      if (v.showText) {
        const l = document.createElement('span');
        l.className = 'listen'; l.textContent = '🔊'; l.setAttribute('role', 'button'); l.setAttribute('aria-label', `Послушать: ${o.en}`);
        l.addEventListener('click', (e) => { e.stopPropagation(); void this.audio.speak(o.audio.id, o.audio.text); });
        b.append(l);
      }
      b.addEventListener('click', () => this.answer({ result: o.id === v.correctId ? 'correct' : 'wrong', chosen: o.id }));
      grid.append(b);
    }
    body.append(grid);
  }

  private renderBuild(body: HTMLElement, v: Extract<TaskView, { mode: 'build_phrase' }>) {
    const ans = document.createElement('div');
    ans.className = 'build-answer';
    ans.setAttribute('aria-label', 'Собранная фраза');
    const pieces = document.createElement('div');
    pieces.className = 'pieces';
    const draw = () => {
      ans.replaceChildren(...this.built.map((i, pos) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'piece'; b.textContent = v.shuffled[i];
        b.addEventListener('click', () => { this.built.splice(pos, 1); draw(); });
        return b;
      }));
      if (this.built.length && v.tail) ans.insertAdjacentText('beforeend', v.tail);
      pieces.querySelectorAll<HTMLButtonElement>('.piece').forEach((b) => (b.disabled = this.built.includes(Number(b.dataset.i))));
      check.disabled = this.built.length !== v.pieces.length;
    };
    v.shuffled.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'piece'; b.textContent = p; b.dataset.i = String(i);
      b.addEventListener('click', () => { if (!this.built.includes(i)) { this.built.push(i); draw(); } });
      pieces.append(b);
    });
    const actions = document.createElement('div');
    actions.className = 'task-actions';
    const check = document.createElement('button');
    check.type = 'button'; check.className = 'btn btn-primary'; check.textContent = '✔ Проверить';
    check.addEventListener('click', () => {
      const chosen = this.built.map((i) => v.shuffled[i]);
      const result = matchPieces(chosen, v.pieces);
      if (result === 'wrong') this.built = [];
      this.answer({ result });
    });
    actions.append(check);
    body.append(ans, pieces, actions);
    this.built = [];
    draw();
  }

  private renderType(body: HTMLElement, v: Extract<TaskView, { mode: 'type_word' }>) {
    const row = document.createElement('form');
    row.className = 'type-row';
    const input = document.createElement('input');
    input.type = 'text'; input.autocomplete = 'off'; input.autocapitalize = 'off'; input.spellcheck = false;
    input.setAttribute('aria-label', 'Напиши слово по-английски');
    const ok = document.createElement('button');
    ok.type = 'submit'; ok.className = 'btn btn-primary'; ok.textContent = '✔';
    row.append(input, ok);
    row.addEventListener('submit', (e) => {
      e.preventDefault();
      const result = matchTyped(input.value, v.expected, v.accept);
      if (result === 'unsure') return;
      this.answer({ result });
    });
    body.append(row);
  }
}
