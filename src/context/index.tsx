"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { ErrorProvider } from "@/context/ErrorContext";
import { StellarWalletProvider } from "@/context/StellarWalletContext";
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
    <ErrorBoundary>
      <ErrorProvider>
        <QueryClientProvider client={queryClient}>
          <StellarWalletProvider>{children}</StellarWalletProvider>
        </QueryClientProvider>
      </ErrorProvider>
    </ErrorBoundary>
  );
}

export default ContextProvider;
