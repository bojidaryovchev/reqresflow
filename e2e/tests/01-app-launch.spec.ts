import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import type { Page } from "@playwright/test";

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp();
});

test.describe("App Launch", () => {
  test("app window opens with correct minimum dimensions", async () => {
    const windowSize = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));
    expect(windowSize.width).toBeGreaterThanOrEqual(800);
    expect(windowSize.height).toBeGreaterThanOrEqual(500);
  });

  test("default empty tab exists with GET method and empty URL", async () => {
    // One tab should exist
    const tabs = page.locator(S.tabItem);
    await expect(tabs).toHaveCount(1);

    // Method should default to GET
    const methodSelect = page.locator(S.methodSelect);
    await expect(methodSelect).toHaveValue("GET");

    // URL should be empty
    const urlInput = page.locator(`${S.urlBar} .autosuggest-wrapper input`);
    await expect(urlInput).toHaveValue("");
  });

  test("sidebar is visible with Collections, Flows, and History tabs", async () => {
    await expect(page.locator(S.sidebar)).toBeVisible();

    const sectionTabs = page.locator(S.sidebarSectionTab);
    await expect(sectionTabs).toHaveCount(3);

    const tabTexts = await sectionTabs.allTextContents();
    expect(tabTexts.some((t) => t.includes("Collections"))).toBe(true);
    expect(tabTexts.some((t) => t.includes("Flows"))).toBe(true);
    expect(tabTexts.some((t) => t.includes("History"))).toBe(true);
  });

  test("request panel defaults to Params tab, response shows empty state", async () => {
    // Params tab should be active
    const activeTab = page.locator(`${S.requestSection} .tab.active`);
    await expect(activeTab).toHaveText("params");

    // Response section shows empty state
    await expect(page.locator(S.responseEmpty)).toBeVisible();
  });
});
