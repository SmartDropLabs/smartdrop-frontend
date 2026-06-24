/** A user's staked position in a farm, including time-lock metadata. */
export type FarmPosition = {
  /** Stable identifier so UI updates survive re-renders. */
  id: string;
  name: string;
  img: string;
  earned: string;
  /** Current staked balance, display string (e.g. "5.398"). */
  stake: string;
  dailyRate: string;
  totalStakedLiquidity: string;
  /** Token symbol of the locked asset. */
  symbol: string;
  /** Amount currently locked, in display units. */
  lockedAmount: number;
  /** Pool minimum deposit in display units. If set and remaining < this after unlock, contract closes the position entirely. */
  minDepositAmount?: number;
  /** Unix epoch (ms) when the position was locked. */
  lockedAt: number;
  /** Minimum lock period (seconds) before the position can be unlocked. */
  lockPeriodSeconds: number;
};

/** Epoch (ms) at which a position becomes eligible for unlock. */
export function unlockAvailableAt(position: FarmPosition): number {
  return position.lockedAt + position.lockPeriodSeconds * 1000;
}
