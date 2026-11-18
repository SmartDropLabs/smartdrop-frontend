"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Pagination state synced to the `?page=` query param (#593).
 *
 * Keeping page in the URL means a page can be shared/bookmarked, the browser
 * back button steps through pages, and a hard refresh restores position.
 * Invalid or missing values fall back to page 1 without throwing.
 *
 * A page change pushes a history entry so back/forward step through pages
 * (#760); `router.replace` overwrote the entry, so Back skipped every page the
 * user had visited. Pass `{ replace: true }` for programmatic resets (e.g.
 * back to page 1 after a sort/search change), and a no-op change (same URL)
 * adds no entry at all.
 */
export type SetPageOptions = {
  replace?: boolean;
};

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
    (next: number | ((current: number) => number), options: SetPageOptions = {}) => {
      const value = typeof next === "function" ? next(page) : next;
      const clamped = Math.max(1, Math.trunc(value) || 1);
      const currentQs = searchParams.toString();
      const params = new URLSearchParams(currentQs);
      if (clamped <= 1) params.delete("page");
      else params.set("page", String(clamped));
      const qs = params.toString();
      if (qs === currentQs) return;
      const href = qs ? `${pathname}?${qs}` : pathname;
      if (options.replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [page, pathname, router, searchParams],
  );

  return { page, setPage };
}
