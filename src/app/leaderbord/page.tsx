import type { Metadata } from "next";
import RedirectClient from "./RedirectClient";

// Issue #227: /leaderbord is a typo'd legacy URL kept only as a redirect to
// /leaderboard. Keep it out of search indexes so the typo variant doesn't
// compete with the real page.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LeaderbordRedirect() {
  return <RedirectClient />;
}
