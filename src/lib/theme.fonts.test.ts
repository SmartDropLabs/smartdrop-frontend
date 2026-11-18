import { describe, expect, it } from "vitest";
import theme, { FONT_STACK } from "./theme";

// #555: the theme must reference next/font's preloaded Inter via the
// --font-inter variable (set on <html> in layout.tsx), not the literal
// 'Inter' family, which never matches next/font's generated face name.
describe("theme fonts (#555)", () => {
  it("uses the next/font CSS variable first in the stack", () => {
    expect(FONT_STACK.startsWith("var(--font-inter)")).toBe(true);
  });

  it("applies the preloaded font to body and heading text", () => {
    expect(theme.fonts.body).toBe(FONT_STACK);
    expect(theme.fonts.heading).toBe(FONT_STACK);
  });

  it("keeps system fallbacks after the preloaded font", () => {
    expect(FONT_STACK).toMatch(/-apple-system.*sans-serif$/);
  });
});
