"use client";

import { StellarWalletProvider } from "@/context/StellarWalletContext";
import { ErrorProvider } from "@/context/ErrorContext";
import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import React, { type ReactNode, useState } from "react";

function ContextProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ChakraProvider>
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
