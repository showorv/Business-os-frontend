import { expect, test } from "@playwright/test";
import { createBusiness, fillRegister, freshEmail, linkFromEmail, register, resetRateLimits, secondPerson, signOut } from "./helpers";

test.beforeEach(resetRateLimits);

test("invite someone by email; they sign up from the link and join; the owner changes their role, then removes them", async ({ page, browser, request }, info) => {
  const owner = freshEmail(info.project.name);
  const invitee = freshEmail(info.project.name, "karim");
  await register(page, owner);
  const businessId = await createBusiness(page, "Rahim Traders");

  // The owner invites Karim as an accountant.
  await page.goto(`/b/${businessId}/team`);
  await page.getByRole("button", { name: "Invite someone" }).click();
  await page.getByLabel("Their email").fill(invitee);
  await page.getByLabel("Role").selectOption("ACCOUNTANT");
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByRole("dialog", { name: "Invitation sent" })).toBeVisible();
  await expect(page.getByLabel("Invitation link")).toHaveValue(/\/invitations\/accept\?token=/);
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).first().click();
  await expect(page.getByText(invitee)).toBeVisible();

  // Karim opens the emailed link on his own device, has no account yet, so signs up on the way.
  const karim = await secondPerson(browser, info);
  await karim.goto(await linkFromEmail(request, invitee, /\/invitations\/accept\?token=/));
  await expect(karim).toHaveURL(/\/login$/);
  await expect(karim.getByText("to accept the invitation")).toBeVisible();
  await karim.getByRole("link", { name: "Create an account" }).click();
  await expect(karim.getByText("to accept the invitation")).toBeVisible();
  await fillRegister(karim, invitee, "Karim Ahmed");
  await expect(karim).toHaveURL(/\/invitations\/accept/);
  await karim.getByRole("button", { name: "Join business" }).click();
  await expect(karim.getByRole("heading", { name: "Welcome to Rahim Traders" })).toBeVisible();

  // As an accountant, Karim sees the team but can't change it.
  await karim.goto(`/b/${businessId}/team`);
  await expect(karim.getByText("Only owners and admins can invite people")).toBeVisible();
  await expect(karim.getByRole("button", { name: "Invite someone" })).toBeHidden();

  // The invitation is used up, and Karim is on the owner's list.
  await page.reload();
  await expect(page.getByText("No pending invitations.")).toBeVisible();
  const row = page.getByRole("listitem").filter({ hasText: "Karim Ahmed" });
  await expect(row.getByText("Accountant")).toBeVisible();

  // Manager, allowed to see the money.
  await row.getByRole("button", { name: "Actions for Karim Ahmed" }).click();
  await page.getByRole("menuitem", { name: "Change role" }).click();
  await page.getByRole("dialog").getByLabel("Role").selectOption("MANAGER");
  await page.getByRole("dialog").getByText("Can see finances", { exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(row.getByText("Manager")).toBeVisible();
  await expect(row.getByText("Sees finances")).toBeVisible();

  // Removed: Karim loses the business straight away.
  await row.getByRole("button", { name: "Actions for Karim Ahmed" }).click();
  await page.getByRole("menuitem", { name: "Remove" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Karim Ahmed was removed")).toBeVisible();
  await expect(row).toBeHidden();

  await karim.goto(`/b/${businessId}`);
  await expect(karim).toHaveURL(/\/onboarding$/);
  await karim.context().close();
});

test("an invitation for one email can't be accepted by another account", async ({ page, browser }, info) => {
  await register(page, freshEmail(info.project.name));
  const businessId = await createBusiness(page, "Rahim Traders");
  await page.goto(`/b/${businessId}/team`);
  await page.getByRole("button", { name: "Invite someone" }).click();
  await page.getByLabel("Their email").fill(freshEmail(info.project.name, "invited"));
  await page.getByRole("button", { name: "Send invitation" }).click();
  const link = new URL(await page.getByLabel("Invitation link").inputValue());

  const stranger = await secondPerson(browser, info);
  await register(stranger, freshEmail(info.project.name, "stranger"), "Someone Else");
  await stranger.goto(link.pathname + link.search);
  await stranger.getByRole("button", { name: "Join business" }).click();
  await expect(stranger.getByText("This invitation is for a different email address")).toBeVisible();
  await expect(stranger.getByRole("button", { name: "Sign out and use another account" })).toBeVisible();
  await stranger.context().close();
});

test("business settings: edit details, pause and reactivate", async ({ page }, info) => {
  await register(page, freshEmail(info.project.name));
  const businessId = await createBusiness(page, "Rahim Traders");
  await page.goto(`/b/${businessId}/settings`);

  await page.getByLabel("Business name").fill("Rahim Traders Ltd");
  await page.getByLabel("Tax ID (TIN/BIN) (optional)").fill("123456789012");
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByText("Saved").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Switch business" })).toContainText("Rahim Traders Ltd");

  await page.getByLabel("Week starts on").selectOption("sunday");
  await page.getByRole("button", { name: "Save" }).nth(1).click();
  await page.reload();
  await expect(page.getByLabel("Week starts on")).toHaveValue("sunday");
  await expect(page.getByLabel("Tax ID (TIN/BIN) (optional)")).toHaveValue("123456789012");

  // Pausing makes everything read-only, with a notice on every screen.
  await page.getByRole("button", { name: "Pause" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Pause" }).click();
  await expect(page.getByText("This business is paused")).toBeVisible();
  await expect(page.getByLabel("Business name")).toBeDisabled();

  await page.getByRole("button", { name: "Reactivate" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Reactivate" }).click();
  await expect(page.getByText("This business is paused")).toBeHidden();
  await expect(page.getByLabel("Business name")).toBeEnabled();
  await signOut(page);
});
