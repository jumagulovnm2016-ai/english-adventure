/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Обычная сборка: dist/ для GitHub Pages.
// `vite build --mode single`: один HTML-файл со всем внутри (для быстрого просмотра и публикации как артефакт).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
  },
}));
