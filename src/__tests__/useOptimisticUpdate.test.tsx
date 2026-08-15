import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, beforeEach } from "vitest";
import { useOptimisticUpdate, QUERY_KEYS } from "@/hooks/useSorobanQuery";
import type { PoolInfo, UserPosition } from "@/types/farm";

describe("useOptimisticUpdate query cache synchronizer (#144)", () => {
  let queryClient: QueryClient;
  const userAddress = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
  const pool1: PoolInfo = {
    id: "pool-1",
    contractAddress: "CA_POOL_1",
    asset: { code: "XLM", isNative: true },
    dailyRate: 10,
    minLockPeriod: 7,
    totalLocked: 1000,
    totalUsers: 50,
    isActive: true,
    createdAt: 1000,
  };
  const pool2: PoolInfo = {
    id: "pool-2",
    contractAddress: "CA_POOL_2",
    asset: { code: "USDC", isNative: false },
    dailyRate: 20,
    minLockPeriod: 14,
    totalLocked: 5000,
    totalUsers: 80,
    isActive: true,
    createdAt: 2000,
  };

  const initialPosition1: UserPosition = {
    poolId: "pool-1",
    stakedAmount: "100",
    unlockTime: 5000,
    credits: "25",
    boost: 0,
    active: true,
  };
  const initialPosition2: UserPosition = {
    poolId: "pool-2",
    stakedAmount: "500",
    unlockTime: 8000,
    credits: "100",
    boost: 0,
    active: true,
  };

  beforeEach(() => {
    queryClient = new QueryClient();
    // Seed multi-pool aggregate query cache used by FarmPage
    queryClient.setQueryData(
      [QUERY_KEYS.USER_POSITION, "all", userAddress],
      [
        { pool: pool1, position: initialPosition1 },
        { pool: pool2, position: initialPosition2 },
      ]
    );
    // Seed single-pool cache
    queryClient.setQueryData(
      [QUERY_KEYS.USER_POSITION, "pool-1", userAddress],
      initialPosition1
    );
  });

  function wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }

  it("updates user position in both all-positions aggregate cache and single-pool cache", () => {
    const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });

    act(() => {
      result.current.updateUserPosition("pool-1", userAddress, (old) => {
        if (!old) return null;
        return {
          ...old,
          stakedAmount: "250",
        };
      });
    });

    // 1. Check all-positions aggregate cache
    const aggregateCache = queryClient.getQueryData<
      Array<{ pool: PoolInfo; position: UserPosition | null }>
    >([QUERY_KEYS.USER_POSITION, "all", userAddress]);

    expect(aggregateCache).toBeDefined();
    expect(aggregateCache![0].position?.stakedAmount).toBe("250");
    // Pool 2 must remain unchanged
    expect(aggregateCache![1].position?.stakedAmount).toBe("500");

    // 2. Check single-pool cache
    const singlePoolCache = queryClient.getQueryData<UserPosition>([
      QUERY_KEYS.USER_POSITION,
      "pool-1",
      userAddress,
    ]);
    expect(singlePoolCache?.stakedAmount).toBe("250");
  });

  it("updates credits in both all-positions aggregate cache and single-pool credits cache", () => {
    const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });

    act(() => {
      result.current.updateCredits("pool-1", userAddress, "75");
    });

    // 1. Check all-positions aggregate cache
    const aggregateCache = queryClient.getQueryData<
      Array<{ pool: PoolInfo; position: UserPosition | null }>
    >([QUERY_KEYS.USER_POSITION, "all", userAddress]);

    expect(aggregateCache![0].position?.credits).toBe("75");
    expect(aggregateCache![1].position?.credits).toBe("100");

    // 2. Check single-pool user credits cache
    const creditsCache = queryClient.getQueryData<string>([
      QUERY_KEYS.USER_CREDITS,
      "pool-1",
      userAddress,
    ]);
    expect(creditsCache).toBe("75");
  });
});
