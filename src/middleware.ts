import { NextRequest, NextResponse } from 'next/server';
import { applyApiCorsHeaders, guardApiRequest } from '@/lib/api-origin';
import { buildCsp } from '@/config/csp';

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

// 'unsafe-eval' is only needed for Next.js dev-mode Fast Refresh (eval-based
// source maps); production builds don't use eval anywhere, so it's dropped
// outside development.
function buildNonceCsp(nonce: string): string {
  return buildCsp({
    nonce,
    isDev: process.env.NODE_ENV !== 'production',
    // Clickjacking: no site (including this one) may embed the app (#508).
    frameAncestors: true,
  });
}

// Note: this middleware previously also ran a next-intl locale middleware
// (rewriting every request to /en), but the app has no [locale] segment
// under src/app -- no page was ever built to receive that rewrite, no
// translations exist, and nothing in the app calls useTranslations/
// getTranslations. The rewrite made every route 404 under `next start`
// (invisible on the deployed static-export build, since middleware doesn't
// run there, which is why this went unnoticed). Removed rather than
// completed, since nothing in the app actually depends on it.
export function middleware(request: NextRequest) {
  // #559: origin allow-list + JSON-only writes for /api/* (no-op elsewhere).
  const apiResponse = guardApiRequest(request);
  if (apiResponse) return apiResponse;

  const nonce = generateNonce();
  const cspHeader = buildNonceCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  // Next.js reads the nonce from the request's CSP header and stamps it on
  // its own inline scripts (RSC payload, bootstrap); without this they'd be
  // blocked by the response policy below.
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set('Content-Security-Policy', cspHeader);
  // Legacy equivalent of frame-ancestors 'none' for browsers without CSP2 (#508).
  response.headers.set('X-Frame-Options', 'DENY');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next|_vercel|.*\\..*).*)',
  ]
};
