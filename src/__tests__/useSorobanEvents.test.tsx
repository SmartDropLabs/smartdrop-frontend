import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useSorobanEvents, type SorobanEventsRpc } from "@/hooks/useSorobanEvents";
import { QUERY_KEYS } from "@/hooks/useSorobanQuery";
import { xdr } from "@stellar/stellar-sdk";

const mockPublicKey = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

vi.mock("@/context/StellarWalletContext", () => ({
  useStellarWallet: () => ({
    publicKey: mockPublicKey,
    isConnected: true,
  }),
}));

describe("useSorobanEvents invalidation (#147)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    queryClient = new QueryClient();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("invalidates USER_CREDITS when update_credits event is detected for connected user", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const mockRpc: SorobanEventsRpc = {
      getLatestLedger: vi.fn().mockResolvedValue({ sequence: 100 }),
      getEvents: vi.fn().mockResolvedValue({
        latestLedger: 101,
        events: [
          {
            inSuccessfulContractCall: true,
            topic: [
              xdr.ScVal.scvSymbol("update_credits"),
              xdr.ScVal.scvString(mockPublicKey),
            ],
          },
        ],
      }),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(
      () =>
        useSorobanEvents(
          ["C_POOL_TEST"],
          ["lock_assets", "unlock_assets", "update_credits"],
          mockRpc
        ),
      { wrapper }
    );

    // Initial sequence fetch
    await act(async () => {
      await Promise.resolve();
    });

    // Advance 5 seconds to trigger the polling tick
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [QUERY_KEYS.USER_CREDITS],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [QUERY_KEYS.POOLS],
    });
  });

  it("invalidates USER_POSITION when lock_assets event is detected for connected user", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const mockRpc: SorobanEventsRpc = {
      getLatestLedger: vi.fn().mockResolvedValue({ sequence: 100 }),
      getEvents: vi.fn().mockResolvedValue({
        latestLedger: 101,
        events: [
          {
            inSuccessfulContractCall: true,
            topic: [
              xdr.ScVal.scvSymbol("lock_assets"),
              xdr.ScVal.scvString(mockPublicKey),
            ],
          },
        ],
      }),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(
      () =>
        useSorobanEvents(
          ["C_POOL_TEST"],
          ["lock_assets", "unlock_assets", "update_credits"],
          mockRpc
        ),
      { wrapper }
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [QUERY_KEYS.USER_POSITION],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [QUERY_KEYS.POOLS],
    });
  });
});
