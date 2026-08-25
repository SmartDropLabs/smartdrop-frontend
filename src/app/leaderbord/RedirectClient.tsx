"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Old URL; static hosts keep this route as a client redirect. */
export default function RedirectClient() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/leaderboard");
  }, [router]);
  return null;
}
