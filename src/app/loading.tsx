"use client";

import { usePathname } from "next/navigation";
import { Box, Flex, Spinner, Text } from "@chakra-ui/react";

function SkeletonBar({ w = "100%", h = "16px", delay = 0 }: { w?: string; h?: string; delay?: number }) {
  return (
    <Box
      w={w}
      h={h}
      borderRadius="md"
      bg="app.surface"
      opacity={0.6}
      animation={`pulse 1.5s ease-in-out ${delay}s infinite alternate`}
      sx={{
        "@keyframes pulse": {
          from: { opacity: 0.3 },
          to: { opacity: 0.7 },
        },
      }}
    />
  );
}

function FarmSkeleton() {
  return (
    <Flex direction="column" gap={4} p={5} minH="100vh" bg="app.bg">
      <SkeletonBar w="200px" h="28px" />
      <SkeletonBar w="120px" h="16px" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Flex
          key={i}
          direction={{ base: "column", md: "row" }}
          gap={4}
          border="1px solid"
          borderColor="app.border"
          borderRadius="card"
          bg="app.surface"
          p={5}
          align="center"
        >
          <SkeletonBar w={{ base: "100%", md: "120px" }} h="20px" delay={i * 0.1} />
          <SkeletonBar w={{ base: "100%", md: "80px" }} h="16px" delay={i * 0.1 + 0.05} />
          <SkeletonBar w={{ base: "100%", md: "80px" }} h="16px" delay={i * 0.1 + 0.1} />
          <SkeletonBar w={{ base: "100%", md: "100px" }} h="16px" delay={i * 0.1 + 0.15} />
          <SkeletonBar w={{ base: "100%", md: "140px" }} h="16px" delay={i * 0.1 + 0.2} />
          <SkeletonBar w={{ base: "100%", md: "100px" }} h="36px" delay={i * 0.1 + 0.25} />
        </Flex>
      ))}
    </Flex>
  );
}

function LeaderboardSkeleton() {
  return (
    <Flex direction="column" gap={4} p={5} minH="100vh" bg="app.bg">
      <SkeletonBar w="240px" h="28px" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Flex
          key={i}
          direction="row"
          gap={4}
          border="1px solid"
          borderColor="app.border"
          borderRadius="card"
          bg="app.surface"
          p={4}
          align="center"
        >
          <SkeletonBar w="32px" h="32px" delay={i * 0.08} />
          <SkeletonBar w="160px" h="16px" delay={i * 0.08 + 0.04} />
          <SkeletonBar w="80px" h="16px" delay={i * 0.08 + 0.08} />
        </Flex>
      ))}
    </Flex>
  );
}

function DefaultLoading() {
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

// Next.js App Router special file (issue #242): shown as the Suspense
// fallback for the root segment — the initial app boot, and any route
// transition slow enough to suspend — instead of a blank/unstyled screen
// while the client bundle and providers initialize.
export default function Loading() {
  const pathname = usePathname();

  if (pathname?.startsWith("/farm")) return <FarmSkeleton />;
  if (pathname?.startsWith("/leaderboard")) return <LeaderboardSkeleton />;
  return <DefaultLoading />;
}
