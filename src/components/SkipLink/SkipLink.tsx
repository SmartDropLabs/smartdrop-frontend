"use client";

import { Link } from "@chakra-ui/react";
import { memo } from "react";

export const MAIN_CONTENT_ID = "main-content";

/**
 * First focusable element on every page (#575). Visually hidden until it
 * receives keyboard focus, then jumps past the navbar and banners to <main>.
 *
 * Following the hash only scrolls in some browsers; it doesn't reliably move
 * keyboard focus, so the next Tab would land back in the navbar. Focus the
 * target explicitly (it has tabIndex={-1}) so the skip actually takes effect.
 */
function SkipLink() {
  return (
    <Link
      href={`#${MAIN_CONTENT_ID}`}
      onClick={(e) => {
        const target = document.getElementById(MAIN_CONTENT_ID);
        if (!target) return;
        e.preventDefault();
        // focus() also scrolls the target into view.
        target.focus();
      }}
      position="absolute"
      top={2}
      left={2}
      zIndex="skipLink"
      px={4}
      py={2}
      borderRadius="md"
      bg="app.accent"
      color="app.onAccent"
      fontWeight="semibold"
      transform="translateY(-200%)"
      _focus={{ transform: "translateY(0)" }}
      _focusVisible={{ transform: "translateY(0)", outline: "2px solid", outlineOffset: "2px" }}
    >
      Skip to main content
    </Link>
  );
}

// Memoized: AppShell re-renders on every wallet / own-CTA change, and this
// component doesn't depend on either.
export default memo(SkipLink);
