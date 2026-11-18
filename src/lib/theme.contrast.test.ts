import { describe, expect, it } from "vitest";
import theme from "./theme";

type Token = { default: string; _dark: string };
const tokens = theme.semanticTokens.colors as Record<string, Token>;

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Text-coloured tokens and every surface they're rendered on.
const TEXT = ["app.text", "app.muted", "app.accent", "app.accent2", "app.accent3", "app.accent4"];
const SURFACES = ["app.bg", "app.surface", "app.surfaceHover", "app.inputBg", "app.tooltipBg"];
const ALERTS: Array<[string, string]> = [
  ["app.errorFg", "app.errorBg"],
  ["app.warningFg", "app.warningBg"],
  ["app.feeWarnFg", "app.feeWarnBg"],
  ["app.onAccent", "app.accent"],
];

describe("theme colour contrast meets WCAG AA (#543)", () => {
  const pairs: Array<[string, string]> = [
    ...TEXT.flatMap((fg) => SURFACES.map((bg): [string, string] => [fg, bg])),
    ...ALERTS,
  ];

  for (const mode of ["default", "_dark"] as const) {
    it.each(pairs)(`${mode}: %s on %s is at least 4.5:1`, (fg, bg) => {
      expect(contrast(tokens[fg][mode], tokens[bg][mode])).toBeGreaterThanOrEqual(4.5);
    });
  }
});
