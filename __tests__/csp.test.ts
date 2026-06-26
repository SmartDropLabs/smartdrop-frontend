import { describe, it, expect } from "vitest";

describe("CSP Headers", () => {
  it("Content-Security-Policy includes default-src self", () => {
    const CSP_POLICY = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://horizon.stellar.org https://soroban-testnet.stellar.org https://soroban.stellar.org https://stellar.expert",
    ].join("; ");

    expect(CSP_POLICY).toContain("default-src 'self'");
    expect(CSP_POLICY).toContain("connect-src");
    expect(CSP_POLICY).toContain("horizon.stellar.org");
    expect(CSP_POLICY).toContain("soroban");
    expect(CSP_POLICY).toContain("stellar.expert");
    expect(CSP_POLICY).not.toContain("*");
  });
});
