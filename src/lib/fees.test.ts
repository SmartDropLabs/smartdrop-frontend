import { describe, expect, it } from "vitest";
import { estimateTotalFeeStroops, formatFeeEstimate, formatStroopsAsXlm } from "./fees";

describe("estimateTotalFeeStroops", () => {
  it("adds the base inclusion fee to the simulated resource fee", () => {
    expect(estimateTotalFeeStroops("12345")).toBe(12445n);
    expect(estimateTotalFeeStroops("0")).toBe(100n);
  });

  it("returns null for missing or malformed input", () => {
    expect(estimateTotalFeeStroops(undefined)).toBeNull();
    expect(estimateTotalFeeStroops(null)).toBeNull();
    expect(estimateTotalFeeStroops("")).toBeNull();
    expect(estimateTotalFeeStroops("-5")).toBeNull();
    expect(estimateTotalFeeStroops("1.5")).toBeNull();
  });
});

describe("formatStroopsAsXlm", () => {
  it("formats stroops with trailing zeros trimmed", () => {
    expect(formatStroopsAsXlm(12445n)).toBe("0.0012445");
    expect(formatStroopsAsXlm(10_000_000n)).toBe("1");
    expect(formatStroopsAsXlm(15_000_000n)).toBe("1.5");
    expect(formatStroopsAsXlm(0n)).toBe("0");
  });
});

describe("formatFeeEstimate", () => {
  it("returns an approximate XLM total", () => {
    expect(formatFeeEstimate("12345")).toBe("~0.0012445 XLM");
  });

  it("returns null when there is no estimate", () => {
    expect(formatFeeEstimate(undefined)).toBeNull();
  });
});
