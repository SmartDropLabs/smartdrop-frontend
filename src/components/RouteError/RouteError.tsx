"use client";

import { useEffect } from "react";
import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";
import { UnknownError, errorLogger } from "@/lib/error-handler";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  routeName: string;
}

/**
 * Fallback rendered by a route's `error.tsx` (#497). Because it replaces only
 * that route's content, a crash in one page leaves the navbar, footer and the
 * rest of the app usable instead of showing an app-wide error page.
 */
export default function RouteError({ error, reset, routeName }: RouteErrorProps) {
  useEffect(() => {
    errorLogger.log(
      new UnknownError(`The ${routeName} page encountered an error`, error),
      `Route error boundary: ${routeName}`,
    );
  }, [error, routeName]);

  return (
    <Box
      w="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
      py={16}
      color="app.text"
    >
      <VStack spacing={5} textAlign="center" maxW="md">
        <Heading size="lg">Something went wrong</Heading>
        <Text color="app.muted">
          The {routeName} page ran into an unexpected error. The rest of the app
          is still available.
        </Text>
        <Button onClick={reset} bg="app.accent" color="app.onAccent" _hover={{ opacity: 0.9 }}>
          Try again
        </Button>
      </VStack>
    </Box>
  );
}
