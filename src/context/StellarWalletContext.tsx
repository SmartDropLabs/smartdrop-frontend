"use client";

import { stellarNetwork } from "@/config";
import { FreighterError } from "@/lib/error-handler";
import type { FreighterWalletApi } from "@/lib/soroban";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

type FreighterModule = typeof import("@stellar/freighter-api");
type FreighterNetworkDetails = Awaited<
  ReturnType<FreighterModule["getNetworkDetails"]>
> & {
  networkDetails?: {
    network?: string;
    networkName?: string;
  };
  networkName?: string;
};

type StellarWalletContextValue = {
  publicKey: string | null;
  walletApi: FreighterWalletApi | null;
  networkName: string | null;
  isNetworkMismatch: boolean;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const StellarWalletContext = createContext<StellarWalletContextValue | null>(
  null
);

function normalizeNetworkName(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === "MAINNET" || normalized.includes("PUBLIC")) return "PUBLIC";
  if (normalized.includes("TEST")) return "TESTNET";
  if (normalized.includes("FUTURE")) return "FUTURENET";
  return normalized;
}

function getFreighterNetworkName(details: FreighterNetworkDetails) {
  return normalizeNetworkName(
    details.network ??
      details.networkDetails?.network ??
      details.networkName ??
      details.networkDetails?.networkName ??
      null,
  );
}

export function StellarWalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletApi, setWalletApi] = useState<FreighterWalletApi | null>(null);
  const [networkName, setNetworkName] = useState<string | null>(null);

  const refreshNetworkDetails = useCallback(
    async (freighterModule?: FreighterModule) => {
      try {
        const freighter =
          freighterModule ?? (await import("@stellar/freighter-api"));
        const details = await freighter.getNetworkDetails();
        if (details.error) {
          setNetworkName(null);
          return;
        }
        setNetworkName(getFreighterNetworkName(details));
      } catch {
        setNetworkName(null);
      }
    },
    [],
  );

  const connect = useCallback(async () => {
    const freighter = await import("@stellar/freighter-api");
    const signingApi = freighter as unknown as FreighterWalletApi;
    
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
        await refreshNetworkDetails(freighter);
        setPublicKey(access.address);
        setWalletApi(signingApi);
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
        await refreshNetworkDetails(freighter);
        setPublicKey(access.address);
        setWalletApi(signingApi);
      } else {
        await refreshNetworkDetails(freighter);
        setPublicKey(addr.address);
        setWalletApi(signingApi);
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
  }, [refreshNetworkDetails]);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setWalletApi(null);
    setNetworkName(null);
  }, []);

  useEffect(() => {
    if (!publicKey) return undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshNetworkDetails();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [publicKey, refreshNetworkDetails]);

  const isNetworkMismatch = Boolean(
    networkName && networkName !== stellarNetwork,
  );

  const value = useMemo(
    () => ({
      publicKey,
      walletApi,
      networkName,
      isNetworkMismatch,
      isConnected: Boolean(publicKey),
      connect,
      disconnect,
    }),
    [publicKey, walletApi, networkName, isNetworkMismatch, connect, disconnect]
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
