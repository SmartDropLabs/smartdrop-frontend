import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memoryStorage } from "./test-storage";
import {
  DEFAULT_SLIPPAGE_PCT,
  checkSlippage,
  loadSlippage,
  minimumReceived,
  parseSlippage,
  saveSlippage,
} from "./slippage";

describe("slippage tolerance (#771)", () => {
  // src/lib tests run in the node environment, which has no window.
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: memoryStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts tolerances in (0, 50]", () => {
    expect(parseSlippage("0.5")).toBe(0.5);
    expect(parseSlippage(" 1 ")).toBe(1);
    expect(parseSlippage(50)).toBe(50);
  });

  it.each(["", "0", "-1", "51", "abc", "Infinity"])("rejects %p", (input) => {
    expect(parseSlippage(input)).toBeNull();
  });

  it("computes the minimum received", () => {
    expect(minimumReceived(100, 0.5)).toBeCloseTo(99.5);
    expect(minimumReceived(100, 1)).toBeCloseTo(99);
    expect(minimumReceived(0, 1)).toBe(0);
    expect(minimumReceived(NaN, 1)).toBe(0);
  });

  it("passes when the submitted amount matches what was confirmed", () => {
    expect(checkSlippage({ confirmedAmount: 100, submittedAmount: 100, tolerancePct: 0.5 })).toEqual({
      ok: true,
    });
  });

  it("allows drift within the tolerance", () => {
    expect(checkSlippage({ confirmedAmount: 100, submittedAmount: 99.6, tolerancePct: 0.5 }).ok).toBe(true);
  });

  it("blocks an amount below the minimum", () => {
    const result = checkSlippage({ confirmedAmount: 100, submittedAmount: 90, tolerancePct: 0.5 });
    expect(result.ok).toBe(false);
  });

  it("blocks when no valid tolerance is set", () => {
    expect(checkSlippage({ confirmedAmount: 100, submittedAmount: 100, tolerancePct: null }).ok).toBe(false);
  });

  it("persists the tolerance per browser", () => {
    expect(loadSlippage()).toBe(DEFAULT_SLIPPAGE_PCT);
    saveSlippage(1);
    expect(loadSlippage()).toBe(1);
  });

  it("falls back to the default for a corrupt stored value", () => {
    window.localStorage.setItem("smartdrop:slippage-tolerance", "999");
    expect(loadSlippage()).toBe(DEFAULT_SLIPPAGE_PCT);
  });
});
