import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { middleware } from './middleware';

describe('middleware CSP', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    vi.stubEnv('NODE_ENV', originalEnv ?? 'test');
  });

  it("omits 'unsafe-eval' from script-src in production", () => {
    vi.stubEnv('NODE_ENV', 'production');
    const response = middleware(new NextRequest('https://example.com/'));
    const csp = response.headers.get('Content-Security-Policy');
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+'/);
  });

  it("keeps 'unsafe-eval' in development for Fast Refresh", () => {
    vi.stubEnv('NODE_ENV', 'development');
    const response = middleware(new NextRequest('https://example.com/'));
    const csp = response.headers.get('Content-Security-Policy');
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("'unsafe-eval'");
  });

  it("forbids framing via frame-ancestors 'none' and X-Frame-Options (#508)", () => {
    const response = middleware(new NextRequest('https://example.com/'));
    expect(response.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('forwards the nonce-bearing CSP on the request so Next.js nonces its inline scripts', () => {
    const response = middleware(new NextRequest('https://example.com/'));
    const csp = response.headers.get('Content-Security-Policy');
    expect(response.headers.get('x-middleware-request-content-security-policy')).toBe(csp);
    const nonce = response.headers.get('x-middleware-request-x-nonce');
    expect(csp).toContain(`'nonce-${nonce}'`);
  });
});
