import { expect, test, type Page } from "@playwright/test";
import { TOTP } from "otpauth";

// Each run makes its own account, so runs never collide.
const password = "e2e-Owner-pass-2026";
const freshEmail = (project: string) => `owner-${project}-${Date.now()}@e2e.test`;

const register = async (page: Page, email: string) => {
  await page.goto("/register");
  await page.getByLabel("Your name").fill("Rahim Uddin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
};

const createBusiness = async (page: Page, name: string) => {
  await page.getByLabel("Business name").fill(name);
  await page.getByRole("button", { name: "Create business" }).click();
  await expect(page.getByRole("heading", { name: `Welcome to ${name}` })).toBeVisible();
};

// A code from a window the server hasn't seen yet: it refuses a code used twice.
const freshCode = async (secret: string, used: Set<string>) => {
  const totp = new TOTP({ secret });
  for (;;) {
    const code = totp.generate();
    if (!used.has(code)) {
      used.add(code);
      return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
};

test("sign up, set up a business, stay signed in after a reload, sign out and back in", async ({ page }, info) => {
  const email = freshEmail(info.project.name);
  await register(page, email);
  await createBusiness(page, "Rahim Traders");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome to Rahim Traders" })).toBeVisible();

  await page.getByRole("button", { name: "Rahim Uddin" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Welcome to Rahim Traders" })).toBeVisible();
});

test("switch to Bangla and keep it on the account", async ({ page }, info) => {
  await register(page, freshEmail(info.project.name));
  await createBusiness(page, "Rahim Traders");
  await page.getByRole("button", { name: "Language" }).click();
  await expect(page.getByRole("heading", { name: "Rahim Traders-এ স্বাগতম" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "bn-BD");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Rahim Traders-এ স্বাগতম" })).toBeVisible();
});

test("two-step verification: turn on, sign in with a code, confirm a password change", async ({ page }, info) => {
  const used = new Set<string>();
  const email = freshEmail(info.project.name);
  await register(page, email);
  await createBusiness(page, "Rahim Traders");

  await page.goto("/settings/security");
  await page.getByRole("button", { name: "Turn on" }).click();
  await page.getByRole("dialog").getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
  const secret = (await page.locator("code").textContent())!.trim();
  await page.getByLabel("Code", { exact: true }).fill(await freshCode(secret, used));
  await page.getByRole("button", { name: "Turn on two-step verification" }).click();
  await expect(page.getByText("Two-step verification is on.")).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();

  // Changing the password asks for a fresh code first, then signs out everywhere.
  const newPassword = "e2e-Owner-pass-2027";
  await page.getByLabel("Current password").fill(password);
  await page.getByLabel("New password").fill(newPassword);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByRole("dialog", { name: "Confirm it's you" })).toBeVisible();
  await page.getByRole("dialog").getByLabel("Code", { exact: true }).fill(await freshCode(secret, used));
  await page.getByRole("dialog").getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Password changed. Sign in again with the new one.")).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/login\/mfa$/);
  await page.getByLabel("Code", { exact: true }).fill("000000");
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText("That code didn't work.", { exact: false })).toBeVisible();
  await page.getByLabel("Code", { exact: true }).fill(await freshCode(secret, used));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByRole("heading", { name: "Welcome to Rahim Traders" })).toBeVisible();
});

test("forgotten password: the emailed link sets a new one", async ({ page, request }, info) => {
  const email = freshEmail(info.project.name);
  await register(page, email);
  await createBusiness(page, "Rahim Traders");
  await page.getByRole("button", { name: "Rahim Uddin" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send link" }).click();
  await expect(page.getByText("a reset link is on its way", { exact: false })).toBeVisible();

  // Mailpit, the local mail catcher, holds the email.
  const mailpit = process.env.MAILPIT_URL ?? "http://localhost:8025";
  let link: string | undefined;
  await expect(async () => {
    const list = (await (await request.get(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json()) as { messages: { ID: string }[] };
    const id = list.messages[0]?.ID;
    expect(id).toBeTruthy();
    const message = (await (await request.get(`${mailpit}/api/v1/message/${id}`)).json()) as { Text: string };
    link = /http\S+\/reset-password\?token=\S+/.exec(message.Text)?.[0];
    expect(link).toBeTruthy();
  }).toPass({ timeout: 20_000 });

  await page.goto(new URL(link!).pathname + new URL(link!).search);
  await page.getByLabel("New password", { exact: true }).fill("e2e-Owner-pass-2028");
  await page.getByLabel("Confirm new password").fill("e2e-Owner-pass-2028");
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page.getByText("Your password was changed", { exact: false })).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("e2e-Owner-pass-2028");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Welcome to Rahim Traders" })).toBeVisible();
});

test("the phone menu opens and closes", async ({ page, isMobile }, info) => {
  test.skip(!isMobile, "Only phones have the menu button.");
  await register(page, freshEmail(info.project.name));
  await createBusiness(page, "Rahim Traders");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Overview" })).toBeVisible();
  await page.getByRole("dialog").getByRole("link", { name: "Overview" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
});
