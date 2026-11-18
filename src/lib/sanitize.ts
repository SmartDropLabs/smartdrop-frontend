/**
 * URL sanitisation helpers used across the app to prevent open-redirect and
 * XSS vectors from untrusted input.
 */

const SAFE_PROTOCOLS = new Set(['https:', 'http:']);

/**
 * Validates and normalises a URL that must use http or https.
 *
 * Protocol-relative URLs (e.g. `//example.com/path`) are promoted to `https:`
 * before parsing so they don't bypass the protocol check (#745).
 *
 * @param value        - Untrusted input.
 * @param allowedHosts - Optional allowlist of hostnames; rejects anything else.
 * @returns The normalised URL string, or `undefined` if the input is invalid.
 * Output-side guards for externally sourced values (#527).
 *
 * React already escapes every string rendered as text or as an attribute
 * value, so names/messages can't inject markup. What React does NOT stop is a
 * URL whose *scheme* is dangerous (`javascript:`, `data:`), which turns an
 * href/src into script execution. Anything that reaches an href or src from
 * outside the codebase goes through these helpers.
 */

const SAFE_PROTOCOLS = new Set(["https:", "http:"]);

/**
 * Returns `value` if it's an absolute http(s) URL (optionally restricted to
 * `allowedHosts`), otherwise `undefined`, so callers render no link at all.
 */
export function safeHttpUrl(
  value: unknown,
  allowedHosts?: readonly string[],
): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;

  let normalized = value.trim();

  // Promote protocol-relative URLs to https so `new URL()` can parse them
  // and the SAFE_PROTOCOLS check catches any downstream abuse.
  if (normalized.startsWith('//')) normalized = `https:${normalized}`;

  try {
    const parsed = new URL(normalized);
    if (!SAFE_PROTOCOLS.has(parsed.protocol)) return undefined;
    if (allowedHosts && !allowedHosts.includes(parsed.hostname)) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
  if (typeof value !== "string" || value.trim() === "") return undefined;
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return undefined;
  }
  if (!SAFE_PROTOCOLS.has(parsed.protocol)) return undefined;
  if (allowedHosts && !allowedHosts.includes(parsed.hostname)) return undefined;
  return parsed.toString();
}
