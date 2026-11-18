import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { middleware } from "../middleware";
import { guardApiRequest } from "./api-origin";

const SELF = "https://smartdrop.example";
const URL_API = `${SELF}/api/sign-fee-bump`;

function req(init: { method?: string; origin?: string; contentType?: string; url?: string } = {}) {
  const headers = new Headers();
  if (init.origin) headers.set("origin", init.origin);
  if (init.contentType) headers.set("content-type", init.contentType);
  return new NextRequest(init.url ?? URL_API, { method: init.method ?? "POST", headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("guardApiRequest (#559)", () => {
  it("lets a same-origin JSON POST through", () => {
    expect(guardApiRequest(req({ origin: SELF, contentType: "application/json" }))).toBeNull();
  });

  it("lets an Origin-less (non-browser) JSON POST through to the route's own checks", () => {
    expect(guardApiRequest(req({ contentType: "application/json" }))).toBeNull();
  });

  it("rejects a foreign origin with 403", async () => {
    const res = guardApiRequest(req({ origin: "https://evil.example", contentType: "application/json" }));
    expect(res?.status).toBe(403);
    expect(res?.headers.get("access-control-allow-origin")).toBeNull();
    await expect(res?.json()).resolves.toEqual({ error: "Origin not allowed" });
  });

  it("rejects a preflight-free text/plain POST with 415", () => {
    const res = guardApiRequest(req({ origin: SELF, contentType: "text/plain" }));
    expect(res?.status).toBe(415);
  });

  it("rejects a POST with no Content-Type with 415", () => {
    expect(guardApiRequest(req())?.status).toBe(415);
  });

  it("answers a preflight only for an allow-listed origin, echoing it (never *)", () => {
    vi.stubEnv("API_ALLOWED_ORIGINS", "https://partner.example, not a url");
    const ok = guardApiRequest(req({ method: "OPTIONS", origin: "https://partner.example" }));
    expect(ok?.status).toBe(204);
    expect(ok?.headers.get("access-control-allow-origin")).toBe("https://partner.example");
    expect(ok?.headers.get("vary")).toContain("Origin");

    const bad = guardApiRequest(req({ method: "OPTIONS", origin: "https://evil.example" }));
    expect(bad?.status).toBe(403);
  });

  it("ignores non-API paths", () => {
    const res = guardApiRequest(req({ url: `${SELF}/farm`, origin: "https://evil.example" }));
    expect(res).toBeNull();
  });
});

describe("middleware wiring (#559)", () => {
  it("blocks a foreign-origin API call before the route runs", () => {
    const res = middleware(req({ origin: "https://evil.example", contentType: "application/json" }));
    expect(res.status).toBe(403);
  });

  it("adds CORS headers for an allow-listed cross-origin caller", () => {
    vi.stubEnv("API_ALLOWED_ORIGINS", "https://partner.example");
    const res = middleware(req({ origin: "https://partner.example", contentType: "application/json" }));
    expect(res.headers.get("access-control-allow-origin")).toBe("https://partner.example");
  });

  it("never sends a wildcard and adds no CORS header for same-origin", () => {
    const res = middleware(req({ origin: SELF, contentType: "application/json" }));
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
