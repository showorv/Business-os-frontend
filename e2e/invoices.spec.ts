import { expect, test, type Page } from "@playwright/test";
import { createBusiness, freshEmail, register, resetRateLimits } from "./helpers";

test.beforeEach(resetRateLimits);

const mailpit = process.env.MAILPIT_URL || "http://localhost:8025";

const addContact = async (page: Page, kind: string, name: string, email?: string) => {
  await page.getByRole("button", { name: "Add a contact" }).click();
  const form = page.getByTestId("contact-form");
  await form.getByRole("radio", { name: kind }).click();
  await form.getByLabel("Name").fill(name);
  if (email) await form.getByLabel(/^Email/).fill(email);
  await form.getByRole("button", { name: "Add a contact" }).click();
  await expect(page.getByText(`${name} added`)).toBeVisible();
};

const fillLine = async (page: Page, index: number, line: { description: string; quantity: string; price: string }) => {
  const card = page.getByTestId("invoice-lines").getByRole("listitem").nth(index);
  await card.getByLabel("Description").fill(line.description);
  await card.getByLabel("Qty").fill(line.quantity);
  await card.getByLabel("Unit price").fill(line.price);
  await card.getByLabel(/category$/).selectOption({ index: 1 });
};

test("invoices: issue one, take part and full payment, PDF, email, and see the dues", async ({ page, request }, info) => {
  const email = freshEmail(info.project.name);
  await register(page, email);
  const businessId = await createBusiness(page, "Rahim Traders");
  const customerEmail = `karim-${info.project.name}-${Date.now()}@e2e.test`;
  await page.goto(`/b/${businessId}/contacts`);
  await addContact(page, "Customer", "Karim Fashion", customerEmail);

  await page.goto(`/b/${businessId}/invoices`);
  await expect(page.getByText("No invoices yet")).toBeVisible();
  await page.getByRole("link", { name: "New invoice" }).click();

  // Nothing chosen yet: the form says what is missing instead of sending it.
  await page.getByRole("button", { name: "Save and issue" }).click();
  await expect(page.getByText("Pick a customer.")).toBeVisible();

  await page.getByLabel("Customer").selectOption({ label: "Karim Fashion" });
  await fillLine(page, 0, { description: "Shirts", quantity: "10", price: "500" });
  await page.getByRole("button", { name: "Add a line" }).click();
  await fillLine(page, 1, { description: "Delivery", quantity: "1", price: "150" });
  await expect(page.getByTestId("invoice-total")).toHaveText("৳5,150.00");
  await page.getByRole("button", { name: "Save and issue" }).click();

  await expect(page.getByText("Invoice issued")).toBeVisible();
  await expect(page.getByTestId("invoice-title")).toContainText("INV-2026-000001");
  await expect(page.getByTestId("invoice-title")).toContainText("Unpaid");
  await expect(page.getByTestId("invoice-due")).toHaveText("৳5,150.00");

  // Part of it comes in as cash.
  await page.getByRole("button", { name: "Record payment" }).click();
  const payment = page.getByTestId("payment-form");
  await payment.getByLabel("Amount").fill("2,000");
  await payment.getByRole("button", { name: "Save payment" }).click();
  await expect(page.getByText("Payment saved")).toBeVisible();
  await expect(page.getByTestId("invoice-title")).toContainText("Part paid");
  await expect(page.getByTestId("invoice-due")).toHaveText("৳3,150.00");

  // The PDF downloads with the invoice number as its name.
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF" }).click();
  expect((await download).suggestedFilename()).toBe("INV-2026-000001.pdf");

  // Emailed to the customer, with the PDF attached.
  await page.getByRole("button", { name: "Email" }).click();
  const mail = page.getByTestId("email-form");
  await expect(mail.getByLabel("To")).toHaveValue(customerEmail);
  await mail.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(`Sent to ${customerEmail}`)).toBeVisible();
  await expect
    .poll(async () => {
      const found = (await (await request.get(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${customerEmail}`)}`)).json()) as { messages: { Attachments: number }[] };
      return found.messages[0]?.Attachments ?? 0;
    })
    .toBe(1);

  // An older invoice, now overdue, shows on the dues page.
  await page.goto(`/b/${businessId}/invoices/new`);
  await page.getByLabel("Customer").selectOption({ label: "Karim Fashion" });
  await page.getByLabel("Date", { exact: true }).fill("2026-09-01");
  await page.getByLabel("Due date").fill("2026-09-15");
  await fillLine(page, 0, { description: "Old order", quantity: "1", price: "1,000" });
  await page.getByRole("button", { name: "Save and issue" }).click();
  await expect(page.getByTestId("invoice-title")).toContainText("Overdue");

  await page.goto(`/b/${businessId}/dues`);
  await expect(page.getByTestId("dues-total")).toHaveText("৳4,150.00");
  await expect(page.getByTestId("dues-overdue")).toHaveText("৳1,000.00");
  await expect(page.getByTestId("dues-table").getByRole("link", { name: "Karim Fashion" })).toBeVisible();

  // The rest of the first invoice is paid; it leaves the dues.
  await page.goto(`/b/${businessId}/invoices`);
  await page.getByTestId("invoices-list").getByRole("listitem").filter({ hasText: "INV-2026-000001" }).getByRole("link").click();
  await page.getByRole("button", { name: "Record payment" }).click();
  await page.getByTestId("payment-form").getByRole("button", { name: "Save payment" }).click();
  await expect(page.getByText("Paid in full")).toBeVisible();
  await expect(page.getByTestId("invoice-title")).toContainText("Paid");

  // Karim's page shows what is still owed.
  await page.getByRole("link", { name: "Karim Fashion" }).first().click();
  await expect(page.getByTestId("contact-due-SALE")).toHaveText("৳1,000.00");
  await expect(page.getByTestId("contact-received")).toHaveText("৳5,150.00");
});

