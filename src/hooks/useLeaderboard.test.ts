import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useLeaderboard, PAGE_SIZE } from "./useLeaderboard";
import { sorobanService } from "@/lib/soroban";

// Mock the sorobanService
vi.mock("@/lib/soroban", () => ({
  sorobanService: {
    getLeaderboard: vi.fn(),
    getUserRank: vi.fn(),
  },
}));

const MOCK_USER = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const MOCK_OTHER_USER = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";

function makeEntry(address: string, credits: number, stake: number) {
  return {
    address,
    totalCredits: credits,
    totalStake: stake,
    boostUtilization: 0,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  // Default: no wallet connected
  vi.mocked(sorobanService.getLeaderboard).mockResolvedValue({
    entries: [],
    total: 0,
  });
  vi.mocked(sorobanService.getUserRank).mockResolvedValue(null);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useLeaderboard", () => {
  it("fetches leaderboard and rank on mount with a connected wallet", async () => {
    // Mock leaderboard returning 25 total entries, page 1 (first 10)
    const page1Entries = Array.from({ length: PAGE_SIZE }, (_, i) =>
      makeEntry(`G${String(i).padStart(55, "0")}`, 100 - i, 50 - i),
    );
    vi.mocked(sorobanService.getLeaderboard).mockResolvedValue({
      entries: page1Entries,
      total: 25,
    });
    // User's global rank is #15 — well outside page 1
    vi.mocked(sorobanService.getUserRank).mockResolvedValue(15);

    const { result } = renderHook(() => useLeaderboard(MOCK_USER));

    // Wait for initial fetch
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(sorobanService.getLeaderboard).toHaveBeenCalledWith(
      0,
      PAGE_SIZE,
      "credits",
    );
    expect(sorobanService.getUserRank).toHaveBeenCalledWith(
      MOCK_USER,
      "credits",
    );

    // Page-local connectedRank should be 0 (user not on page 1)
    expect(result.current.connectedRank).toBe(0);

    // Global userRank should be 15
    expect(result.current.userRank).toBe(15);
    expect(result.current.userRankLoading).toBe(false);

    expect(result.current.paged).toEqual(page1Entries);
    expect(result.current.totalPages).toBe(3);
  });

  it("returns userRank=null and userRankLoading=false when no wallet is connected", async () => {
    const { result } = renderHook(() => useLeaderboard(null));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.connectedRank).toBe(0);
    expect(result.current.userRank).toBeNull();
    expect(result.current.userRankLoading).toBe(false);
    // getUserRank should not be called when publicKey is null
    expect(sorobanService.getUserRank).not.toHaveBeenCalled();
  });

  it("resolves connectedRank correctly when user IS on the current page", async () => {
    const page1Entries = [
      makeEntry(MOCK_OTHER_USER, 100, 50),
      makeEntry(MOCK_USER, 90, 45),
      makeEntry("GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC", 80, 40),
    ];
    vi.mocked(sorobanService.getLeaderboard).mockResolvedValue({
      entries: page1Entries,
      total: 10,
    });
    vi.mocked(sorobanService.getUserRank).mockResolvedValue(2);

    const { result } = renderHook(() => useLeaderboard(MOCK_USER));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // User is at index 1 on the page → rank = offset(0) + 1 + 1 = 2
    expect(result.current.connectedRank).toBe(2);
    // Global rank should also be 2 (same for this small test)
    expect(result.current.userRank).toBe(2);
  });

  it("recomputes userRank when sortKey changes", async () => {
    vi.mocked(sorobanService.getLeaderboard).mockResolvedValue({
      entries: [],
      total: 0,
    });
    vi.mocked(sorobanService.getUserRank).mockResolvedValue(42);

    const { result } = renderHook(() => useLeaderboard(MOCK_USER));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.userRank).toBe(42);
    expect(sorobanService.getUserRank).toHaveBeenLastCalledWith(
      MOCK_USER,
      "credits",
    );

    // Change sort key to "stake"
    vi.mocked(sorobanService.getUserRank).mockResolvedValue(7);

    act(() => {
      result.current.setSortKey("stake");
    });

    // Should have been called with the new sort key
    await waitFor(() =>
      expect(sorobanService.getUserRank).toHaveBeenLastCalledWith(
        MOCK_USER,
        "stake",
      ),
    );

    expect(result.current.userRank).toBe(7);
  });

  it("guards against stale rank responses (race condition)", async () => {
    vi.mocked(sorobanService.getLeaderboard).mockResolvedValue({
      entries: [],
      total: 0,
    });

    // Make getUserRank resolve slowly, simulating a race
    let resolveRank1!: (v: number | null) => void;
    const rank1Promise = new Promise<number | null>((resolve) => {
      resolveRank1 = resolve;
    });
    vi.mocked(sorobanService.getUserRank).mockReturnValueOnce(rank1Promise);

    const { result } = renderHook(() => useLeaderboard(MOCK_USER));

    // Before rank1 resolves, trigger a sort change
    vi.mocked(sorobanService.getUserRank).mockResolvedValue(99);
    act(() => {
      result.current.setSortKey("stake");
    });

    // Now resolve the FIRST rank call (stale — should be ignored)
    await act(async () => {
      resolveRank1(42);
      // Let microtasks run
      await Promise.resolve();
    });

    // The rank should NOT be 42 (stale), it should be 99 from the newer fetch
    await waitFor(() => {
      expect(result.current.userRank).not.toBe(42);
    });
    // Eventually it should be 99 (or whatever the latest value is)
    await waitFor(() => {
      expect(result.current.userRank).toBe(99);
    });
  });

  it("returns filteredCount based on search query", async () => {
    const entries = [
      makeEntry("GAAA", 100, 50),
      makeEntry("GBBB", 90, 45),
    ];
    vi.mocked(sorobanService.getLeaderboard).mockResolvedValue({
      entries,
      total: 2,
    });
    vi.mocked(sorobanService.getUserRank).mockResolvedValue(null);

    const { result } = renderHook(() => useLeaderboard(MOCK_USER));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.filteredCount).toBe(2);

    // Apply search
    act(() => {
      result.current.setSearchQuery("GAAA");
    });

    // Wait for debounce
    await vi.advanceTimersByTimeAsync(300);

    expect(result.current.filteredCount).toBe(1);
    expect(result.current.paged).toHaveLength(1);
  });

  it("auto-refreshes on interval", async () => {
    vi.mocked(sorobanService.getLeaderboard).mockResolvedValue({
      entries: [makeEntry(MOCK_USER, 100, 50)],
      total: 1,
    });
    vi.mocked(sorobanService.getUserRank).mockResolvedValue(1);

    const { result } = renderHook(() => useLeaderboard(MOCK_USER));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(sorobanService.getLeaderboard).toHaveBeenCalledTimes(1);

    // Clear the mock call count
    vi.mocked(sorobanService.getLeaderboard).mockClear();
    vi.mocked(sorobanService.getUserRank).mockClear();

    // Advance past refresh interval
    await vi.advanceTimersByTimeAsync(30_000);

    // Should have been called again by the interval
    expect(sorobanService.getLeaderboard).toHaveBeenCalledTimes(1);
    expect(sorobanService.getUserRank).toHaveBeenCalledTimes(1);
  });
});

