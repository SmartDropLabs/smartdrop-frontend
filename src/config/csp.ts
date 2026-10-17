/**
 * Single source of truth for the Content-Security-Policy.
 *
 * Inline scripts are only allowed through a per-request nonce (server mode,
 * set by src/middleware.ts) or through sha256 hashes (static export, where
 * scripts/csp-hash-inline-scripts.mjs hashes every inline <script> in the
 * exported HTML after `next build`). 'unsafe-inline' is never used for
 * scripts.
 */

export interface CspOptions {
  /** Per-request nonce allowed to run inline scripts (server mode). */
  nonce?: string;
  /** Base64 sha256 digests of allowed inline scripts (static export). */
  scriptHashes?: readonly string[];
  /** Adds 'unsafe-eval' for Next.js dev-mode Fast Refresh. */
  isDev?: boolean;
  /**
   * frame-ancestors is only honoured as a response header, not in a <meta>
   * CSP, so it's opt-in for the header-based policy (#508).
   */
  frameAncestors?: boolean;
  /** report-uri is likewise ignored in a <meta> CSP (#589). */
  reportUri?: string;
}

export function getBackendApiOrigin(): string {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:4000/api/v1"
    ).origin;
  } catch {
    return "http://localhost:4000";
  }
}

export function buildScriptSrc({
  nonce,
  scriptHashes = [],
  isDev = false,
}: Pick<CspOptions, "nonce" | "scriptHashes" | "isDev"> = {}): string {
  return [
    "script-src 'self'",
    ...(nonce ? [`'nonce-${nonce}'`] : []),
    ...scriptHashes.map((hash) => `'sha256-${hash}'`),
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(" ");
}

// 'unsafe-inline' stays in style-src for now — Chakra UI/Emotion inject
// <style> tags at runtime with no nonce wired through, and switching that to
// a nonce-based policy needs an Emotion cache configured with this nonce
// (e.g. via @chakra-ui/next-js's CacheProvider), which isn't set up yet.
export function buildCsp(options: CspOptions = {}): string {
  return [
    "default-src 'self'",
    buildScriptSrc(options),
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' https://horizon.stellar.org https://horizon-testnet.stellar.org https://soroban-testnet.stellar.org https://soroban.stellar.org https://stellar.expert ${getBackendApiOrigin()}`,
    "img-src 'self' data: https:",
    "font-src 'self'",
    "frame-src 'none'",
    ...(options.frameAncestors ? ["frame-ancestors 'none'"] : []),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(options.reportUri ? [`report-uri ${options.reportUri}`] : []),
  ].join("; ");
}
