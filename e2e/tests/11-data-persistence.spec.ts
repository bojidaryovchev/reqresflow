import { test, expect } from "@playwright/test";
import { launchApp, closeApp, restartApp, readData } from "../helpers/app";
import { S } from "../helpers/selectors";
import {
  clickSidebarTab,
  typeUrl,
  clickSave,
  sendRequest,
  TEST_URLS,
} from "../helpers/data";
import type { Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// 11 — Data Persistence
//
// Covers: verifying all data files are written to disk, data survives
//         restart, collections/environments/history/flows file checks
// ─────────────────────────────────────────────────────────────────────

let page: Page;

test.describe("Data Persistence", () => {
  test.beforeAll(async () => {
    ({ page } = await launchApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("session.json is written when tabs change", async () => {
    await typeUrl(page, TEST_URLS.json);
    await page.waitForTimeout(500);

    const session = readData("session.json") as {
      tabs: unknown[];
      activeTabId: string;
    } | null;
    expect(session).not.toBeNull();
    expect(session?.tabs.length).toBeGreaterThanOrEqual(1);
    expect(session?.activeTabId).toBeTruthy();
  });

  test("collections.json is written when collection is created", async () => {
    await clickSidebarTab(page, "Collections");
    const addBtn = page
      .locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`)
      .first();
    await addBtn.click();
    const renameInput = page.locator(S.renameInput);
    await renameInput.fill("Persist Col");
    await renameInput.press("Enter");

    // Save a request to it
    await page.locator(S.requestNameInput).fill("Persist Req");
    await clickSave(page);
    await page.locator(S.savePickerItem).first().click();

    const collections = readData("collections.json") as Array<{
      name: string;
    }> | null;
    expect(collections).not.toBeNull();
    const found = collections?.find((c) => c.name === "Persist Col");
    expect(found).toBeTruthy();
  });

  test("environments.json is written when environment is created", async () => {
    await page.click(S.envManageBtn);
    await expect(page.locator(S.modal)).toBeVisible();
    const addEnvBtn = page.locator(`${S.envList} ${S.sidebarIconBtn}`);
    await addEnvBtn.click();
    const nameInput = page.locator(S.envNameInput);
    await nameInput.fill("Persist Env");
    await page.click(S.modalCloseBtn);

    const envs = readData("environments.json") as Array<{
      name: string;
    }> | null;
    expect(envs).not.toBeNull();
    const found = envs?.find((e) => e.name === "Persist Env");
    expect(found).toBeTruthy();
  });

  test("history.json is written when request is sent", async () => {
    await typeUrl(page, TEST_URLS.json);
    await sendRequest(page);

    const history = readData("history.json") as Array<{
      url: string;
    }> | null;
    expect(history).not.toBeNull();
    expect(history?.length).toBeGreaterThanOrEqual(1);
  });

  test("flows.json is written when flow is created and saved", async () => {
    await clickSidebarTab(page, "Flows");
    const addBtn = page.locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`);
    await addBtn.click();
    const nameInput = page.locator(S.flowEditorName);
    await nameInput.fill("Persist Flow");
    await page.click(
      `${S.flowEditorActions} ${S.flowEditorBtnSecondary}:has-text("Save")`,
    );

    const flows = readData("flows.json") as Array<{ name: string }> | null;
    expect(flows).not.toBeNull();
    const found = flows?.find((f) => f.name === "Persist Flow");
    expect(found).toBeTruthy();

    // Close the flow editor
    await page.click(
      `${S.flowEditorActions} ${S.flowEditorBtnSecondary}:has-text("Back")`,
    );
  });

  test("all data survives app restart", async () => {
    ({ page } = await restartApp());

    // Collections should be restored
    await clickSidebarTab(page, "Collections");
    await expect(
      page.locator(`.collection-name:has-text("Persist Col")`),
    ).toBeVisible();

    // Environment should be selectable
    const envSelect = page.locator(S.envSelect);
    const options = await envSelect.locator("option").allTextContents();
    expect(options.some((o) => o.includes("Persist Env"))).toBe(true);

    // Flows should be restored
    await clickSidebarTab(page, "Flows");
    await expect(
      page.locator(`${S.flowItemName}:has-text("Persist Flow")`),
    ).toBeVisible();

    // History should be restored
    await clickSidebarTab(page, "History");
    const historyItems = page.locator(S.historyItem);
    const count = await historyItems.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
