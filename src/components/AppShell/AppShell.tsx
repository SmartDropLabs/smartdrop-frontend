"use client";

import ConnectWalletButton from "@/components/ConnectWalletButton/ConnectWalletButton";
import Footer from "@/components/Footer/Footer";
import Navbar from "@/components/Navbar/Navbar";
import NetworkMismatchBanner from "@/components/NetworkMismatchBanner/NetworkMismatchBanner";
import ContextProvider from "@/context";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { Box } from "@chakra-ui/react";
import { usePathname } from "next/navigation";

// These routes already render their own inline ConnectWalletButton in an
// empty/disconnected state, so the floating global one would be a duplicate.
const ROUTES_WITH_OWN_CONNECT_BUTTON = ["/history"];

function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isConnected } = useStellarWallet();
  const pathname = usePathname();
  const hasOwnConnectButton = ROUTES_WITH_OWN_CONNECT_BUTTON.includes(pathname);

  return (
    <Box
      display="flex"
      flexDirection="column"
      minH="100vh"
      bg="app.bg"
      color="app.text"
    >
      <Navbar />
      <NetworkMismatchBanner />
      {isConnected ? (
        <>
          <Box as="main" flex={1}>{children}</Box>
          <Footer />
        </>
      ) : (
        <>
          <Box as="main" flex={1} pb={{ base: hasOwnConnectButton ? 0 : "88px", md: 0 }}>{children}</Box>
          {!hasOwnConnectButton && <ConnectWalletButton />}
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
