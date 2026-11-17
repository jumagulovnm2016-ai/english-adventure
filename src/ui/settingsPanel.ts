// Экран настроек. Каждое изменение сразу применяется и сохраняется.
import type { Settings } from '../storage/types';
import type { AudioPlayer } from '../speech/audioPlayer';
import { $, Modal } from './dom';

export class SettingsPanel {
  private modal = new Modal($('settings'));
  constructor(
    private get: () => Settings,
    private set: (patch: Partial<Settings>) => void,
    private audio: AudioPlayer,
    persistent: boolean,
  ) {
    const vol = $('set-volume') as HTMLInputElement;
    vol.addEventListener('input', () => this.set({ volume: Number(vol.value) }));
    vol.addEventListener('change', () => this.testSound());
    document.querySelectorAll<HTMLElement>('#settings .seg').forEach((seg) => {
      const key = seg.dataset.setting as 'uiScale' | 'accent' | 'narrator';
      seg.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.addEventListener('click', () => {
        const v = b.dataset.value!;
        this.set({ [key]: key === 'uiScale' ? Number(v) : v } as Partial<Settings>);
        this.render();
        if (key !== 'uiScale') this.testSound();
      }));
    });
    $('set-test').addEventListener('click', () => this.testSound());
    $('set-storage').textContent = persistent
      ? 'Прогресс сохраняется на этом устройстве.'
      : '⚠ В этом окне браузера прогресс не сохранится (приватный режим или ограничения браузера).';
  }

  private testSound() { void this.audio.speak('p.hello', 'Hello! How are you?'); this.render(); }

  open(onClose: () => void) { this.render(); this.modal.open(onClose); }
  isOpen() { return this.modal.isOpen(); }

  private render() {
    const s = this.get();
    ($('set-volume') as HTMLInputElement).value = String(s.volume);
    document.querySelectorAll<HTMLElement>('#settings .seg').forEach((seg) => {
      const key = seg.dataset.setting as keyof Settings;
      seg.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
        b.setAttribute('aria-pressed', String(String(s[key]) === b.dataset.value));
      });
    });
    $('set-voice').textContent = `Голос: ${this.audio.voiceLabel()}`;
  }
}
