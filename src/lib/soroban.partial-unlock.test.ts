import { describe, it, expect } from 'vitest';
import { computePartialUnlockPreview, amountToStroops } from './soroban';
import { toStroops } from '../types/farm';

describe('computePartialUnlockPreview', () => {
  it('returns full stake and rate when unlocking zero', () => {
    const { remainingStake, newDailyRate } = computePartialUnlockPreview(100, 0, 10);
    expect(remainingStake).toBe(100);
    expect(newDailyRate).toBe(10);
  });

  it('returns zero stake and zero rate when fully unlocking', () => {
    const { remainingStake, newDailyRate } = computePartialUnlockPreview(100, 100, 10);
    expect(remainingStake).toBe(0);
    expect(newDailyRate).toBe(0);
  });

  it('halves both stake and rate when unlocking 50%', () => {
    const { remainingStake, newDailyRate } = computePartialUnlockPreview(100, 50, 10);
    expect(remainingStake).toBe(50);
    expect(newDailyRate).toBe(5);
  });

  it('computes proportional rate for an arbitrary partial unlock', () => {
    // remaining = 200 - 75 = 125; rate = (125 / 200) * 8 = 5
    const { remainingStake, newDailyRate } = computePartialUnlockPreview(200, 75, 8);
    expect(remainingStake).toBe(125);
    expect(newDailyRate).toBeCloseTo(5, 6);
  });

  it('handles zero lockedAmount without NaN or division-by-zero', () => {
    const { remainingStake, newDailyRate } = computePartialUnlockPreview(0, 0, 10);
    expect(remainingStake).toBe(0);
    expect(newDailyRate).toBe(0);
  });

  it('toFixed(4) on remainingStake produces the correct 4-decimal string', () => {
    const { remainingStake } = computePartialUnlockPreview(10.5678, 3.1234, 5);
    expect(remainingStake.toFixed(4)).toBe('7.4444');
  });

  it('toFixed(6) on newDailyRate produces the correct 6-decimal string', () => {
    // remaining = 1000 - 333 = 667; rate = (667 / 1000) * 1 = 0.667
    const { newDailyRate } = computePartialUnlockPreview(1000, 333, 1);
    expect(newDailyRate.toFixed(6)).toBe('0.667000');
  });
});

describe('unlock stroop precision (#76)', () => {
  it('converts exact decimal amounts without float precision loss', () => {
    expect(amountToStroops('10.5').toString()).toBe('105000000');
    expect(amountToStroops('0.0000001').toString()).toBe('1');
    expect(amountToStroops('123.4560003').toString()).toBe('1234560003');
    expect(toStroops(10.5)).toBe('105000000');
    expect(toStroops(123.4560003)).toBe('1234560003');
  });

  it('handles large stakes exceeding Number.MAX_SAFE_INTEGER float precision correctly', () => {
    // 900719925.4740993 exceeds MAX_SAFE_INTEGER when multiplied by 10^7 in float
    const largeAmount = '900719925.4740993';
    expect(amountToStroops(largeAmount).toString()).toBe('9007199254740993');
    // Float path would have produced 9007199254740992 due to IEEE-754 precision limit
    expect(Math.round(parseFloat(largeAmount) * 10_000_000).toString()).toBe('9007199254740992');
  });

  it('rejects invalid or non-positive unlock amounts cleanly via amountToStroops', () => {
    expect(() => amountToStroops('0')).toThrow('Amount must be greater than 0.');
    expect(() => amountToStroops('-5')).toThrow('Enter a valid positive decimal amount.');
    expect(() => amountToStroops('abc')).toThrow('Enter a valid positive decimal amount.');
    expect(() => amountToStroops('1.12345678')).toThrow('Amount supports at most 7 decimal places.');
  });
});
