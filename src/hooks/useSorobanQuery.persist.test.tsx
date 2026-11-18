import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/context/StellarWalletContext", () => ({
  useStellarWallet: vi.fn(() => ({ publicKey: null, walletApi: null })),
}));

import { shouldRetry, usePersistedQueryCache } from "./useSorobanQuery";
import { normalizeError } from "@/lib/error-handler";
import { readPersistedQuery, writePersistedQuery } from "@/lib/queryPersistence";

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

const KEY = ["pools"] as const;

describe("usePersistedQueryCache (#788)", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("restores the last-known data after mount, keeping its original timestamp", async () => {
    const savedAt = Date.now() - 60_000;
    writePersistedQuery("pools", [{ id: "p1" }], savedAt);
    const { queryClient, wrapper } = setup();

    renderHook(() => usePersistedQueryCache(KEY, "pools", undefined, 0), { wrapper });

    await waitFor(() => expect(queryClient.getQueryData(KEY)).toEqual([{ id: "p1" }]));
    expect(queryClient.getQueryState(KEY)?.dataUpdatedAt).toBe(savedAt);
  });

  it("does not overwrite data the cache already has", async () => {
    writePersistedQuery("pools", [{ id: "stale" }], Date.now() - 1_000);
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(KEY, [{ id: "fresh" }]);

    renderHook(() => usePersistedQueryCache(KEY, "pools", undefined, 0), { wrapper });

    await waitFor(() => expect(queryClient.getQueryData(KEY)).toEqual([{ id: "fresh" }]));
  });

  it("persists fetched data with its update time", async () => {
    const { wrapper } = setup();
    const updatedAt = Date.now();

    renderHook(() => usePersistedQueryCache(KEY, "pools", [{ id: "p2" }], updatedAt), {
      wrapper,
    });

    await waitFor(() =>
      expect(readPersistedQuery("pools")).toEqual({ savedAt: updatedAt, data: [{ id: "p2" }] }),
    );
  });

  it("does nothing when there is neither cached nor fetched data", async () => {
    const { queryClient, wrapper } = setup();

    renderHook(() => usePersistedQueryCache(KEY, "pools", undefined, 0), { wrapper });

    expect(queryClient.getQueryData(KEY)).toBeUndefined();
    expect(readPersistedQuery("pools")).toBeUndefined();
  });
});

describe("shouldRetry", () => {
  it("stops after three failures", () => {
    expect(shouldRetry(3, new Error("timeout"))).toBe(false);
  });

  it("retries exactly the errors normalizeError classifies as transient", () => {
    const error = new Error("network request failed");
    expect(shouldRetry(0, error)).toBe(normalizeError(error).isTransient);
  });
});
