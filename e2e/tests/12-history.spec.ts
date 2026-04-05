import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import {
  typeUrl,
  sendRequest,
  clickSidebarTab,
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

test.describe("History", () => {
  test('history section shows "No request history yet" when empty', async () => {
    await clickSidebarTab(page, "History");
    await expect(page.locator(S.sidebarEmpty)).toBeVisible();
  });

  test("sending request adds entry to history", async () => {
    await typeUrl(page, TEST_URLS.json);
    await sendRequest(page);

    await clickSidebarTab(page, "History");

    // History should now have 1 entry
    const items = page.locator(S.historyItem);
    await expect(items).toHaveCount(1);

    // Entry should show method, status, URL
    const firstItem = items.first();
    await expect(firstItem.locator(S.requestMethodBadge)).toBeVisible();
    await expect(firstItem.locator(S.historyStatus)).toBeVisible();
    await expect(firstItem.locator(S.historyItemUrl)).toBeVisible();
  });

  test("history badge shows count", async () => {
    // The History section tab should show a badge with "1"
    const historyTab = page.locator(`.sidebar-section-tab:has-text("History")`);
    const badge = historyTab.locator(S.historyBadge);
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText("1");
  });

  test("clicking history entry opens request in new tab", async () => {
    await clickSidebarTab(page, "History");

    const tabsBefore = await page.locator(S.tabItem).count();
    await page.locator(S.historyItem).first().click();
    const tabsAfter = await page.locator(S.tabItem).count();

    expect(tabsAfter).toBe(tabsBefore + 1);
  });

  test("clear history button removes all entries", async () => {
    await clickSidebarTab(page, "History");

    // Click the clear button (×) in the history header
    const clearBtn = page.locator(`.sidebar-header ${S.sidebarAddBtn}`);
    await clearBtn.click();

    await expect(page.locator(S.historyItem)).toHaveCount(0);
    await expect(page.locator(S.sidebarEmpty)).toBeVisible();
  });
});
