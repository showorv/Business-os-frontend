import { expect, test } from "@playwright/test";
import { createBusiness, freshEmail, register, resetRateLimits } from "./helpers";

test.beforeEach(resetRateLimits);

test("a visitor reads the home page, the prices, the terms and the privacy policy, in English and Bangla", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Your business money, clear and in order" })).toBeVisible();
  // The trial length comes from the platform settings, so only its shape is checked.
  await expect(page.getByTestId("hero-trial")).toHaveText(/Pro free for \d+ days|Free for one business/);
  await expect(page.getByText("An example, not real figures.")).toBeVisible();

  await page.getByRole("link", { name: "See pricing" }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  const pro = page.getByTestId("pricing-pro");
  await expect(pro.getByTestId("pricing-price")).toContainText("৳");
  const yearly = await pro.getByTestId("pricing-price").textContent();
  await page.getByRole("radio", { name: "Monthly" }).click();
  await expect(pro.getByTestId("pricing-price")).not.toHaveText(yearly!);
  await expect(page.getByTestId("pricing-free").getByTestId("pricing-price")).toHaveText("Free");
  await page.getByText("Does Pro renew by itself?").click();
  await expect(page.getByText("You pay for a month or a year at a time")).toBeVisible();

  await page.getByRole("contentinfo").getByRole("link", { name: "Terms" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Terms of use" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Your data is yours/ })).toBeVisible();
  await page.getByRole("button", { name: "Language" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "ব্যবহারের শর্তাবলি" })).toBeVisible();
  await page.getByRole("contentinfo").getByRole("link", { name: "গোপনীয়তা" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "গোপনীয়তা নীতি" })).toBeVisible();
  await page.getByRole("button", { name: "ভাষা" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();

  // Opened straight from an address (not a link inside the app), the prices still load.
  await page.goto("/pricing");
  await expect(page.getByTestId("pricing-pro").getByTestId("pricing-price")).toContainText("৳");

  // Signing up from the home page; the form links to both.
  await page.goto("/");
  await page.getByRole("link", { name: "Start free" }).first().click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole("link", { name: "terms of use" })).toHaveAttribute("href", "/terms");
  await expect(page.getByRole("link", { name: "privacy policy" })).toHaveAttribute("href", "/privacy");
});

test("someone signed in goes straight to their business from the home page, and can download all its data", async ({ page }, info) => {
  await register(page, freshEmail(info.project.name));
  const businessId = await createBusiness(page, "Rahim Traders");

  await page.goto("/");
  await expect(page).toHaveURL(new RegExp(`/b/${businessId}$`));
  await page.goto("/pricing");
  await expect(page.getByRole("link", { name: "Open the app" })).toBeVisible();
  await expect(page.getByTestId("pricing-pro").getByRole("link", { name: "See your plan" })).toHaveAttribute("href", "/settings/plan");

  await page.goto(`/b/${businessId}/settings`);
  const card = page.getByTestId("data-export");
  await card.getByRole("button", { name: "Prepare a download" }).click();
  // The worker puts the workbook together, then it can be downloaded.
  const button = card.getByRole("button", { name: "Download" });
  await expect(button).toBeVisible({ timeout: 20_000 });
  await expect(card).toContainText(/rahim-traders-data-\d{4}-\d{2}-\d{2}\.xlsx/);
  const download = page.waitForEvent("download");
  await button.click();
  expect((await download).suggestedFilename()).toMatch(/^rahim-traders-data-\d{4}-\d{2}-\d{2}\.xlsx$/);
});

test("the assistant uses the full width beside the menu", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "A phone is full width anyway");
  await register(page, freshEmail(info.project.name));
  const businessId = await createBusiness(page, "Rahim Traders");
  await page.goto(`/b/${businessId}/assistant`);
  await expect(page.getByRole("heading", { name: "What would you like to know?" })).toBeVisible();
  const viewport = page.viewportSize()!;
  const main = await page.getByRole("main").boundingBox();
  // Everything right of the 16rem menu.
  expect(main!.width).toBeGreaterThan(viewport.width - 256 - 2);
  // Other pages keep their readable width.
  await page.goto(`/b/${businessId}/settings`);
  await expect(page.getByRole("heading", { name: "Business settings" })).toBeVisible();
  expect((await page.getByRole("main").boundingBox())!.width).toBeLessThanOrEqual(1152);
});
