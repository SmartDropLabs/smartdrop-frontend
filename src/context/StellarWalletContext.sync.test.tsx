/**
 * Cross-tab wallet sync (#758): connecting or disconnecting in one tab is
 * announced over a BroadcastChannel and the other tabs follow.
 *
 * BroadcastChannel is replaced with an in-memory fake so each test controls
 * exactly which "tab" a message comes from.
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorProvider } from "@/context/ErrorContext";
import {
  StellarWalletProvider,
  WALLET_SYNC_CHANNEL,
  useStellarWallet,
  type WalletSyncMessage,
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

class FakeChannel {
  static instances: FakeChannel[] = [];
  onmessage: ((event: { data: WalletSyncMessage }) => void) | null = null;
  posted: WalletSyncMessage[] = [];
  closed = false;

  constructor(public name: string) {
    FakeChannel.instances.push(this);
  }

  postMessage(message: WalletSyncMessage) {
    this.posted.push(message);
  }

  close() {
    this.closed = true;
  }

  /** Simulates a message arriving from another tab. */
  receive(message: WalletSyncMessage) {
    this.onmessage?.({ data: message });
  }
}

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
  render(
    <ChakraProvider>
      <ErrorProvider>
        <StellarWalletProvider>
          <Harness />
        </StellarWalletProvider>
      </ErrorProvider>
    </ChakraProvider>,
  );
  const channel = FakeChannel.instances.find((c) => c.name === WALLET_SYNC_CHANNEL);
  if (!channel) throw new Error("provider did not open the wallet sync channel");
  return channel;
}

async function waitForKey(expected: string) {
  await waitFor(() =>
    expect(screen.getByTestId("public-key").textContent).toBe(expected),
  );
}

describe("StellarWalletProvider cross-tab sync (#758)", () => {
  beforeEach(() => {
    FakeChannel.instances = [];
    vi.stubGlobal("BroadcastChannel", FakeChannel);
    freighterMock.getNetworkDetails.mockResolvedValue({ network: "TESTNET" });
    freighterMock.isConnected.mockResolvedValue({ isConnected: true });
    freighterMock.isAllowed.mockResolvedValue({ isAllowed: true });
    freighterMock.getAddress.mockResolvedValue({ address: KEY });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("announces a local connect and disconnect to other tabs", async () => {
    const channel = renderProvider();

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    await waitForKey(KEY);
    expect(channel.posted).toContainEqual({ type: "connected", publicKey: KEY });

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(channel.posted).toContainEqual({ type: "disconnected" });
  });

  it("follows a connect made in another tab", async () => {
    const channel = renderProvider();
    expect(screen.getByTestId("public-key").textContent).toBe("null");

    channel.receive({ type: "connected", publicKey: KEY });
    await waitForKey(KEY);

    expect(screen.getByTestId("public-key").textContent).toBe(KEY);
    // Applying a received message must not re-broadcast it.
    expect(channel.posted).toEqual([]);
  });

  it("follows a disconnect made in another tab", async () => {
    const channel = renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    await waitForKey(KEY);
    channel.posted = [];

    act(() => channel.receive({ type: "disconnected" }));

    expect(screen.getByTestId("public-key").textContent).toBe("null");
    expect(channel.posted).toEqual([]);
  });

  it("closes the channel on unmount", () => {
    const channel = renderProvider();
    cleanup();
    expect(channel.closed).toBe(true);
  });
});
