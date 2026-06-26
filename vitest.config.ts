import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Playwright specs live in tests/ and are run by `playwright test`, not vitest.
    exclude: ['tests/**', 'node_modules/**'],
    environmentMatchGlobs: [
      ['src/hooks/**', 'jsdom'],
      ['src/lib/**', 'node'],
    ],
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
