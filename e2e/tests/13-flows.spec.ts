import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import {
  clickSidebarTab,
  typeUrl,
  selectMethod,
  clickSave,
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

async function setupCollectionWithRequest(): Promise<void> {
  // Create a collection
  await clickSidebarTab(page, "Collections");
  const addBtn = page.locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`).first();
  await addBtn.click();
  const renameInput = page.locator(S.renameInput);
  await renameInput.fill("Flow Collection");
  await renameInput.press("Enter");

  // Save a request to it
  await typeUrl(page, TEST_URLS.json);
  await selectMethod(page, "GET");
  const nameInput = page.locator(S.requestNameInput);
  await nameInput.fill("Get Post");

  await clickSave(page);
  await page.locator(S.savePickerItem).first().click();
}

test.describe("Flows", () => {
  test('flows section shows "No flows yet" when empty', async () => {
    await clickSidebarTab(page, "Flows");
    await expect(page.locator(S.sidebarEmpty)).toBeVisible();
  });

  test("create flow opens FlowEditor overlay", async () => {
    await clickSidebarTab(page, "Flows");

    const addBtn = page.locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`);
    await addBtn.click();

    await expect(page.locator(S.flowOverlay)).toBeVisible();
    await expect(page.locator(S.flowEditor)).toBeVisible();
  });

  test("edit flow name in editor", async () => {
    const nameInput = page.locator(S.flowEditorName);
    await nameInput.fill("Login Flow");
    await expect(nameInput).toHaveValue("Login Flow");
  });

  test("empty steps shows message", async () => {
    await expect(page.locator(S.flowStepsEmpty)).toBeVisible();
  });

  test("add step opens request picker modal", async () => {
    await page.click(S.flowAddStepBtn);
    await expect(page.locator(S.flowRequestPicker)).toBeVisible();
  });

  test("close flow editor and set up collection for flow tests", async () => {
    // Close the request picker first
    await page.locator(S.modalOverlay).click({ position: { x: 5, y: 5 } });

    // Close the flow editor
    await page.click(
      `${S.flowEditorActions} ${S.flowEditorBtnSecondary}:has-text("Back")`,
    );
    await expect(page.locator(S.flowOverlay)).toBeHidden();

    // Set up a collection with a request for flow step picking
    await setupCollectionWithRequest();
  });

  test("create flow with step from collection", async () => {
    await clickSidebarTab(page, "Flows");
    const addBtn = page.locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`);
    await addBtn.click();

    const nameInput = page.locator(S.flowEditorName);
    await nameInput.fill("Test Flow");

    // Add a step
    await page.click(S.flowAddStepBtn);
    await expect(page.locator(S.flowRequestPicker)).toBeVisible();

    // Click the request in the picker
    await page.locator(S.flowRequestPickerItem).first().click();

    // Step should appear
    await expect(page.locator(S.flowStep)).toHaveCount(1);
    await expect(page.locator(S.flowStepsEmpty)).toBeHidden();
  });

  test("save flow and verify it appears in sidebar", async () => {
    await page.click(
      `${S.flowEditorActions} ${S.flowEditorBtnSecondary}:has-text("Save")`,
    );
    await expect(page.locator(S.flowOverlay)).toBeHidden();

    await clickSidebarTab(page, "Flows");
    await expect(page.locator(S.flowItem)).toHaveCount(1);
    await expect(page.locator(S.flowItemName).first()).toHaveText("Test Flow");
  });

  test("run flow shows FlowRunner with results", async () => {
    await clickSidebarTab(page, "Flows");

    // Click the run button on the flow
    const runBtn = page.locator(`${S.flowItem} ${S.sidebarIconBtn}`).first();
    await runBtn.click();

    // FlowRunner should appear
    await expect(page.locator(S.flowRunner)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(S.flowRunnerTitle)).toHaveText("Flow Results");

    // Wait for flow to complete
    await page.waitForSelector(
      `${S.flowRunnerSummary}:not(:has(.flow-runner-running))`,
      {
        timeout: 15_000,
      },
    );

    // Should show step results
    const steps = page.locator(S.flowRunnerStep);
    await expect(steps).toHaveCount(1);
  });

  test("FlowRunner detail panel shows response/request/captures tabs", async () => {
    // Click the step to show details
    await page.locator(S.flowRunnerStep).first().click();

    // Detail tabs should be visible
    const detailTabs = page.locator(S.flowRunnerDetailTab);
    const tabTexts = await detailTabs.allTextContents();
    expect(tabTexts.some((t) => t.includes("Response"))).toBe(true);
    expect(tabTexts.some((t) => t.includes("Request"))).toBe(true);
    expect(tabTexts.some((t) => t.includes("Captures"))).toBe(true);

    // Close the runner
    await page.click(
      `${S.flowRunnerHeader} ${S.flowEditorBtnSecondary}:has-text("Close")`,
    );
    await expect(page.locator(S.flowRunner)).toBeHidden();
  });
});
