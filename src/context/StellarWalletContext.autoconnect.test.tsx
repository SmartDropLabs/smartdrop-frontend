/**
 * Auto-reconnect on page load (#789): a browser that connected before gets
 * its session back silently, through Freighter's non-prompting calls only.
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorProvider } from "@/context/ErrorContext";
import {
  StellarWalletProvider,
  WALLET_AUTOCONNECT_STORAGE_KEY,
  useStellarWallet,
} from "./StellarWalletContext";

const freighterMock = vi.hoisted(() => ({
  getAddress: vi.fn(),
  getNetworkDetails: vi.fn(),
  isAllowed: vi.fn(),
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  signTransaction: vi.fn(),
}));

vi.mock("@stellar/freighter-api", () => freighterMock);

const KEY = "GA3CD2PYXOQCXW7ZVQW3MOA3JFZCE4F4IG2FD66I55TQASPCNKYYEFRN";

function Harness() {
  const { connect, disconnect, publicKey } = useStellarWallet();
  return (
    <div>
      <button onClick={() => void connect().catch(() => {})}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
      <div data-testid="public-key">{publicKey ?? "null"}</div>
    </div>
  );
}

function renderProvider() {
  return render(
    <ChakraProvider>
      <ErrorProvider>
        <StellarWalletProvider>
          <Harness />
        </StellarWalletProvider>
      </ErrorProvider>
    </ChakraProvider>,
  );
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("StellarWalletContext auto-reconnect (#789)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    freighterMock.isConnected.mockResolvedValue({ isConnected: true });
    freighterMock.isAllowed.mockResolvedValue({ isAllowed: true });
    freighterMock.getAddress.mockResolvedValue({ address: KEY });
    freighterMock.requestAccess.mockResolvedValue({ address: KEY });
    freighterMock.getNetworkDetails.mockResolvedValue({ network: "TESTNET" });
  });

  afterEach(() => {
    cleanup();
  });

  it("reconnects a previously connected wallet on mount without prompting", async () => {
    window.localStorage.setItem(WALLET_AUTOCONNECT_STORAGE_KEY, "1");
    renderProvider();

    await waitFor(() => expect(screen.getByTestId("public-key").textContent).toBe(KEY));
    expect(freighterMock.requestAccess).not.toHaveBeenCalled();
  });

  it("does not touch Freighter on mount when no wallet was remembered", async () => {
    renderProvider();
    await flush();

    expect(freighterMock.isConnected).not.toHaveBeenCalled();
    expect(screen.getByTestId("public-key").textContent).toBe("null");
  });

  it("stays disconnected and forgets the wallet when site access was revoked", async () => {
    window.localStorage.setItem(WALLET_AUTOCONNECT_STORAGE_KEY, "1");
    freighterMock.isAllowed.mockResolvedValue({ isAllowed: false });
    renderProvider();

    await waitFor(() =>
      expect(window.localStorage.getItem(WALLET_AUTOCONNECT_STORAGE_KEY)).toBeNull(),
    );
    expect(screen.getByTestId("public-key").textContent).toBe("null");
    expect(freighterMock.requestAccess).not.toHaveBeenCalled();
  });

  it("keeps the flag but stays disconnected when the extension is unavailable", async () => {
    window.localStorage.setItem(WALLET_AUTOCONNECT_STORAGE_KEY, "1");
    freighterMock.isConnected.mockResolvedValue({ isConnected: false });
    renderProvider();
    await flush();

    expect(screen.getByTestId("public-key").textContent).toBe("null");
    expect(window.localStorage.getItem(WALLET_AUTOCONNECT_STORAGE_KEY)).toBe("1");
  });

  it("remembers the wallet on connect and forgets it on an explicit disconnect", async () => {
    renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    await waitFor(() => expect(screen.getByTestId("public-key").textContent).toBe(KEY));
    expect(window.localStorage.getItem(WALLET_AUTOCONNECT_STORAGE_KEY)).toBe("1");

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

    expect(screen.getByTestId("public-key").textContent).toBe("null");
    expect(window.localStorage.getItem(WALLET_AUTOCONNECT_STORAGE_KEY)).toBeNull();
  });
});