test("bills: enter a supplier's bill as a draft, change it, record it, pay it, and void a wrong one", async ({ page }, info) => {
  await register(page, freshEmail(info.project.name));
  const businessId = await createBusiness(page, "Rahim Traders");

  await page.goto(`/b/${businessId}/bills/new`);
  // The supplier is added from inside the form and chosen at once.
  await page.getByRole("button", { name: "+ Add a new supplier" }).click();
  const form = page.getByTestId("contact-form");
  await expect(form.getByRole("radio", { name: "Supplier" })).toBeChecked();
  await form.getByLabel("Name").fill("Dhaka Fabrics");
  await form.getByRole("button", { name: "Add a contact" }).click();
  await expect(page.getByLabel("Supplier", { exact: true }).locator("option:checked")).toHaveText("Dhaka Fabrics");
  await page.getByLabel(/^Supplier's bill number/).fill("DF-778");
  await fillLine(page, 0, { description: "Fabric rolls", quantity: "2.5", price: "1,000" });
  await expect(page.getByTestId("invoice-total")).toHaveText("৳2,500.00");
  await page.getByRole("button", { name: "Save as draft" }).click();
  await expect(page.getByText("Draft saved")).toBeVisible();
  await expect(page.getByTestId("invoice-title")).toContainText("Draft bill");

  // A draft can still be changed.
  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByTestId("invoice-lines").getByLabel("Qty").fill("3");
  await expect(page.getByTestId("invoice-total")).toHaveText("৳3,000.00");
  await page.getByRole("button", { name: "Save and record" }).click();
  await expect(page.getByText("Bill recorded")).toBeVisible();
  await expect(page.getByTestId("invoice-title")).toContainText("BILL-2026-000001");

  await page.getByRole("button", { name: "Pay bill" }).click();
  await page.getByTestId("payment-form").getByRole("button", { name: "Save payment" }).click();
  await expect(page.getByText("Bill paid in full")).toBeVisible();
  await expect(page.getByTestId("invoice-due")).toHaveText("৳0.00");

  // A second bill entered by mistake is voided with a reason.
  await page.goto(`/b/${businessId}/bills/new`);
  await page.getByLabel("Supplier", { exact: true }).selectOption({ label: "Dhaka Fabrics" });
  await fillLine(page, 0, { description: "Duplicate", quantity: "1", price: "500" });
  await page.getByRole("button", { name: "Save and record" }).click();
  await expect(page.getByTestId("invoice-title")).toContainText("BILL-2026-000002");
  await page.getByRole("button", { name: "Void" }).click();
  await page.getByLabel("Why?").fill("Entered twice");
  await page.getByRole("dialog").getByRole("button", { name: "Void" }).click();
  await expect(page.getByText("Voided: Entered twice")).toBeVisible();

  await page.goto(`/b/${businessId}/dues?side=BILL`);
  await expect(page.getByText("You owe nothing")).toBeVisible();
});
