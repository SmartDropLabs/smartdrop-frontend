"use client";
import { useErrorHandler } from "@/context/ErrorContext";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { Button, type ButtonProps } from "@chakra-ui/react";
import { useState } from "react";

type ConnectWalletButtonProps = ButtonProps & {
  label?: string;
};

export default function ConnectWalletButton({
  label = "Connect Freighter",
  ...buttonProps
}: ConnectWalletButtonProps) {
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
      bottom={{ base: "16px", md: "20px" }}
      right={{ base: "16px", md: "20px" }}
      left={{ base: "16px", md: "auto" }}
      w={{ base: "calc(100% - 32px)", md: "auto" }}
      p={4}
      onClick={handleConnect}
      isLoading={isLoading}
      loadingText="Connecting..."
      {...buttonProps}
    >
      {label}
    </Button>
  );
}
