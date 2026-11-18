/**
 * Tests for the live wallet-change watcher (#539): an external disconnect
 * (Freighter locked / site access revoked) or account switch must update the
 * UI without waiting for the 30s health check or a visibilitychange.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorProvider } from "@/context/ErrorContext";
import {
  StellarWalletProvider,
  WALLET_WATCH_INTERVAL_MS,
  useStellarWallet,
} from "./StellarWalletContext";

type WatchCallback = (params: {
  address: string;
  network: string;
  networkPassphrase: string;
  error?: { code: number; message: string };
}) => void;

const watchState = vi.hoisted(() => ({
  callback: null as WatchCallback | null,
  interval: 0,
  stop: vi.fn(),
}));

const freighterMock = vi.hoisted(() => ({
  getAddress: vi.fn(),
  getNetworkDetails: vi.fn(),
  isAllowed: vi.fn(),
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  signTransaction: vi.fn(),
  WatchWalletChanges: class {
    constructor(timeout: number) {
      watchState.interval = timeout;
    }
    watch(cb: WatchCallback) {
      watchState.callback = cb;
      return {};
    }
    stop() {
      watchState.stop();
    }
  },
}));

vi.mock("@stellar/freighter-api", () => freighterMock);

const KEY_A = "GA3CD2PYXOQCXW7ZVQW3MOA3JFZCE4F4IG2FD66I55TQASPCNKYYEFRN";
const KEY_B = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H";
const TESTNET = {
  network: "TESTNET",
  networkUrl: "https://horizon-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
};

function Harness() {
  const { connect, publicKey, isConnected } = useStellarWallet();
  return (
    <div>
      <button onClick={() => void connect().catch(() => {})}>Connect</button>
      <div data-testid="public-key">{publicKey ?? "null"}</div>
      <div data-testid="is-connected">{String(isConnected)}</div>
    </div>
  );
}

async function renderConnected() {
  render(
    <ChakraProvider>
      <ErrorProvider>
        <StellarWalletProvider>
          <Harness />
        </StellarWalletProvider>
      </ErrorProvider>
    </ChakraProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Connect" }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(screen.getByTestId("is-connected").textContent).toBe("true");
}

function emit(params: Parameters<WatchCallback>[0]) {
  act(() => watchState.callback?.(params));
}

describe("StellarWalletContext external wallet changes (#539)", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
    });
    vi.clearAllMocks();
    watchState.callback = null;
    freighterMock.isConnected.mockResolvedValue({ isConnected: true });
    freighterMock.isAllowed.mockResolvedValue({ isAllowed: true });
    freighterMock.getAddress.mockResolvedValue({ address: KEY_A });
    freighterMock.requestAccess.mockResolvedValue({ address: KEY_A });
    freighterMock.getNetworkDetails.mockResolvedValue(TESTNET);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("subscribes to Freighter wallet changes once connected", async () => {
    await renderConnected();
    expect(watchState.callback).not.toBeNull();
    expect(watchState.interval).toBe(WALLET_WATCH_INTERVAL_MS);
  });

  it("disconnects immediately when the extension reports no address", async () => {
    await renderConnected();
    emit({ address: "", network: "TESTNET", networkPassphrase: TESTNET.networkPassphrase });

    expect(screen.getByTestId("is-connected").textContent).toBe("false");
    expect(screen.getByTestId("public-key").textContent).toBe("null");
    expect(watchState.stop).toHaveBeenCalled();
  });

  it("follows an account switch made in the extension", async () => {
    await renderConnected();
    emit({ address: KEY_B, network: "TESTNET", networkPassphrase: TESTNET.networkPassphrase });

    expect(screen.getByTestId("public-key").textContent).toBe(KEY_B);
    expect(screen.getByTestId("is-connected").textContent).toBe("true");
  });

  it("ignores a transient read error instead of disconnecting", async () => {
    await renderConnected();
    emit({
      address: "",
      network: "",
      networkPassphrase: "",
      error: { code: -1, message: "temporarily unavailable" },
    });

    expect(screen.getByTestId("is-connected").textContent).toBe("true");
  });
});
