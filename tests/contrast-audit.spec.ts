import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = ["/", "/farm", "/leaderboard"];

for (const route of routes) {
  test.describe(`Colour contrast – ${route}`, () => {
    test("dark mode passes WCAG 2.1 AA", async ({ page }) => {
      await page.goto(route);
      // Ensure dark mode is active via localStorage
      await page.evaluate(() =>
        localStorage.setItem("chakra-ui-color-mode", "dark")
      );
      await page.reload();

      const results = await new AxeBuilder({ page })
        .withRules(["color-contrast"])
        .analyze();

      expect(results.violations).toEqual([]);
    });

    test("light mode passes WCAG 2.1 AA", async ({ page }) => {
      await page.goto(route);
      await page.evaluate(() =>
        localStorage.setItem("chakra-ui-color-mode", "light")
      );
      await page.reload();

      const results = await new AxeBuilder({ page })
        .withRules(["color-contrast"])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  });
}
