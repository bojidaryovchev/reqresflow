import { test, expect } from "@playwright/test";
import {
  launchApp,
  closeApp,
  restartApp,
  seedData,
  readData,
} from "../helpers/app";
import { S } from "../helpers/selectors";
import {
  clickSidebarTab,
  typeUrl,
  selectMethod,
  clickSave,
  TEST_URLS,
  makeCollection,
  makeRequest,
  makeFlow,
} from "../helpers/data";
import type { Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// 08 — Flows
//
// Covers: flow CRUD, steps, step captures, flow runner, flow abort,
//         flow rename (sidebar), flow tab context menu, last-run section
// ─────────────────────────────────────────────────────────────────────

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp();
});

// ── Helper: ensure a collection with requests exists ──────────────────
async function setupCollectionWithRequest(): Promise<void> {
  await clickSidebarTab(page, "Collections");
  const addBtn = page.locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`).first();
  await addBtn.click();
  const renameInput = page.locator(S.renameInput);
  await renameInput.fill("Flow Collection");
  await renameInput.press("Enter");

  await typeUrl(page, TEST_URLS.json);
  await selectMethod(page, "GET");
  await page.locator(S.requestNameInput).fill("Get Post");
  await clickSave(page);
  await page.locator(S.savePickerItem).first().click();
}

// ═══════════════════════════════════════════════════════════════════════
// Section 1 — Flow Basics (create, name, steps, save, run)
// ═══════════════════════════════════════════════════════════════════════

test.describe("Flow Basics", () => {
  test('flows section shows "No flows yet" when empty', async () => {
    await clickSidebarTab(page, "Flows");
    await expect(page.locator(S.sidebarEmpty)).toBeVisible();
  });

  test("create flow opens FlowEditor in a flow tab", async () => {
    await clickSidebarTab(page, "Flows");
    const addBtn = page.locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`);
    await addBtn.click();
    await expect(page.locator(S.flowTabContent)).toBeVisible();
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
    await page.locator(S.modalOverlay).click({ position: { x: 5, y: 5 } });
    await page.click(
      `${S.flowEditorActions} ${S.flowEditorBtnSecondary}:has-text("Back")`,
    );
    await expect(page.locator(S.flowEditor)).toBeHidden();
    await setupCollectionWithRequest();
  });

  test("create flow with step from collection", async () => {
    await clickSidebarTab(page, "Flows");
    const addBtn = page.locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`);
    await addBtn.click();

    const nameInput = page.locator(S.flowEditorName);
    await nameInput.fill("Test Flow");

    await page.click(S.flowAddStepBtn);
    await expect(page.locator(S.flowRequestPicker)).toBeVisible();
    await page.locator(S.flowRequestPickerItem).first().click();

    await expect(page.locator(S.flowStep)).toHaveCount(1);
    await expect(page.locator(S.flowStepsEmpty)).toBeHidden();
  });

  test("save flow and verify it appears in sidebar", async () => {
    await page.click(
      `${S.flowEditorActions} ${S.flowEditorBtnSecondary}:has-text("Save")`,
    );
    await expect(page.locator(S.flowItem)).toHaveCount(2);
    await expect(
      page.locator(`${S.flowItemName}:has-text("Test Flow")`),
    ).toBeVisible();
    await page.click(
      `${S.flowEditorActions} ${S.flowEditorBtnSecondary}:has-text("Back")`,
    );
  });

  test("run flow shows FlowRunner with results", async () => {
    await clickSidebarTab(page, "Flows");
    const testFlowItem = page
      .locator(S.flowItem)
      .filter({ hasText: "Test Flow" });
    await testFlowItem.hover();
    const runBtn = testFlowItem.locator(
      `${S.sidebarIconBtn}[title="Run flow"]`,
    );
    await runBtn.click();

    await expect(page.locator(S.flowRunner)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(S.flowRunnerTitle)).toHaveText("Flow Results");
    await page.waitForSelector(
      `${S.flowRunnerSummary}:not(:has(.flow-runner-running))`,
      { timeout: 15_000 },
    );
    const steps = page.locator(S.flowRunnerStep);
    await expect(steps).toHaveCount(1);
  });

  test("FlowRunner detail panel shows response/request/captures tabs", async () => {
    await page.locator(S.flowRunnerStep).first().click();
    const detailTabs = page.locator(S.flowRunnerDetailTab);
    const tabTexts = await detailTabs.allTextContents();
    expect(tabTexts.some((t) => t.includes("Response"))).toBe(true);
    expect(tabTexts.some((t) => t.includes("Request"))).toBe(true);
    expect(tabTexts.some((t) => t.includes("Captures"))).toBe(true);

    await page.click(
      `${S.flowRunnerHeader} ${S.flowEditorBtnSecondary}:has-text("Close")`,
    );
    await expect(page.locator(S.flowRunner)).toBeHidden();
    await expect(page.locator(S.flowEditor)).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Section 2 — Flow Advanced Features (multi-step, reorder, captures)
// ═══════════════════════════════════════════════════════════════════════

test.describe("Flow Advanced Features", () => {
  let advPage: Page;

  test.beforeAll(async () => {
    ({ page: advPage } = await launchApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("set up environment and collection", async () => {
    // Inline setup: create env + collection with requests for advPage
    await advPage.click(S.envManageBtn);
    await expect(advPage.locator(S.modal)).toBeVisible();
    const addEnvBtn = advPage.locator(`${S.envList} ${S.sidebarIconBtn}`);
    await addEnvBtn.click();
    const nameInput = advPage.locator(S.envNameInput);
    await nameInput.fill("FlowEnv");
    await advPage.click(S.modalCloseBtn);
    await advPage.locator(S.envSelect).selectOption({ label: "FlowEnv" });

    await clickSidebarTab(advPage, "Collections");
    const addColBtn = advPage
      .locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`)
      .first();
    await addColBtn.click();
    const renameInput = advPage.locator(S.renameInput);
    await renameInput.fill("Flow Test Col");
    await renameInput.press("Enter");

    await typeUrl(advPage, TEST_URLS.json);
    await selectMethod(advPage, "GET");
    await advPage.locator(S.requestNameInput).fill("Get Post");
    await clickSave(advPage);
    await advPage.locator(S.savePickerItem).first().click();

    await advPage.click(S.tabAdd);
    await typeUrl(advPage, TEST_URLS.get);
    await selectMethod(advPage, "GET");
    await advPage.locator(S.requestNameInput).fill("Echo Request");
    await clickSave(advPage);
    await advPage.locator(S.savePickerItem).first().click();

    await clickSidebarTab(advPage, "Collections");
    const requests = advPage.locator(S.requestItem);
    await expect(requests).toHaveCount(2);
  });

  test("create flow with two steps", async () => {
    await clickSidebarTab(advPage, "Flows");
    const addBtn = advPage.locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`);
    await addBtn.click();

    const nameInput = advPage.locator(S.flowEditorName);
    await nameInput.fill("Multi Step Flow");

    await advPage.click(S.flowAddStepBtn);
    await expect(advPage.locator(S.flowRequestPicker)).toBeVisible();
    await advPage.locator(S.flowRequestPickerItem).first().click();

    await advPage.click(S.flowAddStepBtn);
    await advPage.locator(S.flowRequestPickerItem).nth(1).click();

    await expect(advPage.locator(S.flowStep)).toHaveCount(2);
  });

  test("step connector arrow shown between steps", async () => {
    const connectors = advPage.locator(S.flowStepConnector);
    await expect(connectors).toHaveCount(1);
  });

  test("move step down reorders steps", async () => {
    const firstStepName = await advPage
      .locator(`${S.flowStep}:first-child ${S.flowStepName}`)
      .textContent();

    await advPage
      .locator(`${S.flowStep}:first-child ${S.flowStepMove}[title="Move down"]`)
      .click();

    const newFirstName = await advPage
      .locator(`${S.flowStep}:first-child ${S.flowStepName}`)
      .textContent();
    expect(newFirstName).not.toBe(firstStepName);
  });

  test("move step up restores original order", async () => {
    const secondStep = advPage.locator(S.flowStep).nth(1);
    await secondStep.locator(`${S.flowStepMove}[title="Move up"]`).click();

    const firstName = await advPage
      .locator(`${S.flowStep}:first-child ${S.flowStepName}`)
      .textContent();
    expect(firstName).toContain("Get Post");
  });

  test("move up disabled for first step", async () => {
    const firstMoveUp = advPage.locator(
      `${S.flowStep}:first-child ${S.flowStepMove}[title="Move up"]`,
    );
    await expect(firstMoveUp).toBeDisabled();
  });

  test("move down disabled for last step", async () => {
    const lastMoveDown = advPage.locator(
      `${S.flowStep}:last-child ${S.flowStepMove}[title="Move down"]`,
    );
    await expect(lastMoveDown).toBeDisabled();
  });

  test("click step header expands step detail", async () => {
    await advPage
      .locator(`${S.flowStep}:first-child ${S.flowStepHeader}`)
      .click();
    const detail = advPage.locator(
      `${S.flowStep}:first-child ${S.flowStepDetail}`,
    );
    await expect(detail).toBeVisible();
  });

  test("continue-on-error checkbox toggles", async () => {
    const checkbox = advPage
      .locator(`${S.flowStep}:first-child ${S.flowStepCheckbox} input`)
      .first();

    await expect(checkbox).not.toBeChecked();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test("step captures section shows empty message initially", async () => {
    const emptyCaps = advPage.locator(
      `${S.flowStep}:first-child ${S.flowStepCapturesEmpty}`,
    );
    await expect(emptyCaps).toBeVisible();
  });

  test("add step-level capture creates a row", async () => {
    await advPage
      .locator(`${S.flowStep}:first-child ${S.flowStepCapturesAdd}`)
      .click();

    const captureRow = advPage.locator(
      `${S.flowStep}:first-child ${S.flowStepCaptureRow}`,
    );
    await expect(captureRow).toHaveCount(1);
    await expect(
      advPage.locator(`${S.flowStep}:first-child ${S.flowStepCapturesEmpty}`),
    ).toBeHidden();
  });

  test("fill step capture fields (variable name, source, path)", async () => {
    const captureRow = advPage
      .locator(`${S.flowStep}:first-child ${S.flowStepCaptureRow}`)
      .first();

    const inputs = captureRow.locator(S.flowStepCaptureInput);
    await inputs.first().fill("postUserId");

    const sourceSelect = captureRow.locator(S.flowStepCaptureSelect);
    const val = await sourceSelect.inputValue();
    expect(val).toBe("body");

    await inputs.nth(1).fill("userId");
  });

  test("remove step capture removes the row", async () => {
    await advPage
      .locator(`${S.flowStep}:first-child ${S.flowStepCapturesAdd}`)
      .click();
    await expect(
      advPage.locator(`${S.flowStep}:first-child ${S.flowStepCaptureRow}`),
    ).toHaveCount(2);

    await advPage
      .locator(`${S.flowStep}:first-child ${S.flowStepCaptureRemove}`)
      .last()
      .click();
    await expect(
      advPage.locator(`${S.flowStep}:first-child ${S.flowStepCaptureRow}`),
    ).toHaveCount(1);
  });

  test("collapse step by clicking header again", async () => {
    await advPage
      .locator(`${S.flowStep}:first-child ${S.flowStepHeader}`)
      .click();
    await expect(
      advPage.locator(`${S.flowStep}:first-child ${S.flowStepDetail}`),
    ).toBeHidden();
  });

  test("save and run flow with step captures", async () => {
    await advPage.click(
      `${S.flowEditorActions} ${S.flowEditorBtnSecondary}:has-text("Save")`,
    );
    await advPage.click(`${S.flowEditorActions} ${S.flowEditorBtnPrimary}`);

    await expect(advPage.locator(S.flowRunner)).toBeVisible({
      timeout: 10_000,
    });
    await advPage.waitForSelector(
      `${S.flowRunnerSummary}:not(:has(${S.flowRunnerRunning}))`,
      { timeout: 20_000 },
    );
    await expect(advPage.locator(S.flowRunnerStep)).toHaveCount(2);

    await advPage.click(
      `${S.flowRunnerHeader} .flow-runner-header-actions .flow-editor-btn.secondary:has-text("Close")`,
    );
    await expect(advPage.locator(S.flowEditor)).toBeVisible({
      timeout: 5000,
    });
  });

  test("last run section visible in flow editor after run", async () => {
    await expect(advPage.locator(S.flowEditor)).toBeVisible();
    await expect(advPage.locator(S.flowEditorLastRun)).toBeVisible();
    await expect(advPage.locator(S.flowEditorLastRunTitle)).toHaveText(
      "Last Run",
    );
  });

  test("last run section shows step results", async () => {
    const lastRunSteps = advPage.locator(S.flowEditorLastRunStep);
    const count = await lastRunSteps.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("last run resize handle is visible and draggable", async () => {
    const resizeHandle = advPage.locator(S.flowEditorLastRunResizeHandle);
    await expect(resizeHandle).toBeVisible();

    const lastRun = advPage.locator(S.flowEditorLastRun);
    const beforeBox = await lastRun.boundingBox();
    expect(beforeBox).toBeTruthy();

    const handleBox = await resizeHandle.boundingBox();
    expect(handleBox).toBeTruthy();

    // Drag the resize handle upward by 80px to make the panel taller
    await advPage.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
    await advPage.mouse.down();
    await advPage.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y - 80,
      { steps: 5 },
    );
    await advPage.mouse.up();

    const afterBox = await lastRun.boundingBox();
    expect(afterBox).toBeTruthy();
    expect(afterBox!.height).toBeGreaterThan(beforeBox!.height);
  });

  test("step capture value stored in environment after flow run", async () => {
    await clickSidebarTab(advPage, "Collections");
    await advPage.click(S.tabAdd);
    await expect(advPage.locator(".url-bar")).toBeVisible();

    await advPage.click(S.envManageBtn);
    await expect(advPage.locator(S.modal)).toBeVisible();

    const varRows = advPage.locator(S.envVarRow);
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

    await advPage.click(S.modalCloseBtn);
    await clickSidebarTab(advPage, "Flows");
    await expect(advPage.locator(S.flowEditor)).toBeVisible();
  });

  test("remove step from flow", async () => {
    await advPage
      .locator(`${S.flowStep}:last-child ${S.flowStepRemove}`)
      .click();
    await expect(advPage.locator(S.flowStep)).toHaveCount(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Section 3 — Flow Tab Context Menu & Dirty Indicator
// ═══════════════════════════════════════════════════════════════════════

test.describe("Flow Tab Management", () => {
  let tabPage: Page;

  test.beforeAll(async () => {
    ({ page: tabPage } = await launchApp());

    // Seed a collection + flow so we can open the flow editor
    const req = makeRequest({
      id: "req-tab-test",
      name: "Tab Req",
      method: "GET",
      url: TEST_URLS.json,
    });
    const col = makeCollection({
      id: "col-tab-test",
      name: "Tab Col",
      requests: [req],
    });
    const flow = makeFlow({
      id: "flow-tab-test",
      name: "Tab Flow",
      steps: [
        {
          id: "step-tab-1",
          collectionId: "col-tab-test",
          requestId: "req-tab-test",
          continueOnError: false,
          captures: [],
        },
      ],
    });
    seedData("collections.json", [col]);
    seedData("flows.json", [flow]);
    ({ page: tabPage } = await restartApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("open flow editor by clicking sidebar item", async () => {
    await clickSidebarTab(tabPage, "Flows");
    const flowItem = tabPage
      .locator(S.flowItem)
      .filter({ hasText: "Tab Flow" });
    await flowItem.locator(S.flowItemHeader).click();
    await expect(tabPage.locator(S.flowEditor)).toBeVisible();
  });

  test("flow tab context menu: Duplicate Flow", async () => {
    const activeTab = tabPage.locator(`${S.tabItemActive}`);
    await activeTab.click({ button: "right" });
    await expect(tabPage.locator(S.tabContextMenu)).toBeVisible();
    await tabPage
      .locator(`${S.tabContextMenu} button:has-text("Duplicate Flow")`)
      .click();

    const flowTabItems = tabPage.locator(`.request-tabs-list ${S.tabItem}`);
    const count = await flowTabItems.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("flow tab context menu: Close Tab", async () => {
    const activeTab = tabPage.locator(`${S.tabItemActive}`);
    await activeTab.click({ button: "right" });
    await expect(tabPage.locator(S.tabContextMenu)).toBeVisible();
    await tabPage
      .locator(`${S.tabContextMenu} button:has-text("Close Tab")`)
      .click();

    const flowTabItems = tabPage.locator(`.request-tabs-list ${S.tabItem}`);
    const count = await flowTabItems.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("flow tab dirty indicator shows on edit", async () => {
    await expect(tabPage.locator(S.flowEditor)).toBeVisible();
    const nameInput = tabPage.locator(S.flowEditorName);
    const currentName = await nameInput.inputValue();
    await nameInput.fill(currentName + " edited");
    await expect(
      tabPage.locator(`${S.tabItemActive} ${S.tabDirty}`),
    ).toBeVisible();
  });

  test("middle-click on flow tab closes it", async () => {
    // Save first
    await tabPage.click(
      `${S.flowEditorActions} ${S.flowEditorBtnSecondary}:has-text("Save")`,
    );

    const before = await tabPage
      .locator(`.request-tabs-list ${S.tabItem}`)
      .count();

    // Create a new flow tab
    await clickSidebarTab(tabPage, "Flows");
    const addBtn = tabPage.locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`);
    await addBtn.click();

    const after = await tabPage
      .locator(`.request-tabs-list ${S.tabItem}`)
      .count();
    expect(after).toBe(before + 1);

    // Middle-click on the last tab
    const lastTab = tabPage.locator(`.request-tabs-list ${S.tabItem}`).last();
    await lastTab.click({ button: "middle" });

    const final = await tabPage
      .locator(`.request-tabs-list ${S.tabItem}`)
      .count();
    expect(final).toBe(before);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Section 4 — Flow Rename (sidebar)
// ═══════════════════════════════════════════════════════════════════════

test.describe("Flow Rename (sidebar)", () => {
  let renamePage: Page;

  test.beforeAll(async () => {
    ({ page: renamePage } = await launchApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("create a flow and rename via sidebar rename button", async () => {
    await clickSidebarTab(renamePage, "Flows");
    const addBtn = renamePage.locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`);
    await addBtn.click();

    const nameInput = renamePage.locator(S.flowEditorName);
    await nameInput.fill("Original Name");

    await renamePage.click(
      `${S.flowEditorActions} ${S.flowEditorBtnSecondary}:has-text("Save")`,
    );
    await renamePage.click(
      `${S.flowEditorActions} ${S.flowEditorBtnSecondary}:has-text("Back")`,
    );

    await clickSidebarTab(renamePage, "Flows");
    const flowItem = renamePage
      .locator(S.flowItem)
      .filter({ hasText: "Original Name" });
    await expect(flowItem).toBeVisible();

    // Make hover-only actions visible
    await renamePage.evaluate(() => {
      const style = document.createElement("style");
      style.textContent = ".collection-actions { display: flex !important; }";
      document.head.appendChild(style);
    });

    const renameBtn = flowItem.locator(
      `${S.sidebarIconBtn}[title="Rename flow"]`,
    );
    await renameBtn.click();

    const renameInput = renamePage.locator(`${S.flowItem} ${S.renameInput}`);
    await expect(renameInput).toBeVisible();

    await renameInput.fill("Renamed Flow");
    await renameInput.press("Enter");

    await expect(
      renamePage.locator(`${S.flowItemName}:has-text("Renamed Flow")`),
    ).toBeVisible();
  });

  test("rename flow via double-click on name", async () => {
    const flowName = renamePage.locator(
      `${S.flowItemName}:has-text("Renamed Flow")`,
    );
    await flowName.dblclick();

    const renameInput = renamePage.locator(`${S.flowItem} ${S.renameInput}`);
    await expect(renameInput).toBeVisible();

    await renameInput.fill("Double-Click Renamed");
    await renameInput.press("Enter");

    await expect(
      renamePage.locator(`${S.flowItemName}:has-text("Double-Click Renamed")`),
    ).toBeVisible();
  });

  test("rename flow persists in saved data", async () => {
    const flows = readData("flows.json") as Array<{ name: string }>;
    expect(flows).toBeTruthy();
    const renamedFlow = flows.find((f) => f.name === "Double-Click Renamed");
    expect(renamedFlow).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Section 5 — Flow Abort
// ═══════════════════════════════════════════════════════════════════════

test.describe("Flow Abort", () => {
  let abortPage: Page;

  test.beforeAll(async () => {
    ({ page: abortPage } = await launchApp({ createTab: false }));

    const slowReq = makeRequest({
      id: "req-slow",
      name: "Slow Request",
      method: "GET",
      url: TEST_URLS.delay1s,
    });
    const col = makeCollection({
      id: "col-abort",
      name: "Abort Test Col",
      requests: [slowReq, slowReq],
    });
    const flow = makeFlow({
      id: "flow-abort",
      name: "Abort Flow",
      steps: [
        {
          id: "step-1",
          collectionId: "col-abort",
          requestId: "req-slow",
          continueOnError: false,
          captures: [],
        },
        {
          id: "step-2",
          collectionId: "col-abort",
          requestId: "req-slow",
          continueOnError: false,
          captures: [],
        },
      ],
    });
    seedData("collections.json", [col]);
    seedData("flows.json", [flow]);

    ({ page: abortPage } = await restartApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("abort button stops flow and marks remaining steps as skipped", async () => {
    await clickSidebarTab(abortPage, "Flows");

    const flowItem = abortPage
      .locator(S.flowItem)
      .filter({ hasText: "Abort Flow" });
    await flowItem.locator(S.flowItemHeader).click();
    await expect(abortPage.locator(S.flowEditor)).toBeVisible();

    await abortPage.click(`${S.flowEditorActions} ${S.flowEditorBtnPrimary}`);
    await expect(abortPage.locator(S.flowRunner)).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      abortPage.locator(`.flow-editor-btn.secondary:has-text("Stop")`),
    ).toBeVisible({ timeout: 5_000 });
    await abortPage
      .locator(`.flow-editor-btn.secondary:has-text("Stop")`)
      .click();

    await abortPage.waitForSelector(
      `${S.flowRunnerSummary}:not(:has(${S.flowRunnerRunning}))`,
      { timeout: 20_000 },
    );

    const summaryText = await abortPage
      .locator(S.flowRunnerSummary)
      .textContent();
    expect(summaryText).toMatch(/skipped|aborted/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Section 6 — Flow Step Payload Variant Selection
// ═══════════════════════════════════════════════════════════════════════

test.describe("Flow Step Payload Variant", () => {
  let pvPage: Page;

  test.beforeAll(async () => {
    ({ page: pvPage } = await launchApp({ createTab: false }));

    // Create a request with multiple payload variants
    const reqWithPayloads = makeRequest({
      id: "req-payloads",
      name: "Multi Payload Req",
      method: "POST",
      url: TEST_URLS.post,
      bodyType: "raw",
      rawLanguage: "json",
      body: '{"default":true}',
      payloads: [
        {
          id: "payload-1",
          name: "Default",
          body: '{"default":true}',
          bodyType: "raw",
          rawLanguage: "json",
          formData: [],
          graphql: { query: "", variables: "" },
          binaryFilePath: "",
        },
        {
          id: "payload-2",
          name: "Variant A",
          body: '{"variant":"A"}',
          bodyType: "raw",
          rawLanguage: "json",
          formData: [],
          graphql: { query: "", variables: "" },
          binaryFilePath: "",
        },
        {
          id: "payload-3",
          name: "Variant B",
          body: '{"variant":"B"}',
          bodyType: "raw",
          rawLanguage: "json",
          formData: [],
          graphql: { query: "", variables: "" },
          binaryFilePath: "",
        },
      ],
      activePayloadId: "payload-1",
    });

    // Also a request with no payloads (single body)
    const reqNoPayloads = makeRequest({
      id: "req-no-payloads",
      name: "Single Body Req",
      method: "GET",
      url: TEST_URLS.json,
    });

    const col = makeCollection({
      id: "col-payload-test",
      name: "Payload Test Col",
      requests: [reqWithPayloads, reqNoPayloads],
    });

    const flow = makeFlow({
      id: "flow-payload-test",
      name: "Payload Flow",
      steps: [
        {
          id: "step-pv-1",
          collectionId: "col-payload-test",
          requestId: "req-payloads",
          continueOnError: false,
          captures: [],
        },
        {
          id: "step-pv-2",
          collectionId: "col-payload-test",
          requestId: "req-no-payloads",
          continueOnError: false,
          captures: [],
        },
      ],
    });

    seedData("collections.json", [col]);
    seedData("flows.json", [flow]);
    ({ page: pvPage } = await restartApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("open flow and expand step with payloads", async () => {
    await clickSidebarTab(pvPage, "Flows");
    const flowItem = pvPage
      .locator(S.flowItem)
      .filter({ hasText: "Payload Flow" });
    await flowItem.locator(S.flowItemHeader).click();
    await expect(pvPage.locator(S.flowEditor)).toBeVisible();

    // Expand first step (has payloads)
    await pvPage
      .locator(`${S.flowStep}:first-child ${S.flowStepHeader}`)
      .click();
    await expect(
      pvPage.locator(`${S.flowStep}:first-child ${S.flowStepDetail}`),
    ).toBeVisible();
  });

  test("payload variant dropdown visible for request with multiple payloads", async () => {
    const payloadSelect = pvPage.locator(
      `${S.flowStep}:first-child ${S.flowStepPayloadSelect}`,
    );
    await expect(payloadSelect).toBeVisible();
  });

  test("payload dropdown defaults to empty (request's active payload)", async () => {
    const payloadSelect = pvPage.locator(
      `${S.flowStep}:first-child ${S.flowStepPayloadSelect}`,
    );
    const value = await payloadSelect.inputValue();
    expect(value).toBe("");
  });

  test("payload dropdown lists all variants", async () => {
    const payloadSelect = pvPage.locator(
      `${S.flowStep}:first-child ${S.flowStepPayloadSelect}`,
    );
    const options = payloadSelect.locator("option");
    // 1 default option + 3 payload variants = 4
    await expect(options).toHaveCount(4);

    const texts = await options.allTextContents();
    expect(texts[0]).toContain("Default (request's active payload)");
    expect(texts).toContain("Default");
    expect(texts).toContain("Variant A");
    expect(texts).toContain("Variant B");
  });

  test("select a specific payload variant", async () => {
    const payloadSelect = pvPage.locator(
      `${S.flowStep}:first-child ${S.flowStepPayloadSelect}`,
    );
    await payloadSelect.selectOption({ label: "Variant A" });
    const value = await payloadSelect.inputValue();
    expect(value).toBe("payload-2");
  });

  test("changing payload variant marks flow tab as dirty", async () => {
    await expect(
      pvPage.locator(`${S.tabItemActive} ${S.tabDirty}`),
    ).toBeVisible();
  });

  test("payload dropdown hidden for step with request without payloads", async () => {
    // Collapse first step
    await pvPage
      .locator(`${S.flowStep}:first-child ${S.flowStepHeader}`)
      .click();

    // Expand second step (no payloads)
    await pvPage
      .locator(`${S.flowStep}:nth-child(2) ${S.flowStepHeader}`)
      .click();
    await expect(
      pvPage.locator(`${S.flowStep}:nth-child(2) ${S.flowStepDetail}`),
    ).toBeVisible();

    const payloadSelect = pvPage.locator(
      `${S.flowStep}:nth-child(2) ${S.flowStepPayloadSelect}`,
    );
    await expect(payloadSelect).toHaveCount(0);
  });

  test("reset payload variant back to default", async () => {
    // Collapse second step, expand first
    await pvPage
      .locator(`${S.flowStep}:nth-child(2) ${S.flowStepHeader}`)
      .click();
    await pvPage
      .locator(`${S.flowStep}:first-child ${S.flowStepHeader}`)
      .click();

    const payloadSelect = pvPage.locator(
      `${S.flowStep}:first-child ${S.flowStepPayloadSelect}`,
    );
    await payloadSelect.selectOption({ value: "" });
    const value = await payloadSelect.inputValue();
    expect(value).toBe("");
  });

  test("save and run flow with payload variant selected", async () => {
    const payloadSelect = pvPage.locator(
      `${S.flowStep}:first-child ${S.flowStepPayloadSelect}`,
    );
    await payloadSelect.selectOption({ label: "Variant A" });

    await pvPage.click(
      `${S.flowEditorActions} ${S.flowEditorBtnSecondary}:has-text("Save")`,
    );
    await pvPage.click(`${S.flowEditorActions} ${S.flowEditorBtnPrimary}`);

    await expect(pvPage.locator(S.flowRunner)).toBeVisible({
      timeout: 10_000,
    });
    await pvPage.waitForSelector(
      `${S.flowRunnerSummary}:not(:has(${S.flowRunnerRunning}))`,
      { timeout: 20_000 },
    );

    // Both steps should complete (success or at least attempted)
    const steps = pvPage.locator(S.flowRunnerStep);
    await expect(steps).toHaveCount(2);

    // First step should have run with Variant A body
    await steps.first().click();
    await pvPage
      .locator(`${S.flowRunnerDetailTab}:has-text("Request")`)
      .click();
    const requestContent = pvPage.locator(S.stepDetailContent);
    await expect(requestContent).toContainText("variant");
  });

  test("payload variant persists in saved flow data", async () => {
    const flows = readData("flows.json") as Array<{
      steps: Array<{ payloadId?: string }>;
    }>;
    const flow = flows.find((f) =>
      f.steps.some((s) => s.payloadId === "payload-2"),
    );
    expect(flow).toBeTruthy();
  });
});
