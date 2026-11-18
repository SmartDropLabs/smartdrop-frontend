import { describe, expect, it } from "vitest";
import type { Airdrop } from "@/lib/backend";
import { isAirdropSort, sortAirdrops } from "./sort";

function drop(id: string, amount: number, status: string, createdAt: string): Airdrop {
  return {
    id,
    name: id,
    asset: "XLM",
    asset_issuer: "",
    total_amount: amount,
    expiry_ledger: 1,
    status,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

const drops = [
  drop("b", 500, "pending", "2024-02-01T00:00:00Z"),
  drop("a", 2000, "completed", "2024-01-01T00:00:00Z"),
  drop("c", 100, "executing", "2024-03-01T00:00:00Z"),
];

const ids = (list: Airdrop[]) => list.map((d) => d.id);

describe("sortAirdrops (#773)", () => {
  it("keeps the backend order by default", () => {
    expect(ids(sortAirdrops(drops, "default"))).toEqual(["b", "a", "c"]);
  });

  it("sorts by date", () => {
    expect(ids(sortAirdrops(drops, "newest"))).toEqual(["c", "b", "a"]);
    expect(ids(sortAirdrops(drops, "oldest"))).toEqual(["a", "b", "c"]);
  });

  it("sorts by amount", () => {
    expect(ids(sortAirdrops(drops, "amount-desc"))).toEqual(["a", "b", "c"]);
    expect(ids(sortAirdrops(drops, "amount-asc"))).toEqual(["c", "b", "a"]);
  });

  it("sorts by status", () => {
    expect(ids(sortAirdrops(drops, "status"))).toEqual(["a", "c", "b"]);
  });

  it("does not mutate the input", () => {
    sortAirdrops(drops, "amount-asc");
    expect(ids(drops)).toEqual(["b", "a", "c"]);
  });

  it("recognises only known sort values", () => {
    expect(isAirdropSort("newest")).toBe(true);
    expect(isAirdropSort("bogus")).toBe(false);
  });
});
