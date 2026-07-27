import { useCallback, useEffect, useRef, useState } from "react";
import { sorobanService } from "@/lib/soroban";

export type SortKey = "credits" | "stake";

export type LeaderboardEntry = {
  address: string;
  totalCredits: number;
  totalStake: number;
  boostUtilization: number;
};

export const PAGE_SIZE = 10;
const REFRESH_MS = 30_000;
const SEARCH_DEBOUNCE_MS = 300;

export function fetchLeaderboard(
  offset: number,
  limit: number,
  sortKey: SortKey
): Promise<{ entries: LeaderboardEntry[]; total: number }> {
  return sorobanService.getLeaderboard(offset, limit, sortKey);
}

export function fetchUserRank(
  address: string,
  sortKey: SortKey
): Promise<number | null> {
  return sorobanService.getUserRank(address, sortKey);
}

export function useLeaderboard(publicKey: string | null) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKeyState] = useState<SortKey>("credits");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPageState] = useState(1);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Separate state for the user's global rank (independent of pagination)
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userRankLoading, setUserRankLoading] = useState(false);

  // Generation counter to guard against stale async responses (race condition #79)
  const fetchGenerationRef = useRef(0);

  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchInput]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const refresh = useCallback(() => {
    const generation = ++fetchGenerationRef.current;

    setIsLoading(true);
    fetchLeaderboard(offset, PAGE_SIZE, sortKey)
      .then(({ entries, total }) => {
        // Guard: ignore stale responses
        if (generation !== fetchGenerationRef.current) return;
        setEntries(entries);
        setTotal(total);
        setLastRefreshed(new Date());
      })
      .catch(() => {
        if (generation !== fetchGenerationRef.current) return;
        setEntries([]);
        setTotal(0);
      })
      .finally(() => {
        if (generation !== fetchGenerationRef.current) return;
        setIsLoading(false);
      });
  }, [offset, sortKey]);

  // Fetch the user's global rank independently of pagination
  const refreshRank = useCallback(() => {
    if (!publicKey) {
      setUserRank(null);
      setUserRankLoading(false);
      return;
    }

    const generation = ++fetchGenerationRef.current;
    setUserRankLoading(true);

    fetchUserRank(publicKey, sortKey)
      .then((rank) => {
        if (generation !== fetchGenerationRef.current) return;
        setUserRank(rank != null ? rank : null);
      })
      .catch(() => {
        if (generation !== fetchGenerationRef.current) return;
        setUserRank(null);
      })
      .finally(() => {
        if (generation !== fetchGenerationRef.current) return;
        setUserRankLoading(false);
      });
  }, [publicKey, sortKey]);

  useEffect(() => {
    refresh();
    refreshRank();
    const id = setInterval(() => {
      refresh();
      refreshRank();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh, refreshRank]);

  const paged = searchQuery
    ? entries.filter((e) =>
        e.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;

  // Page-local rank for highlighting the user's row in the table
  const connectedRank = (() => {
    if (!publicKey) return 0;
    const idx = entries.findIndex((e) => e.address === publicKey);
    return idx === -1 ? 0 : offset + idx + 1;
  })();

  const setSortKey = (key: SortKey) => {
    setSortKeyState(key);
    setPageState(1);
  };

  return {
    paged,
    isLoading,
    sortKey,
    setSortKey,
    searchQuery: searchInput,
    setSearchQuery: setSearchInput,
    currentPage,
    totalPages,
    setPage: setPageState,
    connectedRank,
    userRank,
    userRankLoading,
    filteredCount: searchQuery ? paged.length : total,
    lastRefreshed,
    refresh,
  };
}
