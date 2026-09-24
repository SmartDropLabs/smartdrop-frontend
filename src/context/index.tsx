"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { ErrorProvider } from "@/context/ErrorContext";
import { StellarWalletProvider } from "@/context/StellarWalletContext";
import theme from "@/lib/theme";
import { ChakraProvider, localStorageManager } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { type ReactNode, useEffect, useState } from "react";

import { createE2ESeedApi, type E2ESeedApi } from "@/lib/e2eSeed";

declare global {
  interface Window {
    /**
     * Seeding surface for the end-to-end specs. Exposed in development and when
     * NEXT_PUBLIC_E2E is set, and deliberately not the raw QueryClient: the specs
     * ask for the state they want instead of spelling out query keys, so renaming
     * a key cannot break a test in a file that has nothing to do with it.
     */
    __e2e?: E2ESeedApi;
  }
}

function ContextProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    return new QueryClient();
  });

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      (process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_E2E === 'true')
    ) {
      window.__e2e = createE2ESeedApi(queryClient);
    }
  }, [queryClient]);

  return (
    <ChakraProvider theme={theme} colorModeManager={localStorageManager}>
      <ErrorBoundary>
        <ErrorProvider>
          <QueryClientProvider client={queryClient}>
            <StellarWalletProvider>{children}</StellarWalletProvider>
          </QueryClientProvider>
        </ErrorProvider>
      </ErrorBoundary>
    </ChakraProvider>
  );
}

export default ContextProvider;
