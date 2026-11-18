import { describe, it, expect } from 'vitest';
import { nativeToScVal, xdr } from '@stellar/stellar-sdk';
import { parseUserPositionFromXdrResult } from './soroban';

const POOL_ID = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4';
const USER_ADDR = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

/** Build a Soroban Map ScVal from a plain JS object — mirrors what the contract returns. */
function makePositionScVal(fields: Record<string, unknown>): xdr.ScVal {
  return nativeToScVal(fields);
}

describe('parseUserPositionFromXdrResult', () => {
  it('parses every UserPosition field from canonical contract names', () => {
    const scVal = makePositionScVal({
      amount: 50_000_000n,        // 5.0000000 XLM
      locked_at: 1_700_000_000n,
      credits: 10_000_000n,       // 1.0000000
      is_locked: true,
      unlockable_at: 1_700_086_400n,
      boost_allocation: 2,
    });

    const pos = parseUserPositionFromXdrResult(scVal, POOL_ID, USER_ADDR);

    expect(pos).not.toBeNull();
    expect(pos!.user).toBe(USER_ADDR);
    expect(pos!.poolId).toBe(POOL_ID);
    expect(pos!.amount).toBe('5.0000000');
    expect(pos!.lockedAt).toBe(1_700_000_000);
    expect(pos!.credits).toBe('1.0000000');
    expect(pos!.isLocked).toBe(true);
    expect(pos!.unlockableAt).toBe(1_700_086_400);
    expect(pos!.boostAllocation).toBe(2);
  });

  it('derives unlockableAt from lockedAt + min_lock_period when unlockable_at is absent', () => {
    const LOCKED_AT = 1_700_000_000n;
    const MIN_LOCK = 86_400n; // 1 day in seconds

    const scVal = makePositionScVal({
      amount: 10_000_000n,
      locked_at: LOCKED_AT,
      credits: 0n,
      is_locked: true,
      min_lock_period: MIN_LOCK,
    });

    const pos = parseUserPositionFromXdrResult(scVal, POOL_ID, USER_ADDR);

    expect(pos).not.toBeNull();
    expect(pos!.unlockableAt).toBe(Number(LOCKED_AT) + Number(MIN_LOCK));
  });

  it('accepts the unlock_at alias for unlockableAt', () => {
    const scVal = makePositionScVal({
      amount: 10_000_000n,
      locked_at: 1_700_000_000n,
      credits: 0n,
      is_locked: true,
      unlock_at: 1_700_100_000n,
    });

    const pos = parseUserPositionFromXdrResult(scVal, POOL_ID, USER_ADDR);

    expect(pos!.unlockableAt).toBe(1_700_100_000);
  });

  it('defaults unlockableAt to 0 when neither unlockable_at nor min_lock_period are present', () => {
    const scVal = makePositionScVal({
      amount: 10_000_000n,
      locked_at: 1_700_000_000n,
      credits: 0n,
      is_locked: false,
    });

    const pos = parseUserPositionFromXdrResult(scVal, POOL_ID, USER_ADDR);

    expect(pos!.unlockableAt).toBe(0);
  });

  it('accepts locked_amount alias for amount field', () => {
    const scVal = makePositionScVal({
      locked_amount: 20_000_000n, // 2.0000000 XLM
      locked_at: 1_700_000_000n,
      credits: 0n,
      is_locked: true,
    });

    const pos = parseUserPositionFromXdrResult(scVal, POOL_ID, USER_ADDR);

    expect(pos!.amount).toBe('2.0000000');
  });

  it('accepts accrued_credits alias for credits field', () => {
    const scVal = makePositionScVal({
      amount: 10_000_000n,
      locked_at: 1_700_000_000n,
      accrued_credits: 5_000_000n, // 0.5000000
      is_locked: false,
    });

    const pos = parseUserPositionFromXdrResult(scVal, POOL_ID, USER_ADDR);

    expect(pos!.credits).toBe('0.5000000');
  });

  it('returns null for a void/null ScVal (wallet has no position)', () => {
    const scVal = xdr.ScVal.scvVoid();

    const pos = parseUserPositionFromXdrResult(scVal, POOL_ID, USER_ADDR);

    expect(pos).toBeNull();
  });

  it('returns null for a non-map ScVal (unexpected type)', () => {
    const scVal = nativeToScVal('unexpected-string');

    const pos = parseUserPositionFromXdrResult(scVal, POOL_ID, USER_ADDR);

    expect(pos).toBeNull();
  });

  it('omits boostAllocation when neither boost_allocation nor boost are present', () => {
    const scVal = makePositionScVal({
      amount: 10_000_000n,
      locked_at: 1_700_000_000n,
      credits: 0n,
      is_locked: false,
    });

    const pos = parseUserPositionFromXdrResult(scVal, POOL_ID, USER_ADDR);

    expect(pos!.boostAllocation).toBeUndefined();
  });

  it('converts zero-amount fields to 0.0000000', () => {
    const scVal = makePositionScVal({
      amount: 0n,
      locked_at: 0n,
      credits: 0n,
      is_locked: false,
    });

    const pos = parseUserPositionFromXdrResult(scVal, POOL_ID, USER_ADDR);

    expect(pos!.amount).toBe('0.0000000');
    expect(pos!.credits).toBe('0.0000000');
    expect(pos!.lockedAt).toBe(0);
  });
});
