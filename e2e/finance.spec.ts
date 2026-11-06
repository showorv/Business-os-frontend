import { expect, test, type Page } from "@playwright/test";
import { createBusiness, fillRegister, freshEmail, register, resetRateLimits, secondPerson } from "./helpers";

test.beforeEach(resetRateLimits);

const addAccount = async (page: Page, name: string, type: string, opening: string) => {
  await page.getByRole("button", { name: "Add account" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("Kind").selectOption(type);
  await dialog.getByLabel("Opening balance").fill(opening);
  await dialog.getByRole("button", { name: "Add account" }).click();
  await expect(page.getByText("Account added")).toBeVisible();
  await expect(dialog).toBeHidden();
};

// Fills the new-transaction form. The type buttons are at the top; the rest depends on the type.
const fillTransaction = async (page: Page, fields: { type: string; amount: string; account?: string; to?: string; category?: string; description?: string }) => {
  await page.getByRole("radio", { name: fields.type }).click();
  await page.getByLabel("Amount").fill(fields.amount);
  if (fields.account) await page.locator("select").first().selectOption({ label: fields.account });
  if (fields.to) await page.getByLabel("To account").selectOption({ label: fields.to });
  if (fields.category) await page.getByLabel("Category").selectOption({ label: fields.category });
  if (fields.description) await page.getByLabel(/^Description/).fill(fields.description);
};

const confirm = async (page: Page, button: string) => {
  await page.getByRole("button", { name: button, exact: true }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: button, exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
};

test("accounts, then income, a draft expense that's edited and posted, a transfer, a reversal and a void", async ({ page }, info) => {
  await register(page, freshEmail(info.project.name));
  const businessId = await createBusiness(page, "Rahim Traders");

  await page.goto(`/b/${businessId}/accounts`);
  // Every new business starts with an empty "Cash" account.
  await expect(page.getByRole("link", { name: "Cash", exact: true })).toBeVisible();
  await addAccount(page, "Shop cash", "CASH", "5000");
  await addAccount(page, "City Bank", "BANK", "20,000.50");
  await expect(page.getByTestId("total-balance")).toContainText("25,000.50");

  // Income, posted straight away.
  await page.goto(`/b/${businessId}/transactions`);
  await expect(page.getByText("No transactions yet")).toBeVisible();
  await page.getByRole("link", { name: "New transaction" }).click();
  await fillTransaction(page, { type: "Income", amount: "1,250", account: "Shop cash", category: "Other Income", description: "Old shelf sold" });
  await page.getByRole("button", { name: "Save and post" }).click();
  await expect(page.getByText("Posted to the books")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Old shelf sold" })).toBeVisible();
  await expect(page.getByText("Posted", { exact: true }).first()).toBeVisible();

  // An expense saved as a draft touches no balance; then it's edited and posted.
  await page.goto(`/b/${businessId}/transactions/new`);
  await fillTransaction(page, { type: "Expense", amount: "800", account: "Shop cash", category: "Rent", description: "Shop rent" });
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved")).toBeVisible();
  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Amount").fill("900");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("৳900.00").or(page.getByText("900.00")).first()).toBeVisible();
  await confirm(page, "Post");
  await expect(page.getByText("In the books.")).toBeVisible();

  // A transfer with a bank fee.
  await page.goto(`/b/${businessId}/transactions/new`);
  await fillTransaction(page, { type: "Transfer", amount: "1000", account: "City Bank", to: "Shop cash" });
  await page.getByLabel(/^Fee/).fill("10");
  await page.getByRole("button", { name: "Save and post" }).click();
  await expect(page.getByText("Posted to the books")).toBeVisible();

  // Cash: 5,000 + 1,250 − 900 + 1,000 = 6,350. Bank: 20,000.50 − 1,000 − 10 = 18,990.50.
  await page.goto(`/b/${businessId}/accounts`);
  await expect(page.getByTestId("total-balance")).toContainText("25,340.50");

  // Reverse the income: the opposite entry takes 1,250 back out.
  await page.goto(`/b/${businessId}/transactions?type=INCOME`);
  await page.getByRole("link", { name: "Old shelf sold" }).click();
  await page.getByRole("button", { name: "Reverse", exact: true }).click();
  await page.getByRole("dialog").getByLabel(/^Why/).fill("Buyer returned it");
  await page.getByRole("dialog").getByRole("button", { name: "Reverse", exact: true }).click();
  await expect(page.getByText("Reversed", { exact: true })).toBeVisible();
  await page.goto(`/b/${businessId}/accounts`);
  await expect(page.getByTestId("total-balance")).toContainText("24,090.50");

  // A draft voided: crossed out, and in the Voided tab.
  await page.goto(`/b/${businessId}/transactions/new`);
  await fillTransaction(page, { type: "Expense", amount: "50", account: "Shop cash", category: "Transport", description: "Rickshaw" });
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved")).toBeVisible();
  await confirm(page, "Void");
  await expect(page.getByText("Voided before it was posted.")).toBeVisible();
  await page.goto(`/b/${businessId}/transactions`);
  await page.getByRole("tab", { name: "Voided" }).click();
  await expect(page).toHaveURL(/status=VOID/);
  await expect(page.getByRole("link", { name: "Rickshaw" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Shop rent" })).toBeHidden();
});

test("an expense above the approval limit waits; the person who recorded it can't approve it; an owner does", async ({ page, browser }, info) => {
  const karimEmail = freshEmail(info.project.name, "karim");
  await register(page, freshEmail(info.project.name));
  const businessId = await createBusiness(page, "Rahim Traders");

  await page.goto(`/b/${businessId}/settings`);
  await page.getByLabel("Expenses above").fill("1,000");
  await page.getByRole("button", { name: "Save" }).last().click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.goto(`/b/${businessId}/accounts`);
  await addAccount(page, "Shop cash", "CASH", "10000");

  // Karim joins as an accountant: he records money, but can't approve large expenses.
  await page.goto(`/b/${businessId}/team`);
  await page.getByRole("button", { name: "Invite someone" }).click();
  await page.getByLabel("Their email").fill(karimEmail);
  await page.getByLabel("Role").selectOption("ACCOUNTANT");
  await page.getByRole("button", { name: "Send invitation" }).click();
  const link = new URL(await page.getByLabel("Invitation link").inputValue());
  const karim = await secondPerson(browser, info);
  await karim.goto(link.pathname + link.search);
  await karim.getByRole("link", { name: "Create an account" }).click();
  await fillRegister(karim, karimEmail, "Karim Ahmed");
  await karim.getByRole("button", { name: "Join business" }).click();
  // The business already has money in it, so he lands on its dashboard rather than the welcome.
  await expect(karim.getByRole("heading", { level: 1, name: "Rahim Traders" })).toBeVisible();

  // Above the limit: the form says so first, then it waits.
  await karim.goto(`/b/${businessId}/transactions/new`);
  await fillTransaction(karim, { type: "Expense", amount: "2500", category: "Office Supplies", description: "New printer" });
  await expect(karim.getByText("This is above the approval limit")).toBeVisible();
  await karim.getByRole("button", { name: "Save and post" }).click();
  await expect(karim.getByText("Sent for approval")).toBeVisible();
  await expect(karim.getByText("An owner or admin needs to approve this.")).toBeVisible();
  await expect(karim.getByRole("button", { name: "Approve" })).toBeHidden();
  const transactionUrl = new URL(karim.url()).pathname;

  // The owner finds it under "Waiting" and approves it.
  await page.goto(`/b/${businessId}/transactions`);
  await page.getByRole("tab", { name: "Waiting" }).click();
  await page.getByRole("link", { name: "New printer" }).click();
  await expect(page).toHaveURL(new RegExp(`${transactionUrl}$`));
  await confirm(page, "Approve");
  await expect(page.getByText("Approved and posted")).toBeVisible();
  await expect(page.getByText("Approved on")).toBeVisible();
  await page.goto(`/b/${businessId}/accounts`);
  await expect(page.getByTestId("total-balance")).toContainText("7,500.00");

  // The owner's own large expense waits too, and the owner can't approve it themself.
  await page.goto(`/b/${businessId}/transactions/new`);
  await fillTransaction(page, { type: "Expense", amount: "3000", category: "Marketing", description: "Banner" });
  await page.getByRole("button", { name: "Save and post" }).click();
  await expect(page.getByText("You recorded this, so someone else must approve it.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve" })).toBeHidden();
  await karim.context().close();
});

// A tiny real PNG (1×1 pixel), so the server's check of the file's contents passes.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

test("attach a receipt, see it after a reload, refuse a wrong file, remove it", async ({ page }, info) => {
  await register(page, freshEmail(info.project.name));
  const businessId = await createBusiness(page, "Rahim Traders");
  await page.goto(`/b/${businessId}/accounts`);
  await addAccount(page, "Shop cash", "CASH", "1000");
  await page.goto(`/b/${businessId}/transactions/new`);
  await fillTransaction(page, { type: "Expense", amount: "120", category: "Office Supplies", description: "Pens" });
  await page.getByRole("button", { name: "Save and post" }).click();
  await expect(page.getByText("Nothing attached yet.")).toBeVisible();

  await page.getByTestId("attachment-input").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await expect(page.getByText("Only PDF, PNG, JPEG or WebP files can be attached.")).toBeVisible();

  await page.getByTestId("attachment-input").setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("receipt.png attached")).toBeVisible();
  await page.reload();
  await expect(page.getByText("receipt.png")).toBeVisible();
  await expect(page.getByRole("button", { name: "Download receipt.png" })).toBeVisible();

  await page.getByRole("button", { name: "Remove receipt.png" }).click();
  await expect(page.getByText("Nothing attached yet.")).toBeVisible();
});
