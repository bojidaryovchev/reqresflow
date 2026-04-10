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

  test("clicking history entry shows detail panel", async () => {
    await clickSidebarTab(page, "History");

    await page.locator(S.historyItem).first().click();

    // Detail panel should be visible
    await expect(page.locator(S.historyDetailPanel)).toBeVisible();
    // Entry should be highlighted in sidebar
    await expect(page.locator(S.historyItemSelected)).toHaveCount(1);
  });

  test("detail panel shows method, URL, and status", async () => {
    await expect(page.locator(S.historyDetailMethod)).toHaveText("GET");
    await expect(page.locator(S.historyDetailUrl)).toContainText(
      TEST_URLS.json,
    );
    await expect(page.locator(S.historyDetailStatus)).toBeVisible();
  });

  test("detail panel has Response, Request, Captures tabs", async () => {
    const tabs = page.locator(S.historyDetailTab);
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(0)).toContainText("Response");
    await expect(tabs.nth(1)).toContainText("Request");
    await expect(tabs.nth(2)).toContainText("Captures");
  });

  test("detail panel shows response body by default", async () => {
    // Response tab should be active
    await expect(page.locator(S.historyDetailTabActive)).toContainText(
      "Response",
    );
    // Should have some content in the detail body
    await expect(page.locator(S.historyDetailBody)).toBeVisible();
  });

  test("response tab shows status and response body content", async () => {
    // The step response content should show status
    const meta = page.locator(S.stepResponseMeta);
    await expect(meta).toBeVisible();
    // Should show 200 status
    const status = page.locator(S.stepResponseStatus);
    await expect(status).toContainText("200");
    // Response body section should exist with actual content
    await expect(page.locator(S.stepResponseBody)).toBeVisible();
  });

  test("clicking Request tab shows resolved request details", async () => {
    await page.locator(S.historyDetailTab).nth(1).click();
    await expect(page.locator(S.historyDetailTabActive)).toContainText(
      "Request",
    );
    await expect(page.locator(S.historyDetailBody)).toBeVisible();
  });

  test("request content shows resolved URL and method", async () => {
    // The request line should show the method and URL
    const requestLine = page.locator(S.stepRequestLine);
    await expect(requestLine).toBeVisible();
    await expect(requestLine).toContainText("GET");
    const requestUrl = page.locator(S.stepRequestUrl);
    await expect(requestUrl).toContainText(TEST_URLS.json);
  });

  test("captures tab shows empty state when no captures configured", async () => {
    await page.locator(S.historyDetailTab).nth(2).click();
    await expect(page.locator(S.historyDetailTabActive)).toContainText(
      "Captures",
    );
    // No captures were configured, so expect empty message
    await expect(page.locator(S.stepDetailEmpty)).toBeVisible();
  });

  test("close button hides detail panel", async () => {
    await expect(page.locator(S.historyDetailPanel)).toBeVisible();
    await page.locator(S.historyDetailClose).click();
    await expect(page.locator(S.historyDetailPanel)).not.toBeVisible();
    // Selected state should be cleared
    await expect(page.locator(S.historyItemSelected)).toHaveCount(0);
  });

  test("clicking entry again re-opens detail panel", async () => {
    await page.locator(S.historyItem).first().click();
    await expect(page.locator(S.historyDetailPanel)).toBeVisible();
    await expect(page.locator(S.historyItemSelected)).toHaveCount(1);
  });

  test("Open as New Request opens tab with URL", async () => {
    const tabsBefore = await page.locator(S.tabItem).count();

    // Click "Open as New Request" button
    await page.locator(`${S.historyDetailActionBtn}.secondary`).click();

    const tabsAfter = await page.locator(S.tabItem).count();
    expect(tabsAfter).toBe(tabsBefore + 1);

    // The tab should have the same URL
    const urlInput = page.locator(S.urlInput);
    await expect(urlInput).toHaveValue(TEST_URLS.json);
  });

  test("Replay Exact opens tab and sends request", async () => {
    // Go back to history and open detail panel
    await clickSidebarTab(page, "History");
    await page.locator(S.historyItem).first().click();
    await expect(page.locator(S.historyDetailPanel)).toBeVisible();

    const tabsBefore = await page.locator(S.tabItem).count();

    // Click "Replay Exact" button
    await page.locator(`${S.historyDetailActionBtn}.primary`).click();

    // Should open a new tab
    const tabsAfter = await page.locator(S.tabItem).count();
    expect(tabsAfter).toBe(tabsBefore + 1);

    // Should have the correct URL
    const urlInput = page.locator(S.urlInput);
    await expect(urlInput).toHaveValue(TEST_URLS.json);

    // Replay Exact also sends the request, so a response should appear
    await expect(page.locator(S.responseStatus)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("sending another request updates history count", async () => {
    // Send a POST request to a reliable endpoint
    await page.click(S.tabAdd);
    await selectMethod(page, "POST");
    await typeUrl(page, TEST_URLS.jsonList);
    await sendRequest(page);

    await clickSidebarTab(page, "History");
    const items = page.locator(S.historyItem);
    // History now has: original GET + replayed GET + this POST = 3
    await expect(items).toHaveCount(3);

    // Badge should show 3
    const historyTab = page.locator(`.sidebar-section-tab:has-text("History")`);
    const badge = historyTab.locator(S.historyBadge);
    await expect(badge).toHaveText("3");
  });

  test("history entries are ordered newest first", async () => {
    await clickSidebarTab(page, "History");
    const items = page.locator(S.historyItem);

    // First item should be the POST (newest)
    const firstMethod = items.first().locator(S.requestMethodBadge);
    await expect(firstMethod).toHaveText("POST");

    // Remaining items should be GETs (replayed GET + original GET)
    const secondMethod = items.nth(1).locator(S.requestMethodBadge);
    await expect(secondMethod).toHaveText("GET");
  });

  test("clicking different entry updates detail panel", async () => {
    await clickSidebarTab(page, "History");

    // Click the first entry (POST)
    await page.locator(S.historyItem).first().click();
    await expect(page.locator(S.historyDetailPanel)).toBeVisible();
    await expect(page.locator(S.historyDetailMethod)).toHaveText("POST");

    // Click the second entry (GET)
    await page.locator(S.historyItem).nth(1).click();
    await expect(page.locator(S.historyDetailMethod)).toHaveText("GET");
    await expect(page.locator(S.historyDetailUrl)).toContainText(
      TEST_URLS.json,
    );

    // Only one item should be selected
    await expect(page.locator(S.historyItemSelected)).toHaveCount(1);
  });

  test("switching sidebar section closes detail panel", async () => {
    // Detail panel should currently be open from previous test
    await expect(page.locator(S.historyDetailPanel)).toBeVisible();

    // Switch to Collections
    await clickSidebarTab(page, "Collections");

    // Detail panel should no longer be rendered
    await expect(page.locator(S.historyDetailPanel)).not.toBeVisible();

    // Switch back to History — panel should still be closed (selection was cleared)
    await clickSidebarTab(page, "History");
    await expect(page.locator(S.historyDetailPanel)).not.toBeVisible();
    await expect(page.locator(S.historyItemSelected)).toHaveCount(0);
  });

  test("clear history also closes detail panel", async () => {
    await clickSidebarTab(page, "History");
    // Open the detail panel first
    await page.locator(S.historyItem).first().click();
    await expect(page.locator(S.historyDetailPanel)).toBeVisible();

    // Click the clear button
    const clearBtn = page.locator(`.sidebar-header ${S.sidebarAddBtn}`);
    await clearBtn.click();

    // History should be empty
    await expect(page.locator(S.historyItem)).toHaveCount(0);
    await expect(page.locator(S.sidebarEmpty)).toBeVisible();
    // Detail panel should be gone
    await expect(page.locator(S.historyDetailPanel)).not.toBeVisible();
  });

  test("history badge disappears after clearing", async () => {
    const historyTab = page.locator(`.sidebar-section-tab:has-text("History")`);
    const badge = historyTab.locator(S.historyBadge);
    await expect(badge).not.toBeVisible();
  });
});
