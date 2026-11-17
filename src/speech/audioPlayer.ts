// Озвучка английских слов.
// Основной путь (с этапа 2): заранее сгенерированные файлы assets/audio/<акцент>_<пол>/<id>.mp3.
// Пока файлов нет — голос браузера (speechSynthesis). Он работает без интернета на большинстве устройств,
// но качество и набор голосов зависят от устройства. См. docs/DECISIONS.md D17.
import type { Accent, Gender } from '../content/types';

export interface SpeakOptions { slow?: boolean }

export interface VoiceSettings { accent: Accent; narrator: Gender; volume: number }

export interface AudioPlayer {
  /** Произнести слово/фразу. id — для файла озвучки, text — запасной вариант для синтеза. */
  speak(id: string, text: string, opts?: SpeakOptions): Promise<void>;
  /** Произнести несколько по очереди (например, «blue» … «cup»). */
  speakSequence(parts: { id: string; text: string }[], opts?: SpeakOptions): Promise<void>;
  stop(): void;
  setVoice(v: VoiceSettings): void;
  /** Есть ли на устройстве хоть какой-то английский голос. */
  available(): boolean;
  /** Имя голоса, который реально используется (для экрана настроек). */
  voiceLabel(): string;
}

// Части имён голосов, по которым угадываем пол. Списки неполные — у разных систем свои названия.
const FEMALE = ['libby', 'sonia', 'maisie', 'hazel', 'susan', 'kate', 'serena', 'stephanie', 'martha', 'samantha', 'karen',
  'moira', 'tessa', 'fiona', 'victoria', 'allison', 'ava', 'zira', 'aria', 'jenny', 'emma', 'amy', 'michelle', 'nicky'];
const MALE = ['ryan', 'thomas', 'george', 'daniel', 'oliver', 'arthur', 'alex', 'fred', 'david', 'mark', 'guy',
  'christopher', 'eric', 'roger', 'aaron', 'gordon', 'rishi', 'tom', 'james'];
const hasWord = (name: string, list: string[]) => list.some((t) => new RegExp(`\\b${t}\\b`).test(name));

export function voiceGender(voiceName: string): Gender | null {
  const n = voiceName.toLowerCase();
  if (/\bfemale\b|\bwoman\b/.test(n) || hasWord(n, FEMALE)) return 'f';
  if (/\bmale\b|\bman\b/.test(n) || hasWord(n, MALE)) return 'm';
  return null;
}

export function pickVoice(voices: SpeechSynthesisVoice[], accent: Accent, gender: Gender): SpeechSynthesisVoice | null {
  const norm = (l: string) => l.toLowerCase().replace('_', '-');
  const want = accent === 'uk' ? 'en-gb' : 'en-us';
  const en = voices.filter((v) => norm(v.lang).startsWith('en'));
  if (!en.length) return null;
  const score = (v: SpeechSynthesisVoice) => {
    let s = 0;
    if (norm(v.lang) === want) s += 100;
    if (voiceGender(v.name) === gender) s += 20;
    if (/natural|neural|online|enhanced|premium|google/i.test(v.name)) s += 10; // обычно звучат естественнее
    if (v.localService) s += 5; // работает без интернета
    return s;
  };
  return [...en].sort((a, b) => score(b) - score(a))[0];
}

export class BrowserAudioPlayer implements AudioPlayer {
  private settings: VoiceSettings = { accent: 'uk', narrator: 'f', volume: 0.8 };
  private voice: SpeechSynthesisVoice | null = null;
  private synth: SpeechSynthesis | null = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
  private currentAudio: HTMLAudioElement | null = null;

  /** useFiles: есть ли сгенерированные файлы озвучки (с этапа 2). */
  constructor(private useFiles = false, private audioBase = 'assets/audio') {
    if (this.synth) {
      this.refreshVoice();
      // В Chrome список голосов приходит асинхронно
      this.synth.addEventListener?.('voiceschanged', () => this.refreshVoice());
    }
  }

  setVoice(v: VoiceSettings) { this.settings = v; this.refreshVoice(); }

  private refreshVoice() {
    if (!this.synth) return;
    this.voice = pickVoice(this.synth.getVoices(), this.settings.accent, this.settings.narrator);
  }

  available() { return this.useFiles || !!this.voice; }
  voiceLabel() {
    if (this.useFiles) return 'записанные файлы';
    return this.voice ? `${this.voice.name} (${this.voice.lang})` : 'нет английского голоса на устройстве';
  }

  stop() {
    this.synth?.cancel();
    if (this.currentAudio) { this.currentAudio.pause(); this.currentAudio = null; }
  }

  async speak(id: string, text: string, opts: SpeakOptions = {}): Promise<void> {
    this.stop();
    if (this.useFiles) {
      const ok = await this.playFile(id, opts);
      if (ok) return;
    }
    await this.synthesize(text, opts);
  }

  async speakSequence(parts: { id: string; text: string }[], opts: SpeakOptions = {}) {
    this.stop();
    for (const p of parts) {
      if (this.useFiles && (await this.playFile(p.id, opts))) continue;
      await this.synthesize(p.text, opts);
    }
  }

  private playFile(id: string, opts: SpeakOptions): Promise<boolean> {
    const folder = `${this.settings.accent}_${this.settings.narrator}`;
    const file = `${this.audioBase}/${folder}/${id}${opts.slow ? '.slow' : ''}.mp3`;
    return new Promise((resolve) => {
      const a = new Audio(file);
      a.volume = this.settings.volume;
      this.currentAudio = a;
      a.onended = () => resolve(true);
      a.onerror = () => resolve(false);
      a.play().catch(() => resolve(false));
    });
  }

  private synthesize(text: string, opts: SpeakOptions): Promise<void> {
    const synth = this.synth;
    if (!synth || !this.voice) return Promise.resolve();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = this.voice;
      u.lang = this.voice!.lang;
      u.rate = opts.slow ? 0.6 : 0.9;
      u.pitch = 1;
      u.volume = this.settings.volume;
      const done = () => { clearTimeout(guard); resolve(); };
      // Некоторые браузеры не присылают onend — страхуемся таймером
      const guard = setTimeout(done, 1500 + text.length * (opts.slow ? 220 : 120));
      u.onend = done;
      u.onerror = done;
      synth.speak(u);
    });
  }
}
