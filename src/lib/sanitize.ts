/**
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
