import { expect, test } from "@playwright/test";
import { createBusiness, freshCode, freshEmail, makePlatformAdmin, password, register, resetRateLimits, secondPerson } from "./helpers";

test.beforeEach(resetRateLimits);

// Runs as its own Playwright project, after the others: platform settings are shared by every account.
test("platform admin: give Pro, suspend, make a coupon the customer uses, and post an announcement", async ({ page, browser }, info) => {
  const used = new Set<string>();
  const stamp = Date.now();
  const customer = freshEmail(info.project.name, "customer");
  await register(page, customer, "Karim Ahmed");
  const businessId = await createBusiness(page, "Karim Fashion");

  // The admin signs up like anyone, is made an admin on the server, and must turn on two-step sign-in first.
  const admin = await secondPerson(browser, info);
  const adminEmail = freshEmail(info.project.name, "admin");
  await register(admin, adminEmail, "Platform Admin");
  await createBusiness(admin, "Admin Desk");
  makePlatformAdmin(adminEmail);
  await admin.goto("/admin");
  await expect(admin.getByText("Turn on two-step sign-in first")).toBeVisible();
  await admin.getByRole("link", { name: "Go to security" }).click();
  await admin.getByRole("button", { name: "Turn on" }).click();
  await admin.getByRole("dialog").getByLabel("Password", { exact: true }).fill(password);
  await admin.getByRole("button", { name: "Continue" }).click();
  const secret = (await admin.locator("code").textContent())!.trim();
  await admin.getByLabel("Code", { exact: true }).fill(await freshCode(secret, used));
  await admin.getByRole("button", { name: "Turn on two-step verification" }).click();
  await expect(admin.getByText("Two-step verification is on.")).toBeVisible();

  // The overview, then the customer's account.
  await admin.getByRole("button", { name: "Platform Admin" }).click();
  await admin.getByRole("menuitem", { name: "Platform admin" }).click();
  await expect(admin.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(admin.getByText("Monthly income")).toBeVisible();
  await admin.getByRole("link", { name: "Accounts", exact: true }).click();
  await admin.getByPlaceholder("Owner, email or business").fill(customer);
  await expect(admin.getByTestId("workspaces-table").getByRole("row")).toHaveCount(2);
  await admin.getByRole("link", { name: "Karim Ahmed" }).click();
  await expect(admin.getByTestId("workspace-owner")).toHaveText("Karim Ahmed");
  await expect(admin.getByText("Karim Fashion")).toBeVisible();

  // Give Pro free for a month.
  const until = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const changePlan = admin.getByTestId("change-plan");
  await changePlan.getByLabel("Until").fill(until);
  await changePlan.getByLabel("Note").fill("Launch partner");
  await changePlan.getByRole("button", { name: "Save" }).click();
  await expect(admin.getByText("Plan changed").first()).toBeVisible();
  await expect(admin.getByTestId("workspace-plan")).toHaveText("Pro");
  await expect(admin.getByText("Given free").first()).toBeVisible();
  await expect(admin.getByTestId("activity-list")).toContainText("Plan changed");

  // Suspended: the customer can't open the business. Lifted: they can again.
  await admin.getByRole("button", { name: "Suspend" }).click();
  await admin.getByRole("dialog").getByLabel("Reason").fill("Payment dispute");
  await admin.getByRole("dialog").getByRole("button", { name: "Suspend" }).click();
  await expect(admin.getByTestId("suspended-alert")).toContainText("Payment dispute");
  await page.goto(`/b/${businessId}/transactions`);
  await expect(page.getByText("This account is suspended.").first()).toBeVisible();
  await admin.getByRole("button", { name: "Lift suspension" }).click();
  await expect(admin.getByTestId("suspended-alert")).toBeHidden();

  // A coupon for Pro.
  const code = `E2E${stamp}`.slice(0, 20);
  await admin.getByRole("link", { name: "Coupons", exact: true }).click();
  await admin.getByRole("button", { name: "Add a coupon" }).click();
  const form = admin.getByTestId("coupon-form");
  await form.getByLabel("Code").fill(code);
  await form.getByLabel("Percent off").fill("25");
  await form.getByLabel("Pro").check();
  await form.getByRole("button", { name: "Make coupon" }).click();
  await expect(admin.getByTestId("coupons-table")).toContainText(code);

  // The customer sees the gift, and the coupon takes a quarter off a month of Pro.
  await page.goto("/settings/plan");
  await expect(page.getByTestId("current-plan")).toContainText("Pro");
  await page.getByRole("radio", { name: "Monthly" }).click();
  const pro = page.getByTestId("plan-pro");
  await pro.getByRole("button", { name: "Have a coupon?" }).click();
  await pro.getByLabel("Coupon code").fill("NOPE-123");
  await pro.getByRole("button", { name: "Apply" }).click();
  await expect(pro.getByText("There's no coupon with that code.")).toBeVisible();
  await pro.getByLabel("Coupon code").fill(code);
  await pro.getByRole("button", { name: "Apply" }).click();
  await expect(pro.getByTestId("coupon-applied")).toContainText("takes ৳149.75 off");
  await expect(pro.getByTestId("plan-price")).toContainText("৳449.25");

  // An announcement for everyone, then switched off again.
  await admin.getByRole("link", { name: "Settings", exact: true }).click();
  await admin.getByLabel("Show an announcement").check();
  await admin.getByLabel("Message (English)").fill(`Maintenance tonight at 11pm ${stamp}`);
  await admin.getByRole("button", { name: "Save settings" }).click();
  await expect(admin.getByText("Settings saved")).toBeVisible();
  await expect(async () => {
    await page.goto(`/b/${businessId}`);
    await expect(page.getByTestId("announcement")).toContainText(`Maintenance tonight at 11pm ${stamp}`, { timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  await admin.getByLabel("Show an announcement").uncheck();
  await admin.getByRole("button", { name: "Save settings" }).click();
  await expect(admin.getByText("Settings saved")).toBeVisible();

  // Every change is in the admin history.
  await admin.getByRole("link", { name: "Admin history", exact: true }).click();
  await expect(admin.getByTestId("activity-list")).toContainText("Coupon made");
  await expect(admin.getByTestId("activity-list")).toContainText("Settings changed");

  // Someone who isn't an admin is sent away from the panel.
  await page.goto("/admin");
  await expect(page).not.toHaveURL(/\/admin/);
});
