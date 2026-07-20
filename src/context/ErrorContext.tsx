/**
 * Error context and provider for app-wide error handling.
 * Provides access to the error handler and sets up global error listeners.
 */

"use client";

import { useToast, type UseToastReturn } from "@/hooks/useToast";
import { setupGlobalErrorHandlers } from "@/lib/error-handler";
import {
    createContext,
    useContext,
    useEffect,
    type ReactNode,
} from "react";

interface ErrorContextValue {
  toast: UseToastReturn;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const toast = useToast();

  useEffect(() => {
    // Set up global error handlers
    const cleanup = setupGlobalErrorHandlers();

    // Cleanup on unmount
    return cleanup;
  }, []);

  return (
    <ErrorContext.Provider value={{ toast }}>
      {children}
    </ErrorContext.Provider>
  );
}

/**
 * Hook to access the error handler from anywhere in the app.
 */
export function useErrorHandler() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error("useErrorHandler must be used within ErrorProvider");
  }
  return context.toast;
}
