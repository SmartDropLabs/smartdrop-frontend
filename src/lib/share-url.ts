import { stellarNetwork, type StellarNetworkPreset } from "@/config";

/**
 * Build a network-correct share link (#520).
 *
 * Share links used to be the raw `window.location.href`, which carries no
 * network: a testnet pool link opened on the mainnet deployment (or vice
 * versa) resolves to the wrong pool. This tags non-mainnet links with
 * `?network=testnet|futurenet` (and strips a stale tag from mainnet links),
 * and, when `NEXT_PUBLIC_SITE_URL` is set, rebases the link onto that
 * deployment's canonical origin so preview/localhost URLs aren't shared.
 */
export function buildShareUrl(
  rawUrl: string,
  network: StellarNetworkPreset = stellarNetwork,
  siteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
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
