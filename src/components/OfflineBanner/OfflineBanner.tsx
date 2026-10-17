"use client";

import { Alert, AlertIcon } from "@chakra-ui/react";
import { memo, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

const getOnline = () => navigator.onLine;
// Assume online during SSR so the banner never flashes on hydration.
const getServerOnline = () => true;

/** Tracks `navigator.onLine` via the browser's online/offline events. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getOnline, getServerOnline);
}

// Issue #528: tell the user plainly when the device is offline, instead of
// leaving every query to fail with its own error.
function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <Alert
      status="warning"
      role="status"
      position="sticky"
      top={{ base: "auto", md: "80px" }}
      zIndex={10}
      borderRadius={0}
      justifyContent="center"
    >
      <AlertIcon />
      You&apos;re offline. Showing cached pages — live balances and transactions
      will resume when your connection returns.
    </Alert>
  );
}

// Memoized: AppShell re-renders on every wallet / own-CTA change, and this
// component doesn't depend on either.
export default memo(OfflineBanner);
