import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import { clickSidebarTab, typeUrl, selectMethod } from "../helpers/data";
import type { Page } from "@playwright/test";

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp();
});

test.describe("Collections CRUD", () => {
  test('collections section shows "No collections yet" when empty', async () => {
    await clickSidebarTab(page, "Collections");
    await expect(page.locator(S.sidebarEmpty).first()).toBeVisible();
  });

  test('"+" creates collection and starts inline rename', async () => {
    await clickSidebarTab(page, "Collections");

    // Click the add button in the Collections header
    const addBtn = page.locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`).first();
    await addBtn.click();

    // A collection should appear
    await expect(page.locator(S.collection)).toHaveCount(1);

    // Rename input should be visible (inline editing)
    await expect(page.locator(S.renameInput)).toBeVisible();
  });

  test("rename collection via input and Enter", async () => {
    const renameInput = page.locator(S.renameInput);
    await renameInput.fill("API Tests");
    await renameInput.press("Enter");

    // Collection name should show "API Tests"
    await expect(page.locator(S.collectionName).first()).toHaveText("API Tests");
  });

  test("expand/collapse collection via arrow click", async () => {
    const arrow = page.locator(S.collectionArrow).first();

    // Click to expand
    await arrow.click();
    await expect(page.locator(S.collectionRequests).first()).toBeVisible();

    // Click to collapse
    await arrow.click();
    await expect(page.locator(S.collectionRequests)).toHaveCount(0);
  });

  test("save request to collection via save + button on collection header", async () => {
    // First set up a request with URL
    await typeUrl(page, "https://httpbin.org/get");
    await selectMethod(page, "GET");

    // Expand the collection
    const arrow = page.locator(S.collectionArrow).first();
    await arrow.click();

    // Click the save "+" button on the collection header
    const collectionSaveBtn = page.locator(`${S.collectionHeader} ${S.sidebarIconBtn}`).first();
    await collectionSaveBtn.click();

    // Request should now appear inside the collection
    await expect(page.locator(S.requestItem)).toHaveCount(1);
  });

  test("rename request in collection", async () => {
    // Click edit button on the request
    const requestActions = page.locator(`${S.requestItem} ${S.collectionActions}`).first();
    const editBtn = requestActions.locator(S.sidebarIconBtn).first();
    await editBtn.click();

    const renameInput = page.locator(S.renameInput);
    await renameInput.fill("Get All Users");
    await renameInput.press("Enter");

    await expect(page.locator(S.requestName).first()).toHaveText("Get All Users");
  });

  test("delete request from collection", async () => {
    const requestActions = page.locator(`${S.requestItem} ${S.collectionActions}`).first();
    const deleteBtn = requestActions.locator(`${S.sidebarIconBtnDanger}`);
    await deleteBtn.click();

    await expect(page.locator(S.requestItem)).toHaveCount(0);
  });

  test("delete collection removes it from list", async () => {
    const collectionActions = page.locator(`${S.collectionHeader} ${S.collectionActions}`).first();
    const deleteBtn = collectionActions.locator(`${S.sidebarIconBtnDanger}`);
    await deleteBtn.click();

    await expect(page.locator(S.collection)).toHaveCount(0);
  });
});
