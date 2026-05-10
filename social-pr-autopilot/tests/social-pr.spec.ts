import { expect, test } from "@playwright/test";

test("renders the Social PR dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Social PR Autopilot" })).toBeVisible();
  await expect(page.getByText("Launch event")).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate Campaign" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Instagram export" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Telegram dry-run" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bluesky dry-run" })).toBeVisible();

  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 247, 237)");
  await expect(page.getByRole("heading", { name: "Social PR Autopilot" })).toHaveCSS("font-weight", "900");
  await expect(page.getByRole("button", { name: "Generate Campaign" })).toHaveCSS("background-color", "rgb(194, 65, 12)");
});
