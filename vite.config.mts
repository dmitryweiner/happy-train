import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const page = (file: string) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  // Относительные пути: игра открывается с подпути GitHub Pages (/happy-train/)
  base: './',
  build: {
    // GitHub Pages раздаёт /docs из main (FIXIN-PLAN.md §7)
    outDir: 'docs',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: page('./index.html'),
        editor: page('./editor.html'),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts', 'visual-tests/**/*.test.ts'],
    environment: 'node',
  },
});
