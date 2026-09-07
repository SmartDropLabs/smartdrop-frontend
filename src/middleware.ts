import { NextRequest, NextResponse } from 'next/server';

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

const backendApiOrigin = (() => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:4000/api/v1"
    ).origin;
  } catch {
    return "http://localhost:4000";
  }
})();

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' https://horizon.stellar.org https://horizon-testnet.stellar.org https://soroban-testnet.stellar.org https://soroban.stellar.org https://stellar.expert ${backendApiOrigin}`,
    "img-src 'self' data: https:",
    "font-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
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
  const nonce = generateNonce();
  const cspHeader = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next|_vercel|.*\\..*).*)',
  ]
};
