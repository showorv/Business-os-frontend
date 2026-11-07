import { expect, test } from "@playwright/test";
import { createBusiness, freshEmail, register, resetRateLimits, setPlan } from "./helpers";

test.beforeEach(resetRateLimits);

test("a new account is on a Pro trial; when it ends, Free allows one business and no assistant", async ({ page }, info) => {
  const email = freshEmail(info.project.name);
  await register(page, email);
  const first = await createBusiness(page, "Rahim Traders");
  await page.goto("/onboarding");
  const second = await createBusiness(page, "Karim Fashion");

  // The Plan page shows the trial and what's in use.
  await page.goto("/settings/plan");
  await expect(page.getByTestId("current-plan")).toContainText("Pro");
  await expect(page.getByTestId("current-plan")).toContainText("Trial");
  await expect(page.getByText(/Pro trial: 1[34] days left/)).toBeVisible();
  await expect(page.getByRole("meter", { name: "Businesses" })).toHaveAttribute("aria-valuenow", "2");
  await expect(page.getByTestId("plan-pro")).toContainText("৳5,990");
  await page.getByRole("radio", { name: "Monthly" }).click();
  await expect(page.getByTestId("plan-pro")).toContainText("৳599");

  // Three days left: a reminder above every page.
  setPlan(email, "ends_at = now() + interval '3 days'");
  await page.goto(`/b/${first}`);
  await expect(page.getByTestId("plan-banner")).toContainText("Your Pro trial ends in 3 days.");

  // The trial ends.
  setPlan(email, "ends_at = now() - interval '1 day'");
  await page.goto(`/b/${first}`);
  await expect(page.getByTestId("plan-banner")).toContainText("Your Pro trial has ended");

  // The newer business can be read but not changed.
  await page.goto(`/b/${second}`);
  await expect(page.getByText("This business is read-only: your plan has room for fewer businesses")).toBeVisible();

  // No third business, and no assistant.
  await page.goto("/onboarding");
  await expect(page.getByTestId("upgrade-prompt")).toContainText("Your plan is full");
  await page.goto(`/b/${first}/assistant`);
  await expect(page.getByTestId("upgrade-prompt")).toContainText("The AI assistant comes with Pro");
  await page.getByTestId("upgrade-prompt").getByRole("link", { name: "See plans" }).click();
  await expect(page).toHaveURL(/\/settings\/plan$/);
  await expect(page.getByTestId("current-plan")).toContainText("Free");
  await expect(page.getByTestId("current-plan")).toContainText("Ended");

  // A grant from the admin brings it all back.
  setPlan(email, "source = 'GRANT', ends_at = null");
  await page.goto(`/b/${second}`);
  await expect(page.getByText("This business is read-only")).toBeHidden();
  await page.goto("/settings/plan");
  await expect(page.getByText("Given to you free, with no end date.")).toBeVisible();
});
