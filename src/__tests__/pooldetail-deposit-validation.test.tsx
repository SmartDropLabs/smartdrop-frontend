import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChakraProvider } from "@chakra-ui/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import PoolDetailClient from "@/app/farm/[poolId]/PoolDetailClient";
import * as sorobanModule from "@/lib/soroban";
import * as walletModule from "@/context/StellarWalletContext";

describe("PoolDetailClient Deposit Amount Validation (#127)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    vi.spyOn(walletModule, "useStellarWallet").mockReturnValue({
      publicKey: "GA3CD2PYXOQCXW7ZVQW3MOA3JFZCE4F4IG2FD66I55TQASPCNKYYEFRN",
      walletApi: { signTransaction: vi.fn() },
      isConnected: true,
      isConnecting: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      isNetworkMismatch: false,
      currentNetwork: "TESTNET",
    } as any);

    vi.spyOn(sorobanModule.sorobanService, "getFactoryPools").mockResolvedValue([
      {
        id: "pool-xlm",
        contractAddress: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
        asset: { code: "XLM", issuer: "", isNative: true },
        dailyRate: "5",
        minLockPeriod: 86400,
        totalLocked: "1000000",
        totalUsers: 10,
        isActive: true,
        createdAt: 1700000000,
      },
    ]);

    vi.spyOn(sorobanModule.sorobanService, "getPoolDepositors").mockResolvedValue([]);
  });

  it("disables deposit button and shows validation message when amount exceeds 7 decimals", async () => {
    render(
      <ChakraProvider>
        <QueryClientProvider client={queryClient}>
          <PoolDetailClient poolId="pool-xlm" />
        </QueryClientProvider>
      </ChakraProvider>
    );

    // Open deposit modal
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Deposit" })).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Deposit" }));

    // Find input in modal
    const input = await screen.findByPlaceholderText("0");
    fireEvent.change(input, { target: { value: "100.123456789" } });

    expect(
      screen.getByText("Enter a positive amount with no more than 7 decimals.")
    ).toBeDefined();

    // Lock button should be disabled
    const submitBtn = screen.getByRole("button", { name: /^Lock/i });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);
  });

  it("enables deposit button when amount has 7 or fewer decimals", async () => {
    render(
      <ChakraProvider>
        <QueryClientProvider client={queryClient}>
          <PoolDetailClient poolId="pool-xlm" />
        </QueryClientProvider>
      </ChakraProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Deposit" })).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Deposit" }));

    const input = await screen.findByPlaceholderText("0");
    fireEvent.change(input, { target: { value: "100.1234567" } });

    expect(
      screen.queryByText("Enter a positive amount with no more than 7 decimals.")
    ).toBeNull();

    const submitBtn = screen.getByRole("button", { name: /^Lock/i });
    expect(submitBtn.hasAttribute("disabled")).toBe(false);
  });
});
