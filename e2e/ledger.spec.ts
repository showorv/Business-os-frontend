import { expect, test, type Page } from "@playwright/test";
import { createBusiness, freshEmail, register, resetRateLimits } from "./helpers";

test.beforeEach(resetRateLimits);
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

const recordIncome = async (page: Page, businessId: string, amount: string) => {
  await page.goto(`/b/${businessId}/transactions/new`);
  await page.getByRole("radio", { name: "Income" }).click();
  await page.getByLabel("Amount").fill(amount);
  await page.locator("select").first().selectOption({ label: "City Bank" });
  await page.getByLabel("Category").selectOption({ label: "Sales" });
  await page.getByLabel(/^Description/).fill("Counter sales");
  await page.getByRole("button", { name: "Save and post" }).click();
  await expect(page.getByText("Posted to the books")).toBeVisible();
};

test("chart of accounts, a balanced manual journal and its reversal, locking a month, and a reconciliation", async ({ page }, info) => {
  await register(page, freshEmail(info.project.name));
  const businessId = await createBusiness(page, "Rahim Traders");
  await page.goto(`/b/${businessId}/accounts`);
  await addAccount(page, "City Bank", "50000");
  await recordIncome(page, businessId, "12000");

  // Chart of accounts: a tile filters by kind, search narrows it, and a new account can be added.
  await page.goto(`/b/${businessId}/ledger`);
  await expect(page.getByRole("heading", { name: "Ledger" })).toBeVisible();
  const assets = page.getByRole("button", { name: /^Assets/ });
  await assets.click();
  await expect(assets).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("region", { name: "Expenses" })).toBeHidden();
  await page.getByLabel("Search by code or name").fill("city");
  await expect(page.getByRole("button", { name: /1110\s*City Bank/ })).toContainText("62,000.00");
  await assets.click();
  await page.getByLabel("Search by code or name").fill("");

  await page.getByRole("button", { name: "New account" }).click();
  const newAccount = page.getByRole("dialog");
  await newAccount.getByLabel("Kind").selectOption("EXPENSE");
  await expect(newAccount.getByLabel("Code")).not.toHaveValue("");
  await newAccount.getByLabel("Name", { exact: true }).fill("Depreciation");
  await newAccount.getByRole("button", { name: "New account" }).click();
  await expect(page.getByText("Account added")).toBeVisible();
  // The new account opens in its side panel.
  await expect(page.getByRole("dialog", { name: "Depreciation" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();

  // A manual journal won't post until debits equal credits.
  await page.getByRole("link", { name: "New journal entry" }).click();
  await page.getByLabel("Description").fill("Shelf depreciation");
  await page.getByLabel("Account 1").selectOption({ label: await optionFor(page, "Account 1", "Depreciation") });
  await page.getByLabel("Debit 1").fill("2000");
  await page.getByLabel("Account 2").selectOption({ label: "1110 · City Bank" });
  await page.getByLabel("Credit 2").fill("1500");
  await expect(page.getByTestId("journal-balance")).toContainText("500.00 still to balance");
  await expect(page.getByRole("button", { name: "Post entry" })).toBeDisabled();
  await page.getByLabel("Credit 2").fill("2000");
  await expect(page.getByTestId("journal-balance")).toContainText("Debits equal credits");
  await page.getByRole("button", { name: "Post entry" }).click();
  await expect(page).toHaveURL(/ledger\/journals\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Shelf depreciation" })).toBeVisible();
  await expect(page.getByText("Balanced", { exact: true })).toBeVisible();

  // Reversing it posts the mirror image; the original then says so and can't be reversed again.
  await page.getByRole("button", { name: "Reverse" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Reverse" }).click();
  await expect(page.getByText(/Reversed\. The new entry is JE-/)).toBeVisible();
  await expect(page.getByText("Reversal", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Reverses" }).click();
  await expect(page.getByRole("link", { name: /Reversed by JE-/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reverse" })).toBeHidden();

  // The journals tab filters by kind.
  await page.goto(`/b/${businessId}/ledger?tab=journals`);
  await page.getByLabel("Kind").selectOption("ADJUSTING");
  await expect(page).toHaveURL(/kind=ADJUSTING/);
  await expect(page.getByRole("link", { name: "Shelf depreciation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Counter sales" })).toBeHidden();

  // Months: lock this month, then open it again.
  await page.getByRole("tab", { name: "Months" }).click();
  const thisMonth = page.getByTestId(/^month-/).filter({ hasText: "This month" });
  await thisMonth.getByRole("button", { name: /^Options for/ }).click();
  await page.getByRole("menuitem", { name: "Lock" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Lock" }).click();
  await expect(thisMonth).toContainText("Locked");
  await thisMonth.getByRole("button", { name: /^Options for/ }).click();
  await page.getByRole("menuitem", { name: "Open again" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Open again" }).click();
  await expect(thisMonth).toContainText("Open");

  // Reconcile City Bank against a statement that shows 62,000: tick everything off, then finish.
  await page.getByRole("tab", { name: "Reconcile" }).click();
  await expect(page.getByText("Nothing reconciled yet")).toBeVisible();
  await page.getByRole("button", { name: "Start reconciling" }).first().click();
  const start = page.getByRole("dialog");
  await start.getByLabel("Balance on the statement").fill("62,000");
  await start.getByRole("button", { name: "Start reconciling" }).click();
  await expect(page).toHaveURL(/reconcile\/[0-9a-f-]{36}$/);
  await expect(page.getByTestId("rec-difference")).toContainText("62,000.00");
  await page.getByLabel("Select all").check();
  await page.getByRole("button", { name: /^Tick off \d+ entries$/ }).click();
  await expect(page.getByTestId("rec-difference")).toContainText("0.00");
  await expect(page.getByText("Everything matches. Ready to finish.").first()).toBeVisible();

  // Untick one: the gap comes back. Tick it again and finish.
  await page.getByRole("button", { name: /^Untick JE-/ }).first().click();
  await expect(page.getByTestId("rec-difference")).not.toContainText("৳0.00");
  await page.getByLabel("Select all").check();
  await page.getByRole("button", { name: /^Tick off/ }).click();
  await expect(page.getByTestId("rec-difference")).toContainText("৳0.00");
  await page.getByRole("button", { name: "Finish" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Finish" }).click();
  await expect(page.getByText("Finished with no difference.")).toBeVisible();
  await page.getByRole("link", { name: "Reconcile" }).first().click();
  await expect(page.getByText("Done", { exact: true })).toBeVisible();
});

// The label of the option whose text contains `name`, since its code is picked by the app.
const optionFor = async (page: Page, select: string, name: string) => {
  const options = await page.getByLabel(select).locator("option").allTextContents();
  return options.find((text) => text.includes(name))!;
};
