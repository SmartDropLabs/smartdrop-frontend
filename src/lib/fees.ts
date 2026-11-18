/**
 * Fee estimate helpers for the pre-signing confirmation step.
 *
 * Kept free of @stellar/stellar-sdk imports so client components can format
 * fee previews without pulling the SDK into their bundle.
 */

export const STROOPS_PER_XLM = 10_000_000n;

/**
 * Inclusion fee every transaction pays on top of the Soroban resource fee.
 * Matches the SDK's BASE_FEE ("100") used by the transaction builders in
 * `soroban.ts`.
 */
export const BASE_INCLUSION_FEE_STROOPS = 100n;

/**
 * Total estimated fee in stroops: the simulated `minResourceFee` plus the
 * base inclusion fee. Returns null for missing or malformed input.
 */
export function estimateTotalFeeStroops(minResourceFee?: string | null): bigint | null {
  if (minResourceFee == null || !/^\d+$/.test(minResourceFee.trim())) return null;
  return BigInt(minResourceFee.trim()) + BASE_INCLUSION_FEE_STROOPS;
}

/** Format a stroop amount as a trimmed, 7-decimal XLM string, e.g. "0.0012445". */
export function formatStroopsAsXlm(stroops: bigint): string {
  const whole = stroops / STROOPS_PER_XLM;
  const frac = (stroops % STROOPS_PER_XLM).toString().padStart(7, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

/**
 * Human-readable fee estimate for a simulated `minResourceFee`, e.g.
 * "~0.0012445 XLM". Returns null when there is no usable estimate.
 */
export function formatFeeEstimate(minResourceFee?: string | null): string | null {
  const total = estimateTotalFeeStroops(minResourceFee);
  return total === null ? null : `~${formatStroopsAsXlm(total)} XLM`;
}
