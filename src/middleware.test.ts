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
});
