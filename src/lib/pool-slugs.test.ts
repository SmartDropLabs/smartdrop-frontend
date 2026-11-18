import { describe, expect, it } from 'vitest';
import { extractPoolIdFromSlug, generatePoolSlug } from './pool-slugs';
import type { PoolInfo } from './soroban-parsers';

function makePool(id: string, code: string): PoolInfo {
  return {
    id,
    contractAddress: id,
    asset: { code, isNative: code === 'XLM' },
    dailyRate: '0',
    minLockPeriod: 0,
    totalLocked: '0',
    totalUsers: 0,
    isActive: true,
    createdAt: 0,
  };
}

describe('generatePoolSlug', () => {
  it('lowercases the asset code and last 6 chars of the id', () => {
    const pool = makePool('CAAAAAAAAABSC4', 'XLM');
    expect(generatePoolSlug(pool)).toBe('xlm-aabsc4');
  });
});

describe('extractPoolIdFromSlug (#447)', () => {
  const pools = [
    makePool('CAPOLL111111AAA', 'XLM'),
    makePool('CAPOLL222222BBB', 'USDC'),
  ];

  it('resolves a slug back to its pool id', () => {
    const slug = generatePoolSlug(pools[0]);
    expect(extractPoolIdFromSlug(slug, pools)).toBe(pools[0].id);
  });

  it('is case-insensitive', () => {
    const slug = generatePoolSlug(pools[1]);
    expect(extractPoolIdFromSlug(slug.toUpperCase(), pools)).toBe(pools[1].id);
  });

  it('returns null for unknown slugs', () => {
    expect(extractPoolIdFromSlug('eur-abcdef', pools)).toBeNull();
  });

  it('returns null for an empty pool list', () => {
    expect(extractPoolIdFromSlug('xlm-abcdef', [])).toBeNull();
  });

  it('reuses the cached lookup for the same pools array', () => {
    const slug = generatePoolSlug(pools[0]);
    const first = extractPoolIdFromSlug(slug, pools);
    const second = extractPoolIdFromSlug(slug, pools);
    expect(first).toBe(pools[0].id);
    expect(second).toBe(first);
  });
});
