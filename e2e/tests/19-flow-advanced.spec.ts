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

/**
 * Create an environment with a variable, select it, then save two requests
 * into a collection so we can build flows with multiple steps.
 */
async function setupEnvironmentAndCollection(): Promise<void> {
  // Create environment with a variable
  await page.click(S.envManageBtn);
  await expect(page.locator(S.modal)).toBeVisible();
  const addEnvBtn = page.locator(`${S.envList} ${S.sidebarIconBtn}`);
  await addEnvBtn.click();
  const nameInput = page.locator(S.envNameInput);
  await nameInput.fill("FlowEnv");
  await page.click(S.modalCloseBtn);
  await page.locator(S.envSelect).selectOption({ label: "FlowEnv" });

  // Create collection
  await clickSidebarTab(page, "Collections");
  const addColBtn = page
    .locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`)
    .first();
  await addColBtn.click();
  const renameInput = page.locator(S.renameInput);
  await renameInput.fill("Flow Test Col");
  await renameInput.press("Enter");

  // Save first request: GET /posts/1 (captures userId from body)
  await typeUrl(page, TEST_URLS.json);
  await selectMethod(page, "GET");
  const reqName = page.locator(S.requestNameInput);
  await reqName.fill("Get Post");
  await clickSave(page);
  await page.locator(S.savePickerItem).first().click();

  // Open a new tab for second request
  await page.click(S.tabAdd);

  // Save second request: GET /get with httpbin (echoes back)
  await typeUrl(page, TEST_URLS.get);
  await selectMethod(page, "GET");
  await page.locator(S.requestNameInput).fill("Echo Request");
  await clickSave(page);
  await page.locator(S.savePickerItem).first().click();
}

test.describe("Flow Advanced Features", () => {
  test("set up environment and collection for flow tests", async () => {
    await setupEnvironmentAndCollection();

    // Verify collection has 2 requests
    await clickSidebarTab(page, "Collections");
    const requests = page.locator(S.requestItem);
    await expect(requests).toHaveCount(2);
  });

  test("create flow with two steps", async () => {
    await clickSidebarTab(page, "Flows");
    const addBtn = page.locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`);
    await addBtn.click();

    const nameInput = page.locator(S.flowEditorName);
    await nameInput.fill("Multi Step Flow");

    // Add first step
    await page.click(S.flowAddStepBtn);
    await expect(page.locator(S.flowRequestPicker)).toBeVisible();
    await page.locator(S.flowRequestPickerItem).first().click();

    // Add second step
    await page.click(S.flowAddStepBtn);
    await page.locator(S.flowRequestPickerItem).nth(1).click();

    await expect(page.locator(S.flowStep)).toHaveCount(2);
  });

  test("step connector arrow shown between steps", async () => {
    const connectors = page.locator(S.flowStepConnector);
    await expect(connectors).toHaveCount(1);
  });

  test("move step down reorders steps", async () => {
    // Get names of steps before
    const firstStepName = await page
      .locator(`${S.flowStep}:first-child ${S.flowStepName}`)
      .textContent();

    // Click "Move down" on first step (↓ button)
    await page
      .locator(
        `${S.flowStep}:first-child ${S.flowStepMove}[title="Move down"]`,
      )
      .click();

    // First step should now be what was second
    const newFirstName = await page
      .locator(`${S.flowStep}:first-child ${S.flowStepName}`)
      .textContent();
    expect(newFirstName).not.toBe(firstStepName);
  });

  test("move step up restores original order", async () => {
    // Move second step up to restore order
    const secondStep = page.locator(S.flowStep).nth(1);
    await secondStep.locator(`${S.flowStepMove}[title="Move up"]`).click();

    const firstName = await page
      .locator(`${S.flowStep}:first-child ${S.flowStepName}`)
      .textContent();
    expect(firstName).toContain("Get Post");
  });

  test("move up disabled for first step", async () => {
    const firstMoveUp = page.locator(
      `${S.flowStep}:first-child ${S.flowStepMove}[title="Move up"]`,
    );
    await expect(firstMoveUp).toBeDisabled();
  });

  test("move down disabled for last step", async () => {
    const lastMoveDown = page.locator(
      `${S.flowStep}:last-child ${S.flowStepMove}[title="Move down"]`,
    );
    await expect(lastMoveDown).toBeDisabled();
  });

  test("click step header expands step detail", async () => {
    // Click first step header
    await page.locator(`${S.flowStep}:first-child ${S.flowStepHeader}`).click();

    // Step detail should be visible
    const detail = page.locator(
      `${S.flowStep}:first-child ${S.flowStepDetail}`,
    );
    await expect(detail).toBeVisible();
  });

  test("continue-on-error checkbox toggles", async () => {
    const checkbox = page
      .locator(`${S.flowStep}:first-child ${S.flowStepCheckbox} input`)
      .first();

    // Should start unchecked
    await expect(checkbox).not.toBeChecked();

    // Toggle on
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    // Toggle off
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test("step captures section shows empty message initially", async () => {
    const emptyCaps = page.locator(
      `${S.flowStep}:first-child ${S.flowStepCapturesEmpty}`,
    );
    await expect(emptyCaps).toBeVisible();
  });

  test("add step-level capture creates a row", async () => {
    // Click "+ Capture" button inside the expanded step
    await page
      .locator(`${S.flowStep}:first-child ${S.flowStepCapturesAdd}`)
      .click();

    const captureRow = page.locator(
      `${S.flowStep}:first-child ${S.flowStepCaptureRow}`,
    );
    await expect(captureRow).toHaveCount(1);

    // Empty message should be hidden
    await expect(
      page.locator(`${S.flowStep}:first-child ${S.flowStepCapturesEmpty}`),
    ).toBeHidden();
  });

  test("fill step capture fields (variable name, source, path)", async () => {
    const captureRow = page
      .locator(`${S.flowStep}:first-child ${S.flowStepCaptureRow}`)
      .first();

    // Fill variable name
    const inputs = captureRow.locator(S.flowStepCaptureInput);
    await inputs.first().fill("postUserId");

    // Source should default to "body"
    const sourceSelect = captureRow.locator(S.flowStepCaptureSelect);
    const val = await sourceSelect.inputValue();
    expect(val).toBe("body");

    // Fill path
    await inputs.nth(1).fill("userId");
  });

  test("remove step capture removes the row", async () => {
    // Add a second capture then remove it
    await page
      .locator(`${S.flowStep}:first-child ${S.flowStepCapturesAdd}`)
      .click();
    await expect(
      page.locator(`${S.flowStep}:first-child ${S.flowStepCaptureRow}`),
    ).toHaveCount(2);

    // Remove the last one
    await page
      .locator(`${S.flowStep}:first-child ${S.flowStepCaptureRemove}`)
      .last()
      .click();
    await expect(
      page.locator(`${S.flowStep}:first-child ${S.flowStepCaptureRow}`),
    ).toHaveCount(1);
  });

  test("collapse step by clicking header again", async () => {
    await page.locator(`${S.flowStep}:first-child ${S.flowStepHeader}`).click();
    await expect(
      page.locator(`${S.flowStep}:first-child ${S.flowStepDetail}`),
    ).toBeHidden();
  });

  test("save and run flow with step captures", async () => {
    // Save
    await page.click(
      `${S.flowEditorActions} ${S.flowEditorBtnSecondary}:has-text("Save")`,
    );

    // Run via the primary button
    await page.click(`${S.flowEditorActions} ${S.flowEditorBtnPrimary}`);

    // FlowRunner should appear
    await expect(page.locator(S.flowRunner)).toBeVisible({ timeout: 10_000 });

    // Wait for completion
    await page.waitForSelector(
      `${S.flowRunnerSummary}:not(:has(${S.flowRunnerRunning}))`,
      { timeout: 20_000 },
    );

    // Should have 2 step results
    await expect(page.locator(S.flowRunnerStep)).toHaveCount(2);

    // Close the flow runner to go back to editor
    await page.click(
      `${S.flowRunnerHeader} .flow-runner-header-actions .flow-editor-btn.secondary:has-text("Close")`,
    );
    await expect(page.locator(S.flowEditor)).toBeVisible({ timeout: 5000 });
  });

  test("last run section visible in flow editor after run", async () => {
    // Editor should be visible (runner was closed above)
    await expect(page.locator(S.flowEditor)).toBeVisible();

    // Last run section should be visible
    await expect(page.locator(S.flowEditorLastRun)).toBeVisible();
    await expect(page.locator(S.flowEditorLastRunTitle)).toHaveText("Last Run");
  });

  test("last run section shows step results", async () => {
    const lastRunSteps = page.locator(S.flowEditorLastRunStep);
    const count = await lastRunSteps.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("step capture value stored in environment after flow run", async () => {
    // Flow editor doesn't show env-manage-btn; switch to Collections to get request tab view
    await clickSidebarTab(page, "Collections");
    await page.click(S.tabAdd);
    await expect(page.locator('.url-bar')).toBeVisible();

    await page.click(S.envManageBtn);
    await expect(page.locator(S.modal)).toBeVisible();

    const varRows = page.locator(S.envVarRow);
    const count = await varRows.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const inputs = varRows.nth(i).locator('input[type="text"]');
      const key = await inputs.first().inputValue();
      if (key === "postUserId") {
        const value = await inputs.nth(1).inputValue();
        expect(value).toBe("1");
        found = true;
        break;
      }
    }
    expect(found).toBe(true);

    await page.click(S.modalCloseBtn);

    // Go back to Flows sidebar to restore flow editor
    await clickSidebarTab(page, "Flows");
    await expect(page.locator(S.flowEditor)).toBeVisible();
  });

  test("remove step from flow", async () => {
    // Remove the second step
    await page
      .locator(`${S.flowStep}:last-child ${S.flowStepRemove}`)
      .click();
    await expect(page.locator(S.flowStep)).toHaveCount(1);
  });

  test("flow tab context menu: Duplicate Flow", async () => {
    // Right-click on the active flow tab
    const activeTab = page.locator(`${S.tabItemActive}`);
    await activeTab.click({ button: "right" });

    // Context menu should appear
    await expect(page.locator(S.tabContextMenu)).toBeVisible();

    // Click "Duplicate Flow"
    await page
      .locator(`${S.tabContextMenu} button:has-text("Duplicate Flow")`)
      .click();

    // Should now have 2 flow tabs
    const flowTabItems = page.locator(
      `.request-tabs-list ${S.tabItem}`,
    );
    const count = await flowTabItems.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("flow tab context menu: Close Tab", async () => {
    // Right-click on the active flow tab
    const activeTab = page.locator(`${S.tabItemActive}`);
    await activeTab.click({ button: "right" });

    await expect(page.locator(S.tabContextMenu)).toBeVisible();
    await page
      .locator(`${S.tabContextMenu} button:has-text("Close Tab")`)
      .click();

    // One tab fewer
    const flowTabItems = page.locator(
      `.request-tabs-list ${S.tabItem}`,
    );
    const count = await flowTabItems.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("flow tab dirty indicator shows on edit", async () => {
    // The remaining flow tab should be the editor
    await expect(page.locator(S.flowEditor)).toBeVisible();

    // Edit the name to make it dirty
    const nameInput = page.locator(S.flowEditorName);
    const currentName = await nameInput.inputValue();
    await nameInput.fill(currentName + " edited");

    // Dirty dot should appear on the tab
    await expect(page.locator(`${S.tabItemActive} ${S.tabDirty}`)).toBeVisible();
  });

  test("middle-click on flow tab closes it", async () => {
    // Save first so we don't lose state
    await page.click(
      `${S.flowEditorActions} ${S.flowEditorBtnSecondary}:has-text("Save")`,
    );

    // Get tab count before
    const before = await page.locator(`.request-tabs-list ${S.tabItem}`).count();

    // Create a new flow tab so we have multiple (can't close last)
    const addBtn = page.locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`);
    await addBtn.click();

    const after = await page.locator(`.request-tabs-list ${S.tabItem}`).count();
    expect(after).toBe(before + 1);

    // Middle-click on the last tab
    const lastTab = page.locator(`.request-tabs-list ${S.tabItem}`).last();
    await lastTab.click({ button: "middle" });

    const final = await page.locator(`.request-tabs-list ${S.tabItem}`).count();
    expect(final).toBe(before);
  });
});
