import { describe, expect, it } from "vitest";
import theme from "@/lib/theme";

// Helper function to calculate relative luminance of an sRGB color
function getLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return (
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  );
}

// Calculate WCAG contrast ratio between foreground and background
function getContrastRatio(fgHex: string, bgHex: string): number {
  const l1 = getLuminance(fgHex);
  const l2 = getLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("Theme Semantic Tokens & Alert Contrast (#141)", () => {
  const semanticColors = theme.semanticTokens.colors;

  it("defines error and warning semantic color tokens with light/dark variants", () => {
    expect(semanticColors["app.errorBg"]).toBeDefined();
    expect(semanticColors["app.errorFg"]).toBeDefined();
    expect(semanticColors["app.warningBg"]).toBeDefined();
    expect(semanticColors["app.warningFg"]).toBeDefined();
    expect(semanticColors["app.warningAltBg"]).toBeDefined();
    expect(semanticColors["app.warningAltFg"]).toBeDefined();
  });

  it("meets WCAG AA contrast (>= 4.5:1) for error alerts in both light and dark modes", () => {
    // Light mode error: app.errorFg on app.errorBg
    const lightRatio = getContrastRatio(
      semanticColors["app.errorFg"].default,
      semanticColors["app.errorBg"].default
    );
    expect(lightRatio).toBeGreaterThanOrEqual(4.5);

    // Dark mode error: app.errorFg._dark on app.errorBg._dark
    const darkRatio = getContrastRatio(
      semanticColors["app.errorFg"]._dark,
      semanticColors["app.errorBg"]._dark
    );
    expect(darkRatio).toBeGreaterThanOrEqual(4.5);
  });

  it("meets WCAG AA contrast (>= 4.5:1) for warning alerts in both light and dark modes", () => {
    // Light mode warning: app.warningFg on app.warningBg
    const lightRatio = getContrastRatio(
      semanticColors["app.warningFg"].default,
      semanticColors["app.warningBg"].default
    );
    expect(lightRatio).toBeGreaterThanOrEqual(4.5);

    // Dark mode warning: app.warningFg._dark on app.warningBg._dark
    const darkRatio = getContrastRatio(
      semanticColors["app.warningFg"]._dark,
      semanticColors["app.warningBg"]._dark
    );
    expect(darkRatio).toBeGreaterThanOrEqual(4.5);
  });
});
