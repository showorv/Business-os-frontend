import { expect, test, type Page } from "@playwright/test";
import { createBusiness, freshEmail, register, resetRateLimits } from "./helpers";

test.beforeEach(resetRateLimits);
test.setTimeout(240_000);

// A one-page PDF with real text in it, made by the browser itself.
const leasePdf = async (page: Page) => {
  const maker = await page.context().newPage();
  await maker.setContent(`<h1>Shop lease</h1><p>The tenant pays rent on the fifth of each month.</p><p>A late payment fee of two percent applies to rent paid after the tenth.</p>`);
  const pdf = await maker.pdf({ format: "A4" });
  await maker.close();
  return pdf;
};

test("documents are uploaded, read in the background and found by search; the history shows it", async ({ page }, info) => {
  await register(page, freshEmail(info.project.name));
  const businessId = await createBusiness(page, "Rahim Traders");
  await page.goto(`/b/${businessId}/documents`);
  await expect(page.getByText("No documents yet")).toBeVisible();

  await page.getByRole("button", { name: "Upload" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Upload documents" });
  await dialog.getByLabel("Choose files").setInputFiles([
    { name: "shop-lease-contract.pdf", mimeType: "application/pdf", buffer: await leasePdf(page) },
    { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") },
  ]);
  // The text file isn't a kind that can be kept; the lease is guessed to be a contract.
  await expect(dialog.getByText("This kind of file can’t be uploaded.")).toBeVisible();
  await expect(dialog.getByLabel("Kind of document for shop-lease-contract.pdf")).toHaveValue("CONTRACT");
  await dialog.getByRole("button", { name: "Upload 1 file" }).click();
  await expect(page.getByText("1 document uploaded. It’s being read now.")).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).first().click();

  const row = page.getByTestId("document-row").filter({ hasText: "shop-lease-contract.pdf" });
  await expect(row).toContainText("Contract");
  // Read by the worker; the list checks again on its own until it's searchable.
  await expect(row.getByText("Searchable")).toBeVisible({ timeout: 120_000 });

  await page.getByRole("radio", { name: "Receipt" }).click();
  await expect(page.getByText("No documents of this kind")).toBeVisible();
  await page.getByRole("radio", { name: "All" }).click();

  await page.getByLabel("Search documents").fill("late payment fee");
  const hit = page.getByTestId("search-hit").first();
  await expect(hit).toContainText("shop-lease-contract.pdf");
  await expect(hit).toContainText("page 1");
  await expect(hit.locator("mark").first()).toBeVisible();
  await expect(page).toHaveURL(/q=late\+payment\+fee/);
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(row).toBeVisible();

  // The owner can see who did it in the business's history.
  await page.goto(`/b/${businessId}/audit`);
  const upload = page.getByTestId("audit-entry").filter({ hasText: "uploaded a document" }).first();
  await expect(upload).toContainText("Rahim Uddin");
  await page.getByLabel("What happened").selectOption("business.updated");
  await expect(page.getByText("Nothing matches")).toBeVisible();
  await page.getByLabel("What happened").selectOption("");
  await expect(page.getByTestId("audit-entry").filter({ hasText: "created the business" })).toBeVisible();

  // And everyone sees their own sign-ins in settings.
  await page.goto("/settings/activity");
  await expect(page.getByTestId("audit-entry").filter({ hasText: "created their account" })).toBeVisible();
});

test("the assistant answers from the books with sources, and a drafted task is only added once confirmed", async ({ page }, info) => {
  await register(page, freshEmail(info.project.name));
  const businessId = await createBusiness(page, "Rahim Traders");
  await page.goto(`/b/${businessId}/assistant`);
  await expect(page.getByRole("heading", { name: "What would you like to know?" })).toBeVisible();

  // A suggested question: the answer comes with where its figures came from.
  await page.getByRole("button", { name: "How much money do we have across all accounts?" }).click();
  await expect(page.getByTestId("user-message")).toHaveText("How much money do we have across all accounts?");
  const answer = page.getByTestId("assistant-message").first();
  await expect(answer).toContainText("Across your accounts you have");
  await expect(answer.getByTestId("source-chip")).toContainText("Account balances");
  await expect(page).toHaveURL(/\?c=/);

  // Asking for a task drafts a card; nothing exists until it's confirmed.
  await page.getByLabel("Message").fill("Remind me to call the landlord");
  await page.getByLabel("Message").press("Enter");
  const card = page.getByTestId("proposal-card");
  await expect(card).toContainText("Call the landlord about the lease");
  await expect(card).toContainText("Waiting for you");
  await expect(card).toContainText("High");
  await card.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByText("Task added.")).toBeVisible();
  await expect(card).toContainText("Added");

  // The chat is kept, and opens again from the list.
  await page.reload();
  await expect(page.getByTestId("assistant-message")).toHaveCount(2);
  await card.getByRole("link", { name: "Open the task" }).click();
  await expect(page.getByRole("dialog", { name: "Call the landlord about the lease" })).toBeVisible();

  // The history says the assistant was involved.
  await page.goto(`/b/${businessId}/audit`);
  await expect(page.getByTestId("audit-entry").filter({ hasText: "confirmed an assistant suggestion" })).toBeVisible();
});
