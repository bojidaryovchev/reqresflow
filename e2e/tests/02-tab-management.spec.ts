import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import { typeUrl } from "../helpers/data";
import type { Page } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════
// UF-02: Tab Management
// Covers: create/close/switch tabs, dirty indicator, context menu
//         (duplicate/close/close all), tab name from URL, rename,
//         middle-click close, empty state, tab lifecycle
// ═══════════════════════════════════════════════════════════════════════

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

    const activeTabs = page.locator(S.tabItemActive);
    await expect(activeTabs).toHaveCount(1);
  });

  test("click tab switches active tab", async () => {
    const firstTab = page.locator(S.tabItem).first();
    await firstTab.click();
    await expect(firstTab).toHaveClass(/active/);
  });

  test("close tab removes it and activates adjacent", async () => {
    const tabCount = await page.locator(S.tabItem).count();
    expect(tabCount).toBe(2);

    const activeTabClose = page.locator(`${S.tabItemActive} ${S.tabClose}`);
    await activeTabClose.click();

    await expect(page.locator(S.tabItem)).toHaveCount(1);
  });

  test("closing last tab shows empty state", async () => {
    await expect(page.locator(S.tabItem)).toHaveCount(1);
    await page.locator(`${S.tabItem} ${S.tabClose}`).click();

    await expect(page.locator(S.tabItem)).toHaveCount(0);
    await expect(page.locator(".empty-state")).toBeVisible();

    await page.click(S.tabAdd);
    await expect(page.locator(S.tabItem)).toHaveCount(1);
  });

  test("editing URL makes tab dirty (shows dot indicator)", async () => {
    await typeUrl(page, "https://example.com");
    await expect(page.locator(S.tabDirty)).toBeVisible();
  });

  test("right-click tab shows context menu", async () => {
    const tab = page.locator(S.tabItem).first();
    await tab.click({ button: "right" });

    await expect(page.locator(S.tabContextMenu)).toBeVisible();

    const options = page.locator(`${S.tabContextMenu} button`);
    const texts = await options.allTextContents();
    expect(texts).toContain("Duplicate Request");
    expect(texts).toContain("Close Tab");
    expect(texts).toContain("Close All Tabs");
  });

  test("context menu Duplicate Request clones tab", async () => {
    const tab = page.locator(S.tabItem).first();
    await tab.click({ button: "right" });
    await page.click(
      `${S.tabContextMenu} button:has-text("Duplicate Request")`,
    );

    await expect(page.locator(S.tabItem)).toHaveCount(2);
    await expect(page.locator(S.tabContextMenu)).toBeHidden();
  });

  test("context menu Close Tab closes the target tab", async () => {
    const tab = page.locator(S.tabItem).first();
    await tab.click({ button: "right" });
    await page.click(`${S.tabContextMenu} button:has-text("Close Tab")`);

    await expect(page.locator(S.tabItem)).toHaveCount(1);
  });

  test("context menu Close All Tabs removes all tabs", async () => {
    await page.click(S.tabAdd);
    await expect(page.locator(S.tabItem)).toHaveCount(2);

    const tab = page.locator(S.tabItem).first();
    await tab.click({ button: "right" });
    await page.click(`${S.tabContextMenu} button:has-text("Close All Tabs")`);

    await expect(page.locator(S.tabItem)).toHaveCount(0);
    await expect(page.locator(".empty-state")).toBeVisible();

    await page.click(S.tabAdd);
    await expect(page.locator(S.tabItem)).toHaveCount(1);
  });

  test("click outside context menu closes it", async () => {
    const tab = page.locator(S.tabItem).first();
    await tab.click({ button: "right" });
    await expect(page.locator(S.tabContextMenu)).toBeVisible();

    await page.locator(S.requestSection).click();
    await expect(page.locator(S.tabContextMenu)).toBeHidden();
  });

  test("tab displays URL path as name when name is Untitled and URL is set", async () => {
    await typeUrl(page, "https://httpbin.org/get");

    const tabName = page.locator(`${S.tabItemActive} ${S.tabName}`);
    const text = await tabName.textContent();
    expect(text).not.toBe("Untitled");
  });

  test("renaming request updates tab display name", async () => {
    const nameInput = page.locator(S.requestNameInput);
    await nameInput.fill("My Request");

    const tabName = page.locator(`${S.tabItemActive} ${S.tabName}`);
    await expect(tabName).toHaveText("My Request");
  });
});

test.describe("Tab Lifecycle", () => {
  test("request tab dirty indicator shows on change", async () => {
    await typeUrl(page, "https://httpbin.org/headers");

    const activeTab = page.locator(S.tabItemActive);
    const dirtyDot = activeTab.locator(S.tabDirty);
    await expect(dirtyDot).toBeVisible();
  });

  test("middle-click on tab closes it", async () => {
    await page.click(S.tabAdd);
    const tabCount = await page.locator(S.tabItem).count();
    expect(tabCount).toBeGreaterThanOrEqual(2);

    const firstTab = page.locator(S.tabItem).first();
    await firstTab.click({ button: "middle" });

    const newCount = await page.locator(S.tabItem).count();
    expect(newCount).toBe(tabCount - 1);
  });

  test("last tab can be closed - shows empty state", async () => {
    while ((await page.locator(S.tabItem).count()) > 1) {
      const lastTab = page.locator(S.tabItem).last();
      await lastTab.locator(S.tabClose).click();
    }

    const lastTab = page.locator(S.tabItem).first();
    await lastTab.locator(S.tabClose).click();

    await expect(page.locator(S.tabItem)).toHaveCount(0);
    await expect(page.locator(".empty-state")).toBeVisible();

    await page.click(S.tabAdd);
    await expect(page.locator(S.tabItem)).toHaveCount(1);
  });
});
