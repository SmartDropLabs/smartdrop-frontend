import { render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { describe, expect, it, vi } from "vitest";
import LeaderboardPage from "./page";
import * as useLeaderboardModule from "@/hooks/useLeaderboard";

vi.mock("@/hooks/useLeaderboard", () => ({
  useLeaderboard: vi.fn(),
  PAGE_SIZE: 10,
}));

vi.mock("@/context/StellarWalletContext", () => ({
  useStellarWallet: () => ({
    publicKey: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
    isConnected: true,
  }),
}));

describe("LeaderboardPage boost utilization rendering (#142)", () => {
  it("renders exact percentage when boostUtilization is available from backend API", () => {
    const entries = [
      {
        address: "GBJGVZKVQ3E4G6K5U26Y7A3K7HILQJ7LZM3RDPVXYW5X6U3",
        totalCredits: 5000,
        totalStake: 12000,
        boostUtilization: 45,
      },
    ];

    vi.mocked(useLeaderboardModule.useLeaderboard).mockReturnValue({
      paged: entries,
      filteredCount: 1,
      connectedRank: 0,
      isLoading: false,
      sortKey: "credits",
      searchQuery: "",
      setSearchQuery: vi.fn(),
      currentPage: 1,
      totalPages: 1,
      setSortKey: vi.fn(),
      setPage: vi.fn(),
      lastRefreshed: new Date(),
      refresh: vi.fn(),
    });

    render(
      <ChakraProvider>
        <LeaderboardPage />
      </ChakraProvider>,
    );

    expect(screen.getByText("45%")).toBeDefined();
  });

  it("renders dash '—' sentinel when boostUtilization is null in event-scan fallback path", () => {
    const entries = [
      {
        address: "GBJGVZKVQ3E4G6K5U26Y7A3K7HILQJ7LZM3RDPVXYW5X6U3",
        totalCredits: 5000,
        totalStake: 12000,
        boostUtilization: null, // fallback sentinel
      },
    ];

    vi.mocked(useLeaderboardModule.useLeaderboard).mockReturnValue({
      paged: entries,
      filteredCount: 1,
      connectedRank: 0,
      isLoading: false,
      sortKey: "credits",
      searchQuery: "",
      setSearchQuery: vi.fn(),
      currentPage: 1,
      totalPages: 1,
      setSortKey: vi.fn(),
      setPage: vi.fn(),
      lastRefreshed: new Date(),
      refresh: vi.fn(),
    });

    render(
      <ChakraProvider>
        <LeaderboardPage />
      </ChakraProvider>,
    );

    expect(screen.getByText("—")).toBeDefined();
    expect(screen.queryByText("0%")).toBeNull();
  });
});
