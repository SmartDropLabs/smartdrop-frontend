"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The old `/leaderbord` typo URL (issue #227) used to be a dedicated route,
 * but the misspelled `leaderbord/` directory was removed for consistency
 * (#444). In server mode next.config.ts answers `/leaderbord` with a real 301
 * (#785), so this never runs there. The static export (GitHub Pages) has no
 * server to send a status code, so the shared 404 page renders this component
 * as the client-side fallback to send those requests to `/leaderboard`.
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
