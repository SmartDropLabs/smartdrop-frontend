import { render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useFarmStore } from "@/store/farmStore";
import BoostModal, { boostConfirmWarning, LARGE_BOOST_THRESHOLD } from "./BoostModal";

vi.mock("@/context/StellarWalletContext", () => ({
  useStellarWallet: vi.fn(),
}));

vi.mock("@/hooks/useSorobanQuery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useSorobanQuery")>();
  return { ...actual, useSetBoost: vi.fn() };
});

const useStellarWalletMock = vi.mocked(useStellarWallet);
const { useSetBoost } = await import("@/hooks/useSorobanQuery");
const useSetBoostMock = vi.mocked(useSetBoost);

const defaultWallet = {
  publicKey: "GA3CD2PYXOQCXW7ZVQW3MOA3JFZCE4F4IG2FD66I55TQASPCNKYYEFRN",
  walletApi: { signTransaction: vi.fn() },
  networkName: "TESTNET",
  isNetworkMismatch: false,
  isConnected: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
};

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderModal() {
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>
        <BoostModal />
      </ChakraProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useStellarWalletMock.mockReturnValue(defaultWallet);
  useSetBoostMock.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    reset: vi.fn(),
  } as unknown as ReturnType<typeof useSetBoost>);
  useFarmStore.setState({
    selectedPosition: null,
    activeModal: "none",
    pendingTxHash: null,
  });
});

describe("BoostModal", () => {
  it("does not render when modal is not open", () => {
    renderModal();
    expect(screen.queryByText("Set Boost")).toBeNull();
  });

  it("renders when boost modal is opened", () => {
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
    renderModal();
    expect(screen.getByText("Set Boost - XLM")).toBeTruthy();
  });

  it("shows current boost allocation", () => {
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
        boostAllocation: 25,
      },
      activeModal: "boost",
    });
    renderModal();
    expect(screen.getByText("Current boost")).toBeTruthy();
    expect(screen.getAllByText("25%").length).toBeGreaterThanOrEqual(1);
  });

  it("shows warning when user has no stake", () => {
    useFarmStore.setState({
      selectedPosition: {
        id: "pool-1",
        name: "XLM",
        img: "",
        earned: "0",
        stake: "0",
        dailyRate: "0",
        totalStakedLiquidity: "$1,000",
        symbol: "XLM",
        lockedAmount: 0,
        lockedAt: 0,
        lockPeriodSeconds: 86400,
      },
      activeModal: "boost",
    });
    renderModal();
    expect(screen.getByText(/You need to deposit/)).toBeTruthy();
  });
});

describe("boostConfirmWarning (#768)", () => {
  it("keeps the standard warning for a small allocation", () => {
    expect(boostConfirmWarning(20, 0)).toBe(
      "This allocation applies to all future credit emissions until you change it.",
    );
  });

  it("flags a large allocation explicitly in the confirmation step", () => {
    const warning = boostConfirmWarning(LARGE_BOOST_THRESHOLD, 10);
    expect(warning).toMatch(/^Large boost: you are allocating 75% of your credits\./);
  });

  it("does not flag lowering an already-large allocation", () => {
    expect(boostConfirmWarning(80, 100)).not.toMatch(/Large boost/);
  });
});
