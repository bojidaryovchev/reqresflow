import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import { typeUrl } from "../helpers/data";
import type { Page } from "@playwright/test";

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp();
});

test.describe("Tab Management", () => {
  test("click + creates new tab and activates it", async () => {
    await page.click(S.tabAdd);
    const tabs = page.locator(S.tabItem);
    await expect(tabs).toHaveCount(2);

    // New tab should be active
    const activeTabs = page.locator(S.tabItemActive);
    await expect(activeTabs).toHaveCount(1);
  });

  test("click tab switches active tab", async () => {
    // Click the first tab
    const firstTab = page.locator(S.tabItem).first();
    await firstTab.click();

    // First tab should now be active
    await expect(firstTab).toHaveClass(/active/);
  });

  test("close tab removes it and activates adjacent", async () => {
    // We should have 2 tabs. Close the active one.
    const tabCount = await page.locator(S.tabItem).count();
    expect(tabCount).toBe(2);

    // Click close on the active tab
    const activeTabClose = page.locator(`${S.tabItemActive} ${S.tabClose}`);
    await activeTabClose.click();

    // Should now have 1 tab
    await expect(page.locator(S.tabItem)).toHaveCount(1);
  });

  test("closing last tab resets to empty instead of removing", async () => {
    // We have 1 tab. Close it.
    await expect(page.locator(S.tabItem)).toHaveCount(1);
    await page.locator(`${S.tabItem} ${S.tabClose}`).click();

    // Still 1 tab, but it should be reset (empty URL, GET method)
    await expect(page.locator(S.tabItem)).toHaveCount(1);
    await expect(page.locator(S.methodSelect)).toHaveValue("GET");
    const urlInput = page.locator(`${S.urlBar} .autosuggest-wrapper input`);
    await expect(urlInput).toHaveValue("");
  });

  test("editing URL makes tab dirty (shows dot indicator)", async () => {
    await typeUrl(page, "https://example.com");

    // Dirty indicator should appear
    await expect(page.locator(S.tabDirty)).toBeVisible();
  });

  test("right-click tab shows context menu", async () => {
    const tab = page.locator(S.tabItem).first();
    await tab.click({ button: "right" });

    await expect(page.locator(S.tabContextMenu)).toBeVisible();

    // Should have 3 options
    const options = page.locator(`${S.tabContextMenu} button`);
    const texts = await options.allTextContents();
    expect(texts).toContain("Duplicate Request");
    expect(texts).toContain("Close Tab");
    expect(texts).toContain("Close All Tabs");
  });

  test("context menu Duplicate Request clones tab", async () => {
    // Context menu should still be open from previous test, reopen to be safe
    const tab = page.locator(S.tabItem).first();
    await tab.click({ button: "right" });
    await page.click(
      `${S.tabContextMenu} button:has-text("Duplicate Request")`,
    );

    // Should now have 2 tabs
    await expect(page.locator(S.tabItem)).toHaveCount(2);

    // Context menu should be closed
    await expect(page.locator(S.tabContextMenu)).toBeHidden();
  });

  test("context menu Close Tab closes the target tab", async () => {
    const tab = page.locator(S.tabItem).first();
    await tab.click({ button: "right" });
    await page.click(`${S.tabContextMenu} button:has-text("Close Tab")`);

    await expect(page.locator(S.tabItem)).toHaveCount(1);
  });

  test("context menu Close All Tabs resets to single empty tab", async () => {
    // Add a second tab first
    await page.click(S.tabAdd);
    await expect(page.locator(S.tabItem)).toHaveCount(2);

    const tab = page.locator(S.tabItem).first();
    await tab.click({ button: "right" });
    await page.click(`${S.tabContextMenu} button:has-text("Close All Tabs")`);

    await expect(page.locator(S.tabItem)).toHaveCount(1);
    await expect(page.locator(S.methodSelect)).toHaveValue("GET");
  });

  test("click outside context menu closes it", async () => {
    const tab = page.locator(S.tabItem).first();
    await tab.click({ button: "right" });
    await expect(page.locator(S.tabContextMenu)).toBeVisible();

    // Click on the main app area to close
    await page.locator(S.requestSection).click();
    await expect(page.locator(S.tabContextMenu)).toBeHidden();
  });

  test("tab displays URL path as name when name is Untitled and URL is set", async () => {
    await typeUrl(page, "https://httpbin.org/get");

    const tabName = page.locator(`${S.tabItemActive} ${S.tabName}`);
    const text = await tabName.textContent();
    // Should show something URL-derived, not "Untitled"
    expect(text).not.toBe("Untitled");
  });

  test("renaming request updates tab display name", async () => {
    const nameInput = page.locator(S.requestNameInput);
    await nameInput.fill("My Request");

    const tabName = page.locator(`${S.tabItemActive} ${S.tabName}`);
    await expect(tabName).toHaveText("My Request");
  });
});
