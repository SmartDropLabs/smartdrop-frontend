"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FreighterError } from "@/lib/error-handler";

type StellarWalletContextValue = {
  publicKey: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const StellarWalletContext = createContext<StellarWalletContextValue | null>(
  null
);

export function StellarWalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);

  const connect = useCallback(async () => {
    const freighter = await import("@stellar/freighter-api");
    
    try {
      const connected = await freighter.isConnected();
      if (!connected.isConnected || connected.error) {
        throw new FreighterError(
          "FREIGHTER_NOT_INSTALLED",
          "Freighter wallet not detected. Install it from https://www.freighter.app"
        );
      }

      const allowed = await freighter.isAllowed();
      if (!allowed.isAllowed || allowed.error) {
        const access = await freighter.requestAccess();
        if (access.error) {
          throw new FreighterError(
            "FREIGHTER_REJECTED",
            access.error || "Wallet connection was rejected"
          );
        }
        if (!access.address) {
          throw new FreighterError(
            "FREIGHTER_REJECTED",
            "Failed to get wallet address"
          );
        }
        setPublicKey(access.address);
        return;
      }

      const addr = await freighter.getAddress();
      if (addr.error) {
        throw new FreighterError(
          "FREIGHTER_UNKNOWN",
          addr.error || "Failed to get wallet address"
        );
      }
      if (!addr.address) {
        const access = await freighter.requestAccess();
        if (access.error) {
          throw new FreighterError(
            "FREIGHTER_REJECTED",
            access.error || "Wallet connection was rejected"
          );
        }
        if (!access.address) {
          throw new FreighterError(
            "FREIGHTER_REJECTED",
            "Failed to get wallet address"
          );
        }
        setPublicKey(access.address);
      } else {
        setPublicKey(addr.address);
      }
    } catch (error) {
      // Re-throw FreighterErrors as-is
      if (error instanceof FreighterError) {
        throw error;
      }
      // Wrap other errors
      throw new FreighterError(
        "FREIGHTER_UNKNOWN",
        error instanceof Error ? error.message : "Failed to connect wallet"
      );
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
  }, []);

  const value = useMemo(
    () => ({
      publicKey,
      isConnected: Boolean(publicKey),
      connect,
      disconnect,
    }),
    [publicKey, connect, disconnect]
  );

  return (
    <StellarWalletContext.Provider value={value}>
      {children}
    </StellarWalletContext.Provider>
  );
}

export function useStellarWallet() {
  const ctx = useContext(StellarWalletContext);
  if (!ctx) {
    throw new Error("useStellarWallet must be used within StellarWalletProvider");
  }
  return ctx;
}
