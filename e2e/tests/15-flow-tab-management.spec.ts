import { test, expect } from "@playwright/test";
import { launchApp, closeApp, restartApp, seedData } from "../helpers/app";
import { S } from "../helpers/selectors";
import {
  clickSidebarTab,
  typeUrl,
  TEST_URLS,
  makeCollection,
  makeRequest,
  makeFlow,
} from "../helpers/data";
import type { Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// 15 — Flow ↔ Request Tab Switching
//
// Covers: tab bar switches between flow tabs and request tabs based on
//         sidebar section, both sets persist independently, re-open
//         flow reuses existing tab
// ─────────────────────────────────────────────────────────────────────

let page: Page;

test.describe("Flow Tab Switching", () => {
  test.beforeAll(async () => {
    ({ page } = await launchApp({ createTab: false }));

    // Seed a collection and a flow
    const req = makeRequest({
      id: "req-switch",
      name: "Switch Req",
      method: "GET",
      url: TEST_URLS.json,
    });
    const col = makeCollection({
      id: "col-switch",
      name: "Switch Col",
      requests: [req],
    });
    const flow = makeFlow({
      id: "flow-switch",
      name: "Switch Flow",
      steps: [
        {
          id: "step-switch-1",
          collectionId: "col-switch",
          requestId: "req-switch",
          continueOnError: false,
          captures: [],
        },
      ],
    });
    seedData("collections.json", [col]);
    seedData("flows.json", [flow]);

    ({ page } = await restartApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("Collections section shows request tabs", async () => {
    await clickSidebarTab(page, "Collections");
    // Should have at least the default tab
    const tabBar = page.locator(S.tabBar);
    await expect(tabBar).toBeVisible();
  });

  test("create a request tab for later verification", async () => {
    await clickSidebarTab(page, "Collections");
    await page.click(S.tabAdd);
    await typeUrl(page, TEST_URLS.json);
    const requestTabs = await page.locator(S.tabItem).count();
    expect(requestTabs).toBeGreaterThanOrEqual(1);
  });

  test("switching to Flows section shows flow tabs", async () => {
    await clickSidebarTab(page, "Flows");

    // Open the flow
    const flowItem = page
      .locator(S.flowItem)
      .filter({ hasText: "Switch Flow" });
    await flowItem.locator(S.flowItemHeader).click();

    // Flow editor should be visible
    await expect(page.locator(S.flowEditor)).toBeVisible();

    // Tab should show flow name
    const activeTab = page.locator(`${S.tabItemActive}`);
    await expect(activeTab).toBeVisible();
  });

  test("switching back to Collections shows request tabs (not flow tabs)", async () => {
    await clickSidebarTab(page, "Collections");

    // Flow editor should be hidden
    await expect(page.locator(S.flowEditor)).toBeHidden();

    // URL bar should be visible (request mode)
    await expect(page.locator(S.urlBar)).toBeVisible();
  });

  test("switching back to Flows restores open flow tab", async () => {
    await clickSidebarTab(page, "Flows");

    // Flow editor should be visible again
    await expect(page.locator(S.flowEditor)).toBeVisible();
  });

  test("clicking same flow in sidebar reuses existing tab", async () => {
    const tabsBefore = await page.locator(S.tabItem).count();

    const flowItem = page
      .locator(S.flowItem)
      .filter({ hasText: "Switch Flow" });
    await flowItem.locator(S.flowItemHeader).click();

    const tabsAfter = await page.locator(S.tabItem).count();
    expect(tabsAfter).toBe(tabsBefore);
  });

  test("+ button in Flows section creates new flow", async () => {
    await clickSidebarTab(page, "Flows");
    const tabsBefore = await page.locator(S.tabItem).count();

    await page.click(S.tabAdd);

    // A new empty flow editor/tab should open
    const tabsAfter = await page.locator(S.tabItem).count();
    expect(tabsAfter).toBe(tabsBefore + 1);
  });

  test("right-click Close All Tabs on flow tab closes all flow tabs", async () => {
    const activeTab = page.locator(`${S.tabItemActive}`);
    await activeTab.click({ button: "right" });
    await expect(page.locator(S.tabContextMenu)).toBeVisible();

    await page
      .locator(`${S.tabContextMenu} button:has-text("Close All")`)
      .click();

    // No more flow tabs — empty state
    const remaining = await page.locator(S.tabItem).count();
    expect(remaining).toBe(0);
  });
});
