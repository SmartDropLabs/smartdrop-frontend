import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FarmPosition } from "@/types/farm";
import { memoryStorage } from "./test-storage";
import {
  isClaimable,
  loadAutoClaim,
  nextAutoClaim,
  promptKey,
  saveAutoClaim,
} from "./autoClaim";

function position(id: string, earned: string): FarmPosition {
  return {
    id,
    name: id,
    img: "",
    earned,
    stake: "10",
    dailyRate: "1%",
    totalStakedLiquidity: "$1K",
    symbol: "XLM",
    lockedAmount: 10,
    lockedAt: 0,
    lockPeriodSeconds: 0,
  } as FarmPosition;
}

const ready = {
  enabled: true,
  isConnected: true,
  isNetworkMismatch: false,
  modalOpen: false,
  prompted: new Set<string>(),
};

describe("auto-claim prompt (#772)", () => {
  // src/lib tests run in the node environment, which has no window.
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: memoryStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is off by default and persists the opt-in", () => {
    expect(loadAutoClaim()).toBe(false);
    saveAutoClaim(true);
    expect(loadAutoClaim()).toBe(true);
    saveAutoClaim(false);
    expect(loadAutoClaim()).toBe(false);
  });

  it("treats only a positive earned amount as claimable", () => {
    expect(isClaimable(position("a", "1.5"))).toBe(true);
    expect(isClaimable(position("a", "0"))).toBe(false);
    expect(isClaimable(position("a", "-"))).toBe(false);
  });

  it("picks the first claimable position", () => {
    const positions = [position("a", "0"), position("b", "2"), position("c", "3")];
    expect(nextAutoClaim(positions, ready)?.id).toBe("b");
  });

  it.each([
    ["disabled", { enabled: false }],
    ["wallet disconnected", { isConnected: false }],
    ["wrong network", { isNetworkMismatch: true }],
    ["another modal open", { modalOpen: true }],
  ])("prompts nothing when %s", (_label, override) => {
    expect(nextAutoClaim([position("b", "2")], { ...ready, ...override })).toBeNull();
  });

  it("prompts each claimable amount once, and again when rewards grow", () => {
    const first = position("b", "2");
    const prompted = new Set([promptKey(first)]);
    expect(nextAutoClaim([first], { ...ready, prompted })).toBeNull();
    expect(nextAutoClaim([position("b", "2.5")], { ...ready, prompted })?.id).toBe("b");
  });
});
