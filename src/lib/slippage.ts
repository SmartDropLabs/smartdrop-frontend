/**
 * Slippage tolerance for pool deposits (#771).
 *
 * What this does and does not protect: a farm deposit is a single-asset lock
 * — the pool records exactly the amount the user signs, there is no swap and
 * no price quote, and the contract's lock call takes no minimum-amount
 * argument. So the tolerance is enforced client-side only, as a pre-submit
 * check that the amount actually submitted has not drifted below the minimum
 * the user agreed to on the confirmation screen. On-chain enforcement needs a
 * `min_amount` (or equivalent) parameter on the pool contract's lock call.
 */

export const SLIPPAGE_PRESETS = [0.1, 0.5, 1] as const;
export const DEFAULT_SLIPPAGE_PCT = 0.5;
export const MAX_SLIPPAGE_PCT = 50;

const STORAGE_KEY = "smartdrop:slippage-tolerance";

/** Parses a user-entered percentage; null unless 0 < pct <= MAX_SLIPPAGE_PCT. */
export function parseSlippage(input: string | number): number | null {
  const pct = typeof input === "number" ? input : Number(input.trim());
  if (!Number.isFinite(pct) || pct <= 0 || pct > MAX_SLIPPAGE_PCT) return null;
  return pct;
}

/** Smallest amount acceptable for `amount` at `tolerancePct`. */
export function minimumReceived(amount: number, tolerancePct: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return amount * (1 - tolerancePct / 100);
}

export type SlippageCheck =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Pre-submit guard: `submittedAmount` (what is about to be signed) must not be
 * below the minimum derived from `confirmedAmount` (what the user reviewed).
 */
export function checkSlippage({
  confirmedAmount,
  submittedAmount,
  tolerancePct,
}: {
  confirmedAmount: number;
  submittedAmount: number;
  tolerancePct: number | null;
}): SlippageCheck {
  if (tolerancePct === null) {
    return { ok: false, reason: `Set a slippage tolerance between 0 and ${MAX_SLIPPAGE_PCT}%.` };
  }
  const minimum = minimumReceived(confirmedAmount, tolerancePct);
  if (!(submittedAmount >= minimum)) {
    return {
      ok: false,
      reason: `Amount changed to ${submittedAmount}, below your minimum of ${minimum}. Review the deposit again.`,
    };
  }
  return { ok: true };
}

export function loadSlippage(): number {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return (stored !== null && parseSlippage(stored)) || DEFAULT_SLIPPAGE_PCT;
  } catch {
    return DEFAULT_SLIPPAGE_PCT;
  }
}

export function saveSlippage(pct: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(pct));
  } catch {
    // Storage can be unavailable (private mode, quota); the setting just
    // won't persist across visits.
  }
}
