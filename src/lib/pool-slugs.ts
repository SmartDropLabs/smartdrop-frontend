import type { PoolInfo } from './soroban-parsers';

export function generatePoolSlug(pool: PoolInfo): string {
  const assetCode = pool.asset.code.toLowerCase();
  const shortId = pool.id.slice(-6).toLowerCase();
  return `${assetCode}-${shortId}`;
}

/**
 * Collision-free slugs for a whole pool list (#751), keyed by pool id.
 *
 * `generatePoolSlug` keeps only the last 6 id characters, so two pools with
 * the same asset and id tail get the same slug and one URL would silently
 * open the other pool. Pools whose short slug is unique keep it unchanged;
 * pools that share one all get a longer id tail — the shortest that tells
 * them apart. That depends only on the colliding ids, not on list order, so
 * a slug never flips between pools when the list is reordered.
 */
export function generateUniquePoolSlugs(pools: PoolInfo[]): Map<string, string> {
  const groups = new Map<string, PoolInfo[]>();
  for (const pool of pools) {
    const base = generatePoolSlug(pool);
    groups.set(base, [...(groups.get(base) ?? []), pool]);
  }

  const slugs = new Map<string, string>();
  for (const [base, group] of groups) {
    const distinctIds = new Set(group.map((pool) => pool.id));
    if (distinctIds.size === 1) {
      for (const pool of group) slugs.set(pool.id, base);
      continue;
    }
    const longest = Math.max(...group.map((pool) => pool.id.length));
    let tail = 7;
    while (
      tail < longest &&
      new Set(group.map((pool) => pool.id.slice(-tail).toLowerCase())).size < distinctIds.size
    ) {
      tail++;
    }
    for (const pool of group) {
      slugs.set(pool.id, `${pool.asset.code.toLowerCase()}-${pool.id.slice(-tail).toLowerCase()}`);
    }
  }
  return slugs;
}

/**
 * Issue #447: cache a slug → pool-id Map per pools array so repeated
 * navigations over the same list resolve in O(1) instead of rescanning.
 * Built from collision-free slugs (#751); a short slug that more than one
 * pool shares is not mapped at all, so it resolves to "not found" rather
 * than to whichever pool happened to be listed last.
 */
const slugLookupCache = new WeakMap<PoolInfo[], Map<string, string>>();

function getSlugLookup(pools: PoolInfo[]): Map<string, string> {
  let lookup = slugLookupCache.get(pools);
  if (!lookup) {
    lookup = new Map<string, string>();
    for (const [poolId, slug] of generateUniquePoolSlugs(pools)) {
      lookup.set(slug, poolId);
    }
    slugLookupCache.set(pools, lookup);
  }
  return lookup;
}

export function extractPoolIdFromSlug(slug: string, pools: PoolInfo[]): string | null {
  return getSlugLookup(pools).get(slug.toLowerCase()) ?? null;
}
