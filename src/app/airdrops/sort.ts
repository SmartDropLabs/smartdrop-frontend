import type { Airdrop } from "@/lib/backend";

/** Sort options for the airdrops list (#773). */
export const AIRDROP_SORTS = [
  { value: "default", label: "Default order" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount-desc", label: "Amount: high to low" },
  { value: "amount-asc", label: "Amount: low to high" },
  { value: "status", label: "Status" },
] as const;

export type AirdropSort = (typeof AIRDROP_SORTS)[number]["value"];

export function isAirdropSort(value: string): value is AirdropSort {
  return AIRDROP_SORTS.some((option) => option.value === value);
}

function createdAtMs(airdrop: Airdrop): number {
  const ms = Date.parse(airdrop.created_at);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Returns a sorted copy; the input is never mutated. "default" keeps the
 * backend's order. Ties keep their original relative order.
 */
export function sortAirdrops(airdrops: readonly Airdrop[], sort: AirdropSort): Airdrop[] {
  const copy = [...airdrops];
  switch (sort) {
    case "newest":
      return copy.sort((a, b) => createdAtMs(b) - createdAtMs(a));
    case "oldest":
      return copy.sort((a, b) => createdAtMs(a) - createdAtMs(b));
    case "amount-desc":
      return copy.sort((a, b) => b.total_amount - a.total_amount);
    case "amount-asc":
      return copy.sort((a, b) => a.total_amount - b.total_amount);
    case "status":
      return copy.sort((a, b) => a.status.localeCompare(b.status));
    default:
      return copy;
  }
}
