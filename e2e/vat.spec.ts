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

const fillLine = async (page: Page, line: { description: string; quantity: string; price: string; vat?: string }) => {
  const card = page.getByTestId("invoice-lines").getByRole("listitem").first();
  await card.getByLabel("Description").fill(line.description);
  await card.getByLabel("Qty").fill(line.quantity);
  await card.getByLabel("Unit price").fill(line.price);
  await card.getByLabel(/category$/).selectOption({ index: 1 });
  if (line.vat) await card.getByLabel("VAT", { exact: true }).selectOption({ label: line.vat });
};

test("VAT: register the business, charge VAT on an invoice, claim it on a bill, see the month's VAT", async ({ page }, info) => {
  await register(page, freshEmail(info.project.name));
  const businessId = await createBusiness(page, "Rahim Traders");

  // Not registered yet: an invoice has no VAT box, and the VAT page says so.
  await page.goto(`/b/${businessId}/vat`);
  await expect(page.getByText("isn't marked as VAT-registered")).toBeVisible();

  await page.goto(`/b/${businessId}/settings`);
  const settings = page.getByTestId("vat-settings");
  await settings.getByLabel(/VAT-registered/).check();
  await expect(settings.getByLabel("Rate new invoice lines start with")).toHaveValue("1500");
  await settings.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved")).toBeVisible();

  await page.goto(`/b/${businessId}/contacts`);
  await addContact(page, "Customer", "Karim Fashion");
  await addContact(page, "Supplier", "Dhaka Fabrics");

  // An invoice starts at 15%: ৳2,000 + ৳300 VAT.
  await page.goto(`/b/${businessId}/invoices/new`);
  await page.getByLabel("Customer").selectOption({ label: "Karim Fashion" });
  await fillLine(page, { description: "Shirts", quantity: "2", price: "1,000" });
  await expect(page.getByTestId("invoice-subtotal")).toHaveText("৳2,000.00");
  await expect(page.getByTestId("invoice-vat")).toHaveText("৳300.00");
  await expect(page.getByTestId("invoice-total")).toHaveText("৳2,300.00");
  await page.getByRole("button", { name: "Save and issue" }).click();
  await expect(page.getByText("Invoice issued")).toBeVisible();
  await expect(page.getByTestId("invoice-vat")).toHaveText("৳300.00");
  await expect(page.getByTestId("invoice-due")).toHaveText("৳2,300.00");

  // A bill at 7.5%: ৳75 to claim back.
  await page.goto(`/b/${businessId}/bills/new`);
  await page.getByLabel("Supplier", { exact: true }).selectOption({ label: "Dhaka Fabrics" });
  await fillLine(page, { description: "Fabric", quantity: "1", price: "1,000", vat: "7.5%" });
  await expect(page.getByTestId("invoice-total")).toHaveText("৳1,075.00");
  await page.getByRole("button", { name: "Save and record" }).click();
  await expect(page.getByText("Bill recorded")).toBeVisible();

  await page.goto(`/b/${businessId}/vat`);
  await expect(page.getByTestId("vat-output")).toHaveText("৳300.00");
  await expect(page.getByTestId("vat-input")).toHaveText("৳75.00");
  await expect(page.getByTestId("vat-net")).toHaveText("৳225.00");
  await expect(page.getByText("VAT to pay")).toBeVisible();
  await expect(page.getByTestId("vat-sales").getByRole("row", { name: /15%/ })).toContainText("৳2,000.00");
  await expect(page.getByTestId("vat-documents").getByRole("link")).toHaveCount(2);

  // Last month is empty.
  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(page.getByTestId("vat-output")).toHaveText("৳0.00");
  await expect(page.getByText("No issued invoices or bills this month.")).toBeVisible();
});
