// Короткие звуки успеха/ошибки, синтезируются WebAudio (без файлов). Ошибка — мягкий, не «наказывающий» звук.
let ctx: AudioContext | null = null;
let volume = 0.8;
export function setSfxVolume(v: number) { volume = v; }

function tone(freqs: number[], dur: number, type: OscillatorType, gain: number) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime;
    freqs.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = type; o.frequency.value = f;
      const s = t0 + i * dur * 0.6;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(gain * volume, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
      o.connect(g).connect(ctx!.destination);
      o.start(s); o.stop(s + dur + 0.05);
    });
  } catch { /* звук недоступен — не страшно */ }
}

export const sfx = {
  correct: () => tone([660, 880, 1320], 0.18, 'triangle', 0.18),
  wrong: () => tone([330, 262], 0.2, 'sine', 0.12),
  pick: () => tone([520, 780], 0.12, 'triangle', 0.15),
  reward: () => tone([523, 659, 784, 1047], 0.22, 'triangle', 0.2),
};
