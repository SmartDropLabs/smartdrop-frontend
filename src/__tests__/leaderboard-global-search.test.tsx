import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { sorobanService } from "@/lib/soroban";

describe("useLeaderboard Global Search (#132)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("passes debounced search query to getLeaderboard and returns results across pages", async () => {
    const mockGetLeaderboard = vi.spyOn(sorobanService, "getLeaderboard").mockImplementation(
      async (offset, limit, sortKey, search) => {
        if (search === "GA_PAGE_THREE") {
          return {
            entries: [
              {
                address: "GA_PAGE_THREE_SPECIFIC_FARMER",
                totalCredits: 500,
                totalStake: 1000,
                boostUtilization: 0,
              },
            ],
            total: 1,
          };
        }
        return {
          entries: [
            { address: "GA_PAGE_ONE_USER_A", totalCredits: 100, totalStake: 200, boostUtilization: 0 },
            { address: "GA_PAGE_ONE_USER_B", totalCredits: 90, totalStake: 180, boostUtilization: 0 },
          ],
          total: 30, // 3 full pages
        };
      }
    );

    const { result } = renderHook(() => useLeaderboard(null));

    // Flush initial load
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.paged.length).toBe(2);
    expect(result.current.filteredCount).toBe(30);

    // Search for an address located on page 3
    act(() => {
      result.current.setSearchQuery("GA_PAGE_THREE");
    });

    // Advance past the 300ms debounce
    await act(async () => {
      vi.advanceTimersByTime(350);
      await Promise.resolve();
    });

    expect(mockGetLeaderboard).toHaveBeenCalledWith(0, 10, "credits", "GA_PAGE_THREE");
    expect(result.current.paged[0].address).toBe("GA_PAGE_THREE_SPECIFIC_FARMER");
    expect(result.current.filteredCount).toBe(1);
    expect(result.current.currentPage).toBe(1);
  });
});
