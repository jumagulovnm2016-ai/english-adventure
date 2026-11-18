/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { VitePWA } from 'vite-plugin-pwa';

// Обычная сборка: dist/ для GitHub Pages — PWA: установка на экран и работа без интернета.
// `vite build --mode single`: один HTML-файл со всем внутри (для просмотра внутри Claude; там сервис-воркеры запрещены).
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    define: { __PWA__: JSON.stringify(!single) },
    plugins: single ? [viteSingleFile()] : [
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null, // регистрируем сами (src/app/pwa.ts), чтобы показать «доступна новая версия»
        includeAssets: ['icons/*.png'],
        manifest: {
          name: 'English Adventure — Little Town',
          short_name: 'English Town',
          description: 'Обучающая игра: английский для детей 6–15 лет',
          lang: 'ru',
          start_url: './',
          scope: './',
          display: 'standalone',
          orientation: 'any',
          background_color: '#1b1626',
          theme_color: '#1b1626',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,json,webmanifest}'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    build: {
      outDir: single ? 'dist-single' : 'dist',
      chunkSizeWarningLimit: 2000,
    },
    test: {
      include: ['tests/**/*.spec.ts'],
      environment: 'node',
    },
  };
});
