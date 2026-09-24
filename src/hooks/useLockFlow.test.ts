import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@/test/renderHook";
import { useLockFlow } from "./useLockFlow";

vi.mock("@/lib/soroban", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/soroban")>();
  return { ...actual, lockAssets: vi.fn() };
});

const { lockAssets } = await import("@/lib/soroban");
const lockAssetsMock = vi.mocked(lockAssets);

// Hoisted outside `wrapper` so the same QueryClient instance is reused
// across every re-render -- otherwise `wrapper`'s body (a plain function
// component, re-executed on every render pass) would construct a fresh
// QueryClient each time, changing the context value's identity and
// recreating `execute` via its legitimate `queryClient` dependency
// regardless of the #396 fix under test.
const testQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    QueryClientProvider,
    { client: testQueryClient },
    children,
  );
}

afterEach(() => {
  lockAssetsMock.mockReset();
});

describe("useLockFlow execute identity across step changes (#396)", () => {
  it("keeps the same execute reference while step transitions through the flow", async () => {
    let resolveLockAssets: (value: { success: true; hash: string }) => void;
    lockAssetsMock.mockImplementation(
      ({ onStep }) =>
        new Promise((resolve) => {
          resolveLockAssets = resolve;
          // Drive the same simulating -> signing -> submitting sequence the
          // real implementation reports via onStep, before the deposit fn's
          // own setStep("submitting") call in useLockFlow.ts runs.
          onStep?.("simulating");
          onStep?.("signing");
        }),
    );

    // Hoisted so the object identity is stable across the harness's
    // re-invocations of this callback -- a fresh `{}` literal per call would
    // itself break useCallback's memoization and produce a false failure
    // unrelated to the fix under test.
    const stableWalletApi = {} as never;
    const { result, rerender } = renderHook(
      () =>
        useLockFlow({
          poolId: "pool-1",
          symbol: "XLM",
          publicKey: "GABC",
          walletApi: stableWalletApi,
        }),
      { wrapper },
    );

    const executeBeforeStart = result.current.execute;

    let executePromise!: Promise<void>;
    act(() => {
      executePromise = result.current.execute(10);
    });

    // step has now moved away from "idle" (to "signing", per the mocked
    // onStep sequence above) -- before the fix, this recreated `execute`;
    // after the fix it stays referentially stable because the in-flight
    // guard reads a ref, not the step dependency.
    rerender();
    await waitFor(() => {
      expect(result.current.step).toBe("signing");
    });
    expect(result.current.execute).toBe(executeBeforeStart);

    act(() => {
      resolveLockAssets({ success: true, hash: "deadbeef" });
    });
    await act(async () => {
      await executePromise;
    });

    rerender();
    await waitFor(() => {
      expect(result.current.step).toBe("success");
    });
    expect(result.current.execute).toBe(executeBeforeStart);
  });

  it("still blocks a concurrent execute() call while a deposit is in flight", async () => {
    lockAssetsMock.mockImplementation(
      ({ onStep }) =>
        new Promise(() => {
          onStep?.("simulating");
        }),
    );

    const stableWalletApi = {} as never;
    const { result, rerender } = renderHook(
      () =>
        useLockFlow({
          poolId: "pool-1",
          symbol: "XLM",
          publicKey: "GABC",
          walletApi: stableWalletApi,
        }),
      { wrapper },
    );

    act(() => {
      void result.current.execute(10);
    });
    rerender();
    await waitFor(() => {
      expect(result.current.step).toBe("simulating");
    });

    act(() => {
      void result.current.execute(20);
    });

    // A second call while pending must be a no-op: still exactly one
    // lockAssets invocation from the first call.
    expect(lockAssetsMock).toHaveBeenCalledTimes(1);
  });
});
