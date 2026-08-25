import type { PoolInfo } from './soroban-parsers';

export function generatePoolSlug(pool: PoolInfo): string {
  const assetCode = pool.asset.code.toLowerCase();
  const shortId = pool.id.slice(-6).toLowerCase();
  return `${assetCode}-${shortId}`;
}

export function extractPoolIdFromSlug(slug: string, pools: PoolInfo[]): string | null {
  const lowerSlug = slug.toLowerCase();

  for (const pool of pools) {
    if (generatePoolSlug(pool).toLowerCase() === lowerSlug) {
      return pool.id;
    }
  }

  return null;
}
