import { describe, expect, it } from "vitest";
import { formatCompactUsd } from "./format";

describe("formatCompactUsd (#770)", () => {
  it.each([
    [950, "$950"],
    [1000, "$1K"],
    [12345, "$12.35K"],
    [1_000_000, "$1M"],
    [2_500_000_000, "$2.5B"],
    ["1000000", "$1M"],
  ])("formats %p as %p", (input, expected) => {
    expect(formatCompactUsd(input)).toBe(expected);
  });

  it.each([NaN, Infinity, null, undefined, "not-a-number"])(
    "renders %p as an em dash instead of $NaN",
    (input) => {
      expect(formatCompactUsd(input as number)).toBe("—");
    },
  );
});
