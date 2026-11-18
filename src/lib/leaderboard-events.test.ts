import { describe, expect, it, vi } from "vitest";
import { invalidateLeaderboard, onLeaderboardInvalidated } from "./leaderboard-events";

describe("leaderboard invalidation (#761)", () => {
  it("notifies every subscriber when a ranking-changing action completes", () => {
    const first = vi.fn();
    const second = vi.fn();
    const offFirst = onLeaderboardInvalidated(first);
    const offSecond = onLeaderboardInvalidated(second);

    invalidateLeaderboard();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    offFirst();
    offSecond();
  });

  it("stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    const off = onLeaderboardInvalidated(listener);
    off();

    invalidateLeaderboard();

    expect(listener).not.toHaveBeenCalled();
  });
});
