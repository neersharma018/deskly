import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("the shoppable lookbook selects a live product", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Discover DESKLY" }).click();
  await expect(page).toHaveURL(/#our-story$/);
  await expect(page.getByRole("heading", { name: "Good work is in the details." })).toBeVisible();
  const marker = page.getByRole("group", { name: "Pieces in the edit" }).getByRole("button", { name: /Beam Task Lamp/ });
  await marker.click();
  await expect(marker).toHaveAttribute("aria-pressed", "true");
  const product = page.locator("#lookbook-product");
  await expect(product.getByRole("heading", { name: "Beam Task Lamp" })).toBeVisible();
  await product.getByRole("link", { name: "View product" }).click();
  await expect(page.getByRole("heading", { name: "Beam Task Lamp", level: 1 })).toBeVisible();
});

test("a customer places and cancels a cash order through the storefront", async ({ page }) => {
  const store = await (await page.request.get("/api/v1/store")).json();
  test.skip(!store.cash_on_delivery, "Enable CASH_ON_DELIVERY for this checkout flow.");
  const email = `e2e-order-${randomUUID()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Deskly Checkout Test");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("a-test-passphrase");
  await page.getByLabel("Confirm password").fill("a-test-passphrase");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account$/);

  await page.goto("/products/beam-task-lamp");
  await page.getByRole("button", { name: "Add to bag" }).click();
  await page.getByRole("link", { name: "View bag" }).click();
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await expect(page.getByRole("textbox", { name: "Email", exact: true })).toHaveValue(email);
  await page.getByLabel("Phone").fill("9876543210");
  await page.getByLabel("Address line 1").fill("10 Example Road");
  await page.getByLabel("City").fill("Mumbai");
  await page.getByLabel("State").fill("Maharashtra");
  await page.getByLabel("PIN code").fill("400001");
  await page.getByRole("radio", { name: /Cash on delivery/ }).check();
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText("Order placed. Payment is due on delivery.")).toBeVisible();
  const orderId = new URL(page.url()).searchParams.get("order");
  expect(orderId).toBeTruthy();
  await page.goto("/account/orders/" + orderId);
  await page.getByRole("button", { name: "Cancel unpaid order" }).click();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  const cart = await (await page.request.get("/api/v1/cart")).json();
  expect(cart.count).toBe(0);
});
