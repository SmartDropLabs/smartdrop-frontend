import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChakraProvider } from "@chakra-ui/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import Navbar from "@/components/Navbar/Navbar";
import * as walletModule from "@/context/StellarWalletContext";
import * as sorobanQueryModule from "@/hooks/useSorobanQuery";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("Navbar Live Platform Stats (#133)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <ChakraProvider>
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
      </ChakraProvider>
    );
  };

  it("renders live stats from usePlatformStats instead of static string literals", () => {
    vi.spyOn(walletModule, "useStellarWallet").mockReturnValue({
      publicKey: null,
      isConnected: false,
      isConnecting: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      isNetworkMismatch: false,
    } as any);

    vi.spyOn(sorobanQueryModule, "usePlatformStats").mockReturnValue({
      data: {
        totalUsers: 142,
        totalValueLocked: "$5.4M",
        tvl: "$5.4M",
        activePools: 4,
        totalFarmers: 142,
        creditVelocity: "100",
      },
      isLoading: false,
    } as any);

    renderWithProviders(<Navbar />);

    expect(screen.getByText("142")).toBeDefined();
    expect(screen.getByText("$5.4M")).toBeDefined();

    // Verify fabricated constants are gone
    expect(screen.queryByText("30,738")).toBeNull();
    expect(screen.queryByText("$302M")).toBeNull();
    expect(screen.queryByText("Online")).toBeNull();
  });

  it("updates rendered stats dynamically when query data changes", () => {
    vi.spyOn(walletModule, "useStellarWallet").mockReturnValue({
      publicKey: null,
      isConnected: false,
      isConnecting: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      isNetworkMismatch: false,
    } as any);

    vi.spyOn(sorobanQueryModule, "usePlatformStats").mockReturnValue({
      data: {
        totalUsers: 9999,
        totalValueLocked: "$12.8M",
        tvl: "$12.8M",
        activePools: 8,
        totalFarmers: 9999,
        creditVelocity: "250",
      },
      isLoading: false,
    } as any);

    renderWithProviders(<Navbar />);

    expect(screen.getByText("9,999")).toBeDefined();
    expect(screen.getByText("$12.8M")).toBeDefined();
  });

  it("displays connected wallet pill when wallet is connected", () => {
    const address = "GA3CD2PYXOQCXW7ZVQW3MOA3JFZCE4F4IG2FD66I55TQASPCNKYYEFRN";
    vi.spyOn(walletModule, "useStellarWallet").mockReturnValue({
      publicKey: address,
      isConnected: true,
      isConnecting: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      isNetworkMismatch: false,
    } as any);

    vi.spyOn(sorobanQueryModule, "usePlatformStats").mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    renderWithProviders(<Navbar />);

    expect(screen.getByText("Wallet")).toBeDefined();
    expect(screen.getByText("GA3C…EFRN")).toBeDefined();
  });
});
