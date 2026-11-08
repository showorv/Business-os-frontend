import { expect, test, type Page } from "@playwright/test";
import { createBusiness, freshEmail, register, resetRateLimits } from "./helpers";

test.beforeEach(resetRateLimits);

const addContact = async (page: Page, kind: string, name: string) => {
  await page.getByRole("button", { name: "Add a contact" }).click();
  const form = page.getByTestId("contact-form");
  await form.getByRole("radio", { name: kind }).click();
  await form.getByLabel("Name").fill(name);
  await form.getByRole("button", { name: "Add a contact" }).click();
  await expect(page.getByText(`${name} added`)).toBeVisible();
};

test("items: save one, fill invoice and bill lines from it, see what was sold, archive it", async ({ page }, info) => {
  await register(page, freshEmail(info.project.name));
  const businessId = await createBusiness(page, "Rahim Traders");
  await page.goto(`/b/${businessId}/contacts`);
  await addContact(page, "Customer", "Karim Fashion");
  await addContact(page, "Supplier", "Dhaka Fabrics");

  await page.goto(`/b/${businessId}/items`);
  await expect(page.getByText("No items yet")).toBeVisible();
  await page.getByRole("button", { name: "Add an item" }).click();
  const form = page.getByTestId("item-form");
  await form.getByLabel("Name").fill("Cotton shirt");
  await form.getByLabel(/^Unit/).fill("pcs");
  await form.getByLabel(/^Selling price/).fill("850");
  await form.getByLabel(/^Buying price/).fill("600");
  await form.getByLabel(/^Income category/).selectOption({ label: "Sales" });
  await form.getByRole("button", { name: "Add an item" }).click();
  await expect(page.getByText("Cotton shirt added")).toBeVisible();
  // A table on a laptop, a stacked list on a phone.
  const row =
    info.project.name === "phone"
      ? page.getByTestId("items-list").getByRole("listitem").filter({ hasText: "Cotton shirt" })
      : page.getByTestId("items-table").getByRole("row", { name: /Cotton shirt/ });
  await expect(row).toContainText("৳850.00 / pcs");
  await expect(row).toContainText("৳600.00 / pcs");

  // The same name again is refused.
  await page.getByRole("button", { name: "Add an item" }).click();
  await form.getByLabel("Name").fill("cotton SHIRT");
  await form.getByRole("button", { name: "Add an item" }).click();
  await expect(form.getByText("There is already an item with this name")).toBeVisible();
  await form.getByRole("button", { name: "Cancel" }).click();

  // On an invoice, picking it fills the line in.
  await page.goto(`/b/${businessId}/invoices/new`);
  await page.getByLabel("Customer").selectOption({ label: "Karim Fashion" });
  const line = page.getByTestId("invoice-lines").getByRole("listitem").first();
  await line.getByLabel("Saved item").selectOption({ label: "Cotton shirt" });
  await expect(line.getByLabel("Description")).toHaveValue("Cotton shirt");
  await expect(line.getByLabel("Unit price")).toHaveValue("850.00");
  await line.getByLabel("Qty (pcs)").fill("10");
  await expect(page.getByTestId("invoice-total")).toHaveText("৳8,500.00");
  await page.getByRole("button", { name: "Save and issue" }).click();
  await expect(page.getByText("Invoice issued")).toBeVisible();
  await expect(page.getByRole("cell", { name: "10 pcs" })).toBeVisible();

  // On a bill, the buying price.
  await page.goto(`/b/${businessId}/bills/new`);
  await page.getByLabel("Supplier", { exact: true }).selectOption({ label: "Dhaka Fabrics" });
  const billLine = page.getByTestId("invoice-lines").getByRole("listitem").first();
  await billLine.getByLabel("Saved item").selectOption({ label: "Cotton shirt" });
  await expect(billLine.getByLabel("Unit price")).toHaveValue("600.00");
  await billLine.getByLabel("Qty (pcs)").fill("20");
  await billLine.getByLabel("Expense category").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Save and record" }).click();
  await expect(page.getByText("Bill recorded")).toBeVisible();

  await page.goto(`/b/${businessId}/items`);
  await expect(row.getByTestId("item-sold")).toHaveText("10 pcs · ৳8,500.00");
  await expect(row).toContainText("20 pcs · ৳12,000.00");

  // Archived, it leaves the list and the pickers.
  await row.getByRole("button", { name: "Cotton shirt" }).click();
  await form.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Item archived")).toBeVisible();
  await expect(page.getByText("No items yet")).toBeVisible();
  await page.goto(`/b/${businessId}/invoices/new`);
  await expect(page.getByLabel("Description")).toBeVisible();
  await expect(page.getByLabel("Saved item")).toHaveCount(0);
});
