import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test.use({ trace: "off" });

test("administration can create, stock, publish and archive a product", async ({ page }) => {
  const email = process.env.PLAYWRIGHT_ADMIN_EMAIL;
  const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD;
  test.skip(!email || !password, "Set dedicated development admin credentials to exercise the admin UI.");
  const slug = "qa-desk-" + randomUUID().slice(0, 8);
  const name = "Test Desk Accessory " + slug.slice(-8);
  await page.goto("/login?next=/admin/products/new");
  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "New product", level: 1 })).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Slug").fill(slug);
  await page.getByLabel("Brand").fill("Deskly QA");
  await page.getByRole("combobox", { name: "Category", exact: true }).selectOption({ label: "Desk Mats" });
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByRole("heading", { name: "Add a variant" })).toBeVisible();
  await page.getByLabel("SKU", { exact: true }).fill(slug.toUpperCase());
  await page.getByLabel("Variant name").fill("Graphite");
  await page.getByLabel("Colour").fill("Graphite");
  await page.getByLabel("Price (paise)").fill("139900");
  await page.getByRole("button", { name: "Create variant" }).click();
  await page.getByRole("link", { name: /Adjust stock/ }).click();
  await expect(page.getByRole("heading", { name: "Adjust stock" })).toBeVisible();
  await page.getByLabel("Stock change (negative to reduce)").fill("4");
  await page.getByLabel("Adjustment reason").fill("Browser test receiving");
  await page.getByRole("button", { name: "Record adjustment" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
  await page.goBack();
  await page.getByLabel("Published", { exact: true }).check();
  await page.getByRole("button", { name: "Save product" }).click();
  const archive = page.getByRole("button", { name: "Archive product" });
  await expect(archive).toBeVisible();
  try {
    const product = await page.request.get("/api/v1/products/" + slug);
    expect(product.status()).toBe(200);
    expect((await product.json()).variants[0].available).toBe(4);
  } finally {
    await archive.click();
  }
  await expect.poll(async () => (await page.request.get("/api/v1/products/" + slug)).status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Catalogue visibility" })).toHaveCount(0);
  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { name: "Orders", exact: true })).toBeVisible();
});
