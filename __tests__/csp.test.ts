import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import { buildCsp } from "../src/config/csp";
import { addScriptHashes, collectInlineScriptHashes, hashInlineScriptsInHtml } from "../scripts/csp-hash-inline-scripts.mjs";

const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("base64");

describe("CSP Headers", () => {
  it("Content-Security-Policy includes default-src self", () => {
    const CSP_POLICY = buildCsp();

    expect(CSP_POLICY).toContain("default-src 'self'");
    expect(CSP_POLICY).toContain("connect-src");
    expect(CSP_POLICY).toContain("horizon.stellar.org");
    expect(CSP_POLICY).toContain("soroban");
    expect(CSP_POLICY).toContain("stellar.expert");
    expect(CSP_POLICY).not.toContain("*");
  });

  it("never allows inline scripts via 'unsafe-inline'", () => {
    for (const csp of [buildCsp(), buildCsp({ nonce: "abc" }), buildCsp({ scriptHashes: ["x"] })]) {
      const scriptSrc = csp.split("; ").find((d) => d.startsWith("script-src"));
      expect(scriptSrc).not.toContain("unsafe-inline");
    }
  });

  it("adds nonce and hash sources to script-src", () => {
    const csp = buildCsp({ nonce: "n0nce", scriptHashes: ["h1", "h2"] });
    expect(csp).toContain("script-src 'self' 'nonce-n0nce' 'sha256-h1' 'sha256-h2'");
  });
});

describe("static-export inline script hashing", () => {
  it("hashes only inline scripts, byte-for-byte", () => {
    const html = `<script src="/a.js"></script><script>self.__next_f.push([1,"x"])</script><script></script>`;
    expect(collectInlineScriptHashes(html)).toEqual([sha('self.__next_f.push([1,"x"])')]);
  });

  it("appends hashes to an existing script-src without duplicating", () => {
    const policy = addScriptHashes("default-src 'self'; script-src 'self' 'sha256-a'", ["a", "b"]);
    expect(policy).toBe("default-src 'self'; script-src 'self' 'sha256-a' 'sha256-b'");
  });

  it("rewrites the page's meta CSP with the hashes of its inline scripts", () => {
    const body = "document.documentElement.dataset.theme='dark'";
    const html =
      `<html><head><meta http-equiv="Content-Security-Policy" content="default-src &#x27;self&#x27;; script-src &#x27;self&#x27;; object-src &#x27;none&#x27;"/>` +
      `<script>${body}</script></head></html>`;

    const updated = hashInlineScriptsInHtml(html);
    expect(updated).toContain(
      `content="default-src &#x27;self&#x27;; script-src &#x27;self&#x27; &#x27;sha256-${sha(body)}&#x27;; object-src &#x27;none&#x27;"`
    );
    expect(updated).toContain(`<script>${body}</script>`);
  });

  it("returns null for pages without a meta CSP", () => {
    expect(hashInlineScriptsInHtml("<html><script>x()</script></html>")).toBeNull();
  });
});
