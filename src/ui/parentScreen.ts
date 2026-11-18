// Экран для родителей: что ребёнок умеет, слова и путаница, время игры, настройки и резервная копия.
import type { Report, WordRow } from '../parent/report';
import { $ } from './dom';

export interface ParentActions {
  report: () => Report;
  getLimit: () => number | null;
  setLimit: (min: number | null) => void;
  todaySeconds: () => number;
  hasPin: () => Promise<boolean>;
  setPin: (pin: string | null) => Promise<void>;
  exportFile: () => Promise<{ name: string; text: string }>;
  importFile: (text: string) => Promise<{ ok: boolean; error?: string }>;
  reset: () => Promise<void>;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
const ruDay = (key: string) => { const [, m, d] = key.split('-'); return `${Number(d)}.${m}`; };

export class ParentScreen {
  private onClose: (() => void) | null = null;

  constructor(private a: ParentActions) {
    $('parent-close').addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.isOpen() && $('gate').hidden) this.close(); });
    document.querySelectorAll<HTMLButtonElement>('.parent-tabs [data-tab]').forEach((b) => b.addEventListener('click', () => this.tab(b.dataset.tab!)));
    document.querySelectorAll<HTMLButtonElement>('#parent-limit button').forEach((b) => b.addEventListener('click', () => {
      this.a.setLimit(b.dataset.value ? Number(b.dataset.value) : null);
      this.renderSettings();
    }));
    ($('parent-pin-form') as HTMLFormElement).addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = ($('parent-pin') as HTMLInputElement).value.trim();
      if (!/^\d{4}$/.test(v)) { $('parent-pin-state').textContent = 'Нужно ровно 4 цифры.'; return; }
      await this.a.setPin(v);
      ($('parent-pin') as HTMLInputElement).value = '';
      await this.renderSettings();
      $('parent-pin-state').textContent = 'PIN сохранён.';
    });
    $('parent-pin-clear').addEventListener('click', async () => { await this.a.setPin(null); await this.renderSettings(); $('parent-pin-state').textContent = 'PIN убран.'; });
    $('parent-export').addEventListener('click', () => void this.doExport());
    ($('parent-import') as HTMLInputElement).addEventListener('change', (e) => void this.doImport(e.target as HTMLInputElement));
    ($('parent-reset-form') as HTMLFormElement).addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = ($('parent-reset') as HTMLInputElement).value.trim().toUpperCase();
      if (v !== 'СБРОС') { $('parent-reset').focus(); return; }
      await this.a.reset();
    });
  }

  isOpen() { return !$('parent').hidden; }

  open(onClose?: () => void) {
    this.onClose = onClose ?? null;
    $('parent').hidden = false;
    this.render();
    this.tab('skills');
    $('parent-close').focus();
  }

  close() {
    if (!this.isOpen()) return;
    $('parent').hidden = true;
    const cb = this.onClose; this.onClose = null; cb?.();
  }

  private tab(name: string) {
    document.querySelectorAll<HTMLElement>('.parent-tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    document.querySelectorAll<HTMLElement>('.parent-body [data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== name));
    if (name === 'settings') void this.renderSettings();
  }

  render() {
    const r = this.a.report();
    const s = r.summary;
    $('parent-summary').innerHTML = [
      [`${s.questsDone} / ${s.questsTotal}`, 'заданий выполнено'],
      [`${r.skills.filter((x) => x.status === 'confirmed').length} / ${r.skills.length}`, 'навыков подтверждено'],
      [String(s.learned), 'слов и фраз выучено'],
      [String(s.learning + s.familiar), 'изучается сейчас'],
      [`${s.minutesWeek} мин`, 'игры за 7 дней'],
    ].map(([b, t]) => `<div class="stat"><b>${b}</b><span>${t}</span></div>`).join('');

    // навыки
    $('parent-skills').innerHTML = r.skills.map((k) => {
      const icon = k.status === 'confirmed' ? '✅' : k.status === 'in_progress' ? '🟡' : '⚪';
      const meta = k.status === 'confirmed' ? `с ${fmtDate(k.confirmedAt!)}${k.withoutVoice ? ' · без голоса' : ''}` : k.status === 'in_progress' ? 'учится' : 'ещё не начато';
      return `<li class="skill ${k.status}"><details><summary><span class="icon">${icon}</span><span>${esc(k.title)}</span><span class="meta">${meta}</span></summary>
        <p class="notes">${esc(k.explain)}</p></details><div class="bar"><i style="width:${Math.round(k.progress * 100)}%"></i></div></li>`;
    }).join('');

    // слова
    $('parent-hard').innerHTML = r.hard.length
      ? `<div class="callout"><b>Чаще ошибается:</b> ${r.hard.map((w) => `<span class="en">${esc(w.en)}</span> (${esc(w.ru)}) — ${w.wrong} ош.`).join(', ')}. Эти слова игра чаще даёт на повторение.</div>` : '';
    $('parent-confusions').innerHTML = r.confusions.length
      ? `<div class="callout"><b>Путает:</b> ${r.confusions.map((c) => `${esc(c.a)} ↔ ${esc(c.b)} (${esc(c.aRu)} / ${esc(c.bRu)}) — ${c.count} раз`).join('; ')}</div>` : '';
    const table = (title: string, rows: WordRow[], hint: string) => rows.length ? `<div class="word-group"><h3>${title} · ${rows.length}</h3><p class="notes">${hint}</p>
      <table class="word-table"><thead><tr><th>По-английски</th><th>Перевод</th><th>Верно / ошибок</th></tr></thead><tbody>
      ${rows.map((w) => `<tr><td class="en">${esc(w.en)}</td><td>${esc(w.ru)}</td><td>${w.correct} / ${w.wrong}</td></tr>`).join('')}</tbody></table></div>` : '';
    $('parent-words').innerHTML =
      table('✅ Выучено', r.words.learned, 'Отвечал правильно с первой попытки несколько раз, с перерывами в несколько дней.') +
      table('🟡 Учит сейчас', r.words.learning, 'Встречал в заданиях; игра будет возвращать эти слова на повторение.') +
      table('🔵 Знал раньше, проверяем', r.words.familiar, 'Узнал во входной проверке; игра подтвердит это повторениями.') ||
      '<p class="notes">Пока нет — ребёнок ещё не начинал задания.</p>';

    // время
    const max = Math.max(30, ...r.days.map((d) => d.minutes));
    $('parent-days').innerHTML = r.days.map((d) =>
      `<div class="day ${d.minutes ? '' : 'zero'}" title="${ruDay(d.day)}: ${d.minutes} мин"><b>${d.minutes || ''}</b><i style="height:${Math.round((d.minutes / max) * 100)}%"></i><span>${ruDay(d.day)}</span></div>`).join('');
    const today = Math.round(this.a.todaySeconds() / 60);
    const lim = this.a.getLimit();
    $('parent-today').textContent = `Сегодня: ${today} мин${lim ? ` из ${lim}` : ''}. Дней с игрой за 2 недели: ${s.daysPlayed14}. Время считается, только когда игра открыта на экране.`;
  }

  private async renderSettings() {
    const lim = this.a.getLimit();
    document.querySelectorAll<HTMLButtonElement>('#parent-limit button').forEach((b) =>
      b.setAttribute('aria-pressed', String((b.dataset.value || null) === (lim === null ? null : String(lim)))));
    $('parent-pin-state').textContent = (await this.a.hasPin()) ? 'PIN задан.' : 'PIN не задан.';
  }

  private async doExport() {
    const { name, text } = await this.a.exportFile();
    // Внутри окна Claude скачивание идёт через разрешение «downloads»; в обычном браузере — обычной ссылкой.
    const host = (window as unknown as { claude?: { use?: (n: string) => Promise<{ save: (o: { filename: string; data: string }) => Promise<unknown> } | null> } }).claude;
    try {
      const dl = host?.use ? await host.use('downloads') : null;
      if (dl) await dl.save({ filename: name, data: text });
      else {
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      $('parent-file-msg').textContent = `Файл «${name}» сохранён в загрузки.`;
    } catch {
      $('parent-file-msg').textContent = 'Браузер не дал сохранить файл. Откройте игру по обычной ссылке (не во встроенном окне) и попробуйте снова.';
    }
  }

  private async doImport(input: HTMLInputElement) {
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { $('parent-file-msg').textContent = 'Файл слишком большой для файла прогресса.'; return; }
    const r = await this.a.importFile(await f.text());
    $('parent-file-msg').textContent = r.ok ? 'Прогресс загружен. Игра перезапускается…' : `Не получилось: ${r.error}`;
  }
}
