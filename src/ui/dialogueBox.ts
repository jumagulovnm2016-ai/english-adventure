// Реплика персонажа внизу экрана: имя, английская фраза, перевод/подсказка, «ещё раз», «дальше».
import type { AudioPlayer } from '../speech/audioPlayer';
import { $ } from './dom';

export interface Line { speaker: string; en: string; ru?: string; audio?: { id: string; text: string }; player?: boolean }

export class DialogueBox {
  private resolve: (() => void) | null = null;
  private audioRef: Line['audio'];

  constructor(private audio: AudioPlayer) {
    $('dlg-next').addEventListener('click', () => this.done());
    $('dlg-say').addEventListener('click', () => this.say());
    document.addEventListener('keydown', (e) => {
      if (!this.resolve || $('dialogue').hidden || !$('task').hidden) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'у') { e.preventDefault(); this.done(); }
    });
  }

  show(line: Line): Promise<void> {
    const sp = $('dlg-speaker');
    sp.textContent = line.speaker;
    sp.classList.toggle('player', !!line.player);
    $('dlg-en').textContent = line.en;
    const ru = $('dlg-ru');
    ru.textContent = line.ru ?? '';
    ru.hidden = !line.ru;
    $('dlg-say').hidden = !line.audio;
    this.audioRef = line.audio;
    $('dialogue').hidden = false;
    ($('dlg-next') as HTMLButtonElement).focus({ preventScroll: true });
    this.say();
    return new Promise((r) => { this.resolve = r; });
  }

  private say() { if (this.audioRef) void this.audio.speak(this.audioRef.id, this.audioRef.text); }

  private done() {
    const r = this.resolve;
    if (!r) return;
    this.resolve = null;
    r();
  }

  hide() { $('dialogue').hidden = true; this.audio.stop(); }
  isOpen() { return !$('dialogue').hidden; }
}
