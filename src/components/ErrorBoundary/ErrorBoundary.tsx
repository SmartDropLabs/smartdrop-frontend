/**
 * Error Boundary component for catching React component errors.
 * Prevents the entire app from crashing if a component fails.
 */

"use client";

import { UnknownError, errorLogger } from "@/lib/error-handler";
import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";
import React, { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
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
