import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { safeHttpUrl } from "./sanitize";
import { stellarExpertTxUrl } from "./soroban";

describe("safeHttpUrl (#527)", () => {
  it("accepts absolute http(s) URLs", () => {
    expect(safeHttpUrl("https://github.com/alice")).toBe("https://github.com/alice");
    expect(safeHttpUrl("http://example.com/")).toBe("http://example.com/");
  });

  it.each([
    "javascript:alert(1)",
    " JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "/relative/path",
    "",
    "not a url",
  ])("rejects %j", (value) => {
    expect(safeHttpUrl(value)).toBeUndefined();
  });

  it("rejects non-strings", () => {
    expect(safeHttpUrl(undefined)).toBeUndefined();
    expect(safeHttpUrl(null)).toBeUndefined();
    expect(safeHttpUrl(42)).toBeUndefined();
  });

  it("enforces the host allow-list when given", () => {
    expect(safeHttpUrl("https://github.com/alice", ["github.com"])).toBe(
      "https://github.com/alice",
    );
    expect(safeHttpUrl("https://evil.example/alice", ["github.com"])).toBeUndefined();
    expect(safeHttpUrl("https://github.com.evil.example/", ["github.com"])).toBeUndefined();
  });
});

describe("stellarExpertTxUrl encoding (#527)", () => {
  it("leaves a normal hash untouched", () => {
    const hash = "a".repeat(64);
    expect(stellarExpertTxUrl(hash, "testnet")).toBe(
      `https://stellar.expert/explorer/testnet/tx/${hash}`,
    );
  });

  it("can't be steered to another path or query by a malformed hash", () => {
    const url = new URL(stellarExpertTxUrl("../../account/GABC?x=1#y", "testnet"));
    expect(url.hostname).toBe("stellar.expert");
    expect(url.pathname.startsWith("/explorer/testnet/tx/")).toBe(true);
    expect(url.search).toBe("");
    expect(url.hash).toBe("");
  });
});

describe("no raw-HTML sinks in src (#527)", () => {
  // React escapes text by default; these are the only ways to bypass it. If one
  // is ever genuinely needed, sanitize its input (e.g. DOMPurify) and update
  // this allow-list with a comment explaining why.
  const SINKS = /dangerouslySetInnerHTML|\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML|document\.write\(/;

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sourceFiles(path);
      return /\.(t|j)sx?$/.test(name) && !/\.test\.(t|j)sx?$/.test(name) ? [path] : [];
    });
  }

  it("finds none", () => {
    const root = join(__dirname, "..");
    const offenders = sourceFiles(root).filter((file) => SINKS.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
