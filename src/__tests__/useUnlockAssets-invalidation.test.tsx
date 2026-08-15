import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { useUnlockAssets, QUERY_KEYS } from "@/hooks/useSorobanQuery";
import * as sorobanModule from "@/lib/soroban";
import * as walletModule from "@/context/StellarWalletContext";

describe("useUnlockAssets Cache Invalidation (#138)", () => {
  let queryClient: QueryClient;
  const mockPublicKey = "GA3CD2PYXOQCXW7ZVQW3MOA3JFZCE4F4IG2FD66I55TQASPCNKYYEFRN";

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();

    vi.spyOn(walletModule, "useStellarWallet").mockReturnValue({
      publicKey: mockPublicKey,
      walletApi: { signTransaction: vi.fn() },
      isConnected: true,
      isConnecting: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      isNetworkMismatch: false,
      currentNetwork: "TESTNET",
    } as any);
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it("invalidates stellarBalance, pools, positions, credits, and stats upon successful unlock", async () => {
    vi.spyOn(sorobanModule.sorobanService, "unlockAssets").mockResolvedValue({
      success: true,
      transactionHash: "unlock-tx-hash-123",
      hash: "unlock-tx-hash-123",
      status: "SUCCESS",
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUnlockAssets(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        poolId: "pool-xlm",
        amount: "50",
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["stellarBalance", mockPublicKey],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [QUERY_KEYS.POOLS],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [QUERY_KEYS.USER_POSITION],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [QUERY_KEYS.USER_POSITION, "pool-xlm"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [QUERY_KEYS.USER_POSITION, "all", mockPublicKey],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [QUERY_KEYS.USER_CREDITS, "pool-xlm"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [QUERY_KEYS.PLATFORM_STATS],
    });
  });

  it("does not invalidate queries when unlock fails", async () => {
    vi.spyOn(sorobanModule.sorobanService, "unlockAssets").mockResolvedValue({
      success: false,
      error: "Assets still locked",
      status: "FAILED",
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUnlockAssets(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        poolId: "pool-xlm",
        amount: "50",
      });
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
