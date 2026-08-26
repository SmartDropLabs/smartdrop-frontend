import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

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

export function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const cspHeader = buildCsp(nonce);

  const intlResponse = intlMiddleware(request);

  if (intlResponse.headers.has('location')) {
    intlResponse.headers.set('Content-Security-Policy', cspHeader);
    return intlResponse;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  for (const [key, value] of intlResponse.headers.entries()) {
    if (key.toLowerCase() !== 'content-security-policy') {
      response.headers.set(key, value);
    }
  }

  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
}

export const config = {
  matcher: [
    '/',
    '/(en|es)/:path*',
    '/((?!_next|_vercel|.*\\..*).*)',
  ]
};
