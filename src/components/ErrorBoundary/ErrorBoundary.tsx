/**
 * Error Boundary component for catching React component errors.
 * Prevents the entire app from crashing if a component fails.
 *
 * React boundaries only see errors thrown while rendering. Errors from async
 * work and event handlers are routed in via `useErrorBoundary()` (or, for
 * stray promise rejections, `captureUnhandledRejections`) (#536).
 */

"use client";

import { UnknownError, errorLogger } from "@/lib/error-handler";
import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";
import React, { Component, useCallback, useState, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  /**
   * Also show the fallback for unhandled promise rejections anywhere on the
   * page. Use on the app-level boundary only (#536).
   */
  captureUnhandledRejections?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidMount() {
    if (this.props.captureUnhandledRejections && typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
    }
  }

  componentWillUnmount() {
    if (typeof window !== "undefined") {
      window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
    }
  }

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    // Logging is already done by setupGlobalErrorHandlers; here we only
    // surface the failure instead of leaving the UI silently broken.
    this.setState({ hasError: true, error: toError(event.reason) });
  };

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const boundaryError = new UnknownError(
      "A component encountered an error",
      error,
    );

    errorLogger.log(boundaryError, `React Error Boundary: ${errorInfo.componentStack}`);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(error!, this.retry);
      }

      // Default fallback UI
      return (
        <Box
          w="100%"
          minH="100vh"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="app.bg"
          color="app.text"
          p={4}
        >
          <VStack spacing={6} textAlign="center">
            <Heading size="lg">Something went wrong</Heading>
            <Text color="app.muted" maxW="md">
              We encountered an unexpected error. Please try again.
            </Text>
            {process.env.NODE_ENV === "development" && (
              <Box
                bg="app.surface"
                border="1px solid"
                borderColor="app.border"
                p={4}
                borderRadius="card"
                w="100%"
                maxW="md"
                textAlign="left"
                fontSize="sm"
                fontFamily="mono"
                overflowX="auto"
              >
                <Text color="app.errorFg" fontWeight="bold" mb={2}>
                  {error?.name}: {error?.message}
                </Text>
                <Text color="app.muted" whiteSpace="pre-wrap" fontSize="xs">
                  {error?.stack}
                </Text>
              </Box>
            )}
            <Button
              onClick={this.retry}
              bg="app.accent"
              color="app.onAccent"
              _hover={{ opacity: 0.9 }}
              size="lg"
              borderRadius="full"
            >
              Try Again
            </Button>
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component that wraps a specific region with error boundary.
 * Useful for isolating errors to specific parts of the app.
 */
export function ErrorBoundarySection({
  children,
  sectionName,
  fallback,
}: {
  children: ReactNode;
  sectionName?: string;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}) {
  return (
    <ErrorBoundary
      fallback={
        fallback ||
        ((error, retry) => (
          <Box
            w="100%"
            p={6}
            borderRadius="card"
            border="1px solid"
            borderColor="app.errorFg"
            bg="app.errorBg"
            color="app.errorFg"
            textAlign="center"
          >
            <Heading size="sm" mb={2}>
              {sectionName} Error
            </Heading>
            <Text mb={4}>Failed to load {sectionName}. Please try again.</Text>
            <Button
              onClick={retry}
              size="sm"
              variant="outline"
              borderColor="app.errorFg"
              color="app.errorFg"
              _hover={{ bg: "app.errorFg", color: "app.onAccent" }}
            >
              Retry
            </Button>
          </Box>
        ))
      }
    >
      {children}
    </ErrorBoundary>
  );
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * Route errors from async code and event handlers to the nearest
 * `ErrorBoundary`, which can't see them on its own (#536).
 *
 * ```tsx
 * const { showBoundary } = useErrorBoundary();
 * const onClick = () => claim().catch(showBoundary);
 * ```
 */
export function useErrorBoundary(): { showBoundary: (error: unknown) => void } {
  const [error, setError] = useState<Error | null>(null);
  // Re-throwing during render is what lets the boundary catch it.
  if (error) throw error;
  const showBoundary = useCallback((e: unknown) => setError(toError(e)), []);
  return { showBoundary };
}
