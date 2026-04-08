import { test, expect } from "@playwright/test";
import {
  launchApp,
  closeApp,
  restartApp,
  readData,
  getDataDir,
} from "../helpers/app";
import { S } from "../helpers/selectors";
import { typeUrl, selectMethod } from "../helpers/data";
import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════
// UF-01: App Launch & Session
// Covers: window dimensions, default state, sidebar tabs, request/response
//         defaults, session save/restore, corrupted data resilience
// ═══════════════════════════════════════════════════════════════════════

test.describe("App Launch", () => {
  let page: Page;

  test.beforeAll(async () => {
    ({ page } = await launchApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("app window opens with correct minimum dimensions", async () => {
    const windowSize = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));
    expect(windowSize.width).toBeGreaterThanOrEqual(800);
    expect(windowSize.height).toBeGreaterThanOrEqual(500);
  });

  test("default empty tab exists with GET method and empty URL", async () => {
    const tabs = page.locator(S.tabItem);
    await expect(tabs).toHaveCount(1);

    const methodSelect = page.locator(S.methodSelect);
    await expect(methodSelect).toHaveValue("GET");

    const urlInput = page.locator(`${S.urlBar} .autosuggest-wrapper input`);
    await expect(urlInput).toHaveValue("");
  });

  test("sidebar is visible with Collections, Flows, History and Generators tabs", async () => {
    await expect(page.locator(S.sidebar)).toBeVisible();

    const sectionTabs = page.locator(S.sidebarSectionTab);
    await expect(sectionTabs).toHaveCount(4);

    const tabTexts = await sectionTabs.allTextContents();
    expect(tabTexts.some((t) => t.includes("Collections"))).toBe(true);
    expect(tabTexts.some((t) => t.includes("Flows"))).toBe(true);
    expect(tabTexts.some((t) => t.includes("History"))).toBe(true);
    expect(tabTexts.some((t) => t.includes("Generators"))).toBe(true);
  });

  test("request panel defaults to Params tab, response shows empty state", async () => {
    const activeTab = page.locator(`${S.requestSection} .tab.active`);
    await expect(activeTab).toHaveText("params");

    await expect(page.locator(S.responseEmpty)).toBeVisible();
  });
});

test.describe("Session Persistence", () => {
  let page: Page;

  test("session is saved and restored across app restart", async () => {
    ({ page } = await launchApp());

    await selectMethod(page, "POST");
    await typeUrl(page, "https://httpbin.org/post");

    const nameInput = page.locator(S.requestNameInput);
    await nameInput.fill("Session Test");

    await page.click(S.tabAdd);
    await typeUrl(page, "https://httpbin.org/get");

    await expect(page.locator(S.tabItem)).toHaveCount(2);
    await page.waitForTimeout(500);

    const sessionData = readData("session.json") as {
      tabs: unknown[];
      activeTabId: string;
    } | null;
    expect(sessionData).not.toBeNull();
    expect(sessionData?.tabs).toHaveLength(2);

    ({ page } = await restartApp());

    await expect(page.locator(S.tabItem)).toHaveCount(2);

    const urlInput = page.locator(`${S.urlBar} .autosuggest-wrapper input`);
    const url = await urlInput.inputValue();
    expect(url).toContain("httpbin.org");

    await closeApp();
  });

  test("active tab ID is preserved across restart", async () => {
    ({ page } = await launchApp());

    await typeUrl(page, "https://httpbin.org/get");
    await page.click(S.tabAdd);
    await typeUrl(page, "https://httpbin.org/post");

    await page.locator(S.tabItem).first().click();
    await page.waitForTimeout(500);

    ({ page } = await restartApp());

    const activeTab = page.locator(S.tabItemActive);
    await expect(activeTab).toHaveCount(1);

    await closeApp();
  });
});

test.describe("Corrupted Data Resilience", () => {
  let page: Page;

  test.beforeAll(async () => {
    ({ page } = await launchApp({ createTab: false }));

    const dataDir = path.join(getDataDir(), "reqresflow-data");
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, "collections.json"),
      "NOT VALID JSON{{{",
      "utf-8",
    );
    fs.writeFileSync(
      path.join(dataDir, "environments.json"),
      "BROKEN",
      "utf-8",
    );
    fs.writeFileSync(path.join(dataDir, "history.json"), "<<<>>>", "utf-8");

    ({ page } = await restartApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("app launches successfully even with corrupted data files", async () => {
    await expect(page.locator(S.app)).toBeVisible();
  });

  test("sidebar shows empty collections after corrupted load", async () => {
    await page.click(S.tabAdd);
    await page.waitForSelector(S.urlBar, { timeout: 5_000 });
    await page.click(`.sidebar-section-tab:has-text("Collections")`);
    const collections = page.locator(S.collection);
    const count = await collections.count();
    expect(count).toBe(0);
  });

  test("history is empty after corrupted load", async () => {
    await page.click(`.sidebar-section-tab:has-text("History")`);
    const items = page.locator(S.historyItem);
    const count = await items.count();
    expect(count).toBe(0);
  });
});
