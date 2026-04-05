import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import { clickSidebarTab, typeUrl, clickSave } from "../helpers/data";
import type { Page } from "@playwright/test";

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp();
});

test.describe("Save & Load Requests", () => {
  test("save button on unlinked request opens Save Picker modal", async () => {
    await typeUrl(page, "https://httpbin.org/get");

    await clickSave(page);

    // Save picker modal should appear
    await expect(page.locator(S.savePickerModal)).toBeVisible();

    // Close it
    await page.locator(S.savePickerClose).click();
    await expect(page.locator(S.savePickerModal)).toBeHidden();
  });

  test("save picker shows empty message when no collections exist", async () => {
    await clickSave(page);
    await expect(page.locator(S.savePickerEmpty)).toBeVisible();

    await page.locator(S.savePickerClose).click();
  });

  test("create collection then save request to it via picker", async () => {
    // Create a collection first
    await clickSidebarTab(page, "Collections");
    const addBtn = page.locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`).first();
    await addBtn.click();
    const renameInput = page.locator(S.renameInput);
    await renameInput.fill("My API");
    await renameInput.press("Enter");

    // Now save the current request
    await clickSave(page);
    await expect(page.locator(S.savePickerModal)).toBeVisible();

    // Click the collection in the picker
    await page.locator(S.savePickerItem).first().click();

    // Modal should close
    await expect(page.locator(S.savePickerModal)).toBeHidden();

    // Dirty indicator should be gone
    await expect(page.locator(S.tabDirty)).toBeHidden();
  });

  test("save button on linked request overwrites without picker", async () => {
    // Modify the request (add a param) to make it dirty
    const urlInput = page.locator(`${S.urlBar} .autosuggest-wrapper input`);
    const currentUrl = await urlInput.inputValue();
    await typeUrl(page, currentUrl + "?updated=true");

    // Tab should be dirty
    await expect(page.locator(S.tabDirty)).toBeVisible();

    // Save should directly overwrite (no picker)
    await clickSave(page);
    await expect(page.locator(S.savePickerModal)).toBeHidden();
    await expect(page.locator(S.tabDirty)).toBeHidden();
  });

  test("load request from collection opens new tab", async () => {
    await clickSidebarTab(page, "Collections");

    // Expand collection
    const arrow = page.locator(S.collectionArrow).first();
    await arrow.click();

    const tabsBefore = await page.locator(S.tabItem).count();

    // Click the saved request
    await page.locator(S.requestItem).first().click();

    const tabsAfter = await page.locator(S.tabItem).count();
    expect(tabsAfter).toBe(tabsBefore + 1);
  });

  test("active request is highlighted in sidebar", async () => {
    await expect(page.locator(S.requestItemActive)).toHaveCount(1);
  });
});
