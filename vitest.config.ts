import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const sharedExclude = ['tests/**', 'e2e/**', 'node_modules/**', 'dist/**', '.next/**'];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    // environmentMatchGlobs was removed in Vitest 4 (silently ignored), so
    // every file was falling through to the default jsdom environment.
    // src/lib covers server-side code (API routes, fee-bump guard) that must
    // run under the node environment — jsdom's Buffer polyfill fails
    // @noble/hashes' Uint8Array instanceof checks (issue #449). Projects
    // restore the intended per-directory environments.
    projects: [
      {
        extends: true,
        test: {
          name: 'lib',
          environment: 'node',
          include: ['src/lib/**/*.test.ts', '__tests__/**/*.ts'],
          exclude: sharedExclude,
        },
      },
      {
        extends: true,
        test: {
          name: 'app',
          environment: 'jsdom',
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['src/lib/**', ...sharedExclude],
        },
      },
    ],
  },
});
