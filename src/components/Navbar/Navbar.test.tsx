import { ChakraProvider } from "@chakra-ui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Navbar from "./Navbar";
import { usePlatformStats } from "@/hooks/useSorobanQuery";

const walletMock = vi.hoisted(() => ({
  publicKey: null as string | null,
  walletApi: null,
  networkName: "TESTNET",
  isNetworkMismatch: false,
  isConnected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock("@/context/StellarWalletContext", () => ({
  useStellarWallet: vi.fn(() => walletMock),
}));

vi.mock("@/hooks/useSorobanQuery", () => ({
  usePlatformStats: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const usePathnameMock = vi.mocked(await import("next/navigation")).usePathname;
const usePlatformStatsMock = vi.mocked(usePlatformStats);

const TEST_PUBLIC_KEY =
  "GA3CD2PYXOQCXW7ZVQW3MOA3JFZCE4F4IG2FD66I55TQASPCNKYYEFRN";
const SHORTENED_ADDRESS = "GA3C…EFRN";

function renderNavbar() {
  return render(
    <ChakraProvider>
      <Navbar />
    </ChakraProvider>,
  );
}

function connectWallet() {
  walletMock.publicKey = TEST_PUBLIC_KEY;
  walletMock.isConnected = true;
}

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom does not implement Element.scrollTo, which Chakra's MenuList
  // calls when it mounts to focus the active item.
  Element.prototype.scrollTo = vi.fn();
  walletMock.publicKey = null;
  walletMock.isConnected = false;
  walletMock.isNetworkMismatch = false;
  usePathnameMock.mockReturnValue("/");
  usePlatformStatsMock.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof usePlatformStats>);

  // jsdom has no clipboard implementation; WalletMenu's copy action needs it.
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe("Navbar (disconnected)", () => {
  it("shows public links but hides wallet-gated Farm/Leaderboard links", () => {
    renderNavbar();

    expect(screen.getByRole("link", { name: "Home" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "History" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Contributors" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Farm" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Leaderboard" })).toBeNull();
  });

  it("shows platform stat pills instead of the wallet pill", () => {
    renderNavbar();

    expect(screen.getByText("Online")).toBeTruthy();
    expect(screen.getByText("Users")).toBeTruthy();
    expect(screen.getByText("TVL")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Wallet menu" })).toBeNull();
  });

  it("renders placeholder dashes when stats have not loaded", () => {
    renderNavbar();

    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });
});

describe("Navbar (connected)", () => {
  beforeEach(connectWallet);

  it("shows Farm/Leaderboard links once connected", () => {
    renderNavbar();

    expect(screen.getByRole("link", { name: "Farm" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Leaderboard" })).toBeTruthy();
  });

  it("replaces stat pills with a wallet pill showing the shortened address", () => {
    renderNavbar();

    expect(screen.queryByText("Online")).toBeNull();
    expect(screen.queryByText("TVL")).toBeNull();

    const pill = screen.getByRole("button", { name: "Wallet menu" });
    expect(pill.textContent).toContain(SHORTENED_ADDRESS);
  });

  it("disconnects from the wallet menu", async () => {
    renderNavbar();

    fireEvent.click(screen.getByRole("button", { name: "Wallet menu" }));
    fireEvent.click(await screen.findByText("Disconnect"));

    await waitFor(() => {
      expect(walletMock.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  it("copies the full public key from the wallet menu and confirms", async () => {
    renderNavbar();

    fireEvent.click(screen.getByRole("button", { name: "Wallet menu" }));
    fireEvent.click(await screen.findByText("Copy address"));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(TEST_PUBLIC_KEY);
    });
    expect(await screen.findByText("Copied!")).toBeTruthy();
  });
});

describe("Navbar active-link highlighting", () => {
  it("marks the link matching the current pathname as active", () => {
    usePathnameMock.mockReturnValue("/history");
    renderNavbar();

    const home = screen.getByRole("link", { name: "Home" });
    const history = screen.getByRole("link", { name: "History" });

    expect(history.className).toContain("font-semibold");
    expect(home.className).toContain("font-medium");
    expect(history.className).not.toContain("font-medium");
    expect(home.className).not.toContain("font-semibold");
  });
});

describe("Navbar More menu", () => {
  it("opens to show the secondary navigation links", async () => {
    renderNavbar();

    fireEvent.click(screen.getByRole("button", { name: "More navigation links" }));

    // Chakra MenuItems render an explicit role="menuitem" (overriding the
    // implicit link role), and jsdom has no layout so the positioned list
    // stays visibility:hidden — both require querying with hidden: true.
    const labels = ["Prices", "Airdrops", "Webhooks", "Alerts"];
    const hrefs = ["/prices", "/airdrops", "/webhooks", "/alerts"];
    for (let i = 0; i < labels.length; i++) {
      const item = await screen.findByRole(
        "menuitem",
        { name: labels[i], hidden: true },
      );
      expect(item.getAttribute("href")).toBe(hrefs[i]);
    }
  });
});
