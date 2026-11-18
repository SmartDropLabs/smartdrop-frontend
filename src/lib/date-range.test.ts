import { describe, expect, it } from "vitest";
import { filterByDateRange } from "./date-range";

// Local-time ISO strings so the assertions hold in any test-runner timezone.
const at = (y: number, m: number, d: number, h = 12) =>
  new Date(y, m - 1, d, h).toISOString();

const entries = [
  { id: "a", date: at(2026, 11, 1) },
  { id: "b", date: at(2026, 11, 5, 0) },
  { id: "c", date: at(2026, 11, 5, 23) },
  { id: "d", date: at(2026, 11, 10) },
];

const ids = (list: { id: string }[]) => list.map((e) => e.id);

describe("filterByDateRange (#774)", () => {
  it("returns everything when both bounds are empty", () => {
    expect(filterByDateRange(entries, "", "")).toBe(entries);
  });

  it("treats both bounds as inclusive whole days", () => {
    expect(ids(filterByDateRange(entries, "2026-11-05", "2026-11-05"))).toEqual(["b", "c"]);
  });

  it("supports an open-ended start or end", () => {
    expect(ids(filterByDateRange(entries, "2026-11-05", ""))).toEqual(["b", "c", "d"]);
    expect(ids(filterByDateRange(entries, "", "2026-11-04"))).toEqual(["a"]);
  });

  it("ignores an unparseable bound instead of filtering everything out", () => {
    expect(ids(filterByDateRange(entries, "not-a-date", "2026-11-01"))).toEqual(["a"]);
  });

  it("drops entries with an invalid date when a range is active", () => {
    const withBad = [...entries, { id: "x", date: "garbage" }];
    expect(ids(filterByDateRange(withBad, "2026-11-01", "2026-11-30"))).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });
});
