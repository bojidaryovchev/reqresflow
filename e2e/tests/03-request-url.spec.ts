import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import { typeUrl, selectMethod, clickRequestTab } from "../helpers/data";
import type { Page } from "@playwright/test";

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp();
});

test.describe("URL & Method", () => {
  test("method dropdown cycles through all HTTP methods", async () => {
    const methods = [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ];
    for (const method of methods) {
      await selectMethod(page, method);
      await expect(page.locator(S.methodSelect)).toHaveValue(method);
    }
    // Reset to GET
    await selectMethod(page, "GET");
  });

  test("typing URL updates the input field", async () => {
    await typeUrl(page, "https://httpbin.org/get");
    const urlInput = page.locator(`${S.urlBar} .autosuggest-wrapper input`);
    await expect(urlInput).toHaveValue("https://httpbin.org/get");
  });

  test("URL with query string auto-populates params table", async () => {
    await typeUrl(page, "https://httpbin.org/get?foo=bar&baz=qux");

    await clickRequestTab(page, "Params");

    // Should have params populated (plus the trailing empty row)
    const rows = page.locator(S.kvRow);
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("adding param row appends to URL query string", async () => {
    // Clear and start fresh
    await typeUrl(page, "https://httpbin.org/get");
    await clickRequestTab(page, "Params");

    // Fill the first empty row
    const firstRow = page.locator(S.kvRow).first();
    const keyInput = firstRow.locator(".autosuggest-wrapper input").first();
    const valueInput = firstRow.locator(".autosuggest-wrapper input").nth(1);

    await keyInput.fill("testKey");
    await valueInput.fill("testValue");

    // URL should now contain the param
    const urlInput = page.locator(`${S.urlBar} .autosuggest-wrapper input`);
    await expect(urlInput).toHaveValue(/testKey=testValue/);
  });

  test("disabling param row removes it from URL", async () => {
    await clickRequestTab(page, "Params");

    // Uncheck the first param's enabled checkbox
    const firstRow = page.locator(S.kvRow).first();
    const checkbox = firstRow.locator('input[type="checkbox"]');
    await checkbox.uncheck();

    // URL should no longer contain the param
    const urlInput = page.locator(`${S.urlBar} .autosuggest-wrapper input`);
    await expect(urlInput).not.toHaveValue(/testKey=testValue/);

    // Re-enable for cleanup
    await checkbox.check();
  });

  test("removing param removes from URL", async () => {
    await clickRequestTab(page, "Params");

    const removeBtn = page.locator(S.kvRow).first().locator(S.kvRemoveBtn);
    await removeBtn.click();

    const newUrl = await page
      .locator(`${S.urlBar} .autosuggest-wrapper input`)
      .inputValue();
    expect(newUrl).not.toContain("testKey");
  });
});
