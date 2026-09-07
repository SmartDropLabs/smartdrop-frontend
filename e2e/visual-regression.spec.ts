import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

function leaderboardEntry(i: number) {
  return {
    address: `GLEADER${String(i).padStart(3, "0")}${"A".repeat(45)}`.slice(0, 56),
    totalCredits: 1000 - i,
    totalStake: 100 + i,
    boostUtilization: i % 2 === 0 ? 10 : 25,
  };
}

async function installVisualStabilityHooks(page: Page) {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = `
        *,
        *::before,
        *::after {
          animation: none !important;
          transition: none !important;
          caret-color: transparent !important;
          scroll-behavior: auto !important;
        }
      `;
      document.head.appendChild(style);
    });
  });
}

async function mockLeaderboardApi(page: Page, total: number): Promise<void> {
  await page.route("**/__mock-leaderboard-api**", async (route) => {
    const url = new URL(route.request().url());
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? 10);
    const sort = url.searchParams.get("sort") ?? "credits";

    const all = Array.from({ length: total }, (_, i) => leaderboardEntry(i));
    all.sort((a, b) =>
      sort === "credits"
        ? b.totalCredits - a.totalCredits
        : b.totalStake - a.totalStake,
    );

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        entries: all.slice(offset, offset + limit),
        total,
      }),
    });
  });
}

function trackConsoleErrors(page: Page) {
  const errors: string[] = [];

  page.on("console", (message: ConsoleMessage) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  page.on("pageerror", (error: Error) => {
    errors.push(error.message);
  });

  return errors;
}

test.describe("visual regression coverage", () => {
  test.beforeEach(async ({ page }) => {
    await installVisualStabilityHooks(page);
  });

  test("unknown routes render the 404 page and recover back home", async ({ page }) => {
    const consoleErrors = trackConsoleErrors(page);

    await page.addInitScript(() => {
      localStorage.setItem("chakra-ui-color-mode", "light");
    });
    await page.goto("/definitely-not-a-real-route");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("This page doesn't exist")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();

    await expect(page).toHaveScreenshot("404-page-light.png", {
      fullPage: true,
      // Next.js dev overlay's error/issues badge (<nextjs-portal>, dev-mode
      // only -- this suite runs against `pnpm dev`) animates inside what
      // appears to be a shadow root the animation-disabling style injection
      // above can't reach, so it renders slightly differently frame to
      // frame. Confirmed via a real CI diff: every pixel outside this badge
      // matched exactly. Mask it out rather than compare it.
      mask: [page.locator("nextjs-portal")],
    });

    await page.getByRole("link", { name: "Back to home" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByText("SmartDrop Dashboard")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("theme toggle persists across reloads on the 404 page", async ({ page }) => {
    const consoleErrors = trackConsoleErrors(page);

    await page.goto("/still-not-a-real-route");
    await page.waitForLoadState("networkidle");
    // Seed the "light" baseline via evaluate + an explicit reload, not
    // page.addInitScript(). addInitScript re-runs on *every* navigation in
    // this page, including the page.reload() below that's meant to test
    // persistence -- so it was silently overwriting the "dark" value the
    // toggle click had just set, back to "light", right before the
    // persistence check read it. That made this look like a broken toggle
    // when the toggle itself was working correctly the whole time (confirmed
    // via trace: localStorage read "dark" immediately after the click, every
    // time, and only flipped back to "light" after reload).
    await page.evaluate(() => {
      localStorage.setItem("chakra-ui-color-mode", "light");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const toggle = page.getByRole("button", { name: "Toggle colour mode" });
    await expect(toggle).toBeVisible();

    await toggle.click();
    await expect.poll(async () => {
      return page.evaluate(() => localStorage.getItem("chakra-ui-color-mode"));
    }).toBe("dark");

    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect.poll(async () => {
      return page.evaluate(() => localStorage.getItem("chakra-ui-color-mode"));
    }).toBe("dark");

    await expect(page).toHaveScreenshot("404-page-dark.png", {
      fullPage: true,
      mask: [page.locator("nextjs-portal")],
    });

    expect(consoleErrors).toEqual([]);
  });

  test("leaderboard renders deterministically and keeps sorting stable", async ({ page }) => {
    const consoleErrors = trackConsoleErrors(page);

    await page.clock.setFixedTime(new Date("2026-01-15T12:00:00.000Z"));
    await mockLeaderboardApi(page, 25);
    await page.goto("/leaderboard");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Leaderboard", { exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "1" }).first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /credits/i })).toHaveAttribute(
      "aria-sort",
      "descending",
    );

    await expect(page).toHaveScreenshot("leaderboard-credits.png", {
      fullPage: true,
      mask: [page.locator("nextjs-portal")],
    });

    await page.getByRole("button", { name: "Stake" }).click();
    await expect(page.getByRole("columnheader", { name: /stake/i })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    await expect(page.getByRole("cell", { name: "124" }).first()).toBeVisible();

    await expect(page).toHaveScreenshot("leaderboard-stake.png", {
      fullPage: true,
      mask: [page.locator("nextjs-portal")],
    });

    expect(consoleErrors).toEqual([]);
  });
});
