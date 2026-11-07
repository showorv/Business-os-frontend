import { expect, test, type Browser, type Page, type TestInfo, type APIRequestContext } from "@playwright/test";
import { createBusiness, fillRegister, freshEmail, linkFromEmail, register, resetRateLimits, secondPerson } from "./helpers";

test.beforeEach(resetRateLimits);
test.setTimeout(240_000);

// Tomorrow on this machine's clock, as a date box wants it.
const tomorrow = () => {
  const day = new Date(Date.now() + 86_400_000);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
};

// The owner's business, with Karim joined as a manager (who can work on tasks).
const ownerAndKarim = async (page: Page, browser: Browser, request: APIRequestContext, info: TestInfo) => {
  await register(page, freshEmail(info.project.name));
  const businessId = await createBusiness(page, "Rahim Traders");
  const invitee = freshEmail(info.project.name, "karim");
  await page.goto(`/b/${businessId}/team`);
  await page.getByRole("button", { name: "Invite someone" }).click();
  await page.getByLabel("Their email").fill(invitee);
  await page.getByLabel("Role").selectOption("MANAGER");
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByRole("dialog", { name: "Invitation sent" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).first().click();

  const karim = await secondPerson(browser, info);
  await karim.goto(await linkFromEmail(request, invitee, /\/invitations\/accept\?token=/));
  await karim.getByRole("link", { name: "Create an account" }).click();
  await fillRegister(karim, invitee, "Karim Ahmed");
  await karim.getByRole("button", { name: "Join business" }).click();
  await expect(karim.getByRole("heading", { name: "Welcome to Rahim Traders" })).toBeVisible();
  return { businessId, karim };
};

test("a task is assigned, the assignee hears about it live, works on it and comments; reminders and the calendar", async ({ page, browser, request }, info) => {
  const { businessId, karim } = await ownerAndKarim(page, browser, request, info);
  // Karim has the app open on the dashboard, listening for news.
  await karim.goto(`/b/${businessId}`);
  await expect(karim.getByRole("button", { name: "Notifications" })).toBeVisible();

  // The owner adds a task for Karim, due tomorrow.
  await page.goto(`/b/${businessId}/tasks`);
  await expect(page.getByText("No tasks yet")).toBeVisible();
  await page.getByRole("button", { name: "New task" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Add task" }).click();
  await expect(dialog.getByText("Give the task a title.")).toBeVisible();
  await dialog.getByLabel("Title").fill("Pay the electricity bill");
  await dialog.getByRole("radio", { name: "High" }).click();
  await dialog.getByLabel("Assigned to").selectOption({ label: "Karim Ahmed" });
  await dialog.getByLabel("Due").fill(`${tomorrow()}T10:00`);
  await dialog.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByText("Task added")).toBeVisible();
  // The new task opens on the side.
  const panel = page.getByRole("dialog", { name: "Pay the electricity bill" });
  await expect(panel).toBeVisible();
  await expect(panel.getByLabel("Priority")).toHaveValue("HIGH");
  await panel.getByRole("button", { name: "Close" }).click();
  await expect(page.getByTestId("column-TODO").getByText("Pay the electricity bill")).toBeVisible();

  // Karim gets it straight away: a toast and a count on the bell, without reloading.
  await expect(karim.getByText("New task: Pay the electricity bill")).toBeVisible({ timeout: 20_000 });
  await expect(karim.getByTestId("unread-badge")).toHaveText("1");
  await karim.getByRole("button", { name: /^Notifications, 1 unread/ }).click();
  await karim.getByTestId("notification").filter({ hasText: "Pay the electricity bill" }).click();
  await expect(karim).toHaveURL(/\/tasks\?task=/);
  const karimPanel = karim.getByRole("dialog", { name: "Pay the electricity bill" });
  await expect(karimPanel).toBeVisible();
  await expect(karim.getByTestId("unread-badge")).toBeHidden();

  // He starts it and leaves a note. Done can't go straight back to Blocked, so only allowed moves show.
  await karimPanel.getByRole("group", { name: "Status" }).getByRole("button", { name: "In progress" }).click();
  await expect(karim.getByText("Moved to In progress")).toBeVisible();
  await karimPanel.getByLabel("Write a comment").fill("Paid half, the rest tomorrow");
  await karimPanel.getByRole("button", { name: "Send comment" }).click();
  await expect(karimPanel.getByText("Paid half, the rest tomorrow")).toBeVisible();

  // The owner hears about the comment, and finds it in the inbox.
  await expect(page.getByText("Karim Ahmed commented on Pay the electricity bill")).toBeVisible({ timeout: 20_000 });
  await page.goto("/notifications");
  await expect(page.getByText("You have 1 unread notification.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Today" }).getByTestId("notification")).toHaveCount(1);
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(page.getByText("You're all caught up.")).toBeVisible();

  // The board moved it; the list and the calendar show it too.
  await page.goto(`/b/${businessId}/tasks`);
  await expect(page.getByTestId("column-IN_PROGRESS").getByText("Pay the electricity bill")).toBeVisible();
  await page.getByRole("tab", { name: "List" }).click();
  await expect(page.getByText("Pay the electricity bill")).toBeVisible();
  await page.getByRole("tab", { name: "Calendar" }).click();
  await page.getByRole("button", { name: new RegExp(`^${tomorrow()}, \\d+ item`) }).click();
  await page.getByTestId("day-details").getByRole("button", { name: /Pay the electricity bill/ }).click();
  await expect(page.getByRole("dialog", { name: "Pay the electricity bill" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();

  // A yearly reminder of the owner's own.
  await page.getByRole("tab", { name: "Reminders" }).click();
  await page.getByRole("button", { name: "New reminder" }).first().click();
  const reminder = page.getByRole("dialog");
  await reminder.getByLabel("What for").fill("Renew the trade licence");
  await reminder.getByLabel("When").fill(`${tomorrow()}T09:00`);
  await reminder.getByLabel("Repeats").selectOption("YEARLY");
  await reminder.getByLabel("Notify").selectOption("10080");
  await reminder.getByRole("button", { name: "Set reminder" }).click();
  await expect(page.getByText("Reminder set")).toBeVisible();
  const row = page.getByTestId("reminder-row").filter({ hasText: "Renew the trade licence" });
  await expect(row.getByText("Every year")).toBeVisible();
  await row.getByRole("button", { name: "Options for Renew the trade licence" }).click();
  await page.getByRole("menuitem", { name: "Pause" }).click();
  await expect(row.getByText("Paused")).toBeVisible();

  await karim.context().close();
});

test("a monthly rent schedule: created, run, paused and ended; notification settings", async ({ page }, info) => {
  await register(page, freshEmail(info.project.name));
  const businessId = await createBusiness(page, "Rahim Traders");
  await page.goto(`/b/${businessId}/accounts`);
  await page.getByRole("button", { name: "Add account" }).first().click();
  const accountDialog = page.getByRole("dialog");
  await accountDialog.getByLabel("Name").fill("City Bank");
  await accountDialog.getByLabel("Kind").selectOption("BANK");
  await accountDialog.getByLabel("Opening balance").fill("50000");
  await accountDialog.getByRole("button", { name: "Add account" }).click();
  await expect(accountDialog).toBeHidden();

  await page.goto(`/b/${businessId}/recurring`);
  await expect(page.getByText("Nothing repeats yet")).toBeVisible();
  await page.getByRole("button", { name: "New schedule" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Shop rent");
  await dialog.getByRole("button", { name: "Create schedule" }).click();
  await expect(dialog.getByText("Choose an account")).toBeVisible();
  await dialog.getByLabel("Account").selectOption({ label: "City Bank" });
  await dialog.getByLabel("Category").selectOption({ label: "Rent" });
  await dialog.getByLabel("Amount").fill("15,000");
  await expect(dialog.getByText(/^On day \d+ of every month, from/)).toBeVisible();
  await dialog.getByLabel("Remind me").selectOption("3");
  await dialog.getByText("Post it straight to the books").click();
  await dialog.getByRole("button", { name: "Create schedule" }).click();
  await expect(page.getByText("Schedule created")).toBeVisible();

  // It starts today, so it's due at once. Either the worker or "Run now" records it.
  const panel = page.getByRole("dialog", { name: "Shop rent" });
  await expect(panel).toBeVisible();
  await expect(panel.getByText("−৳15,000.00")).toBeVisible();
  const runNow = panel.getByRole("button", { name: "Run now" });
  if (await runNow.isVisible()) await runNow.click();
  await expect(async () => {
    await page.reload();
    await expect(page.getByRole("dialog", { name: "Shop rent" }).getByTestId("schedule-run")).toHaveCount(1, { timeout: 2_000 });
  }).toPass({ timeout: 30_000 });

  // The rent landed in the books, posted.
  await page.getByRole("dialog", { name: "Shop rent" }).getByRole("link", { name: "Open the transaction" }).click();
  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]+$/);
  await expect(page.getByText("৳15,000.00").first()).toBeVisible();

  // Back on the list: the monthly total, then pause, resume and end it.
  await page.goto(`/b/${businessId}/recurring`);
  await expect(page.getByText("Going out each month").locator("..").getByText("৳15,000.00")).toBeVisible();
  await page.getByTestId("schedule-card").getByRole("button", { name: "Shop rent" }).click();
  const again = page.getByRole("dialog", { name: "Shop rent" });
  await again.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByText("Schedule paused")).toBeVisible();
  await again.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByText("Schedule running again")).toBeVisible();
  await again.getByRole("button", { name: "End schedule" }).click();
  await page.getByRole("dialog", { name: "End “Shop rent”?" }).getByRole("button", { name: "End schedule" }).click();
  await expect(page.getByText("Schedule ended")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("1 ended schedule")).toBeVisible();

  // How this person is notified: email off, quiet hours on.
  await page.goto("/settings/notifications");
  await page.getByRole("switch", { name: "Email" }).click();
  await page.getByRole("switch", { name: "Quiet hours" }).click();
  await page.getByLabel("From").fill("21:30");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("switch", { name: "Email" })).toHaveAttribute("aria-checked", "false");
  await expect(page.getByLabel("From")).toHaveValue("21:30");
  await expect(page.getByText("Push on this device")).toBeVisible();
});
