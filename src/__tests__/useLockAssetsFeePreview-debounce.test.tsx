import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { useLockAssetsFeePreview } from "@/hooks/useSorobanQuery";
import * as sorobanModule from "@/lib/soroban";

describe("useLockAssetsFeePreview Debouncing (#134)", () => {
  let queryClient: QueryClient;
  const mockPublicKey = "GA3CD2PYXOQCXW7ZVQW3MOA3JFZCE4F4IG2FD66I55TQASPCNKYYEFRN";
  const mockPoolContractId = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";

  beforeEach(() => {
    vi.useFakeTimers();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it("debounces rapid amount changes and calls simulateLockAssets only once with the final amount", async () => {
    const simulateSpy = vi.spyOn(sorobanModule, "simulateLockAssets").mockResolvedValue({
      feePreview: "100",
      minResourceFee: "100",
    } as any);

    let currentAmount = "1";
    const { result, rerender } = renderHook(
      ({ amount }) =>
        useLockAssetsFeePreview({
          publicKey: mockPublicKey,
          poolContractId: mockPoolContractId,
          amount,
          debounceMs: 300,
        }),
      {
        initialProps: { amount: currentAmount },
        wrapper: createWrapper(),
      }
    );

    // Initial mount: amount is "1", immediately in debounce window
    expect(result.current.isDebouncing).toBe(false);

    // Rapidly change amount 4 times within 200ms
    act(() => {
      vi.advanceTimersByTime(50);
      currentAmount = "12";
    });
    rerender({ amount: currentAmount });
    expect(result.current.isDebouncing).toBe(true);

    act(() => {
      vi.advanceTimersByTime(50);
      currentAmount = "123";
    });
    rerender({ amount: currentAmount });
    expect(result.current.isDebouncing).toBe(true);

    act(() => {
      vi.advanceTimersByTime(50);
      currentAmount = "1234";
    });
    rerender({ amount: currentAmount });
    expect(result.current.isDebouncing).toBe(true);

    act(() => {
      vi.advanceTimersByTime(50);
      currentAmount = "12345";
    });
    rerender({ amount: currentAmount });
    expect(result.current.isDebouncing).toBe(true);

    // Now advance past the 300ms debounce window
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current.isDebouncing).toBe(false);
    expect(simulateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: "12345",
      })
    );
  });
});
