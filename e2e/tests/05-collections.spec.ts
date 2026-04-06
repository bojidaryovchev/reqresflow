import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import {
  clickSidebarTab,
  typeUrl,
  selectMethod,
  clickSave,
  TEST_URLS,
} from "../helpers/data";
import type { Page } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════
// UF-05: Collections
// Covers: create/rename/delete collections, save/open/delete requests,
//         expand/collapse, save picker, linked request overwrite,
//         active request highlight, dirty state save button
// ═══════════════════════════════════════════════════════════════════════

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp();
});

// ── Collections CRUD ──────────────────────────────────────────────────

test.describe("Collections CRUD", () => {
  test('collections section shows "No collections yet" when empty', async () => {
    await clickSidebarTab(page, "Collections");
    await expect(page.locator(S.sidebarEmpty).first()).toBeVisible();
  });

  test('"+" creates collection and starts inline rename', async () => {
    await clickSidebarTab(page, "Collections");

    const addBtn = page
      .locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`)
      .first();
    await addBtn.click();

    await expect(page.locator(S.collection)).toHaveCount(1);
    await expect(page.locator(S.renameInput)).toBeVisible();
  });

  test("rename collection via input and Enter", async () => {
    const renameInput = page.locator(S.renameInput);
    await renameInput.fill("API Tests");
    await renameInput.press("Enter");

    await expect(page.locator(S.collectionName).first()).toHaveText(
      "API Tests",
    );
  });

  test("expand/collapse collection via arrow click", async () => {
    const arrow = page.locator(S.collectionArrow).first();

    await arrow.click();
    await expect(page.locator(S.collectionRequests)).toHaveCount(0);

    await arrow.click();
    await expect(page.locator(S.collectionRequests).first()).toBeVisible();
  });

  test("save request to collection via save + button on collection header", async () => {
    await typeUrl(page, "https://httpbin.org/get");
    await selectMethod(page, "GET");

    await page.locator(S.collectionHeader).first().hover();
    const collectionSaveBtn = page
      .locator(`${S.collectionHeader} ${S.sidebarIconBtn}`)
      .first();
    await collectionSaveBtn.click();

    await expect(page.locator(S.requestItem)).toHaveCount(1);
  });

  test("rename request in collection", async () => {
    await page.locator(S.requestItem).first().hover();
    const requestActions = page
      .locator(`${S.requestItem} ${S.collectionActions}`)
      .first();
    const editBtn = requestActions.locator(S.sidebarIconBtn).first();
    await editBtn.click();

    const renameInput = page.locator(S.renameInput);
    await renameInput.fill("Get All Users");
    await renameInput.press("Enter");

    await expect(page.locator(S.requestName).first()).toHaveText(
      "Get All Users",
    );
  });

  test("delete request from collection", async () => {
    await page.locator(S.requestItem).first().hover();
    const requestActions = page
      .locator(`${S.requestItem} ${S.collectionActions}`)
      .first();
    const deleteBtn = requestActions.locator(`${S.sidebarIconBtnDanger}`);
    await deleteBtn.click();

    await expect(page.locator(S.requestItem)).toHaveCount(0);
  });

  test("delete collection removes it from list", async () => {
    await page.locator(S.collectionHeader).first().hover();
    const collectionActions = page
      .locator(`${S.collectionHeader} ${S.collectionActions}`)
      .first();
    const deleteBtn = collectionActions.locator(`${S.sidebarIconBtnDanger}`);
    await deleteBtn.click();

    await expect(page.locator(S.collection)).toHaveCount(0);
  });
});

// ── Save & Load Requests ──────────────────────────────────────────────

test.describe("Save & Load Requests", () => {
  test("save button on unlinked request opens Save Picker modal", async () => {
    await typeUrl(page, "https://httpbin.org/get");

    await clickSave(page);

    await expect(page.locator(S.savePickerModal)).toBeVisible();

    await page.locator(S.savePickerClose).click();
    await expect(page.locator(S.savePickerModal)).toBeHidden();
  });

  test("save picker shows empty message when no collections exist", async () => {
    await clickSave(page);
    await expect(page.locator(S.savePickerEmpty)).toBeVisible();

    await page.locator(S.savePickerClose).click();
  });

  test("create collection then save request to it via picker", async () => {
    await clickSidebarTab(page, "Collections");
    const addBtn = page
      .locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`)
      .first();
    await addBtn.click();
    const renameInput = page.locator(S.renameInput);
    await renameInput.fill("My API");
    await renameInput.press("Enter");

    await clickSave(page);
    await expect(page.locator(S.savePickerModal)).toBeVisible();

    await page.locator(S.savePickerItem).first().click();

    await expect(page.locator(S.savePickerModal)).toBeHidden();
    await expect(page.locator(S.tabDirty)).toBeHidden();
  });

  test("save button on linked request overwrites without picker", async () => {
    const urlInput = page.locator(`${S.urlBar} .autosuggest-wrapper input`);
    const currentUrl = await urlInput.inputValue();
    await typeUrl(page, currentUrl + "?updated=true");

    await expect(page.locator(S.tabDirty)).toBeVisible();

    await clickSave(page);
    await expect(page.locator(S.savePickerModal)).toBeHidden();
    await expect(page.locator(S.tabDirty)).toBeHidden();
  });

  test("load request from collection reuses existing tab", async () => {
    await clickSidebarTab(page, "Collections");

    const arrow = page.locator(S.collectionArrow).first();
    const arrowText = await arrow.textContent();
    if (arrowText?.includes("\u25B6")) {
      await arrow.click();
    }

    const tabsBefore = await page.locator(S.tabItem).count();

    await page.locator(S.requestItem).first().click();

    const tabsAfter = await page.locator(S.tabItem).count();
    expect(tabsAfter).toBe(tabsBefore);
  });

  test("active request is highlighted in sidebar", async () => {
    await expect(page.locator(S.requestItemActive)).toHaveCount(1);
  });
});

// ── Save Button Dirty State ──────────────────────────────────────────

test.describe("Save Button Dirty State", () => {
  test("save button gains dirty class when tab has unsaved changes", async () => {
    // Open a fresh tab so it's unlinked
    await page.click(S.tabAdd);
    await typeUrl(page, TEST_URLS.get);

    await page.locator(S.requestNameInput).fill("Dirty Request");

    // Save into an existing collection (from prior tests)
    await clickSave(page);
    await expect(page.locator(S.savePickerModal)).toBeVisible();
    await page.locator(S.savePickerItem).first().click();

    // Now modify the URL to make it dirty
    await typeUrl(page, TEST_URLS.post);

    const saveBtn = page.locator(S.saveBtn);
    await expect(saveBtn).toHaveClass(/dirty/);
  });

  test("save button loses dirty class after saving", async () => {
    await page.keyboard.press("Control+s");

    const saveBtn = page.locator(S.saveBtn);
    await expect(saveBtn).not.toHaveClass(/dirty/);
  });
});
