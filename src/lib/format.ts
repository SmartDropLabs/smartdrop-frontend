/**
 * Compact USD for large figures like pool TVL (#770): 1000000 → "$1M",
 * 12345 → "$12.35K", 950 → "$950". Non-finite input renders as "—" rather
 * than "$NaN".
 */
const compactUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

export function formatCompactUsd(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return compactUsd.format(n);
}
