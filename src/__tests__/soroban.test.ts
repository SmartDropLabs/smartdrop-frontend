/**
 * Unit tests for XDR parser helpers in soroban-parsers.ts.
 *
 * Tests use plain JS objects (as returned by scValToNative) so they stay
 * fast and dependency-free. parsePoolsFromNative and parsePoolEntry are
 * exported specifically to enable this pattern.
 */
import { describe, it, expect } from 'vitest';
import {
  bigintToDisplayAmount,
  parsePoolEntry,
  parsePoolsFromNative,
} from '../lib/soroban-parsers';

// ── bigintToDisplayAmount ─────────────────────────────────────────────────────

describe('bigintToDisplayAmount', () => {
  it('converts zero stroops', () => {
    expect(bigintToDisplayAmount(0n)).toBe('0.0000000');
  });

  it('converts 5_000_000 stroops → 0.5000000', () => {
    expect(bigintToDisplayAmount(5_000_000n)).toBe('0.5000000');
  });

  it('converts 10_000_000 stroops → 1.0000000', () => {
    expect(bigintToDisplayAmount(10_000_000n)).toBe('1.0000000');
  });

  it('converts 100_000_000 stroops → 10.0000000', () => {
    expect(bigintToDisplayAmount(100_000_000n)).toBe('10.0000000');
  });

  it('clamps negative values to 0.0000000', () => {
    expect(bigintToDisplayAmount(-1n)).toBe('0.0000000');
  });

  it('passes non-bigint through as string', () => {
    expect(bigintToDisplayAmount('5')).toBe('5');
    expect(bigintToDisplayAmount(undefined)).toBe('0');
  });
});

// ── parsePoolEntry ────────────────────────────────────────────────────────────

const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

// Simulate the plain-JS object that scValToNative returns for an ScMap entry.
// Strings come back as Buffers in Node.js; BigInts stay as BigInt.
const USDC_POOL_NATIVE = {
  id: Buffer.from('pool-1'),
  contract_address: Buffer.from('GCONTRACTUSDC'),
  asset_code: Buffer.from('USDC'),
  asset_issuer: Buffer.from(USDC_ISSUER),
  is_native: false,
  daily_rate: 5_000_000n,    // 0.5000000 display
  min_lock_period: 86400n,   // 1 day in seconds
  total_locked: 100_000_000n, // 10.0000000 display
  total_users: 42,
  is_active: true,
  created_at: 1700000000n,
};

const XLM_POOL_NATIVE = {
  id: Buffer.from('pool-xlm'),
  contract_address: Buffer.from('GXLMCONTRACT'),
  asset_code: Buffer.from('XLM'),
  is_native: true,
  daily_rate: 0n,
  min_lock_period: 0n,
  total_locked: 0n,
  total_users: 0,
  is_active: true,
  created_at: 0n,
};

describe('parsePoolEntry', () => {
  it('parses a USDC pool with all canonical fields', () => {
    const pool = parsePoolEntry(USDC_POOL_NATIVE, 0);

    expect(pool.id).toBe('pool-1');
    expect(pool.contractAddress).toBe('GCONTRACTUSDC');
    expect(pool.asset.code).toBe('USDC');
    expect(pool.asset.issuer).toBe(USDC_ISSUER);
    expect(pool.asset.isNative).toBe(false);
    expect(pool.dailyRate).toBe('0.5000000');
    expect(pool.minLockPeriod).toBe(86400);
    expect(pool.totalLocked).toBe('10.0000000');
    expect(pool.totalUsers).toBe(42);
    expect(pool.isActive).toBe(true);
    expect(pool.createdAt).toBe(1700000000);
  });

  it('parses a native XLM pool — isNative true, no issuer', () => {
    const pool = parsePoolEntry(XLM_POOL_NATIVE, 0);

    expect(pool.asset.code).toBe('XLM');
    expect(pool.asset.isNative).toBe(true);
    expect(pool.asset.issuer).toBeUndefined();
  });

  it('uses fallbackIndex when id and contract_address are absent', () => {
    const pool = parsePoolEntry(
      {
        asset_code: Buffer.from('XLM'),
        is_native: true,
        daily_rate: 0n,
        min_lock_period: 0n,
        total_locked: 0n,
        total_users: 0,
        is_active: true,
        created_at: 0n,
      },
      7,
    );
    expect(pool.id).toBe('7');
  });

  it('accepts nested asset object format', () => {
    const pool = parsePoolEntry(
      {
        id: Buffer.from('pool-nested'),
        contract_address: Buffer.from('GNESTED'),
        asset: {
          code: Buffer.from('AQUA'),
          issuer: Buffer.from('GAISSUERAQUA'),
          is_native: false,
        },
        daily_rate: 1_000_000n,
        min_lock_period: 3600n,
        total_locked: 50_000_000n,
        total_users: 5,
        is_active: true,
        created_at: 1000n,
      },
      0,
    );

    expect(pool.asset.code).toBe('AQUA');
    expect(pool.asset.issuer).toBe('GAISSUERAQUA');
    expect(pool.asset.isNative).toBe(false);
  });
});

// ── parsePoolsFromNative ──────────────────────────────────────────────────────

describe('parsePoolsFromNative', () => {
  it('returns empty array for empty input', () => {
    expect(parsePoolsFromNative([])).toEqual([]);
  });

  it('parses multiple pools', () => {
    const pools = parsePoolsFromNative([USDC_POOL_NATIVE, XLM_POOL_NATIVE]);
    expect(pools).toHaveLength(2);
    expect(pools[0].id).toBe('pool-1');
    expect(pools[1].id).toBe('pool-xlm');
  });

  it('skips a null entry and returns valid ones', () => {
    const pools = parsePoolsFromNative([USDC_POOL_NATIVE, null, XLM_POOL_NATIVE]);
    expect(pools).toHaveLength(2);
    expect(pools[0].id).toBe('pool-1');
    expect(pools[1].id).toBe('pool-xlm');
  });

  it('skips a non-object (string) entry', () => {
    const pools = parsePoolsFromNative([USDC_POOL_NATIVE, 'broken', XLM_POOL_NATIVE]);
    expect(pools).toHaveLength(2);
  });

  it('skips an array entry (wrong type)', () => {
    const pools = parsePoolsFromNative([USDC_POOL_NATIVE, [1, 2, 3]]);
    expect(pools).toHaveLength(1);
  });

  it('correctly converts zero-amount pool fields', () => {
    const pools = parsePoolsFromNative([XLM_POOL_NATIVE]);
    expect(pools[0].dailyRate).toBe('0.0000000');
    expect(pools[0].totalLocked).toBe('0.0000000');
  });
});
