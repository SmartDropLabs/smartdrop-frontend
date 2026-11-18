// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { buildShareUrl, getRememberedUtmParams, rememberUtmParams } from "./share-url";

const POOL = "https://smartdrop.example/farm/xlm-usdc";

afterEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("share links keep UTM attribution (#752)", () => {
  it("copies utm_* params onto the share link", () => {
    const utm = new URLSearchParams("utm_source=x&utm_campaign=launch&ref=ignored");

    const url = new URL(buildShareUrl(POOL, "PUBLIC", undefined, utm));

    expect(url.searchParams.get("utm_source")).toBe("x");
    expect(url.searchParams.get("utm_campaign")).toBe("launch");
    expect(url.searchParams.has("ref")).toBe(false);
  });

  it("does not overwrite utm params the link already sets", () => {
    const utm = new URLSearchParams("utm_source=visit");

    const url = new URL(buildShareUrl(`${POOL}?utm_source=link`, "PUBLIC", undefined, utm));

    expect(url.searchParams.get("utm_source")).toBe("link");
  });

  it("remembers the landing page's utm params after navigation", () => {
    window.history.replaceState(null, "", "/?utm_source=newsletter&utm_medium=email");
    rememberUtmParams();
    window.history.replaceState(null, "", "/farm/xlm-usdc");

    expect(getRememberedUtmParams().toString()).toBe("utm_source=newsletter&utm_medium=email");
    const url = new URL(buildShareUrl(POOL, "PUBLIC", undefined));
    expect(url.searchParams.get("utm_source")).toBe("newsletter");
  });

  it("prefers the current URL's utm params over remembered ones", () => {
    rememberUtmParams("?utm_source=old");
    window.history.replaceState(null, "", "/?utm_source=new");

    expect(getRememberedUtmParams().get("utm_source")).toBe("new");
  });

  it("does not store anything when the visit has no utm params", () => {
    rememberUtmParams("?ref=abc");

    expect(window.sessionStorage.length).toBe(0);
    expect(getRememberedUtmParams().toString()).toBe("");
  });
});
