import { test, expect } from "@playwright/test";
import { launchApp, closeApp, readData } from "../helpers/app";
import { S } from "../helpers/selectors";
import { typeUrl, selectMethod } from "../helpers/data";

test.describe("Session Persistence", () => {
  let app: import("@playwright/test").ElectronApplication;
  let page: import("@playwright/test").Page;

  test("session is saved and restored across app restart", async () => {
    // ── Launch 1: set up state ──
    ({ app, page } = await launchApp());

    // Set up a tab with specific data
    await selectMethod(page, "POST");
    await typeUrl(page, "https://httpbin.org/post");

    const nameInput = page.locator(S.requestNameInput);
    await nameInput.fill("Session Test");

    // Add a second tab
    await page.click(S.tabAdd);
    await typeUrl(page, "https://httpbin.org/get");

    // Verify 2 tabs
    await expect(page.locator(S.tabItem)).toHaveCount(2);

    // Wait for session auto-save
    await page.waitForTimeout(500);

    // Verify session file was written
    const sessionData = readData("session.json") as { tabs: unknown[]; activeTabId: string } | null;
    expect(sessionData).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(sessionData!.tabs).toHaveLength(2);

    // Close the app (but keep the data dir)
    await app.close();

    // ── Launch 2: verify restoration ──
    ({ app, page } = await launchApp());

    // Tabs should be restored
    await expect(page.locator(S.tabItem)).toHaveCount(2);

    // Active tab should have the second tab's URL
    const urlInput = page.locator(`${S.urlBar} .autosuggest-wrapper input`);
    const url = await urlInput.inputValue();
    expect(url).toContain("httpbin.org");

    await closeApp();
  });

  test("active tab ID is preserved across restart", async () => {
    ({ app, page } = await launchApp());

    // Create 2 tabs, activate the first
    await typeUrl(page, "https://httpbin.org/get");
    await page.click(S.tabAdd);
    await typeUrl(page, "https://httpbin.org/post");

    // Click first tab
    await page.locator(S.tabItem).first().click();
    await page.waitForTimeout(500);

    await app.close();

    ({ app, page } = await launchApp());

    // First tab should be active
    const activeTab = page.locator(S.tabItemActive);
    await expect(activeTab).toHaveCount(1);

    await closeApp();
  });
});
