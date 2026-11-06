import { expect, test, type Page } from "@playwright/test";
import { createBusiness, freshEmail, register, resetRateLimits } from "./helpers";

test.beforeEach(resetRateLimits);
test.setTimeout(240_000);

// Today in Dhaka, written the way a Bangladeshi bank writes it.
const today = () => {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date()).split("-");
  return `${day}/${month}/${year}`;
};

// A bank file with a couple of lines of details above the table, and separate money-out / money-in columns.
const statementCsv = () =>
  [
    "City Bank Ltd - Account statement",
    "Account no,1234567",
    "Date,Description,Ref,Debit,Credit,Balance",
    `${today()},Counter sales deposit,,,"12,000.00","62,000.00"`,
    `${today()},DARAZ BD LTD order 5521,,"2,500.00",,"59,500.00"`,
    `${today()},Office rent November,CHQ-0042,"15,000.00",,"44,500.00"`,
    `${today()},Card purchase and fee,,"1,050.00",,"43,450.00"`,
  ].join("\n");

const setUp = async (page: Page, project: string) => {
  await register(page, freshEmail(project));
  const businessId = await createBusiness(page, "Rahim Traders");
  await page.goto(`/b/${businessId}/accounts`);
  await page.getByRole("button", { name: "Add account" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("City Bank");
  await dialog.getByLabel("Kind").selectOption("BANK");
  await dialog.getByLabel("Opening balance").fill("50000");
  await dialog.getByRole("button", { name: "Add account" }).click();
  await expect(dialog).toBeHidden();

  // Already in the books, so the deposit on the statement matches it by itself.
  await page.goto(`/b/${businessId}/transactions/new`);
  await page.getByRole("radio", { name: "Income" }).click();
  await page.getByLabel("Amount").fill("12000");
  await page.locator("select").first().selectOption({ label: "City Bank" });
  await page.getByLabel("Category").selectOption({ label: "Sales" });
  await page.getByLabel(/^Description/).fill("Counter sales");
  await page.getByRole("button", { name: "Save and post" }).click();
  await expect(page.getByText("Posted to the books")).toBeVisible();
  return businessId;
};

test("a rule, a statement import with column checking, and settling every line from the inbox", async ({ page }, info) => {
  const businessId = await setUp(page, info.project.name);

  // A rule for the online shop's charges, made before the statement arrives.
  await page.goto(`/b/${businessId}/statements?tab=rules`);
  await expect(page.getByText("No rules yet")).toBeVisible();
  await page.getByRole("button", { name: "New rule" }).click();
  const ruleDialog = page.getByRole("dialog");
  await ruleDialog.getByLabel("Name").fill("Daraz orders");
  await ruleDialog.getByRole("radio", { name: "Money out" }).click();
  await ruleDialog.getByLabel("When the line contains").fill("daraz");
  await ruleDialog.getByLabel("Record it as").selectOption({ label: "Office Supplies" });
  await ruleDialog.getByRole("button", { name: "Add rule" }).click();
  await expect(page.getByText("Rule added")).toBeVisible();
  await expect(page.getByText("Money out containing “daraz” → Office Supplies")).toBeVisible();

  // Import: the columns are worked out from the file, checked, and saved as a format.
  await page.getByRole("link", { name: "Import statement" }).click();
  await expect(page).toHaveURL(/statements\/import$/);
  await page.getByLabel("Statement file").setInputFiles({ name: "city-bank.csv", mimeType: "text/csv", buffer: Buffer.from(statementCsv()) });
  await expect(page.getByText("city-bank.csv")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByLabel("Headings are on")).toHaveValue("3");
  await expect(page.getByRole("radio", { name: "In & out" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("preview-stats")).toContainText("Readable4");
  await page.getByLabel("Save these columns as a format").check();
  await page.getByLabel("Format name").fill("City Bank CSV");
  await page.getByRole("button", { name: "Import 4 lines" }).click();

  // The worker reads it; the list keeps checking until it's done.
  await expect(page).toHaveURL(/tab=imports/);
  const row = page.getByTestId("import-row").first();
  await expect(row).toContainText("Done", { timeout: 60_000 });
  await expect(row).toContainText("4 new lines");
  await expect(page.getByText("City Bank CSV")).toBeVisible();

  // The deposit matched itself and the rule handled Daraz, so two are left to review.
  await row.getByRole("link").click();
  await expect(page.getByRole("button", { name: /^To review\s*2$/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^Matched\s*1$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Waiting to post\s*1$/ })).toBeVisible();

  // Rent: recorded as an expense and posted.
  await page.getByRole("button", { name: "Office rent November" }).click();
  const panel = page.getByRole("dialog", { name: "Office rent November" });
  // Nothing in the books fits, so it opens on Categorize.
  await expect(panel.getByRole("radio", { name: "Categorize" })).toHaveAttribute("aria-checked", "true");
  await panel.getByLabel("Category").selectOption({ label: "Rent" });
  await panel.getByRole("button", { name: "Create transaction" }).click();
  await expect(page.getByText("Transaction created and posted")).toBeVisible();

  // The panel moves on to the card purchase, which is split into the purchase and its fee.
  const card = page.getByRole("dialog", { name: "Card purchase and fee" });
  await card.getByRole("radio", { name: "Split" }).click();
  await card.getByLabel("Category for part 1").selectOption({ label: "Office Supplies" });
  await card.getByLabel("Amount for part 1").fill("1000");
  await card.getByLabel("Category for part 2").selectOption({ label: "Bank & MFS Charges" });
  await card.getByLabel("Amount for part 2").fill("60");
  await expect(card.getByTestId("split-left")).toContainText("10.00 too much");
  await expect(card.getByRole("button", { name: "Split into 2 transactions" })).toBeDisabled();
  await card.getByLabel("Amount for part 2").fill("50");
  await expect(card.getByTestId("split-left")).toContainText("Adds up exactly");
  await card.getByRole("button", { name: "Split into 2 transactions" }).click();
  await expect(page.getByText("Split into 2 transactions").first()).toBeVisible();
  await expect(page.getByText("All caught up")).toBeVisible();

  // Unmatch the deposit, then match it again from the suggestion.
  await page.getByRole("button", { name: /^Matched\s*3$/ }).click();
  await page.getByRole("button", { name: "Counter sales deposit" }).click();
  const deposit = page.getByRole("dialog", { name: "Counter sales deposit" });
  await expect(deposit.getByText("Matched automatically by amount and date.")).toBeVisible();
  await deposit.getByRole("button", { name: "Unmatch" }).click();
  await page.getByRole("dialog", { name: "Unmatch this line?" }).getByRole("button", { name: "Unmatch" }).click();
  await expect(page.getByText("Line is back for review")).toBeVisible();
  await expect(deposit.getByRole("radio", { name: "Match (1)" })).toHaveAttribute("aria-checked", "true");
  await deposit.getByRole("button", { name: "Match to this entry" }).click();
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: /^Matched$/ })).toBeVisible();
  await page.keyboard.press("Escape");

  // The rule made a draft, which waits for someone to post it.
  await page.getByRole("button", { name: /^Waiting to post\s*1$/ }).click();
  await expect(page.getByRole("button", { name: "DARAZ BD LTD order 5521" })).toBeVisible();
  await expect(page.getByText("3 of 4 lines settled")).toBeVisible();
});
