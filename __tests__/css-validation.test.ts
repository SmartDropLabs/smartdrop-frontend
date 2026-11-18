import { describe, it, expect } from "vitest";
import { validateCssFiles } from "../scripts/check-css.mjs";

/**
 * Guards the styling pipeline (issue #480): a syntax error in globals.css
 * would otherwise only show up as a silently unstyled app, because nothing
 * validated the CSS before the build. Shares its implementation with the
 * `lint:css` / `build` script so CI and the local pipeline fail the same way.
 */
describe("CSS validation", () => {
  it("parses every stylesheet in src without syntax errors", async () => {
    const { files, errors } = await validateCssFiles();

    expect(files.length).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
});
