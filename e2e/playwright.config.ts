import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e.ts'],
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_STELLAR_NETWORK: 'TESTNET',
      NEXT_PUBLIC_SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
      NEXT_PUBLIC_LEADERBOARD_API_URL:
        'http://localhost:3000/__mock-leaderboard-api',
      NEXT_PUBLIC_MIN_LOCK_PERIOD_SECONDS: '604800',
      NEXT_PUBLIC_E2E: 'true',
      // Network-level seeding for farm.spec (issue #475): getFactoryPools /
      // getUserPosition short-circuit unless a factory contract and a funded
      // simulation account are configured. Both are satisfied by the RPC
      // mocks in e2e/farm.spec.ts (POOLS_XDR / POSITION_XDR / ACCOUNT_XDR).
      NEXT_PUBLIC_FACTORY_CONTRACT_ID:
        'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
      NEXT_PUBLIC_SIMULATION_ACCOUNT:
        'GA3CD2PYXOQCXW7ZVQW3MOA3JFZCE4F4IG2FD66I55TQASPCNKYYEFRN',
    },
  },
});
