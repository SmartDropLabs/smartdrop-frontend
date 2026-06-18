"use client";
import { Button } from "@chakra-ui/react";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useErrorHandler } from "@/context/ErrorContext";
import { useState } from "react";

export default function ConnectWalletButton() {
  const { connect } = useStellarWallet();
  const toast = useErrorHandler();
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await connect();
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
