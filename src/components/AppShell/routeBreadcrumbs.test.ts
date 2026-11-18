import { describe, expect, it } from "vitest";
import { buildRouteBreadcrumbs } from "./routeBreadcrumbs";

describe("buildRouteBreadcrumbs (#786)", () => {
  it("builds a linked trail for a nested route, with the current page unlinked", () => {
    expect(buildRouteBreadcrumbs("/airdrops/season-2/claims")).toEqual([
      { label: "Airdrops", href: "/airdrops" },
      { label: "Season 2", href: "/airdrops/season-2" },
      { label: "Claims", href: undefined },
    ]);
  });

  it("returns nothing for the home page and top-level routes", () => {
    expect(buildRouteBreadcrumbs("/")).toBeNull();
    expect(buildRouteBreadcrumbs("/history")).toBeNull();
    expect(buildRouteBreadcrumbs(null)).toBeNull();
    expect(buildRouteBreadcrumbs(undefined)).toBeNull();
  });

  it("leaves routes that render their own trail alone", () => {
    expect(buildRouteBreadcrumbs("/farm")).toBeNull();
    expect(buildRouteBreadcrumbs("/farm/CPOOLID123")).toBeNull();
  });

  it("does not treat a route that merely starts with 'farm' as a /farm route", () => {
    expect(buildRouteBreadcrumbs("/farmers/top")).toEqual([
      { label: "Farmers", href: "/farmers" },
      { label: "Top", href: undefined },
    ]);
  });

  it("ignores trailing and duplicate slashes", () => {
    expect(buildRouteBreadcrumbs("/alerts//rules/")).toEqual([
      { label: "Alerts", href: "/alerts" },
      { label: "Rules", href: undefined },
    ]);
  });

  it("decodes escaped segments and tolerates malformed ones", () => {
    expect(buildRouteBreadcrumbs("/webhooks/my%20hook")?.[1].label).toBe("My hook");
    expect(buildRouteBreadcrumbs("/webhooks/%E0%A4%A")?.[1].label).toBe("%E0%A4%A");
  });

  it("truncates long segments such as contract ids", () => {
    const id = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZZZZZZ";
    const label = buildRouteBreadcrumbs(`/prices/${id}`)?.[1].label ?? "";

    expect(label.length).toBeLessThanOrEqual(24);
    expect(label).toBe(`${id.slice(0, 10)}…${id.slice(-6)}`);
  });
});
