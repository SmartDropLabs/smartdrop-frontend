"use client";
import { useErrorHandler } from "@/context/ErrorContext";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { Button } from "@chakra-ui/react";
import { useState } from "react";

export default function ConnectWalletButton() {
  const { connect } = useStellarWallet();
  const toast = useErrorHandler();
  const [isLoading, setIsLoading] = useState(false);

  const CONNECT_TIMEOUT_MS = 30_000;

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Connection timed out. Please try again.")),
          CONNECT_TIMEOUT_MS,
        ),
      );
      await Promise.race([connect(), timeout]);
      toast.success("Wallet Connected", "Your wallet has been connected successfully");
    } catch (error) {
      toast.handleError(error, "Wallet Connection");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      bgColor="#4AE292"
      color="#000"
      borderRadius="3xl"
      position="fixed"
      bottom="20px"
      right="20px"
      p={4}
      onClick={handleConnect}
      isLoading={isLoading}
      loadingText="Connecting..."
    >
      Connect Freighter
    </Button>
  );
}
