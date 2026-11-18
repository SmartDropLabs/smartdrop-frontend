import type { BreadcrumbSegment } from "@/components/Breadcrumbs/Breadcrumbs";

/**
 * Route prefixes whose pages already render their own, data-aware trail
 * (e.g. /farm/[poolId] shows the pool's name rather than its raw id), so the
 * shell must not render a second one above it (#786).
 */
export const SELF_BREADCRUMB_PREFIXES = ["/farm"];

const MAX_LABEL_LENGTH = 24;

function labelFor(segment: string): string {
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // Malformed escape: show the raw segment.
  }
  const words = decoded.replace(/[-_]+/g, " ").trim();
  const label = words.charAt(0).toUpperCase() + words.slice(1);
  return label.length > MAX_LABEL_LENGTH
    ? `${label.slice(0, 10)}…${label.slice(-6)}`
    : label;
}

/**
 * The shell's breadcrumb trail for `pathname` (#786): one segment per path
 * part, each linking to its parent route except the last (the current page).
 * Returns null for top-level routes — a single "Home › Page" crumb adds
 * nothing the navbar doesn't already show — and for routes in
 * SELF_BREADCRUMB_PREFIXES.
 */
export function buildRouteBreadcrumbs(pathname: string | null | undefined): BreadcrumbSegment[] | null {
  if (!pathname) return null;
  if (SELF_BREADCRUMB_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null;
  }
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  return segments.map((segment, index) => {
    const isLast = index === segments.length - 1;
    return {
      label: labelFor(segment),
      href: isLast ? undefined : `/${segments.slice(0, index + 1).join("/")}`,
    };
  });
}
