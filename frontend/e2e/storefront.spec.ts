import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("shop, filter, select a variant and keep the bag after reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Make room for better work." })).toBeVisible();
  await page.getByRole("link", { name: "Shop essentials" }).click();
  await page.getByRole("searchbox", { name: "Search" }).fill("Slate");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await page.getByRole("link", { name: "Slate 75 Mechanical Keyboard", exact: true }).last().click();
  await page.getByRole("radio", { name: "Ivory" }).check();
  await expect(page.locator(".detail-price")).toHaveText("₹6,699");
  await page.getByRole("button", { name: "Add to bag" }).click();
  await expect(page.getByText("Added to your bag.")).toBeVisible();
  await page.getByRole("link", { name: "View bag" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await page.reload();
  await expect(page.getByText(/Ivory.*each/)).toBeVisible();
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await expect(page.getByRole("heading", { name: "Shipping details" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Order summary" })).toBeVisible();
});

test("register, generate and save a catalogue-matched setup", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Deskly Test");
  await page.getByLabel("Email address").fill(`e2e-${randomUUID()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("a-test-passphrase");
  await page.getByLabel("Confirm password").fill("a-test-passphrase");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Welcome, Deskly Test." })).toBeVisible();
  await page.goto("/setup-builder");
  await page.getByLabel("Desk Mats", { exact: true }).check();
  await page.getByRole("button", { name: "Generate setup", exact: true }).click();
  await expect(page.getByText("Product total")).toBeVisible();
  const replace = page.getByLabel(/^Replace /).first();
  if (await replace.count()) await replace.selectOption({ index: 1 });
  await page.getByLabel("Setup name").fill("My tested setup");
  await page.getByRole("button", { name: "Save setup", exact: true }).click();
  await expect(page.getByText("Setup saved to your account.")).toBeVisible();
  await page.getByRole("button", { name: "Add setup to bag" }).click();
  await expect(page.getByText("Setup added to your bag.")).toBeVisible();
  await page.goto("/account/setups");
  await expect(page.getByRole("heading", { name: "My tested setup" })).toBeVisible();
  await page.getByRole("link", { name: "Open setup" }).click();
  await expect(page.getByText("Product total")).toBeVisible();
});

test("customer cannot open admin operations", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  const response = await page.request.get("/api/v1/admin/dashboard");
  expect(response.status()).toBe(401);
});
