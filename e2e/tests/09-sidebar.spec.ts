import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import {
  clickSidebarTab,
  typeUrl,
  selectMethod,
  clickSave,
  clickRequestTab,
  TEST_URLS,
} from "../helpers/data";
import type { Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// 09 — Sidebar
//
// Covers: section tabs, resize, collection tree, sidebar actions,
//         request play/load, variant play/rename, history items
// ─────────────────────────────────────────────────────────────────────

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp();
});

// ═══════════════════════════════════════════════════════════════════════
// Section 1 — Sidebar Structure & Navigation
// ═══════════════════════════════════════════════════════════════════════

test.describe("Sidebar Structure", () => {
  test("section tabs switch between Collections, Flows, and History", async () => {
    await clickSidebarTab(page, "Collections");
    const collectionsTab = page.locator(
      `.sidebar-section-tab:has-text("Collections")`,
    );
    await expect(collectionsTab).toHaveClass(/active/);

    await clickSidebarTab(page, "Flows");
    const flowsTab = page.locator(`.sidebar-section-tab:has-text("Flows")`);
    await expect(flowsTab).toHaveClass(/active/);

    await clickSidebarTab(page, "History");
    const historyTab = page.locator(`.sidebar-section-tab:has-text("History")`);
    await expect(historyTab).toHaveClass(/active/);
  });

  test("sidebar section tabs highlight active tab", async () => {
    await clickSidebarTab(page, "Collections");
    const collectionsTab = page.locator(
      `${S.sidebarSectionTab}:has-text("Collections")`,
    );
    await expect(collectionsTab).toHaveClass(/active/);

    await clickSidebarTab(page, "History");
    const historyTab = page.locator(
      `${S.sidebarSectionTab}:has-text("History")`,
    );
    await expect(historyTab).toHaveClass(/active/);
    await expect(collectionsTab).not.toHaveClass(/active/);

    await clickSidebarTab(page, "Flows");
    const flowsTab = page.locator(`${S.sidebarSectionTab}:has-text("Flows")`);
    await expect(flowsTab).toHaveClass(/active/);

    await clickSidebarTab(page, "Collections");
  });

  test("sidebar resize via drag handle", async () => {
    const handle = page.locator(S.sidebarResizeHandle);
    await expect(handle).toBeVisible();

    const sidebar = page.locator(S.sidebar);
    const initialBox = await sidebar.boundingBox();
    expect(initialBox).toBeTruthy();

    const handleBox = await handle.boundingBox();
    expect(handleBox).toBeTruthy();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const hb = handleBox!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ib = initialBox!;

    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x + 100, hb.y + hb.height / 2, {
      steps: 5,
    });
    await page.mouse.up();

    const newBox = await sidebar.boundingBox();
    expect(newBox?.width).toBeGreaterThan(ib.width);
  });

  test("sidebar resize clamps to min/max (160-600px)", async () => {
    const handle = page.locator(S.sidebarResizeHandle);
    const handleBox = await handle.boundingBox();
    expect(handleBox).toBeTruthy();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const hb = handleBox!;

    // Try to drag way to the left (below minimum)
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(50, hb.y + hb.height / 2, {
      steps: 5,
    });
    await page.mouse.up();

    const sidebar = page.locator(S.sidebar);
    const box = await sidebar.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(160);
  });

  test("collection tree expand/collapse works", async () => {
    await clickSidebarTab(page, "Collections");

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
    const emptyText = page.locator(`${S.collectionRequests} ${S.sidebarEmpty}`);
    await expect(emptyText).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Section 2 — Sidebar Actions (play, load, variants)
// ═══════════════════════════════════════════════════════════════════════

test.describe("Sidebar Actions", () => {
  let actPage: Page;

  test.beforeAll(async () => {
    ({ page: actPage } = await launchApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  async function setupCollectionWithPayload(): Promise<void> {
    await clickSidebarTab(actPage, "Collections");
    const addBtn = actPage
      .locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`)
      .first();
    await addBtn.click();
    const renameInput = actPage.locator(S.renameInput);
    await renameInput.fill("Sidebar Test Col");
    await renameInput.press("Enter");

    await selectMethod(actPage, "POST");
    await typeUrl(actPage, TEST_URLS.jsonList);
    await actPage.locator(S.requestNameInput).fill("Test POST");

    await clickRequestTab(actPage, "Body");
    await actPage.locator(`${S.bodyTypeOption}:has-text("raw")`).click();
    await actPage.selectOption(S.rawLanguageSelect, "json");

    const cmContent = actPage
      .locator(`${S.requestSection} .cm-content`)
      .first();
    await cmContent.click();
    await actPage.keyboard.type('{"key": "value"}');

    await actPage.click(S.payloadAddBtn);
    await expect(actPage.locator(S.payloadTab)).toHaveCount(2);

    await clickSave(actPage);
    await actPage.locator(S.savePickerItem).first().click();
  }

  test("set up collection with payloads", async () => {
    await setupCollectionWithPayload();
    await clickSidebarTab(actPage, "Collections");
    await expect(actPage.locator(S.requestItem)).toHaveCount(1);
  });

  test("sidebar section switch shows correct tab bar", async () => {
    await clickSidebarTab(actPage, "Collections");
    const requestTabBar = actPage.locator(S.tabBar);
    await expect(requestTabBar).toBeVisible();

    await clickSidebarTab(actPage, "Flows");
    await expect(requestTabBar).toBeVisible();

    await clickSidebarTab(actPage, "Collections");
    await expect(requestTabBar).toBeVisible();
  });

  test("request play button is visible on saved request with payloads", async () => {
    const arrow = actPage.locator(S.collectionArrow).first();
    const arrowText = await arrow.textContent();
    if (arrowText?.includes("▶")) {
      await actPage.locator(S.collectionHeader).first().click();
    }

    const playBtn = actPage.locator(`${S.requestItem} ${S.requestPlayBtn}`);
    await expect(playBtn.first()).toBeVisible();
  });

  test("clicking request play button loads and sends request", async () => {
    const playBtn = actPage
      .locator(`${S.requestItem} ${S.requestPlayBtn}`)
      .first();
    await playBtn.click();

    await actPage.waitForFunction(
      () => {
        const status = document.querySelector(".response-status");
        return status && status.textContent?.match(/\d{3}/);
      },
      { timeout: 15_000 },
    );

    const statusText = await actPage.locator(S.responseStatus).textContent();
    expect(statusText).toMatch(/\d{3}/);
  });

  test("variant items are visible under request with payloads", async () => {
    await clickSidebarTab(actPage, "Collections");
    const arrow = actPage.locator(S.collectionArrow).first();
    const arrowText = await arrow.textContent();
    if (arrowText?.includes("▶")) {
      await actPage.locator(S.collectionHeader).first().click();
    }

    const variants = actPage.locator(S.requestVariantItem);
    const count = await variants.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("variant play button sends request with variant payload", async () => {
    const variantPlayBtn = actPage.locator(S.requestVariantPlayBtn).first();
    await variantPlayBtn.click();

    await actPage.waitForFunction(
      () => {
        const status = document.querySelector(".response-status");
        return status && status.textContent?.match(/\d{3}/);
      },
      { timeout: 15_000 },
    );

    const statusText = await actPage.locator(S.responseStatus).textContent();
    expect(statusText).toMatch(/\d{3}/);
  });

  test("clicking saved request in sidebar focuses existing tab (reuses)", async () => {
    await clickSidebarTab(actPage, "Collections");
    const tabsBefore = await actPage.locator(S.tabItem).count();
    await actPage.locator(S.requestItem).first().click();
    const tabsAfter = await actPage.locator(S.tabItem).count();
    expect(tabsAfter).toBe(tabsBefore);
  });

  test("loading same request again reuses existing tab (no duplicates)", async () => {
    const tabsBefore = await actPage.locator(S.tabItem).count();
    await actPage.locator(S.requestItem).first().click();
    const tabsAfter = await actPage.locator(S.tabItem).count();
    expect(tabsAfter).toBe(tabsBefore);
  });

  test("history items are created after sending requests", async () => {
    await clickSidebarTab(actPage, "History");
    const historyItems = actPage.locator(S.historyItem);
    const count = await historyItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test("clicking history item shows detail panel", async () => {
    await actPage.locator(S.historyItem).first().click();
    await expect(actPage.locator(S.historyDetailPanel)).toBeVisible();
    await expect(actPage.locator(S.historyItemSelected)).toHaveCount(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Section 3 — Payload Rename (via sidebar)
// ═══════════════════════════════════════════════════════════════════════

test.describe("Payload Rename (sidebar)", () => {
  let renPage: Page;

  test.beforeAll(async () => {
    ({ page: renPage } = await launchApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("set up collection with request that has payloads", async () => {
    await clickSidebarTab(renPage, "Collections");
    const addBtn = renPage
      .locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`)
      .first();
    await addBtn.click();
    const renameInput = renPage.locator(S.renameInput);
    await renameInput.fill("Rename Test Col");
    await renameInput.press("Enter");

    await selectMethod(renPage, "POST");
    await typeUrl(renPage, TEST_URLS.jsonList);
    await renPage.locator(S.requestNameInput).fill("Payload Req");

    await clickRequestTab(renPage, "Body");
    await renPage.locator(`${S.bodyTypeOption}:has-text("raw")`).click();

    await renPage.click(S.payloadAddBtn);
    await expect(renPage.locator(S.payloadTab)).toHaveCount(2);

    await clickSave(renPage);
    await renPage.locator(S.savePickerItem).first().click();
  });

  test("rename payload variant via sidebar rename button", async () => {
    await clickSidebarTab(renPage, "Collections");

    const arrow = renPage.locator(S.collectionArrow).first();
    const arrowText = await arrow.textContent();
    if (arrowText?.includes("▶")) {
      await renPage.locator(S.collectionHeader).first().click();
    }

    await expect(renPage.locator(S.requestVariantItem).first()).toBeVisible();

    // Make hover-only actions visible
    await renPage.evaluate(() => {
      const style = document.createElement("style");
      style.textContent = ".collection-actions { display: flex !important; }";
      document.head.appendChild(style);
    });

    const firstVariant = renPage.locator(S.requestVariantItem).first();
    const renameBtn = firstVariant.locator(
      `${S.sidebarIconBtn}[title="Rename payload"]`,
    );
    await renameBtn.click();

    const renameInput = renPage.locator(
      `${S.requestVariantItem} ${S.renameInput}`,
    );
    await expect(renameInput).toBeVisible();

    await renameInput.fill("Renamed Payload");
    await renameInput.press("Enter");

    await expect(renPage.locator(S.requestVariantName).first()).toHaveText(
      "Renamed Payload",
    );
  });
});
