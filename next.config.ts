import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { validateEnv } from "./src/config/validateEnv";
import { buildCsp } from "./src/config/csp";

const isStaticExport = process.env.NEXT_EXPORT === "true";

// Skip env-var warnings during static-export builds — server-only vars
// like STELLAR_FEE_SPONSOR_SECRET are legitimately absent in that mode,
// and the warnings would only confuse developers (#423).
if (!isStaticExport) {
  validateEnv();
}

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
// Static policy for the <meta> CSP rendered by src/app/layout.tsx in
// static-export mode. Nonces can't work there (the HTML is generated once,
// not per request), so `npm run build` runs
// scripts/csp-hash-inline-scripts.mjs afterwards to add a sha256 hash for
// every inline <script> to each exported page's script-src. In server mode
// src/middleware.ts sends a nonce-based policy header instead.
const CSP_POLICY = buildCsp({
  // Report CSP violations for monitoring (#589).
  reportUri: "/api/csp-report",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Ensure CSS minification in production (#579)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error'],
    } : false,
  },
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  ...(isStaticExport ? { output: "export" } : {}),
  devIndicators: false,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  // Expose basePath to the client so ServiceWorkerRegistrar registers
  // `<basePath>/sw.js` on GitHub Pages exports (#528).
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  headers: async () => [
    {
      // The service worker must never be served stale, or fixes to it would
      // take a full HTTP-cache lifetime to reach users (#528).
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      ],
    },
    {
      source: "/icon.svg",
      headers: [
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
      ],
    },
    {
      source: "/apple-icon.png",
      headers: [
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
      ],
    },
    // #585 — static assets (JS/CSS/images) get long-lived immutable caching
    {
      source: "/_next/static/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      source: "/:path*\\.(png|jpg|jpeg|gif|svg|webp|avif|ico|woff|woff2|ttf|eot)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
      ],
    },
  ],
};

export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(nextConfig);
export { CSP_POLICY };
