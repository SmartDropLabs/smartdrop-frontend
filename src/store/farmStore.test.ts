import { beforeEach, describe, expect, it } from "vitest";

import { useFarmStore } from "@/store/farmStore";
import type { FarmPosition } from "@/types/farm";

const position: FarmPosition = {
  id: "pool-1",
  name: "XLM",
  img: "",
  earned: "1.25",
  stake: "10",
  dailyRate: "0.5",
  totalStakedLiquidity: "$1,000",
  symbol: "XLM",
  lockedAmount: 10,
  lockedAt: 1_700_000_000_000,
  lockPeriodSeconds: 86_400,
};

beforeEach(() => {
  useFarmStore.setState({
    selectedPosition: null,
    activeModal: "none",
    pendingTxHash: null,
  });
});

describe("useFarmStore", () => {
  it("opens the unlock modal for the selected position", () => {
    useFarmStore.getState().openUnlock(position);

    const state = useFarmStore.getState();
    expect(state.selectedPosition).toBe(position);
    expect(state.activeModal).toBe("unlock");
  });
});
