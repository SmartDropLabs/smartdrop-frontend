import { renderHook, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  StellarWalletProvider,
  useStellarWallet,
} from "./StellarWalletContext";
import * as freighterApi from "@stellar/freighter-api";

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn().mockResolvedValue({ isConnected: true }),
  isAllowed: vi.fn().mockResolvedValue({ isAllowed: true }),
  getAddress: vi.fn().mockResolvedValue({
    address: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
  }),
  requestAccess: vi.fn(),
  getNetworkDetails: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  return createElement(StellarWalletProvider, null, children);
}

describe("StellarWalletContext visibilitychange network refresh (#140)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates network details promptly when tab becomes visible and freighter responds", async () => {
    vi.mocked(freighterApi.getNetworkDetails).mockResolvedValue({
      network: "TESTNET",
      networkUrl: "",
      networkPassphrase: "Test SDF Network ; September 2015",
    });

    const { result } = renderHook(() => useStellarWallet(), { wrapper });

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.networkName).toBe("TESTNET");

    // Simulate tab becoming visible with new network details
    vi.mocked(freighterApi.getNetworkDetails).mockResolvedValueOnce({
      network: "PUBLIC",
      networkUrl: "",
      networkPassphrase: "Public Global Stellar Network ; September 2015",
    });

    await act(async () => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current.networkName).toBe("PUBLIC");
  });

  it("bounds visibilitychange refresh with timeout and resets networkName when freighter hangs", async () => {
    vi.useFakeTimers();
    vi.mocked(freighterApi.getNetworkDetails).mockResolvedValueOnce({
      network: "TESTNET",
      networkUrl: "",
      networkPassphrase: "Test SDF Network ; September 2015",
    });

    const { result } = renderHook(() => useStellarWallet(), { wrapper });

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.networkName).toBe("TESTNET");

    // Make next call hang indefinitely
    vi.mocked(freighterApi.getNetworkDetails).mockReturnValueOnce(
      new Promise(() => {}),
    );

    act(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16000);
    });

    // Network name must reset to null on timeout rather than staying frozen indefinitely
    expect(result.current.networkName).toBeNull();
    vi.useRealTimers();
  });
});
