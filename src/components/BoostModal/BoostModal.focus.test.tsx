import { render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useFarmStore } from "@/store/farmStore";
import BoostModal from "./BoostModal";

vi.mock("@/context/StellarWalletContext", () => ({
  useStellarWallet: vi.fn(),
}));

vi.mock("@/hooks/useSorobanQuery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useSorobanQuery")>();
  return { ...actual, useSetBoost: vi.fn(() => ({ mutate: vi.fn(), isPending: false, reset: vi.fn() })) };
});

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderWithOutsideButton() {
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>
        <button type="button">Outside trigger</button>
        <BoostModal />
      </ChakraProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(useStellarWallet).mockReturnValue({
    publicKey: "GA3CD2PYXOQCXW7ZVQW3MOA3JFZCE4F4IG2FD66I55TQASPCNKYYEFRN",
    walletApi: { signTransaction: vi.fn() },
    networkName: "TESTNET",
    isNetworkMismatch: false,
    isConnected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as ReturnType<typeof useStellarWallet>);
  useFarmStore.setState({
    selectedPosition: {
      id: "pool-1",
      name: "XLM",
      img: "",
      earned: "10",
      stake: "50",
      dailyRate: "0.5",
      totalStakedLiquidity: "$1,000",
      symbol: "XLM",
      lockedAmount: 50,
      lockedAt: Date.now() - 86400000,
      lockPeriodSeconds: 86400,
    },
    activeModal: "boost",
  });
});

describe("BoostModal focus management (#531)", () => {
  it("moves initial focus to the allocation slider inside the dialog", async () => {
    renderWithOutsideButton();
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("slider")), { timeout: 5000 });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("pulls focus back into the dialog when it escapes", async () => {
    renderWithOutsideButton();
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true), { timeout: 5000 });

    screen.getByText("Outside trigger", { selector: "button" }).focus();

    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true), { timeout: 5000 });
  });

  it("marks the dialog as modal for assistive tech", async () => {
    renderWithOutsideButton();
    const dialog = await screen.findByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });
});
