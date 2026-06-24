"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { ErrorProvider } from "@/context/ErrorContext";
import { StellarWalletProvider } from "@/context/StellarWalletContext";
import theme from "@/lib/theme";
import { ChakraProvider, ColorModeScript, localStorageManager } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { type ReactNode, useState } from "react";

function ContextProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} storageKey="chakra-ui-color-mode" />
      <ChakraProvider theme={theme} colorModeManager={localStorageManager}>
        <ErrorBoundary>
          <ErrorProvider>
            <QueryClientProvider client={queryClient}>
              <StellarWalletProvider>{children}</StellarWalletProvider>
            </QueryClientProvider>
          </ErrorProvider>
        </ErrorBoundary>
      </ChakraProvider>
    </>
  );
}

export default ContextProvider;
