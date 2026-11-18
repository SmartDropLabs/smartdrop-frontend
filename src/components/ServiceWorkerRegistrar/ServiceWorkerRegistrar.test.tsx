import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ServiceWorkerRegistrar, { shouldRegisterServiceWorker } from "./ServiceWorkerRegistrar";

describe("shouldRegisterServiceWorker (#528)", () => {
  it("registers only in production", () => {
    expect(shouldRegisterServiceWorker("production", undefined)).toBe(true);
    expect(shouldRegisterServiceWorker("development", undefined)).toBe(false);
    expect(shouldRegisterServiceWorker("test", undefined)).toBe(false);
  });

  it("can be disabled with NEXT_PUBLIC_ENABLE_SW=false", () => {
    expect(shouldRegisterServiceWorker("production", "false")).toBe(false);
  });
});

describe("ServiceWorkerRegistrar (#528)", () => {
  const register = vi.fn(() => Promise.resolve({}));

  beforeEach(() => {
    register.mockClear();
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register },
    });
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    // @ts-expect-error -- remove the test stub
    delete navigator.serviceWorker;
  });

  it("registers /sw.js at the root scope once the page has loaded", () => {
    render(<ServiceWorkerRegistrar />);
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
  });

  it("prefixes the basePath for GitHub Pages exports", () => {
    render(<ServiceWorkerRegistrar basePath="/smartdrop" />);
    expect(register).toHaveBeenCalledWith("/smartdrop/sw.js", { scope: "/smartdrop/" });
  });

  it("does not register outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    render(<ServiceWorkerRegistrar />);
    expect(register).not.toHaveBeenCalled();
  });
});
