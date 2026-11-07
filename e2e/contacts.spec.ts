import { expect, test, type Page } from "@playwright/test";
import { createBusiness, freshEmail, register, resetRateLimits } from "./helpers";

test.beforeEach(resetRateLimits);

const addContact = async (page: Page, fields: { kind: string; name: string; company?: string; phone?: string }) => {
  await page.getByRole("button", { name: "Add a contact" }).click();
  const form = page.getByTestId("contact-form");
  await form.getByRole("radio", { name: fields.kind }).click();
  await form.getByLabel("Name").fill(fields.name);
  if (fields.company) await form.getByLabel(/^Shop or company/).fill(fields.company);
  if (fields.phone) await form.getByLabel(/^Phone/).fill(fields.phone);
  await form.getByRole("button", { name: "Add a contact" }).click();
  await expect(page.getByText(`${fields.name} added`)).toBeVisible();
};

test("customers and suppliers: add them, record money with them, see their totals, tag a posted one, archive", async ({ page }, info) => {
  await register(page, freshEmail(info.project.name));
  const businessId = await createBusiness(page, "Rahim Traders");

  await page.goto(`/b/${businessId}/contacts`);
  await expect(page.getByText("No customers or suppliers yet")).toBeVisible();
  await addContact(page, { kind: "Customer", name: "Karim Ahmed", company: "Karim Fashion", phone: "01711000000" });
  await addContact(page, { kind: "Supplier", name: "Dhaka Fabrics" });

  // The tabs and the search narrow the list.
  await page.getByRole("radio", { name: "Suppliers" }).click();
  await expect(page.getByTestId("contacts-list").getByRole("link")).toHaveText(["Dhaka Fabrics"]);
  await page.getByRole("radio", { name: "All" }).click();
  await page.getByPlaceholder("Name, phone or email").fill("01711");
  await expect(page.getByTestId("contacts-list").getByRole("link")).toHaveText(["Karim Ahmed"]);

  // From Karim's page, record a sale: the form opens as income with Karim chosen.
  await page.getByRole("link", { name: "Karim Ahmed" }).click();
  await expect(page.getByTestId("contact-name")).toContainText("Karim Ahmed");
  await expect(page.getByText("No transactions with them yet")).toBeVisible();
  await page.getByRole("link", { name: "Record money" }).click();
  await expect(page.getByLabel(/^Customer/)).toHaveValue(/.+/);
  await page.getByLabel("Amount").fill("5,000");
  await page.getByLabel("Category").selectOption({ label: "Sales" });
  await page.getByLabel(/^Description/).fill("Eid order");
  await page.getByRole("button", { name: "Save and post" }).click();
  await expect(page.getByText("Posted to the books")).toBeVisible();
  await expect(page.getByTestId("transaction-contact")).toHaveText("Karim Ahmed");

  // A purchase where the supplier is added from inside the form.
  await page.goto(`/b/${businessId}/transactions/new`);
  await page.getByRole("radio", { name: "Expense" }).click();
  await page.getByLabel("Amount").fill("1,200");
  await page.getByLabel("Category").selectOption({ index: 1 });
  await page.getByRole("button", { name: "New", exact: true }).click();
  const form = page.getByTestId("contact-form");
  await expect(form.getByRole("radio", { name: "Supplier" })).toBeChecked();
  await form.getByLabel("Name").fill("Chittagong Threads");
  await form.getByRole("button", { name: "Add a contact" }).click();
  await expect(page.getByLabel(/^Supplier/).locator("option:checked")).toHaveText("Chittagong Threads");
  await page.getByRole("button", { name: "Save and post" }).click();
  await expect(page.getByTestId("transaction-contact")).toHaveText("Chittagong Threads");

  // An income posted with nobody, tagged afterwards from its page.
  await page.goto(`/b/${businessId}/transactions/new`);
  await page.getByRole("radio", { name: "Income" }).click();
  await page.getByLabel("Amount").fill("2,500");
  await page.getByLabel("Category").selectOption({ label: "Sales" });
  await page.getByRole("button", { name: "Save and post" }).click();
  await expect(page.getByText("Posted to the books")).toBeVisible();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByLabel("Customer or supplier").selectOption({ label: "Karim Ahmed" });
  await expect(page.getByTestId("transaction-contact")).toHaveText("Karim Ahmed");

  // Karim's totals and both transactions.
  await page.getByTestId("transaction-contact").click();
  await expect(page.getByTestId("contact-received")).toContainText("7,500");
  await expect(page.getByTestId("contact-paid")).toContainText("0");
  await expect(page.getByTestId("contact-transactions").getByRole("listitem")).toHaveCount(2);

  // Archived: gone from the list and the form, still named on old transactions.
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Archived. Old transactions keep the name.")).toBeVisible();
  await page.getByRole("link", { name: "Customers & suppliers" }).first().click();
  await expect(page.getByTestId("contacts-list").getByRole("link")).toHaveText(["Chittagong Threads", "Dhaka Fabrics"]);
  await page.goto(`/b/${businessId}/transactions/new`);
  await page.getByRole("radio", { name: "Income" }).click();
  await expect(page.getByLabel(/^Customer/).locator("option", { hasText: "Karim Ahmed" })).toHaveCount(0);
});
