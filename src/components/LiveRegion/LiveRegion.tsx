"use client";

import { useEffect, useRef, useState } from "react";
import { VisuallyHidden } from "@chakra-ui/react";

type LiveRegionProps = {
  message: string;
  politeness?: "polite" | "assertive";
};

/**
 * Visually-hidden aria-live region for announcing dynamic content changes
 * (table refresh, sort, pagination, search results) to assistive tech.
 * `role="status"` gives older screen readers a fallback announcement path
 * on top of aria-live for browsers/AT that don't watch it directly.
 */
export default function LiveRegion({
  message,
  politeness = "polite",
}: LiveRegionProps) {
  return (
    <VisuallyHidden aria-live={politeness} aria-atomic="true" role="status">
      {message}
    </VisuallyHidden>
  );
}

/**
 * Hook that announces messages via a shared live region. Use this to
 * announce dynamic updates (filter changes, sort, data refresh, action
 * results) so screen readers receive frequent, meaningful feedback (#597).
 *
 * @returns announce function — call with a message to announce it.
 */
export function useAnnounce() {
  const [message, setMessage] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const announce = (msg: string, politeness: "polite" | "assertive" = "polite") => {
    // Clear then set to force re-announcement of identical messages.
    setMessage("");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setMessage(msg), 50);

    // Expose politeness via data attribute for the LiveRegion consumer.
    return politeness;
  };

  return { message, announce };
}
