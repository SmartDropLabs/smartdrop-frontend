/**
 * Opt-in "auto-claim when claimable" (#772).
 *
 * Scope, stated plainly: this is an *auto-prompt*, not unattended claiming.
 * While the farm page is open and the wallet is connected, a position whose
 * rewards become claimable opens the normal claim flow, which still asks the
 * user to sign in Freighter — one signature per claim, never silent signing.
 * Each claimable amount is prompted at most once per page session, so
 * dismissing the prompt doesn't re-open it in a loop. Truly unattended
 * auto-claim (claiming while the user is away) needs keeper or contract
 * support, e.g. a delegated claimer or auto-compounding in the pool.
 */

import type { FarmPosition } from "@/types/farm";

const STORAGE_KEY = "smartdrop:auto-claim";

export function loadAutoClaim(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveAutoClaim(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // Unavailable storage: the preference just won't survive a reload.
  }
}

/** Rewards are claimable when `earned` parses to a positive number. */
export function isClaimable(position: Pick<FarmPosition, "earned">): boolean {
  const earned = Number(position.earned);
  return Number.isFinite(earned) && earned > 0;
}

/** Identity of one claimable amount: new rewards produce a new key. */
export function promptKey(position: Pick<FarmPosition, "id" | "earned">): string {
  return `${position.id}:${position.earned}`;
}

/**
 * The position to prompt a claim for next, or null. Nothing is prompted unless
 * the feature is on, the wallet is usable, and no other farm modal is open.
 */
export function nextAutoClaim(
  positions: readonly FarmPosition[],
  {
    enabled,
    isConnected,
    isNetworkMismatch,
    modalOpen,
    prompted,
  }: {
    enabled: boolean;
    isConnected: boolean;
    isNetworkMismatch: boolean;
    modalOpen: boolean;
    prompted: ReadonlySet<string>;
  },
): FarmPosition | null {
  if (!enabled || !isConnected || isNetworkMismatch || modalOpen) return null;
  return positions.find((p) => isClaimable(p) && !prompted.has(promptKey(p))) ?? null;
}
