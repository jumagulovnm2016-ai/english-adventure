// Установка игры как приложения и работа без интернета (только в обычной сборке — внутри Claude сервис-воркеры запрещены).
declare const __PWA__: boolean;

export interface PwaHooks {
  /** Браузер готов предложить установку (Chrome, Android). */
  onInstallable: (install: () => Promise<boolean>) => void;
  /** Новая версия игры загружена и готова. */
  onUpdateReady: () => void;
}

export const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

export const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function setupPwa(h: PwaHooks): { offlineReady: Promise<boolean> } {
  if (!__PWA__ || !('serviceWorker' in navigator) || !isSecureContext) return { offlineReady: Promise.resolve(false) };

  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    const ev = e as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
    h.onInstallable(async () => { await ev.prompt(); return (await ev.userChoice).outcome === 'accepted'; });
  });

  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // первая установка — не «обновление»
    if (hadController) h.onUpdateReady();
  });

  const offlineReady = navigator.serviceWorker.register('./sw.js', { scope: './' })
    .then(async () => { await navigator.serviceWorker.ready; return true; })
    .catch((err) => { console.warn('Офлайн-режим недоступен:', err); return false; });
  return { offlineReady };
}
