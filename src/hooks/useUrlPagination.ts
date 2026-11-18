"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Pagination state synced to the `?page=` query param (#593).
 *
 * Keeping page in the URL means a page can be shared/bookmarked, the browser
 * back button steps through pages, and a hard refresh restores position.
 * Invalid or missing values fall back to page 1 without throwing.
 */
export function useUrlPagination(defaultPage = 1) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = useMemo(() => {
    const raw = searchParams.get("page");
    if (!raw) return defaultPage;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : defaultPage;
  }, [searchParams, defaultPage]);

  const setPage = useCallback(
    (next: number | ((current: number) => number)) => {
      const value = typeof next === "function" ? next(page) : next;
      const clamped = Math.max(1, Math.trunc(value) || 1);
      const params = new URLSearchParams(searchParams.toString());
      if (clamped <= 1) params.delete("page");
      else params.set("page", String(clamped));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [page, pathname, router, searchParams],
  );

  return { page, setPage };
}
