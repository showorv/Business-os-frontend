import { execSync } from "node:child_process";
import { expect, type APIRequestContext, type Browser, type Page, type TestInfo } from "@playwright/test";
import { TOTP } from "otpauth";

// Never write a password here: they come from .env (see .env.example), which is never committed.
const needEnv = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env before running the browser tests (copy .env.example).`);
  return value;
};
export const password = needEnv("E2E_PASSWORD");
export const newPassword = needEnv("E2E_NEW_PASSWORD");
const mailpit = process.env.MAILPIT_URL || "http://localhost:8025";

// The test backend allows 10 sign-ups per 10 minutes, and one run makes more than that. This clears
// the counters in the test Redis database only (db 2 by default), never your normal one.
export const resetRateLimits = () => {
  const container = process.env.E2E_REDIS_CONTAINER || "business_os_redis";
  const db = process.env.E2E_REDIS_DB || "2";
  execSync(`docker exec ${container} sh -c "redis-cli -n ${db} --scan --pattern 'ratelimit:*' | xargs -r redis-cli -n ${db} del"`, { stdio: "ignore" });
};

// Each run makes its own accounts, so runs never collide.
export const freshEmail = (project: string, who = "owner") => `${who}-${project}-${Date.now()}@e2e.test`;

export const register = async (page: Page, email: string, name = "Rahim Uddin") => {
  await page.goto("/register");
  await fillRegister(page, email, name);
  await expect(page).toHaveURL(/\/onboarding$/);
};

// Fills and sends the register form on the page that's open now.
export const fillRegister = async (page: Page, email: string, name: string) => {
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
};

// Returns the new business's id, from the address.
export const createBusiness = async (page: Page, name: string) => {
  await page.getByLabel("Business name").fill(name);
  await page.getByRole("button", { name: "Create business" }).click();
  await expect(page.getByRole("heading", { name: `Welcome to ${name}` })).toBeVisible();
  return /\/b\/([^/]+)/.exec(page.url())![1];
};

export const signOut = async (page: Page, name = "Rahim Uddin") => {
  await page.getByRole("button", { name }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
};

// A code from a window the server hasn't seen yet: it refuses a code used twice.
export const freshCode = async (secret: string, used: Set<string>) => {
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

// The newest email to this address in Mailpit (the local mail catcher), and the first link in it matching `path`.
export const linkFromEmail = async (request: APIRequestContext, email: string, path: RegExp) => {
  let link: string | undefined;
  await expect(async () => {
    const list = (await (await request.get(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json()) as { messages: { ID: string }[] };
    const id = list.messages[0]?.ID;
    expect(id).toBeTruthy();
    const message = (await (await request.get(`${mailpit}/api/v1/message/${id}`)).json()) as { Text: string };
    link = new RegExp(`http\\S+${path.source}\\S*`).exec(message.Text)?.[0];
    expect(link).toBeTruthy();
  }).toPass({ timeout: 20_000 });
  const url = new URL(link!);
  return url.pathname + url.search;
};

// A second person in the same test, on the same kind of device: their own cookies, their own session.
export const secondPerson = async (browser: Browser, info: TestInfo) => {
  const use = info.project.use;
  const context = await browser.newContext({
    baseURL: use.baseURL,
    viewport: use.viewport,
    userAgent: use.userAgent,
    isMobile: use.isMobile,
    hasTouch: use.hasTouch,
    deviceScaleFactor: use.deviceScaleFactor,
  });
  return context.newPage();
};
