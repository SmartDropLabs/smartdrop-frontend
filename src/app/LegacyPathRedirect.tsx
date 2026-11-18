"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The old `/leaderbord` typo URL (issue #227) used to be a dedicated route,
 * but the misspelled `leaderbord/` directory was removed for consistency
 * (#444). The shared 404 page renders this component to send those requests
 * to `/leaderboard` — works in both server mode and the static export,
 * where middleware and next.config redirects never run.
 */
export default function LegacyPathRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Read window.location directly: the static-export 404.html is
    // prerendered generically, so window.location is the ground truth for
    // the path that actually 404'd (basePath included).
    const path = window.location.pathname.replace(/\/+$/, "");
    if (path.endsWith("/leaderbord")) {
      router.replace("/leaderboard");
    }
  }, [router]);

  return null;
}
