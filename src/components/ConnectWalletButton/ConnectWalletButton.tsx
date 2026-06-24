"use client";
import { useErrorHandler } from "@/context/ErrorContext";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { Button, Flex, Text, Tooltip } from "@chakra-ui/react";
import { useState } from "react";

const ACCENT = "#4AE292";

/** Truncate a Stellar public key to "GABC…WXYZ" format. */
function truncateKey(key: string): string {
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

/**
 * ConnectWalletButton
 *
 * - Unconnected: shows "Connect Freighter" CTA.
 * - Connected: shows a condensed address badge with a "Disconnect" action.
 * Clicking the address badge copies the full key to the clipboard.
 */
export default function ConnectWalletButton() {
  const { connect, disconnect, publicKey, isConnected } = useStellarWallet();
  const toast = useErrorHandler();
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connect();
      toast.success("Wallet connected", "Freighter is now linked to SmartDrop");
    } catch (error) {
      toast.handleError(error, "Wallet Connection");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCopy = async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available — silent fail */
    }
  };

  if (isConnected && publicKey) {
    return (
      <Flex
        align="center"
        gap={2}
        position="fixed"
        bottom="20px"
        right="20px"
        bg="#1a1a1a"
        border="1px solid #333"
        borderRadius="3xl"
        px={4}
        py={2}
      >
        <Tooltip
          label={copied ? "Copied!" : publicKey}
          hasArrow
          bg="#222"
          color="#fff"
          fontSize="xs"
        >
          <Text
            fontSize="sm"
            fontFamily="mono"
            color={ACCENT}
            cursor="pointer"
            onClick={() => void handleCopy()}
            _hover={{ opacity: 0.8 }}
            userSelect="none"
          >
            {truncateKey(publicKey)}
          </Text>
        </Tooltip>
        <Text color="#555" fontSize="xs">|</Text>
        <Text
          fontSize="xs"
          color="#A2A2A2"
          cursor="pointer"
          _hover={{ color: "#fff" }}
          onClick={disconnect}
          userSelect="none"
        >
          Disconnect
        </Text>
      </Flex>
    );
  }

  return (
    <Button
      bgColor={ACCENT}
      color="#000"
      borderRadius="3xl"
      position="fixed"
      bottom="20px"
      right="20px"
      px={6}
      py={4}
      fontWeight="bold"
      onClick={() => void handleConnect()}
      isLoading={isConnecting}
      loadingText="Connecting…"
      _hover={{ opacity: 0.9 }}
    >
      Connect Freighter
    </Button>
  );
}
