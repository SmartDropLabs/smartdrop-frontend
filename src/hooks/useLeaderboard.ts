import { useCallback, useEffect, useState } from "react";

export type SortKey = "credits" | "stake";

export type LeaderboardEntry = {
  address: string;
  totalCredits: number;
  totalStake: number;
  boostUtilization: number;
};

export const PAGE_SIZE = 10;
const REFRESH_MS = 30_000;

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  // Wire to Horizon event indexer or Soroban RPC when contract is deployed.
  await new Promise((r) => setTimeout(r, 400));
  return Array.from({ length: 100 }, (_, i) => ({
    address: `G${"A".repeat(55 - String(i + 1).length)}${i + 1}`,
    totalCredits: 50000 - i * 480,
    totalStake: 100000 - i * 950,
    boostUtilization: Math.max(5, 100 - i),
  }));
}

export function useLeaderboard(publicKey: string | null) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKeyState] = useState<SortKey>("credits");
  const [searchQuery, setSearchQueryState] = useState("");
  const [page, setPageState] = useState(1);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchLeaderboard().then((data) => {
      setEntries(data);
      setIsLoading(false);
      setLastRefreshed(new Date());
    });
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const sorted = [...entries].sort((a, b) =>
    sortKey === "credits"
      ? b.totalCredits - a.totalCredits
      : b.totalStake - a.totalStake
  );

  const filtered = sorted.filter((e) =>
    e.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const connectedRank = publicKey
    ? filtered.findIndex((e) => e.address === publicKey) + 1
    : 0;

  const setSortKey = (key: SortKey) => {
    setSortKeyState(key);
    setPageState(1);
  };

  const setSearchQuery = (q: string) => {
    setSearchQueryState(q);
    setPageState(1);
  };

  return {
    paged,
    isLoading,
    sortKey,
    setSortKey,
    searchQuery,
    setSearchQuery,
    currentPage,
    totalPages,
    setPage: setPageState,
    connectedRank,
    filteredCount: filtered.length,
    lastRefreshed,
    refresh,
  };
}
