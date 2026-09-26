"use client";

import { keyframes } from "@emotion/react";
import { Box } from "@chakra-ui/react";
import { useIsFetching } from "@tanstack/react-query";

const slide = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
`;

/**
 * A thin bar at the top of the viewport while cached data is being refreshed
 * (#499). Only queries that already hold data count, so first loads (which
 * have their own spinners) don't trigger it; the old data stays on screen and
 * this shows it is being updated. The animation is dropped for users who
 * prefer reduced motion, leaving a static bar.
 */
export default function RefetchIndicator() {
  const refetching =
    useIsFetching({ predicate: (query) => query.state.data !== undefined }) > 0;

  return (
    <Box
      aria-hidden="true"
      position="fixed"
      top={0}
      left={0}
      right={0}
      h="2px"
      zIndex="toast"
      overflow="hidden"
      pointerEvents="none"
      opacity={refetching ? 1 : 0}
      transition="opacity 0.2s ease"
    >
      <Box
        h="100%"
        w="40%"
        bg="app.accent"
        animation={refetching ? `${slide} 1.2s ease-in-out infinite` : undefined}
        sx={{ "@media (prefers-reduced-motion: reduce)": { animation: "none", w: "100%" } }}
      />
    </Box>
  );
}
