"use client";

import { useRpcHealth } from "@/hooks/useSorobanQuery";
import { Alert, AlertIcon } from "@chakra-ui/react";

// Issue #248: when the Soroban RPC is down, every page independently shows
// its own query error instead of one unified, immediate signal. A single
// global banner is a clearer, faster way for a user to understand "this is
// a whole-app connectivity issue," not something wrong with one page.
export default function RpcUnreachableBanner() {
  const { isUnreachable } = useRpcHealth();

  if (!isUnreachable) return null;

  return (
    <Alert
      status="error"
      position="sticky"
      top={{ base: "auto", md: "80px" }}
      zIndex={10}
      borderRadius={0}
      justifyContent="center"
      bg="app.errorBg"
      color="app.errorFg"
    >
      <AlertIcon color="app.errorFg" />
      Unable to reach the Stellar network. Some data may be unavailable
      until the connection is restored.
    </Alert>
  );
}
