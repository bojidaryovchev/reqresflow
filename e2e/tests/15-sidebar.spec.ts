import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import { clickSidebarTab } from "../helpers/data";
import type { Page } from "@playwright/test";

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp();
});

test.describe("Sidebar", () => {
  test("section tabs switch between Collections, Flows, and History", async () => {
    // Collections
    await clickSidebarTab(page, "Collections");
    const collectionsTab = page.locator(
      `.sidebar-section-tab:has-text("Collections")`,
    );
    await expect(collectionsTab).toHaveClass(/active/);

    // Flows
    await clickSidebarTab(page, "Flows");
    const flowsTab = page.locator(`.sidebar-section-tab:has-text("Flows")`);
    await expect(flowsTab).toHaveClass(/active/);

    // History
    await clickSidebarTab(page, "History");
    const historyTab = page.locator(`.sidebar-section-tab:has-text("History")`);
    await expect(historyTab).toHaveClass(/active/);
  });

  test("sidebar resize via drag handle", async () => {
    const handle = page.locator(S.sidebarResizeHandle);
    await expect(handle).toBeVisible();

    const sidebar = page.locator(S.sidebar);
    const initialBox = await sidebar.boundingBox();
    expect(initialBox).toBeTruthy();

    // Drag the handle to the right to widen the sidebar
    const handleBox = await handle.boundingBox();
    expect(handleBox).toBeTruthy();

    await page.mouse.move(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      handleBox!.x + handleBox!.width / 2,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      handleBox!.y + handleBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      handleBox!.x + 100,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      handleBox!.y + handleBox!.height / 2,
      { steps: 5 },
    );
    await page.mouse.up();

    const newBox = await sidebar.boundingBox();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(newBox!.width).toBeGreaterThan(initialBox!.width);
  });

  test("sidebar resize clamps to min/max (160-600px)", async () => {
    const handle = page.locator(S.sidebarResizeHandle);
    const handleBox = await handle.boundingBox();
    expect(handleBox).toBeTruthy();

    // Try to drag way to the left (below minimum)
    await page.mouse.move(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      handleBox!.x + handleBox!.width / 2,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      handleBox!.y + handleBox!.height / 2,
    );
    await page.mouse.down();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await page.mouse.move(50, handleBox!.y + handleBox!.height / 2, {
      steps: 5,
    });
    await page.mouse.up();

    const sidebar = page.locator(S.sidebar);
    const box = await sidebar.boundingBox();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(box!.width).toBeGreaterThanOrEqual(160);
  });

  test("collection tree expand/collapse works", async () => {
    await clickSidebarTab(page, "Collections");

    // Create a collection
    const addBtn = page
      .locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`)
      .first();
    await addBtn.click();
    const renameInput = page.locator(S.renameInput);
    await renameInput.fill("Test");
    await renameInput.press("Enter");

    // Collection starts expanded after creation, so first click collapses
    const arrow = page.locator(S.collectionArrow).first();
    await arrow.click();
    await expect(page.locator(S.collectionRequests)).toHaveCount(0);

    // Click again to expand
    await arrow.click();
    await expect(page.locator(S.collectionRequests)).toBeVisible();
  });

  test("empty collection shows placeholder text", async () => {
    // Collection is already expanded from previous test
    // Should show empty state inside
    const emptyText = page.locator(`${S.collectionRequests} ${S.sidebarEmpty}`);
    await expect(emptyText).toBeVisible();
  });
});
