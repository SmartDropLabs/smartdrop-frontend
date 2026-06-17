import type { NextConfig } from "next";

/** Set in CI for GitHub Pages project sites, e.g. /SmartDrop */
const raw = process.env.BASE_PATH?.trim() ?? "";
const basePath = raw.startsWith("/") ? raw : raw ? `/${raw}` : "";

/**
 * NEXT_EXPORT=true → static export for GitHub Pages (no API routes).
 * Unset (default) → server mode for Vercel / `next start` (API routes active).
 *
 * The /api/stats route caches TVL data server-side every 60 s.
 * When running in static-export mode the frontend hook falls back to querying
 * the Stellar Horizon API directly from the browser.
 */
const isStaticExport = process.env.NEXT_EXPORT === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  ...(isStaticExport ? { output: "export" } : {}),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
