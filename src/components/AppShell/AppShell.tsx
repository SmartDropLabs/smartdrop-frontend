"use client";

import ConnectWalletButton from "@/components/ConnectWalletButton/ConnectWalletButton";
import Footer from "@/components/Footer/Footer";
import Navbar from "@/components/Navbar/Navbar";
import ContextProvider from "@/context";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { Box } from "@chakra-ui/react";

function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isConnected } = useStellarWallet();

  return (
    <Box
      display="flex"
      flexDirection="column"
      minH="100vh"
      bg="app.bg"
      color="app.text"
    >
      <Navbar />
      {isConnected ? (
        <>
          <Box as="main" flex={1}>{children}</Box>
          <Footer />
        </>
      ) : (
        <>
          <Box as="main" flex={1}>{children}</Box>
          <ConnectWalletButton />
        </>
      )}
    </Box>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ContextProvider>
      <LayoutWrapper>{children}</LayoutWrapper>
    </ContextProvider>
  );
}
