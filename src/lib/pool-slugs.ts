import type { PoolInfo } from './soroban-parsers';

export function generatePoolSlug(pool: PoolInfo): string {
  const assetCode = pool.asset.code.toLowerCase();
  const shortId = pool.id.slice(-6).toLowerCase();
  return `${assetCode}-${shortId}`;
}

/**
 * Issue #447: cache a slug → pool-id Map per pools array so repeated
 * navigations over the same list resolve in O(1) instead of rescanning.
 */
const slugLookupCache = new WeakMap<PoolInfo[], Map<string, string>>();

function getSlugLookup(pools: PoolInfo[]): Map<string, string> {
  let lookup = slugLookupCache.get(pools);
  if (!lookup) {
    lookup = new Map<string, string>();
    for (const pool of pools) {
      lookup.set(generatePoolSlug(pool), pool.id);
    }
    slugLookupCache.set(pools, lookup);
  }
  return lookup;
}

export function extractPoolIdFromSlug(slug: string, pools: PoolInfo[]): string | null {
  return getSlugLookup(pools).get(slug.toLowerCase()) ?? null;
}
