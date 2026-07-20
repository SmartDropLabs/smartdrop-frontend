import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Playwright specs live in tests/ and e2e/ and are run by Playwright, not Vitest.
    exclude: ['tests/**', 'e2e/**', 'node_modules/**', 'dist/**', '.next/**'],
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
