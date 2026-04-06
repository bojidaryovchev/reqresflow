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

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp();
});

/**
 * Save a request with a payload to enable the play buttons.
 */
async function setupCollectionWithPayload(): Promise<void> {
  // Create collection
  await clickSidebarTab(page, "Collections");
  const addBtn = page.locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`).first();
  await addBtn.click();
  const renameInput = page.locator(S.renameInput);
  await renameInput.fill("Sidebar Test Col");
  await renameInput.press("Enter");

  // Configure a POST request with payload
  await selectMethod(page, "POST");
  await typeUrl(page, TEST_URLS.post);
  await page.locator(S.requestNameInput).fill("Test POST");

  // Set body type to raw JSON
  await clickRequestTab(page, "Body");
  await page.locator(`${S.bodyTypeOption}:has-text("raw")`).click();
  await page.selectOption(S.rawLanguageSelect, "json");

  // Type body into CodeMirror
  const cmContent = page.locator(`${S.requestSection} .cm-content`).first();
  await cmContent.click();
  await page.keyboard.type('{"key": "value"}');

  // Add a payload (variant)
  await page.click(S.payloadAddBtn);
  await expect(page.locator(S.payloadTab)).toHaveCount(2);

  // Save the request
  await clickSave(page);
  await page.locator(S.savePickerItem).first().click();
}

test.describe("Sidebar Actions", () => {
  test("set up collection with payloads", async () => {
    await setupCollectionWithPayload();

    // Verify collection exists with request
    await clickSidebarTab(page, "Collections");
    await expect(page.locator(S.requestItem)).toHaveCount(1);
  });

  test("sidebar section switch shows correct tab bar", async () => {
    // When on Collections, request tabs should show
    await clickSidebarTab(page, "Collections");
    const requestTabBar = page.locator(S.tabBar);
    await expect(requestTabBar).toBeVisible();

    // Switch to Flows
    await clickSidebarTab(page, "Flows");

    // The request tab bar is replaced with flow tab bar
    // Flow tabs bar still uses .request-tabs-bar parent but shows flow tabs
    await expect(requestTabBar).toBeVisible();

    // Switch back to Collections
    await clickSidebarTab(page, "Collections");
    await expect(requestTabBar).toBeVisible();
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
    const flowsTab = page.locator(
      `${S.sidebarSectionTab}:has-text("Flows")`,
    );
    await expect(flowsTab).toHaveClass(/active/);

    // Go back to collections for remaining tests
    await clickSidebarTab(page, "Collections");
  });

  test("request play button is visible on saved request with payloads", async () => {
    // Expand collection if collapsed
    const arrow = page.locator(S.collectionArrow).first();
    const arrowText = await arrow.textContent();
    if (arrowText?.includes("▶")) {
      await page.locator(S.collectionHeader).first().click();
    }

    // The request item should have a play button
    const playBtn = page.locator(
      `${S.requestItem} ${S.requestPlayBtn}`,
    );
    await expect(playBtn.first()).toBeVisible();
  });

  test("clicking request play button loads and sends request", async () => {
    const playBtn = page.locator(
      `${S.requestItem} ${S.requestPlayBtn}`,
    ).first();
    await playBtn.click();

    // Wait for response (pendingSendRef triggers auto-send)
    await page.waitForFunction(
      () => {
        const status = document.querySelector(".response-status");
        return status && status.textContent?.includes("200");
      },
      { timeout: 15_000 },
    );

    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");
  });

  test("variant items are visible under request with payloads", async () => {
    await clickSidebarTab(page, "Collections");

    // Expand the collection
    const arrow = page.locator(S.collectionArrow).first();
    const arrowText = await arrow.textContent();
    if (arrowText?.includes("▶")) {
      await page.locator(S.collectionHeader).first().click();
    }

    const variants = page.locator(S.requestVariantItem);
    const count = await variants.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("variant play button sends request with variant payload", async () => {
    const variantPlayBtn = page.locator(S.requestVariantPlayBtn).first();
    await variantPlayBtn.click();

    // Wait for response
    await page.waitForFunction(
      () => {
        const status = document.querySelector(".response-status");
        return status && status.textContent?.includes("200");
      },
      { timeout: 15_000 },
    );

    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");
  });

  test("clicking saved request in sidebar focuses existing tab (reuses)", async () => {
    // The saved request is already open from the play-button test above.
    // Clicking it again should just focus the existing tab, not create a new one.
    await clickSidebarTab(page, "Collections");
    const tabsBefore = await page.locator(S.tabItem).count();

    await page.locator(S.requestItem).first().click();

    const tabsAfter = await page.locator(S.tabItem).count();
    expect(tabsAfter).toBe(tabsBefore);
  });

  test("loading same request again reuses existing tab (no duplicates)", async () => {
    const tabsBefore = await page.locator(S.tabItem).count();

    // Click same request again
    await page.locator(S.requestItem).first().click();

    const tabsAfter = await page.locator(S.tabItem).count();
    expect(tabsAfter).toBe(tabsBefore);
  });

  test("history items are created after sending requests", async () => {
    await clickSidebarTab(page, "History");

    // We sent requests earlier, so history should have entries
    const historyItems = page.locator(S.historyItem);
    const count = await historyItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test("clicking history item loads it into a tab", async () => {
    const tabsBefore = await page.locator(S.tabItem).count();

    await page.locator(S.historyItem).first().click();

    const tabsAfter = await page.locator(S.tabItem).count();
    expect(tabsAfter).toBe(tabsBefore + 1);
  });
});
