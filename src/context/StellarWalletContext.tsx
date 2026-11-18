"use client";

import { stellarNetwork } from "@/config";
import { useErrorHandler } from "@/context/ErrorContext";
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

type StellarWalletActions = Pick<StellarWalletContextValue, "connect" | "disconnect">;

const StellarWalletContext = createContext<StellarWalletContextValue | null>(
  null
);

// connect/disconnect are stable callbacks, so components that only trigger
// wallet actions read them from this context and skip the re-render that
// every publicKey / networkName change causes for StellarWalletContext.
const StellarWalletActionsContext = createContext<StellarWalletActions | null>(
  null
);

export const FREIGHTER_CONNECT_TIMEOUT_MS = 15_000;

/** How often Freighter is polled for external wallet changes (#539). */
export const WALLET_WATCH_INTERVAL_MS = 3_000;

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

function createFreighterTimeoutError() {
  return new FreighterError(
    "FREIGHTER_TIMEOUT",
    "Freighter did not respond before the wallet connection timeout",
  );
}

async function withFreighterConnectTimeout<T>(
  promise: Promise<T>,
  deadlineMs: number,
): Promise<T> {
  const remainingMs = deadlineMs - Date.now();
  if (remainingMs <= 0) {
    throw createFreighterTimeoutError();
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(createFreighterTimeoutError()), remainingMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** How often to re-read Freighter's network while it is mismatched (#512). */
export const NETWORK_MISMATCH_POLL_MS = 3_000;

export function StellarWalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletApi, setWalletApi] = useState<FreighterWalletApi | null>(null);
  const [networkName, setNetworkName] = useState<string | null>(null);
  const toast = useErrorHandler();

  const refreshNetworkDetails = useCallback(
    async (freighterModule?: FreighterModule, deadlineMs?: number) => {
      try {
        const freighter =
          freighterModule ?? (await import("@stellar/freighter-api"));
        const details =
          deadlineMs === undefined
            ? await freighter.getNetworkDetails()
            : await withFreighterConnectTimeout(
                freighter.getNetworkDetails(),
                deadlineMs,
              );
        if (details.error) {
          setNetworkName(null);
          return;
        }
        setNetworkName(getFreighterNetworkName(details));
      } catch (error) {
        setNetworkName(null);
        if (
          error instanceof FreighterError &&
          error.code === "FREIGHTER_TIMEOUT"
        ) {
          throw error;
        }
      }
    },
    [],
  );

  const connect = useCallback(async () => {
    const freighter = await import("@stellar/freighter-api");
    const signingApi = freighter as unknown as FreighterWalletApi;
    
    try {
      const deadlineMs = Date.now() + FREIGHTER_CONNECT_TIMEOUT_MS;
      const connected = await withFreighterConnectTimeout(
        freighter.isConnected(),
        deadlineMs,
      );
      if (!connected.isConnected || connected.error) {
        throw new FreighterError(
          "FREIGHTER_NOT_INSTALLED",
          "Freighter wallet not detected. Install it from https://www.freighter.app"
        );
      }

      const allowed = await withFreighterConnectTimeout(
        freighter.isAllowed(),
        deadlineMs,
      );
      if (!allowed.isAllowed || allowed.error) {
        const access = await withFreighterConnectTimeout(
          freighter.requestAccess(),
          deadlineMs,
        );
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
        await refreshNetworkDetails(freighter, deadlineMs);
        setPublicKey(access.address);
        setWalletApi(signingApi);
        return;
      }

      const addr = await withFreighterConnectTimeout(
        freighter.getAddress(),
        deadlineMs,
      );
      if (addr.error) {
        throw new FreighterError(
          "FREIGHTER_UNKNOWN",
          addr.error || "Failed to get wallet address"
        );
      }
      if (!addr.address) {
        const access = await withFreighterConnectTimeout(
          freighter.requestAccess(),
          deadlineMs,
        );
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
        await refreshNetworkDetails(freighter, deadlineMs);
        setPublicKey(access.address);
        setWalletApi(signingApi);
      } else {
        await refreshNetworkDetails(freighter, deadlineMs);
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

  // Issue #226: disconnect() itself stays silent — it's also called for an
  // explicit, user-initiated "Disconnect" click, which needs no toast. Use
  // this instead at every internal call site where the wallet drops out
  // from under the user without them asking (extension locked/removed,
  // access revoked, network unreachable), so they aren't left interacting
  // with a UI that silently stopped being connected.
  const { warning: toastWarning } = toast;
  const disconnectUnexpectedly = useCallback(() => {
    disconnect();
    toastWarning(
      "Wallet disconnected",
      "Freighter is no longer connected. Reconnect to continue.",
    );
  }, [disconnect, toastWarning]);

  // Periodic health check for Freighter extension (#222)
  useEffect(() => {
    if (!publicKey) return undefined;

    const checkFreighterHealth = async () => {
      try {
        const freighter = await import("@stellar/freighter-api");
        const connected = await freighter.isConnected();
        
        // If extension is no longer available, disconnect gracefully
        if (!connected.isConnected || connected.error) {
          disconnectUnexpectedly();
          return;
        }

        // Verify we can still get the address
        const addr = await freighter.getAddress();
        if (addr.error || !addr.address) {
          disconnectUnexpectedly();
          return;
        }

        // If address changed, update it
        if (addr.address !== publicKey) {
          setPublicKey(addr.address);
        }
      } catch {
        // Extension error or removal - disconnect
        disconnectUnexpectedly();
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkFreighterHealth, 30000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- disconnectUnexpectedly's own behavior never changes (it only closes over the stable disconnect/toastWarning), so omitting it here avoids re-subscribing this effect on every render.
  }, [publicKey, disconnect]);

  // NOTE: this listener does not fire when a user opens the Freighter
  // extension popup while this tab stays visible — extension popups are a
  // separate top-level browsing context, not an overlay that hides the
  // page, so document.visibilityState never changes. That means the most
  // common way users actually switch Freighter's network (click the
  // extension icon, change network, close the popup) doesn't trigger this
  // refresh at all. That's a separate, likely more impactful gap (missing
  // trigger, not unreliable timing) — tracked as a follow-up, out of scope
  // for the timeout fix below. See #140.
  useEffect(() => {
    if (!publicKey) return undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const deadlineMs = Date.now() + FREIGHTER_CONNECT_TIMEOUT_MS;

        // Refresh network details (existing behavior)
        void refreshNetworkDetails(undefined, deadlineMs).catch(() => {});

        // Detect Freighter account switch (#67): re-read the active address
        // and compare against the publicKey we're currently using. If the
        // user switched accounts inside the extension while this tab was
        // backgrounded, update publicKey so the UI stays in sync.
        void (async () => {
          try {
            const freighter = await import("@stellar/freighter-api");
            const addr = await withFreighterConnectTimeout(
              freighter.getAddress(),
              deadlineMs,
            );
            if (addr.error || !addr.address) {
              // Extension revoked access or became unreachable — disconnect
              // so the UI doesn't show stale state.
              disconnectUnexpectedly();
              return;
            }
            if (addr.address !== publicKey) {
              setPublicKey(addr.address);
            }
          } catch {
            // Timeout or extension error — leave state as-is, will retry
            // on next visibility change.
          }
        })();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see the health-check effect above for why disconnectUnexpectedly is intentionally omitted.
  }, [publicKey, refreshNetworkDetails, disconnect]);

  // Live wallet-change watcher (#539). The health check and visibilitychange
  // listener above only notice external changes lazily (up to 30s, or on the
  // next tab switch) and never when the Freighter popup is used while this
  // tab stays visible (#140). Freighter's WatchWalletChanges polls the
  // extension and reports lock / revoked site access (empty address), account
  // switches and network switches, so the UI updates within seconds.
  useEffect(() => {
    if (!publicKey) return undefined;

    let cancelled = false;
    let watcher: { stop(): void } | null = null;

    void (async () => {
      try {
        const freighter = await import("@stellar/freighter-api");
        if (cancelled || typeof freighter.WatchWalletChanges !== "function") return;

        const w = new freighter.WatchWalletChanges(WALLET_WATCH_INTERVAL_MS);
        watcher = w;
        w.watch(({ address, network, error }) => {
          // A failed read is not proof of disconnect; the health check above
          // handles a genuinely unreachable extension.
          if (error) return;
          if (!address) {
            disconnectUnexpectedly();
            return;
          }
          if (address !== publicKey) setPublicKey(address);
          if (network && network !== networkName) {
            void refreshNetworkDetails(
              undefined,
              Date.now() + FREIGHTER_CONNECT_TIMEOUT_MS,
            ).catch(() => {});
          }
        });
      } catch {
        // Watcher unavailable — the interval/visibility checks still apply.
      }
    })();

    return () => {
      cancelled = true;
      watcher?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see the health-check effect above for why disconnectUnexpectedly is intentionally omitted.
  }, [publicKey, networkName, refreshNetworkDetails, disconnect]);

  const isNetworkMismatch = Boolean(
    networkName && networkName !== stellarNetwork,
  );

  // Switching networks inside the Freighter popup fires no page event —
  // the tab never goes hidden, so the visibilitychange refresh above doesn't
  // run and the mismatch banner stayed up until a reload (#512). While the
  // network is mismatched, poll Freighter and re-check on window focus so the
  // banner clears as soon as the user switches.
  useEffect(() => {
    if (!publicKey || !isNetworkMismatch) return undefined;

    const recheck = () => {
      void refreshNetworkDetails(
        undefined,
        Date.now() + FREIGHTER_CONNECT_TIMEOUT_MS,
      ).catch(() => {});
    };

    const timer = window.setInterval(recheck, NETWORK_MISMATCH_POLL_MS);
    window.addEventListener("focus", recheck);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", recheck);
    };
  }, [publicKey, isNetworkMismatch, refreshNetworkDetails]);

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

  const actions = useMemo(() => ({ connect, disconnect }), [connect, disconnect]);

  return (
    <StellarWalletActionsContext.Provider value={actions}>
      <StellarWalletContext.Provider value={value}>
        {children}
      </StellarWalletContext.Provider>
    </StellarWalletActionsContext.Provider>
  );
}

export function useStellarWallet() {
  const ctx = useContext(StellarWalletContext);
  if (!ctx) {
    throw new Error("useStellarWallet must be used within StellarWalletProvider");
  }
  return ctx;
}

/**
 * Just the wallet actions. Unlike useStellarWallet(), consumers of this hook
 * do not re-render when the connected account or network changes.
 */
export function useStellarWalletActions() {
  const ctx = useContext(StellarWalletActionsContext);
  if (!ctx) {
    throw new Error(
      "useStellarWalletActions must be used within StellarWalletProvider"
    );
  }
  return ctx;
}
