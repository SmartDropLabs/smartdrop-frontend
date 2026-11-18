import { describe, expect, it } from 'vitest';
import { extractPoolIdFromSlug, generatePoolSlug, generateUniquePoolSlugs } from './pool-slugs';
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

describe('generateUniquePoolSlugs (#751)', () => {
  it('keeps the short slug for pools that do not collide', () => {
    const pools = [makePool('CAPOLL111111AAA', 'XLM'), makePool('CAPOLL222222BBB', 'USDC')];
    const slugs = generateUniquePoolSlugs(pools);

    expect(slugs.get(pools[0].id)).toBe(generatePoolSlug(pools[0]));
    expect(slugs.get(pools[1].id)).toBe(generatePoolSlug(pools[1]));
  });

  it('gives colliding pools distinct, longer slugs', () => {
    const a = makePool('CAAAAA9ZZZZZZ', 'XLM');
    const b = makePool('CBBBBB8ZZZZZZ', 'XLM');
    expect(generatePoolSlug(a)).toBe(generatePoolSlug(b));

    const slugs = generateUniquePoolSlugs([a, b]);

    expect(slugs.get(a.id)).toBe('xlm-9zzzzzz');
    expect(slugs.get(b.id)).toBe('xlm-8zzzzzz');
  });

  it('does not depend on list order', () => {
    const a = makePool('CAAAAA9ZZZZZZ', 'XLM');
    const b = makePool('CBBBBB8ZZZZZZ', 'XLM');

    expect(generateUniquePoolSlugs([a, b])).toEqual(generateUniquePoolSlugs([b, a]));
  });
});

describe('extractPoolIdFromSlug with colliding pools (#751)', () => {
  const a = makePool('CAAAAA9ZZZZZZ', 'XLM');
  const b = makePool('CBBBBB8ZZZZZZ', 'XLM');
  const pools = [a, b];

  it('resolves each unique slug to its own pool', () => {
    const slugs = generateUniquePoolSlugs(pools);

    expect(extractPoolIdFromSlug(slugs.get(a.id)!, pools)).toBe(a.id);
    expect(extractPoolIdFromSlug(slugs.get(b.id)!, pools)).toBe(b.id);
  });

  it('does not resolve the shared short slug to either pool', () => {
    expect(extractPoolIdFromSlug(generatePoolSlug(a), pools)).toBeNull();
  });
});
