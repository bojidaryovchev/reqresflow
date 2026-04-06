import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import { clickRequestTab } from "../helpers/data";
import type { Page } from "@playwright/test";

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp();
});

test.describe("Response Captures", () => {
  test('empty captures shows "No captures yet" message', async () => {
    await clickRequestTab(page, "Captures");
    await expect(page.locator(S.capturesEmpty)).toBeVisible();
  });

  test("warning shows when no environment is selected", async () => {
    await clickRequestTab(page, "Captures");

    // If no env is active, warning should show
    const envSelect = page.locator(S.envSelect);
    const currentVal = await envSelect.inputValue();
    if (!currentVal || currentVal === "") {
      await expect(page.locator(S.capturesWarning)).toBeVisible();
    }
  });

  test("add capture creates row with all fields", async () => {
    await clickRequestTab(page, "Captures");
    await page.click(S.captureAddBtn);

    const row = page.locator(S.captureRow);
    await expect(row).toHaveCount(1);

    // Row should have: checkbox, varName input, source select, path input, remove btn
    await expect(row.locator('input[type="checkbox"]')).toBeVisible();
    await expect(row.locator(S.captureVarInput)).toBeVisible();
    await expect(row.locator(S.captureSourceSelect)).toBeVisible();
    await expect(row.locator(S.captureRemoveBtn)).toBeVisible();
  });

  test("source dropdown has Body, Header, Status options", async () => {
    const sourceSelect = page.locator(S.captureSourceSelect).first();
    const options = sourceSelect.locator("option");
    const values = await options.allTextContents();
    expect(values.some((v) => v.includes("Body"))).toBe(true);
    expect(values.some((v) => v.includes("Header"))).toBe(true);
    expect(values.some((v) => v.includes("Status"))).toBe(true);
  });

  test("path input hidden when source is status", async () => {
    const sourceSelect = page.locator(S.captureSourceSelect).first();
    await sourceSelect.selectOption("status");

    // Path input is conditionally removed (not just disabled) when source is status
    await expect(page.locator(S.capturePathInput)).toHaveCount(0);

    // Reset source back to body so subsequent tests have path input visible
    await sourceSelect.selectOption("body");
    await expect(page.locator(S.capturePathInput).first()).toBeVisible();
  });

  test("toggle capture enabled/disabled via checkbox", async () => {
    const checkbox = page
      .locator(`${S.captureRow} input[type="checkbox"]`)
      .first();

    // Should start checked (enabled)
    await expect(checkbox).toBeChecked();

    // Uncheck
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();

    // Re-check
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  });

  test("remove capture removes row", async () => {
    await expect(page.locator(S.captureRow)).toHaveCount(1);
    await page.locator(S.captureRemoveBtn).first().click();
    await expect(page.locator(S.captureRow)).toHaveCount(0);
  });
});
