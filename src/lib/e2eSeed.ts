/**
 * E2E seeding surface.
 *
 * The specs used to reach into `window.__queryClient` and call `setQueryData`
 * themselves, which coupled every test to two things it should not know about:
 * the QueryClient instance, and the literal spelling of each query key. Rename a
 * key and an unrelated test starts failing; drop the global and every spec breaks
 * at once.
 *
 * This module owns that knowledge instead — the keys sit next to the hooks that
 * define them — and the app installs it under the same development/E2E condition
 * the raw client used to be exposed under. The specs say *what* state they want
 * rather than *where* it lives.
 */

import type { QueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/hooks/useSorobanQuery';
import type { PoolInfo, UserPosition } from '@/lib/soroban-parsers';

/**
 * The pool id the app uses for "every position of this account", as seen in
 * `PoolDetailClient` and `UnlockModal`. Kept here so both the seeding and the
 * spec that reads it agree on one spelling.
 */
export const ALL_POOLS = 'all';

export interface SeededPosition {
  pool: PoolInfo;
  position: UserPosition;
}

export interface E2ESeedApi {
  /** Replaces the cached pool list. */
  seedPools(pools: PoolInfo[]): void;
  /** Caches positions for `publicKey` under the same key the app reads. */
  seedPositions(publicKey: string, entries: SeededPosition[]): void;
  /** Clears the cached positions for `publicKey`. */
  clearPositions(publicKey: string): void;
  /** Drops everything this API can seed, for a test that starts from nothing. */
  reset(): void;
}

export function createE2ESeedApi(queryClient: QueryClient): E2ESeedApi {
  const positionKey = (publicKey: string): [string, string, string] => [
    QUERY_KEYS.USER_POSITION,
    ALL_POOLS,
    publicKey,
  ];

  return {
    seedPools: (pools) => {
      queryClient.setQueryData([QUERY_KEYS.POOLS], pools);
    },

    seedPositions: (publicKey, entries) => {
      queryClient.setQueryData(positionKey(publicKey), entries);
    },

    clearPositions: (publicKey) => {
      queryClient.setQueryData(positionKey(publicKey), []);
    },

    reset: () => {
      queryClient.clear();
    },
  };
}
