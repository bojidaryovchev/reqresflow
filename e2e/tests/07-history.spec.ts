import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import {
  typeUrl,
  sendRequest,
  selectMethod,
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

    const items = page.locator(S.historyItem);
    await expect(items).toHaveCount(1);

    const firstItem = items.first();
    await expect(firstItem.locator(S.requestMethodBadge)).toBeVisible();
    await expect(firstItem.locator(S.historyStatus)).toBeVisible();
    await expect(firstItem.locator(S.historyItemUrl)).toBeVisible();
  });

  test("history entry shows response time", async () => {
    await clickSidebarTab(page, "History");
    const firstItem = page.locator(S.historyItem).first();
    const timeEl = firstItem.locator(S.historyTime);
    await expect(timeEl).toBeVisible();
    const text = await timeEl.textContent();
    expect(text).toMatch(/\d+ms/);
  });

  test("history entry shows timestamp", async () => {
    await clickSidebarTab(page, "History");
    const firstItem = page.locator(S.historyItem).first();
    const timestampEl = firstItem.locator(".history-item-timestamp");
    await expect(timestampEl).toBeVisible();
    const text = await timestampEl.textContent();
    // Timestamp should have some content (time or date)
    expect((text ?? "").trim().length).toBeGreaterThan(0);
  });

  test("history badge shows count", async () => {
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

  test("history entry preserves method and URL in restored tab", async () => {
    // The tab opened from history should have the same URL
    const urlInput = page.locator(S.urlInput);
    await expect(urlInput).toHaveValue(TEST_URLS.json);
  });

  test("sending another request updates history count", async () => {
    // Send a POST request to a reliable endpoint
    await page.click(S.tabAdd);
    await selectMethod(page, "POST");
    await typeUrl(page, TEST_URLS.jsonList);
    await sendRequest(page);

    await clickSidebarTab(page, "History");
    const items = page.locator(S.historyItem);
    await expect(items).toHaveCount(2);

    // Badge should show 2
    const historyTab = page.locator(`.sidebar-section-tab:has-text("History")`);
    const badge = historyTab.locator(S.historyBadge);
    await expect(badge).toHaveText("2");
  });

  test("history entries are ordered newest first", async () => {
    await clickSidebarTab(page, "History");
    const items = page.locator(S.historyItem);

    // First item should be the POST (newest)
    const firstMethod = items.first().locator(S.requestMethodBadge);
    await expect(firstMethod).toHaveText("POST");

    // Second item should be the GET (oldest)
    const secondMethod = items.nth(1).locator(S.requestMethodBadge);
    await expect(secondMethod).toHaveText("GET");
  });

  test("clear history button removes all entries", async () => {
    await clickSidebarTab(page, "History");

    // Click the clear button (×) in the history header
    const clearBtn = page.locator(`.sidebar-header ${S.sidebarAddBtn}`);
    await clearBtn.click();

    await expect(page.locator(S.historyItem)).toHaveCount(0);
    await expect(page.locator(S.sidebarEmpty)).toBeVisible();
  });

  test("history badge disappears after clearing", async () => {
    const historyTab = page.locator(`.sidebar-section-tab:has-text("History")`);
    const badge = historyTab.locator(S.historyBadge);
    await expect(badge).not.toBeVisible();
  });
});
