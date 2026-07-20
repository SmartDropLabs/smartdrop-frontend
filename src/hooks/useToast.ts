/**
 * Hook for displaying errors and other notifications to the user.
 * Uses Chakra UI toast for consistent, accessible notifications.
 */

"use client";

import {
    type RetryConfig,
    errorLogger,
    normalizeError,
    withRetry
} from "@/lib/error-handler";
import { useToast as useChakraToast } from "@chakra-ui/react";
import { useCallback } from "react";

export type NotificationType = "success" | "error" | "info" | "warning";

interface ToastOptions {
  duration?: number;
  isClosable?: boolean;
  position?: "top" | "top-right" | "top-left" | "bottom" | "bottom-right" | "bottom-left";
}

const DEFAULT_TOAST_OPTIONS: ToastOptions = {
  duration: 5000,
  isClosable: true,
  position: "bottom-right",
};

export function useToast() {
  const chakraToast = useChakraToast();

  /**
   * Show a success notification.
   */
  const success = useCallback(
    (title: string, description?: string, options: ToastOptions = {}) => {
      chakraToast({
        title,
        description,
        status: "success",
        ...DEFAULT_TOAST_OPTIONS,
        ...options,
      });
    },
    [chakraToast]
  );

  /**
   * Show an error notification.
   */
  const error = useCallback(
    (title: string, description?: string, options: ToastOptions = {}) => {
      chakraToast({
        title,
        description,
        status: "error",
        ...DEFAULT_TOAST_OPTIONS,
        ...options,
      });
    },
    [chakraToast]
  );

  /**
   * Show an info notification.
   */
  const info = useCallback(
    (title: string, description?: string, options: ToastOptions = {}) => {
      chakraToast({
        title,
        description,
        status: "info",
        ...DEFAULT_TOAST_OPTIONS,
        ...options,
      });
    },
    [chakraToast]
  );

  /**
   * Show a warning notification.
   */
  const warning = useCallback(
    (title: string, description?: string, options: ToastOptions = {}) => {
      chakraToast({
        title,
        description,
        status: "warning",
        ...DEFAULT_TOAST_OPTIONS,
        ...options,
      });
    },
    [chakraToast]
  );

  /**
   * Handle and display an error to the user.
   * Automatically logs the error and shows a user-friendly message.
   */
  const handleError = useCallback(
    (error: unknown, context?: string) => {
      const normalized = normalizeError(error, context);
      errorLogger.log(normalized, context);

      // Show user-friendly message
      chakraToast({
        title: "Error",
        description: normalized.userMessage,
        status: "error",
        ...DEFAULT_TOAST_OPTIONS,
        duration: 6000, // Slightly longer for errors
      });

      return normalized;
    },
    [chakraToast]
  );

  /**
   * Execute a function with automatic error handling and success notification.
   * Shows a loading toast while executing.
   */
  const withErrorHandling = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      options: {
        loadingMessage?: string;
        successMessage?: string;
        errorContext?: string;
        toastOptions?: ToastOptions;
        retryConfig?: Partial<RetryConfig>;
      } = {}
    ): Promise<T | null> => {
      const {
        loadingMessage,
        successMessage,
        errorContext,
        toastOptions = {},
        retryConfig,
      } = options;

      const toastId = loadingMessage
        ? chakraToast({
            title: loadingMessage,
            status: "info",
            duration: null, // Don't auto-close while loading
            isClosable: false,
            ...DEFAULT_TOAST_OPTIONS,
            ...toastOptions,
          })
        : null;

      try {
        // Execute with retry if configured
        const result = retryConfig
          ? await withRetry(fn, retryConfig)
          : await fn();

        // Close loading toast if it exists
        if (toastId) chakraToast.close(toastId);

        // Show success notification
        if (successMessage) {
          chakraToast({
            title: "Success",
            description: successMessage,
            status: "success",
            ...DEFAULT_TOAST_OPTIONS,
            ...toastOptions,
          });
        }

        return result;
      } catch (err) {
        // Close loading toast if it exists
        if (toastId) chakraToast.close(toastId);

        // Handle and display error
        handleError(err, errorContext);
        return null;
      }
    },
    [chakraToast, handleError]
  );

  return {
    success,
    error,
    info,
    warning,
    handleError,
    withErrorHandling,
  };
}

export type UseToastReturn = ReturnType<typeof useToast>;
