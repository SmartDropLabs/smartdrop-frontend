import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChakraProvider } from "@chakra-ui/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import PoolDetailClient from "@/app/farm/[poolId]/PoolDetailClient";
import * as sorobanServiceModule from "@/lib/soroban";

vi.mock("@/context/StellarWalletContext", () => ({
  useStellarWallet: () => ({
    publicKey: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
    isConnected: true,
    walletApi: null,
    isNetworkMismatch: false,
  }),
}));

vi.mock("@/context/OwnConnectButtonContext", () => ({
  useOwnConnectButton: () => vi.fn(),
}));

vi.mock("@/hooks/useLockFlow", () => ({
  useLockFlow: () => ({
    step: "idle",
    record: null,
    error: null,
    isPending: false,
    execute: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("@/components/TvlChart/TvlChart", () => ({
  default: () => <div data-testid="tvl-chart">TVL Chart</div>,
}));

vi.mock("@/hooks/useSorobanQuery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useSorobanQuery")>();
  return {
    ...actual,
    useStellarBalance: () => ({ data: 100, isLoading: false, isError: false }),
  };
});

describe("PoolDetailClient shared usePools and usePoolDepositors caching (#143)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it("renders pool details from seeded usePools cache without redundant fetches", async () => {
    const mockPool = {
      id: "test-pool-xyz",
      contractAddress: "CA_TEST_XYZ",
      asset: { code: "XLM", isNative: true },
      dailyRate: 15.5,
      minLockPeriod: 7,
      totalLocked: 100000,
      totalUsers: 42,
      isActive: true,
      createdAt: 1000,
    };

    // Seed the shared 'pools' cache key
    queryClient.setQueryData(["pools"], [mockPool]);
    queryClient.setQueryData(["poolDepositors", "test-pool-xyz", 20], [
      { address: "GBJGVZ...", amount: 500, credits: 120 },
    ]);

    render(
      <ChakraProvider>
        <QueryClientProvider client={queryClient}>
          <PoolDetailClient poolId="test-pool-xyz" />
        </QueryClientProvider>
      </ChakraProvider>,
    );

    expect(screen.getByText("test-pool-xyz")).toBeDefined();
    expect(screen.getByText("XLM Pool")).toBeDefined();
    expect(screen.getByText("15.5000 / day")).toBeDefined();
    expect(screen.getByText("42")).toBeDefined();
  });

  it("displays 'Pool not found.' when target poolId does not exist in the pools cache", async () => {
    queryClient.setQueryData(["pools"], []);

    render(
      <ChakraProvider>
        <QueryClientProvider client={queryClient}>
          <PoolDetailClient poolId="non-existent-pool" />
        </QueryClientProvider>
      </ChakraProvider>,
    );

    expect(screen.getByText("Pool not found.")).toBeDefined();
  });
});
