// Карточка предмета: картинка, английское название, перевод, слова по отдельности, озвучка.
import type { ContentRegistry } from '../content/registry';
import type { AudioPlayer } from '../speech/audioPlayer';
import { ITEM_ART, type ItemArtKey } from '../game/art/items';
import { pxToDataUrl } from '../game/art/textures';
import { $, Modal } from './dom';

export class ItemCard {
  private modal = new Modal($('card'));
  private current: string | null = null;
  private ruHints = true;

  constructor(private content: ContentRegistry, private audio: AudioPlayer) {
    $('card-play').addEventListener('click', () => this.sayAll(false));
    $('card-slow').addEventListener('click', () => this.sayAll(true));
  }

  setRuHints(on: boolean) { this.ruHints = on; }
  isOpen() { return this.modal.isOpen(); }

  open(itemId: string, onClose: () => void) {
    this.current = itemId;
    const item = this.content.item(itemId);
    const art = ITEM_ART[item.sprite as ItemArtKey];
    const img = $('card-img') as HTMLImageElement;
    img.src = art ? pxToDataUrl(art(), 9) : '';
    img.alt = this.content.itemNameRu(itemId);
    $('card-en').textContent = this.content.itemNameEn(itemId);
    const ru = $('card-ru');
    ru.textContent = this.content.itemNameRu(itemId);
    ru.hidden = !this.ruHints;

    const chips = $('card-words');
    chips.replaceChildren();
    for (const w of this.content.itemWords(itemId)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.innerHTML = `<span class="en"></span>${this.ruHints ? '<span class="ru"></span>' : ''}`;
      b.querySelector('.en')!.textContent = w.en;
      const r = b.querySelector('.ru'); if (r) r.textContent = w.ru;
      b.setAttribute('aria-label', `${w.en} — ${w.ru}. Послушать`);
      b.addEventListener('click', async () => {
        b.classList.add('speaking');
        await this.audio.speak(w.id, w.en);
        b.classList.remove('speaking');
      });
      chips.append(b);
    }
    $('card-note').textContent = this.audio.available()
      ? ''
      : 'На этом устройстве нет английского голоса — озвучка появится, когда добавим записанные файлы.';

    this.modal.open(() => { this.audio.stop(); this.current = null; onClose(); });
    void this.sayAll(false);
  }

  /** Целиком: «blue cup» (для озвучки файлом — id предмета), одно слово — id слова. */
  private sayAll(slow: boolean) {
    if (!this.current) return Promise.resolve();
    const words = this.content.itemWords(this.current);
    if (words.length === 1) return this.audio.speak(words[0].id, words[0].en, { slow });
    return this.audio.speak(this.current, this.content.itemNameEn(this.current), { slow });
  }
}
