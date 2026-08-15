import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { parsePoolsFromNative } from '@/lib/soroban-parsers';

describe('soroban-parsers pool id stability (#145)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('preserves stable id using contractAddress across array order changes', () => {
    const poolA = {
      contract_address: 'CAAAAAAA_POOL_A_CONTRACT_ADDR',
      asset_code: 'XLM',
      daily_rate: 10000000n,
    };
    const poolB = {
      contract_address: 'CBBBBBBB_POOL_B_CONTRACT_ADDR',
      asset_code: 'USDC',
      daily_rate: 20000000n,
    };

    // Order 1: [A, B]
    const parsedOrder1 = parsePoolsFromNative([poolA, poolB]);
    expect(parsedOrder1[0].id).toBe('CAAAAAAA_POOL_A_CONTRACT_ADDR');
    expect(parsedOrder1[1].id).toBe('CBBBBBBB_POOL_B_CONTRACT_ADDR');

    // Order 2: [B, A] (simulating factory reordering)
    const parsedOrder2 = parsePoolsFromNative([poolB, poolA]);
    expect(parsedOrder2[0].id).toBe('CBBBBBBB_POOL_B_CONTRACT_ADDR');
    expect(parsedOrder2[1].id).toBe('CAAAAAAA_POOL_A_CONTRACT_ADDR');

    // Both resolve to identical IDs regardless of array index
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('uses explicit id when provided', () => {
    const pool = {
      id: 'custom-farm-pool-1',
      contract_address: 'CC_CONTRACT_ADDR',
      asset_code: 'AQUA',
    };

    const parsed = parsePoolsFromNative([pool]);
    expect(parsed[0].id).toBe('custom-farm-pool-1');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('logs a clear warning when falling back to index for a pool missing contract_address and id', () => {
    const poolMalformed = {
      asset_code: 'XLM',
      daily_rate: 5000000n,
    };

    const parsed = parsePoolsFromNative([poolMalformed]);
    expect(parsed[0].id).toBe('0');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('parsePoolEntry: pool at index 0 has no id/pool_id/contract_address'),
    );
  });
});
