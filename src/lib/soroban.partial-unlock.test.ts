import { describe, it, expect } from 'vitest';
import { computePartialUnlockPreview } from './soroban';

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
