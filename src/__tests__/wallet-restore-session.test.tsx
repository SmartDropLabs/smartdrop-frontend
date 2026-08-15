import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import {
  StellarWalletProvider,
  useStellarWallet,
} from "@/context/StellarWalletContext";

const mockFreighter = {
  isConnected: vi.fn(),
  isAllowed: vi.fn(),
  getAddress: vi.fn(),
  getNetworkDetails: vi.fn(),
  requestAccess: vi.fn(),
  signTransaction: vi.fn(),
};

vi.mock("@stellar/freighter-api", () => mockFreighter);

describe("StellarWalletProvider Silent Session Restoration (#137)", () => {
  const validAddress = "GA3CD2PYXOQCXW7ZVQW3MOA3JFZCE4F4IG2FD66I55TQASPCNKYYEFRN";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("silently restores session on mount when already authorized without user interaction", async () => {
    mockFreighter.isConnected.mockResolvedValue({ isConnected: true });
    mockFreighter.isAllowed.mockResolvedValue({ isAllowed: true });
    mockFreighter.getAddress.mockResolvedValue({ address: validAddress });
    mockFreighter.getNetworkDetails.mockResolvedValue({
      network: "TESTNET",
      networkPassphrase: "Test SDF Network ; September 2015",
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StellarWalletProvider>{children}</StellarWalletProvider>
    );

    const { result } = renderHook(() => useStellarWallet(), { wrapper });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.publicKey).toBe(validAddress);
    });

    // Verify requestAccess was NEVER called (no popup prompted)
    expect(mockFreighter.requestAccess).not.toHaveBeenCalled();
  });

  it("remains disconnected when site is not authorized (isAllowed: false)", async () => {
    mockFreighter.isConnected.mockResolvedValue({ isConnected: true });
    mockFreighter.isAllowed.mockResolvedValue({ isAllowed: false });
    mockFreighter.getAddress.mockResolvedValue({ address: "" });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StellarWalletProvider>{children}</StellarWalletProvider>
    );

    const { result } = renderHook(() => useStellarWallet(), { wrapper });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
      expect(result.current.publicKey).toBeNull();
    });

    expect(mockFreighter.requestAccess).not.toHaveBeenCalled();
  });

  it("remains disconnected when Freighter is not installed", async () => {
    mockFreighter.isConnected.mockResolvedValue({ isConnected: false });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StellarWalletProvider>{children}</StellarWalletProvider>
    );

    const { result } = renderHook(() => useStellarWallet(), { wrapper });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
      expect(result.current.publicKey).toBeNull();
    });

    expect(mockFreighter.isAllowed).not.toHaveBeenCalled();
  });
});
