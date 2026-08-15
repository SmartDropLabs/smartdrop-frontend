import { renderHook } from "@/test/renderHook";
import { act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLockFlow, type LockFlowParams } from "./useLockFlow";
import { QUERY_KEYS } from "./useSorobanQuery";
import * as soroban from "@/lib/soroban";
import * as analytics from "@/lib/analytics";

vi.mock("@/lib/soroban", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/soroban")>();
  return {
    ...actual,
    lockAssets: vi.fn(),
  };
});

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

const mockLockAssets = vi.mocked(soroban.lockAssets);
const mockTrackEvent = vi.mocked(analytics.trackEvent);

const TEST_PUBLIC_KEY = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
const TEST_POOL_ID = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const mockWalletApi = {
  isAllowed: vi.fn().mockResolvedValue(true),
  getUserInfo: vi.fn().mockResolvedValue({ publicKey: TEST_PUBLIC_KEY }),
  signAuthEntry: vi.fn(),
} as unknown as soroban.FreighterWalletApi;

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useLockFlow state machine and deposit execution (#128)", () => {
  let queryClient: QueryClient;
  const defaultParams: LockFlowParams = {
    poolId: TEST_POOL_ID,
    symbol: "XLM",
    publicKey: TEST_PUBLIC_KEY,
    walletApi: mockWalletApi,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("completes full successful deposit flow (idle -> signing -> submitting -> success) and invalidates caches", async () => {
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
    const fakeTxHash = "0xdeadbeef1234567890abcdef";

    mockLockAssets.mockImplementation(async ({ onStep }) => {
      onStep?.("submitting");
      return { success: true, hash: fakeTxHash };
    });

    const { result } = renderHook(() => useLockFlow(defaultParams), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.step).toBe("idle");
    expect(result.current.isPending).toBe(false);
    expect(result.current.record).toBeNull();
    expect(result.current.error).toBeNull();

    await act(async () => {
      await result.current.execute(100);
    });

    // State assertions
    expect(result.current.step).toBe("success");
    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.record).toMatchObject({
      poolId: TEST_POOL_ID,
      symbol: "XLM",
      displayAmount: 100,
      txHash: fakeTxHash,
    });
    expect(result.current.record?.confirmedAt).toBeDefined();

    // Analytics assertions
    expect(mockTrackEvent).toHaveBeenCalledWith("deposit_initiated", {
      poolId: TEST_POOL_ID,
      symbol: "XLM",
      displayAmount: 100,
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(
      "deposit_succeeded",
      expect.objectContaining({
        poolId: TEST_POOL_ID,
        symbol: "XLM",
        displayAmount: 100,
        txHash: fakeTxHash,
        durationMs: expect.any(Number),
      }),
    );

    // React Query cache invalidations
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: [QUERY_KEYS.USER_POSITION] });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: [QUERY_KEYS.POOLS] });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: [QUERY_KEYS.PLATFORM_STATS] });
  });

  it("handles lockAssets returning success: false with an error message", async () => {
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    mockLockAssets.mockResolvedValueOnce({
      success: false,
      error: "Contract execution reached maximum allowed gas",
    });

    const { result } = renderHook(() => useLockFlow(defaultParams), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.execute(50);
    });

    expect(result.current.step).toBe("error");
    expect(result.current.isPending).toBe(false);
    expect(result.current.record).toBeNull();
    expect(result.current.error).toBeDefined();
    expect(result.current.error).not.toBeNull();

    // Analytics assertion
    expect(mockTrackEvent).toHaveBeenCalledWith(
      "deposit_failed",
      expect.objectContaining({
        poolId: TEST_POOL_ID,
        symbol: "XLM",
        displayAmount: 50,
        errorCode: expect.any(String),
      }),
    );

    // Caches must NOT be invalidated on failure
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it("handles lockAssets throwing an unexpected error and normalizes it", async () => {
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    mockLockAssets.mockRejectedValueOnce(new Error("RPC node timeout connecting to Soroban"));

    const { result } = renderHook(() => useLockFlow(defaultParams), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.execute(25);
    });

    expect(result.current.step).toBe("error");
    expect(result.current.isPending).toBe(false);
    expect(result.current.record).toBeNull();
    expect(result.current.error).toBeDefined();

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "deposit_failed",
      expect.objectContaining({
        poolId: TEST_POOL_ID,
        symbol: "XLM",
        displayAmount: 25,
      }),
    );

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it("fails immediately with wallet error if walletApi or publicKey is missing", async () => {
    const { result } = renderHook(
      () =>
        useLockFlow({
          ...defaultParams,
          walletApi: null,
          publicKey: "",
        }),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await act(async () => {
      await result.current.execute(10);
    });

    expect(result.current.step).toBe("error");
    expect(result.current.error).toContain("Wallet not connected");
    expect(mockLockAssets).not.toHaveBeenCalled();
  });

  it("resets hook back to idle state via reset()", async () => {
    mockLockAssets.mockResolvedValueOnce({ success: true, hash: "0xabc" });

    const { result } = renderHook(() => useLockFlow(defaultParams), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.execute(10);
    });
    expect(result.current.step).toBe("success");
    expect(result.current.record).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.step).toBe("idle");
    expect(result.current.record).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it("guards against reentrancy when execute is called while deposit is pending", async () => {
    let resolveLock: (val: { success: boolean; hash: string }) => void;
    const lockPromise = new Promise<{ success: boolean; hash: string }>((res) => {
      resolveLock = res;
    });

    mockLockAssets.mockImplementationOnce(() => lockPromise);

    const { result } = renderHook(() => useLockFlow(defaultParams), {
      wrapper: createWrapper(queryClient),
    });

    let firstCallPromise: Promise<void>;
    act(() => {
      firstCallPromise = result.current.execute(10);
    });

    // Reentrancy attempt while pending
    await act(async () => {
      await result.current.execute(20);
    });

    expect(mockLockAssets).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLock!({ success: true, hash: "0x123" });
      await firstCallPromise;
    });

    expect(result.current.step).toBe("success");
  });
});
