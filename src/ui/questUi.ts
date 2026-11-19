// Цель квеста в верхней панели, звёзды, всплывающие сообщения, окна начала и награды.
import type { AudioPlayer } from '../speech/audioPlayer';
import { sfx } from '../speech/sfx';
import { $, Modal } from './dom';
import { bump, confetti } from './fx';

export class QuestHud {
  private sayAudio: { id: string; text: string } | null = null;
  constructor(private audio: AudioPlayer) {
    $('quest-say').addEventListener('click', () => { if (this.sayAudio) void this.audio.speak(this.sayAudio.id, this.sayAudio.text); });
  }
  private stars = -1;
  setStars(n: number) {
    $('hud-stars').querySelector('span')!.textContent = String(n);
    if (this.stars >= 0 && n > this.stars) bump($('hud-stars'));
    this.stars = n;
  }
  setGoal(goal: { title: string; text: string; say?: { id: string; text: string } } | null) {
    $('quest-goal').hidden = !goal;
    if (!goal) return;
    $('quest-title').textContent = goal.title;
    $('quest-text').textContent = goal.text;
    this.sayAudio = goal.say ?? null;
    $('quest-say').hidden = !goal.say;
  }
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function toast(text: string, ms = 2200) {
  const t = $('toast');
  t.textContent = text;
  t.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

const introModal = () => new Modal($('quest-intro'));
const rewardModal = () => new Modal($('reward'));
let intro: Modal | null = null;
let reward: Modal | null = null;

export function showQuestIntro(title: string, text: string): Promise<void> {
  intro ??= introModal();
  $('qi-title').textContent = title;
  $('qi-text').textContent = text;
  return new Promise((r) => intro!.open(r));
}

export function showReward(args: { stars: number; quest: string; words: { en: string; ru: string; say: () => void }[]; extra?: string }): Promise<void> {
  reward ??= rewardModal();
  sfx.reward();
  // звёзды выпрыгивают по одной
  const stars = $('rw-stars');
  stars.replaceChildren(...(args.stars ? Array.from({ length: args.stars }, (_, i) => { const s = document.createElement('span'); s.className = 'rw-star'; s.style.animationDelay = `${0.15 + i * 0.18}s`; s.textContent = '⭐'; return s; }) : [document.createTextNode('✔')]));
  $('rw-quest').textContent = args.quest;
  const box = $('rw-words');
  box.replaceChildren(...args.words.map((w) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip';
    b.innerHTML = '<span class="en"></span><span class="ru"></span>';
    b.querySelector('.en')!.textContent = w.en;
    b.querySelector('.ru')!.textContent = w.ru;
    b.addEventListener('click', w.say);
    return b;
  }));
  $('rw-extra').textContent = args.extra ?? '';
  const done = new Promise<void>((r) => reward!.open(r));
  requestAnimationFrame(() => confetti(stars, 26));
  return done;
}

export const isAnyModalOpen = () => ['card', 'settings', 'quest-intro', 'reward', 'task', 'gate', 'parent', 'limit'].some((id) => !$(id).hidden);
