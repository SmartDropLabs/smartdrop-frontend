"use client";

import { stellarNetwork } from "@/config";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { Alert, AlertIcon, Text } from "@chakra-ui/react";

/** Matches the navbar height in globals.css (--navbar-height). */
const NAVBAR_HEIGHT = "var(--navbar-height, 80px)";

export default function NetworkMismatchBanner() {
  const { isNetworkMismatch, networkName } = useStellarWallet();

  if (!isNetworkMismatch || !networkName) return null;

  return (
    <Alert
      status="warning"
      position="sticky"
      top={{ base: "auto", md: NAVBAR_HEIGHT }}
      zIndex={10}
      borderRadius={0}
      justifyContent="center"
      color="app.text"
      role="alert"
      aria-label={`Network mismatch: Freighter is set to ${networkName}. Switch to ${stellarNetwork} to use SmartDrop.`}
    >
      <AlertIcon />
      Freighter is set to{" "}
      <Text as="strong" mx={1}>{networkName}</Text>.
      Switch to{" "}
      <Text as="strong" mx={1}>{stellarNetwork}</Text>
      {" "}to use SmartDrop.
    </Alert>
  );
}
