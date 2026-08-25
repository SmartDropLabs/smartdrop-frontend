import { Flex, Spinner, Text } from "@chakra-ui/react";

// Next.js App Router special file (issue #242): shown as the Suspense
// fallback for the root segment — the initial app boot, and any route
// transition slow enough to suspend — instead of a blank/unstyled screen
// while the client bundle and providers initialize.
export default function Loading() {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap={4}
      minH="100vh"
      bg="app.bg"
    >
      <Spinner size="xl" color="app.accent" thickness="3px" />
      <Text color="app.muted" fontSize="sm">
        Loading SmartDrop…
      </Text>
    </Flex>
  );
}
