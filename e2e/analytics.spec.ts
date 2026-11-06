import { expect, test, type Page } from "@playwright/test";
import { createBusiness, freshEmail, register, resetRateLimits } from "./helpers";

test.beforeEach(resetRateLimits);
// Each test records several transactions through the form, which takes a while on a phone.
test.setTimeout(180_000);

const addAccount = async (page: Page, name: string, opening: string) => {
  await page.getByRole("button", { name: "Add account" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("Kind").selectOption("BANK");
  await dialog.getByLabel("Opening balance").fill(opening);
  await dialog.getByRole("button", { name: "Add account" }).click();
  await expect(dialog).toBeHidden();
};

// Records money dated today, so "This month" always holds it.
const record = async (page: Page, businessId: string, type: "Income" | "Expense", amount: string, category: string, description: string) => {
  await page.goto(`/b/${businessId}/transactions/new`);
  await page.getByRole("radio", { name: type }).click();
  await page.getByLabel("Amount").fill(amount);
  await page.locator("select").first().selectOption({ label: "City Bank" });
  await page.getByLabel("Category").selectOption({ label: category });
  await page.getByLabel(/^Description/).fill(description);
  await page.getByRole("button", { name: "Save and post" }).click();
  await expect(page.getByText("Posted to the books")).toBeVisible();
};

test("the dashboard, reports, a budget and goals follow the books", async ({ page }, info) => {
  await register(page, freshEmail(info.project.name));
  const businessId = await createBusiness(page, "Rahim Traders");

  // A new business shows the getting-started list until money is recorded.
  await expect(page.getByText("Getting started")).toBeVisible();
  await page.goto(`/b/${businessId}/accounts`);
  await addAccount(page, "City Bank", "50000");
  await record(page, businessId, "Income", "12000", "Sales", "Counter sales");
  await record(page, businessId, "Expense", "3000", "Rent", "Shop rent");
  await record(page, businessId, "Expense", "1500", "Utilities", "Electricity");

  // Dashboard: the business name, the net profit, and each chart can be read as a table.
  await page.goto(`/b/${businessId}`);
  await expect(page.getByRole("heading", { level: 1, name: "Rahim Traders" })).toBeVisible();
  await expect(page.getByTestId("net-profit")).toContainText("7,500");
  await page.getByRole("button", { name: "Period" }).click();
  await page.getByRole("menuitem", { name: "This month" }).click();
  await expect(page).toHaveURL(/period=month/);
  await expect(page.getByTestId("net-profit")).toContainText("7,500");
  await expect(page.getByText("Biggest expenses")).toBeVisible();
  const expensesKey = page.getByRole("button", { name: "Expenses", exact: true });
  await expensesKey.click();
  await expect(expensesKey).toHaveAttribute("aria-pressed", "false");
  await expensesKey.click();
  await expect(expensesKey).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("radio", { name: "Show as table" }).first().click();
  await expect(page.getByRole("table").first()).toBeVisible();
  await expect(page.getByText("All clear. Nothing is waiting.")).toBeVisible();

  // Reports: each statement is a tab; the balance sheet balances; an export is queued.
  await page.goto(`/b/${businessId}/reports`);
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await expect(page.getByTestId("report-net-profit")).toContainText("7,500");
  await page.getByRole("tab", { name: "Balance sheet" }).click();
  await expect(page).toHaveURL(/report=balance/);
  await expect(page.getByText("Balanced", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Cash flow" }).click();
  await expect(page.getByText("How cash moved")).toBeVisible();
  await page.getByRole("tab", { name: "Trial balance" }).click();
  await expect(page.getByRole("columnheader", { name: "Debit" })).toBeVisible();
  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("menuitem", { name: "Excel" }).click();
  await expect(page.getByText("Making your file.")).toBeVisible();
  await expect(page.getByText("Your exports")).toBeVisible();

  // Budget: limits for two categories, then the detail page shows what's used.
  await page.goto(`/b/${businessId}/budgets`);
  await expect(page.getByText("No budgets yet")).toBeVisible();
  await page.getByRole("button", { name: "New budget" }).click();
  const budget = page.getByRole("dialog");
  await budget.getByLabel("Name").fill("Running costs");
  await budget.getByLabel("Limit for Rent").fill("10000");
  await budget.getByLabel("Limit for Utilities").fill("1600");
  await budget.getByRole("button", { name: "Create budget" }).click();
  await expect(page).toHaveURL(/budgets\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Running costs" })).toBeVisible();
  await expect(page.getByText("Getting close")).toBeVisible();
  await expect(page.getByText("On track")).toBeVisible();

  // Goals: one is created, raised and then cancelled.
  await page.goto(`/b/${businessId}/goals`);
  await expect(page.getByText("No goals yet")).toBeVisible();
  await page.getByRole("button", { name: "New goal" }).click();
  const goal = page.getByRole("dialog");
  await goal.getByLabel("Name").fill("Sales target");
  await goal.getByLabel("Measure").selectOption("REVENUE");
  await goal.getByLabel("Target").fill("24000");
  await goal.getByRole("button", { name: "Create goal" }).click();
  await expect(page.getByText("Goal set")).toBeVisible();
  await expect(page.getByText("12,000.00 to go")).toBeVisible();
  await page.getByRole("button", { name: "Options for Sales target" }).click();
  await page.getByRole("menuitem", { name: "Change name or target" }).click();
  await page.getByRole("dialog").getByLabel("Target").fill("12000");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Reached!")).toBeVisible();
  await page.getByRole("button", { name: "Options for Sales target" }).click();
  await page.getByRole("menuitem", { name: "Cancel goal" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel goal" }).click();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
});

test("with two businesses, the all-businesses view adds them up", async ({ page }, info) => {
  await register(page, freshEmail(info.project.name));
  const first = await createBusiness(page, "Rahim Traders");
  await page.goto(`/b/${first}/accounts`);
  await addAccount(page, "City Bank", "10000");
  await record(page, first, "Income", "5000", "Sales", "Counter sales");

  await page.goto("/onboarding");
  const second = await createBusiness(page, "Karim Fashion");
  await page.goto(`/b/${second}/accounts`);
  await addAccount(page, "City Bank", "10000");
  await record(page, second, "Expense", "2000", "Rent", "Shop rent");

  await page.getByRole("button", { name: "Switch business" }).click();
  await page.getByRole("menuitem", { name: "All businesses" }).click();
  await expect(page).toHaveURL(/\/all/);
  await expect(page.getByRole("heading", { name: "All businesses" })).toBeVisible();
  await expect(page.getByTestId("all-net-profit")).toContainText("3,000");
  await expect(page.getByText("Across 2 businesses")).toBeVisible();
  await page.getByRole("link", { name: /Rahim Traders/ }).click();
  await expect(page).toHaveURL(new RegExp(`/b/${first}$`));
});
