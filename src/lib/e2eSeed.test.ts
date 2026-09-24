// @vitest-environment jsdom
/**
 * The seeding API is small, but it is the contract every E2E spec now depends
 * on, so it is checked directly: which keys it writes, and that those keys are
 * the ones the hooks read. jsdom because it imports `useSorobanQuery` for
 * QUERY_KEYS, which is the whole point — the module under test and the specs
 * both lean on that one spelling.
 */
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALL_POOLS, createE2ESeedApi } from './e2eSeed';
import { QUERY_KEYS } from '../hooks/useSorobanQuery';
import type { PoolInfo, UserPosition } from './soroban-parsers';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const PUBLIC_KEY = 'GBQ3WPTHKJ5XKWLOKUZJLZL2GVXR6RWQCXUVDQZWM7Q2YNLDRVGM5ZWJ';

// The shapes come from the contract parsers, which the E2E stubs already fake
// with plain objects; these tests are about keys and lifetime, not parsing.
const POOL = { id: 'pool-xlm', assetCode: 'XLM' } as unknown as PoolInfo;
const POSITION = {
  user: PUBLIC_KEY,
  poolId: 'pool-xlm',
  amount: '10.0000000',
  lockedAt: 1_750_000_000_000,
  credits: '0',
  isLocked: true,
  unlockableAt: 1_750_604_800_000,
} as unknown as UserPosition;

function api(): { client: QueryClient; seed: ReturnType<typeof createE2ESeedApi> } {
  const client = new QueryClient();
  return { client, seed: createE2ESeedApi(client) };
}

describe('e2e seeding API', () => {
  it('writes pools under the key the hook reads', () => {
    const { client, seed } = api();

    seed.seedPools([POOL]);

    expect(client.getQueryData([QUERY_KEYS.POOLS])).toEqual([POOL]);
  });

  it('writes positions under the key the app invalidates', () => {
    const { client, seed } = api();

    seed.seedPositions(PUBLIC_KEY, [{ pool: POOL, position: POSITION }]);

    expect(client.getQueryData([QUERY_KEYS.USER_POSITION, 'all', PUBLIC_KEY])).toEqual([
      { pool: POOL, position: POSITION },
    ]);
  });

  it('keeps positions per account, so one seed cannot leak into another', () => {
    const { client, seed } = api();
    const other = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

    seed.seedPositions(PUBLIC_KEY, [{ pool: POOL, position: POSITION }]);

    expect(client.getQueryData([QUERY_KEYS.USER_POSITION, 'all', other])).toBeUndefined();
  });

  it('clears positions without touching the pool list', () => {
    const { client, seed } = api();
    seed.seedPools([POOL]);
    seed.seedPositions(PUBLIC_KEY, [{ pool: POOL, position: POSITION }]);

    seed.clearPositions(PUBLIC_KEY);

    expect(client.getQueryData([QUERY_KEYS.USER_POSITION, 'all', PUBLIC_KEY])).toEqual([]);
    expect(client.getQueryData([QUERY_KEYS.POOLS])).toEqual([POOL]);
  });

  it('resets everything it seeded', () => {
    const { client, seed } = api();
    seed.seedPools([POOL]);
    seed.seedPositions(PUBLIC_KEY, [{ pool: POOL, position: POSITION }]);

    seed.reset();

    expect(client.getQueryData([QUERY_KEYS.POOLS])).toBeUndefined();
    expect(client.getQueryData([QUERY_KEYS.USER_POSITION, 'all', PUBLIC_KEY])).toBeUndefined();
  });

  it('pins the key spellings the specs rely on', () => {
    // If the app renames a key, this fails here — next to the reason — rather
    // than somewhere unrelated inside a spec.
    expect(QUERY_KEYS.POOLS).toBe('pools');
    expect(QUERY_KEYS.USER_POSITION).toBe('userPosition');
    expect(ALL_POOLS).toBe('all');
  });
});

describe('spec coupling', () => {
  const specDirs = ['e2e', 'tests']
    .map((name) => join(repoRoot, name))
    .filter((path) => existsSync(path));

  const specFiles = specDirs.flatMap((dir) =>
    readdirSync(dir)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => join(dir, name)),
  );

  it('has specs to check, so this cannot pass vacuously', () => {
    expect(specFiles.length).toBeGreaterThan(0);
  });

  it('leaves no spec reaching for the raw QueryClient', () => {
    const offenders = specFiles.filter((file) => readFileSync(file, 'utf8').includes('__queryClient'));

    expect(offenders).toEqual([]);
  });

  it('no longer hands the raw QueryClient to the page', () => {
    const context = readFileSync(join(repoRoot, 'src', 'context', 'index.tsx'), 'utf8');

    expect(context).not.toContain('__queryClient');
    expect(context).toContain('createE2ESeedApi');
  });
});
