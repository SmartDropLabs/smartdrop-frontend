"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Box, Flex, Progress, Spinner, Text, type BoxProps } from "@chakra-ui/react";

/** After this long the loader says so, so a slow load isn't read as stuck (#783). */
const SLOW_LOAD_MS = 5000;

/**
 * Indeterminate top-of-page progress bar shown with every loading variant,
 * plus a "still loading" note once the load runs past SLOW_LOAD_MS (#783).
 * The real duration isn't knowable for a Suspense fallback, so the bar is
 * indeterminate rather than a fake percentage.
 */
function LoadingProgress() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Progress
        size="xs"
        isIndeterminate
        colorScheme="green"
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex="banner"
        aria-label="Loading page"
      />
      {slow && (
        <Text
          role="status"
          color="app.muted"
          fontSize="sm"
          textAlign="center"
          position="fixed"
          top={2}
          left={0}
          right={0}
          zIndex="banner"
        >
          Still loading — this is taking longer than usual.
        </Text>
      )}
    </>
  );
}

function SkeletonBar({
  w = "100%",
  h = "16px",
  delay = 0,
}: {
  w?: string | { base: string; md: string };
  h?: string;
  delay?: number;
}) {
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

  let skeleton = <DefaultLoading />;
  if (pathname?.startsWith("/farm")) skeleton = <FarmSkeleton />;
  else if (pathname?.startsWith("/leaderboard")) skeleton = <LeaderboardSkeleton />;

  return (
    <>
      <LoadingProgress />
      {skeleton}
    </>
  );
}
