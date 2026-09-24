"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { ErrorProvider } from "@/context/ErrorContext";
import { StellarWalletProvider } from "@/context/StellarWalletContext";
import theme from "@/lib/theme";
import { ChakraProvider, localStorageManager } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { type ReactNode, useEffect, useState } from "react";

declare global {
  interface Window {
    __queryClient?: QueryClient;
  }
}

function ContextProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    return new QueryClient();
  });

  useEffect(() => {
    // Expose the QueryClient only in non-production builds. E2E tests run
    // against `next dev` (NODE_ENV=development), so the dev-only guard is
    // sufficient — never expose it in production, even when NEXT_PUBLIC_E2E
    // is set (#471).
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      window.__queryClient = queryClient;
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
