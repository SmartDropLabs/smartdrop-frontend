import { stellarNetwork, type StellarNetworkPreset } from "@/config";

const UTM_STORAGE_KEY = "smartdrop:utm";

function utmParamsFrom(search: string): URLSearchParams {
  const utm = new URLSearchParams();
  for (const [key, value] of new URLSearchParams(search)) {
    if (key.toLowerCase().startsWith("utm_")) utm.set(key, value);
  }
  return utm;
}

/**
 * Remembers the current URL's `utm_*` params for the rest of the session
 * (#752), so a share link built after the visitor has navigated away from
 * the landing page still carries the campaign that brought them here.
 * A later visit with its own UTM params replaces the stored ones.
 */
export function rememberUtmParams(search?: string): void {
  if (typeof window === "undefined") return;
  const utm = utmParamsFrom(search ?? window.location.search);
  if (utm.toString() === "") return;
  try {
    window.sessionStorage.setItem(UTM_STORAGE_KEY, utm.toString());
  } catch {
    // Storage blocked (private mode, sandboxed iframe) — attribution is best-effort.
  }
}

/** UTM params for share links: the current URL's, else the session's remembered ones. */
export function getRememberedUtmParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  const current = utmParamsFrom(window.location.search);
  if (current.toString() !== "") return current;
  try {
    return utmParamsFrom(window.sessionStorage.getItem(UTM_STORAGE_KEY) ?? "");
  } catch {
    return new URLSearchParams();
  }
}

/**
 * Build a network-correct share link (#520).
 *
 * Share links used to be the raw `window.location.href`, which carries no
 * network: a testnet pool link opened on the mainnet deployment (or vice
 * versa) resolves to the wrong pool. This tags non-mainnet links with
 * `?network=testnet|futurenet` (and strips a stale tag from mainnet links),
 * and, when `NEXT_PUBLIC_SITE_URL` is set, rebases the link onto that
 * deployment's canonical origin so preview/localhost URLs aren't shared.
 *
 * `utm_*` params from the visit (#752) are carried onto the link unless the
 * link already sets them, so shares keep their campaign attribution.
 */
export function buildShareUrl(
  rawUrl: string,
  network: StellarNetworkPreset = stellarNetwork,
  siteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
  utmParams: URLSearchParams = getRememberedUtmParams(),
): string {
  if (!rawUrl) return rawUrl;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  if (siteUrl) {
    try {
      // Rebuild from the site origin: assigning url.host alone would keep a
      // stale port (e.g. localhost:3000).
      url = new URL(`${url.pathname}${url.search}${url.hash}`, new URL(siteUrl).origin);
    } catch {
      // Malformed NEXT_PUBLIC_SITE_URL — keep the current origin.
    }
  }

  for (const [key, value] of utmParams) {
    if (key.toLowerCase().startsWith("utm_") && !url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  }

  if (network === "PUBLIC") {
    url.searchParams.delete("network");
  } else {
    url.searchParams.set("network", network.toLowerCase());
  }

  return url.toString();
}

/** Prefix share text with the network on non-mainnet deployments. */
export function buildShareText(
  text: string,
  network: StellarNetworkPreset = stellarNetwork,
): string {
  if (network === "PUBLIC") return text;
  const label = network === "TESTNET" ? "Testnet" : "Futurenet";
  return `[${label}] ${text}`;
}
