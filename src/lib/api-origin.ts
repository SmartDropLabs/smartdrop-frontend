import { NextResponse, type NextRequest } from "next/server";

/**
 * Explicit origin allow-list for `/api/*` (#559).
 *
 * The app never sends `Access-Control-Allow-Origin`, so browsers already
 * stop other sites from *reading* API responses. That doesn't stop them
 * from *sending* requests: a cross-origin `text/plain` POST is a CORS
 * "simple request" with no preflight, and the fee-bump route parses its
 * body with `request.json()` regardless of Content-Type. So any page could
 * make its visitors' browsers hit the sponsor-signing endpoint (spending RPC
 * work and spreading the per-IP rate limit across many IPs). Here we:
 *
 *  - reject any request whose `Origin` isn't this deployment or listed in
 *    `API_ALLOWED_ORIGINS` (comma-separated, server-only env var);
 *  - require `Content-Type: application/json` on state-changing methods, so
 *    a cross-origin browser request always triggers a preflight;
 *  - answer preflights only for allowed origins, echoing the exact origin
 *    (never `*`).
 *
 * Requests with no `Origin` (curl, server-to-server) aren't browser CORS
 * traffic and are left to the route's own validation and rate limiting.
 */

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function allowedApiOrigins(request: NextRequest): Set<string> {
  const origins = new Set<string>([request.nextUrl.origin]);
  for (const raw of (process.env.API_ALLOWED_ORIGINS ?? "").split(",")) {
    const value = raw.trim();
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      // Ignore malformed entries rather than widening the list.
    }
  }
  return origins;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

/**
 * Returns a response that ends the request (blocked, or a preflight answer),
 * or `null` to let it continue to the route handler.
 */
export function guardApiRequest(request: NextRequest): NextResponse | null {
  if (!isApiPath(request.nextUrl.pathname)) return null;

  const origin = request.headers.get("origin");
  const allowed = allowedApiOrigins(request);

  if (origin !== null && !allowed.has(origin)) {
    return NextResponse.json(
      { error: "Origin not allowed" },
      { status: 403, headers: { Vary: "Origin" } },
    );
  }

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: origin ? corsHeaders(origin) : { Vary: "Origin" },
    });
  }

  if (STATE_CHANGING.has(request.method)) {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 415 },
      );
    }
  }

  return null;
}

/** Adds CORS headers for an allowed cross-origin caller (never for same-origin). */
export function applyApiCorsHeaders(request: NextRequest, response: NextResponse): void {
  if (!isApiPath(request.nextUrl.pathname)) return;
  const origin = request.headers.get("origin");
  response.headers.append("Vary", "Origin");
  if (origin && origin !== request.nextUrl.origin && allowedApiOrigins(request).has(origin)) {
    for (const [key, value] of Object.entries(corsHeaders(origin))) {
      if (key !== "Vary") response.headers.set(key, value);
    }
  }
}
