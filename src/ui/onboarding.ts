// Первый запуск: выбор героя, имя, возрастной режим, входная проверка (по желанию).
import type { ContentRegistry } from '../content/registry';
import type { LearningService } from '../learning/learningService';
import type { AudioPlayer } from '../speech/audioPlayer';
import type { Clock } from '../core/clock';
import { PLAYER_LOOKS } from '../game/art/character';
import { personImageUrl } from '../game/art/textures';
import { shuffle } from '../learning/options';
import { visualFor } from './visuals';
import { sfx } from '../speech/sfx';
import { $ } from './dom';

export interface OnboardingResult {
  avatar: string; name: string; ageMode: 'junior' | 'senior';
  placement: { doneAt: string; known: number; total: number; skipped: boolean };
}

/** Слова для входной проверки: всё, что можно показать картинкой (цвета, числа, животные, еда, школа). */
export const PLACEMENT_ITEMS = [
  'w.red', 'w.blue', 'w.green', 'w.yellow', 'w.pink', 'w.black', 'w.white', 'w.brown',
  'w.one', 'w.two', 'w.three', 'w.five', 'w.seven', 'w.ten',
  'w.cat', 'w.dog', 'w.duck', 'w.bird', 'w.rabbit', 'w.frog',
  'w.apple', 'w.banana', 'w.milk', 'w.bread', 'w.egg',
  'w.pencil', 'w.pen', 'w.ruler', 'w.book', 'w.ball',
];

const show = (id: string) => {
  document.querySelectorAll<HTMLElement>('#onboard .ob-step').forEach((s) => (s.hidden = s.id !== id));
  ($(id).querySelector('button, input') as HTMLElement | null)?.focus({ preventScroll: true });
};

export function runOnboarding(content: ContentRegistry, learning: LearningService, audio: AudioPlayer, clock: Clock): Promise<OnboardingResult> {
  return new Promise((resolve) => {
    const res: Partial<OnboardingResult> = {};
    $('onboard').hidden = false;

    // 1. герой
    const heroes = $('ob-heroes');
    heroes.replaceChildren(...PLAYER_LOOKS.map((look, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ob-hero'; b.dataset.look = look;
      b.setAttribute('aria-label', `Герой ${i + 1}`);
      const img = document.createElement('img'); img.src = personImageUrl(look); img.alt = '';
      b.append(img);
      b.addEventListener('click', () => { res.avatar = look; sfx.pick(); show('ob-step-name'); });
      return b;
    }));
    show('ob-step-hero');

    // 2. имя
    $('ob-name-form').addEventListener('submit', (e) => {
      e.preventDefault();
      res.name = (($('ob-name') as HTMLInputElement).value || '').trim().slice(0, 20);
      show('ob-step-age');
    });

    // 3. режим
    document.querySelectorAll<HTMLButtonElement>('#ob-step-age [data-age]').forEach((b) => b.addEventListener('click', () => {
      res.ageMode = b.dataset.age as 'junior' | 'senior';
      show('ob-step-offer');
    }));

    const finish = (placement: OnboardingResult['placement']) => {
      res.placement = placement;
      show('ob-step-done');
      const { known, total, skipped } = placement;
      $('ob-done-title').textContent = skipped ? 'Поехали!' : `Ты уже знаешь ${known} из ${total}!`;
      $('ob-done-text').textContent = skipped
        ? 'Всё объясним по ходу игры.'
        : known >= total * 0.8
          ? 'Здорово! Эти слова ты уже знаешь. Помоги маме дома, а потом выходи на улицу и иди направо — на площадку и в зоопарк: там много нового!'
          : known > 0 ? 'Знакомые слова игра не будет объяснять заново — только проверит через день.' : 'Ничего страшного — всему научимся вместе!';
      $('ob-go').addEventListener('click', () => { $('onboard').hidden = true; resolve(res as OnboardingResult); }, { once: true });
    };

    // 4. проверка
    $('ob-skip').addEventListener('click', () => finish({ doneAt: clock.now().toISOString(), known: 0, total: 0, skipped: true }));
    $('ob-check').addEventListener('click', async () => {
      show('ob-step-check');
      const items = shuffle(PLACEMENT_ITEMS.filter((id) => { try { content.word(id); return true; } catch { return false; } }), Date.now());
      const known: string[] = [];
      for (let i = 0; i < items.length; i++) {
        ($('ob-bar') as HTMLElement).style.width = `${(i / items.length) * 100}%`;
        const ok = await askOne(content, audio, items[i], i);
        await learning.logOnly({ t: clock.now().toISOString(), item: items[i], kind: 'comprehension', mode: 'placement', result: ok ? 'correct' : 'wrong', hinted: false, context: 'placement' });
        if (ok) known.push(items[i]);
      }
      await learning.markFamiliar(known);
      finish({ doneAt: clock.now().toISOString(), known: known.length, total: items.length, skipped: false });
    });
  });
}

/** Один вопрос проверки: звучит слово, 3 картинки, «не знаю». Без подсказок и повторных попыток. */
function askOne(content: ContentRegistry, audio: AudioPlayer, target: string, seed: number): Promise<boolean> {
  return new Promise((resolve) => {
    const w = content.word(target);
    // только варианты-картинки из той же темы: проверяем понимание на слух, а не чтение
    const topic = w.topic;
    const pool = PLACEMENT_ITEMS.filter((id) => id !== target && content.word(id).topic === topic);
    const extra = PLACEMENT_ITEMS.filter((id) => id !== target && !pool.includes(id));
    const ids = shuffle([target, ...shuffle(pool, seed).slice(0, 2), ...shuffle(extra, seed + 3)].slice(0, 3), seed + 11);
    const box = $('ob-options');
    const say = () => void audio.speak(target, w.en);
    $('ob-listen').onclick = say;
    box.replaceChildren(...ids.map((id) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'opt'; b.dataset.id = id;
      const v = visualFor(content, id);
      if (v.kind === 'swatch') b.insertAdjacentHTML('beforeend', `<span class="swatch" style="background:${v.color}"></span>`);
      else if (v.kind === 'image') { const img = document.createElement('img'); img.src = v.src; img.alt = ''; b.append(img); }
      else { const d = document.createElement('span'); d.className = 'digit'; d.textContent = v.kind === 'digit' || v.kind === 'emoji' ? v.text : content.word(id).en; b.append(d); }
      b.setAttribute('aria-label', 'вариант ответа');
      b.addEventListener('click', () => done(id === target));
      return b;
    }));
    $('ob-dunno').onclick = () => done(false);
    let answered = false;
    function done(ok: boolean) { if (answered) return; answered = true; resolve(ok); }
    say();
  });
}
