import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCountdown } from "@/hooks/useCountdown";
import { unlockAvailableAt, type FarmPosition } from "@/types/farm";
import { EarningRow } from "./page";

vi.mock("@/hooks/useCountdown", () => ({
  useCountdown: vi.fn(() => ({
    remainingMs: 60_000,
    isElapsed: false,
    label: "00h 01m 00s",
  })),
}));

const positions: FarmPosition[] = [
  {
    id: "pool-1",
    name: "XLM",
    img: "",
    earned: "1",
    stake: "10",
    dailyRate: "0.5",
    totalStakedLiquidity: "$1,000",
    symbol: "XLM",
    lockedAmount: 10,
    lockedAt: 1_700_000_000_000,
    lockPeriodSeconds: 86_400,
  },
  {
    id: "pool-2",
    name: "USDC",
    img: "",
    earned: "2",
    stake: "20",
    dailyRate: "0.4",
    totalStakedLiquidity: "$2,000",
    symbol: "USDC",
    lockedAmount: 20,
    lockedAt: 1_700_100_000_000,
    lockPeriodSeconds: 86_400,
  },
  {
    id: "pool-3",
    name: "AQUA",
    img: "",
    earned: "3",
    stake: "30",
    dailyRate: "0.3",
    totalStakedLiquidity: "$3,000",
    symbol: "AQUA",
    lockedAmount: 30,
    lockedAt: 1_700_200_000_000,
    lockPeriodSeconds: 86_400,
  },
];

function PositionList({ positions }: { positions: FarmPosition[] }) {
  return positions.map((position) => (
    <EarningRow key={position.id} position={position} />
  ));
}

const useCountdownMock = vi.mocked(useCountdown);

function renderCount(position: FarmPosition) {
  const unlockAt = unlockAvailableAt(position);
  return useCountdownMock.mock.calls.filter(([value]) => value === unlockAt)
    .length;
}

beforeEach(() => {
  useCountdownMock.mockClear();
});

describe("EarningRow render isolation", () => {
  it("re-renders only the row whose data changed after all objects are rebuilt", () => {
    const { rerender } = render(<PositionList positions={positions} />);
    const initialRenderCounts = positions.map(renderCount);

    const updatedPositions = positions.map((position) => ({
      ...position,
      earned: position.id === "pool-2" ? "2.5" : position.earned,
    }));

    updatedPositions.forEach((position, index) => {
      expect(position).not.toBe(positions[index]);
    });

    rerender(<PositionList positions={updatedPositions} />);

    expect(renderCount(updatedPositions[0])).toBe(initialRenderCounts[0]);
    expect(renderCount(updatedPositions[1])).toBe(initialRenderCounts[1] + 1);
    expect(renderCount(updatedPositions[2])).toBe(initialRenderCounts[2]);
  });
});
