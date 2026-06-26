"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { ErrorProvider } from "@/context/ErrorContext";
import { StellarWalletProvider } from "@/context/StellarWalletContext";
import theme from "@/lib/theme";
import { ChakraProvider, ColorModeScript, localStorageManager } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { type ReactNode, useState } from "react";

function ContextProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const qc = new QueryClient();
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_E2E === 'true') {
      (window as any).__queryClient = qc;
    }
    return qc;
  });

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
