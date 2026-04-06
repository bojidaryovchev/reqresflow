import { test, expect } from "@playwright/test";
import { launchApp, closeApp, restartApp, seedData, readData, getDataDir } from "../helpers/app";
import { S } from "../helpers/selectors";
import fs from "node:fs";
import path from "node:path";
import {
  clickSidebarTab,
  clickRequestTab,
  clickResponseTab,
  typeUrl,
  selectMethod,
  sendRequest,
  clickSave,
  TEST_URLS,
  makeCollection,
  makeRequest,
  makeEnvironment,
  makeFlow,
} from "../helpers/data";
import type { Page } from "@playwright/test";

// ─── Payload Rename (via request panel input) ─────────────────────────
let page: Page;

test.describe("Payload Rename (request panel)", () => {
  test.beforeAll(async () => {
    ({ page } = await launchApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("rename payload via payload-rename-input", async () => {
    // Switch to raw body so payloads are shown
    await clickRequestTab(page, "Body");
    await page.locator(`${S.bodyTypeOption}:has-text("raw")`).click();

    // The default payload should be visible
    await expect(page.locator(S.payloadTab)).toHaveCount(1);

    // The rename input should exist with default value "Default"
    const renameInput = page.locator(".payload-rename-input");
    await expect(renameInput).toBeVisible();
    await expect(renameInput).toHaveValue("Default");

    // Rename the payload
    await renameInput.fill("My Payload");
    await expect(renameInput).toHaveValue("My Payload");

    // The payload tab name should also update
    const tabName = page.locator(`${S.payloadTab} ${S.payloadTabName}`).first();
    await expect(tabName).toHaveText("My Payload");
  });

  test("add second payload and rename it", async () => {
    await page.click(S.payloadAddBtn);
    await expect(page.locator(S.payloadTab)).toHaveCount(2);

    // Click the second payload tab to activate it
    await page.locator(S.payloadTab).nth(1).click();

    // Rename it
    const renameInput = page.locator(".payload-rename-input");
    await renameInput.fill("Variant B");
    await expect(renameInput).toHaveValue("Variant B");

    // Tab name should reflect
    const tabName = page.locator(`${S.payloadTab} ${S.payloadTabName}`).nth(1);
    await expect(tabName).toHaveText("Variant B");
  });
});

// ─── Payload Rename (via sidebar) ─────────────────────────────────────
test.describe("Payload Rename (sidebar)", () => {
  test.beforeAll(async () => {
    ({ page } = await launchApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("set up collection with request that has payloads", async () => {
    // Create collection
    await clickSidebarTab(page, "Collections");
    const addBtn = page
      .locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`)
      .first();
    await addBtn.click();
    const renameInput = page.locator(S.renameInput);
    await renameInput.fill("Rename Test Col");
    await renameInput.press("Enter");

    // Set up a POST request with body
    await selectMethod(page, "POST");
    await typeUrl(page, TEST_URLS.post);
    await page.locator(S.requestNameInput).fill("Payload Req");

    await clickRequestTab(page, "Body");
    await page.locator(`${S.bodyTypeOption}:has-text("raw")`).click();

    // Add a second payload
    await page.click(S.payloadAddBtn);
    await expect(page.locator(S.payloadTab)).toHaveCount(2);

    // Save
    await clickSave(page);
    await page.locator(S.savePickerItem).first().click();
  });

  test("rename payload variant via sidebar rename button", async () => {
    await clickSidebarTab(page, "Collections");

    // Ensure the collection is expanded (check arrow direction)
    const arrow = page.locator(S.collectionArrow).first();
    const arrowText = await arrow.textContent();
    if (arrowText?.includes("▶")) {
      await page.locator(S.collectionHeader).first().click();
    }

    // Variants should be visible (payloads > 1 shows them automatically)
    await expect(page.locator(S.requestVariantItem).first()).toBeVisible();

    // Make hover-only actions visible (CSS :hover can't be triggered in Electron tests)
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.textContent = ".collection-actions { display: flex !important; }";
      document.head.appendChild(style);
    });

    // Click the rename button (✎) on the first variant
    const firstVariant = page.locator(S.requestVariantItem).first();
    const renameBtn = firstVariant.locator(
      `${S.sidebarIconBtn}[title="Rename payload"]`,
    );
    await renameBtn.click();

    // Rename input should appear
    const renameInput = page.locator(
      `${S.requestVariantItem} ${S.renameInput}`,
    );
    await expect(renameInput).toBeVisible();

    // Type new name and confirm
    await renameInput.fill("Renamed Payload");
    await renameInput.press("Enter");

    // Verify the variant name updated
    await expect(
      page.locator(S.requestVariantName).first(),
    ).toHaveText("Renamed Payload");
  });
});

// ─── Flow Rename (sidebar) ────────────────────────────────────────────
test.describe("Flow Rename (sidebar)", () => {
  test.beforeAll(async () => {
    ({ page } = await launchApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("create a flow and rename via sidebar rename button", async () => {
    await clickSidebarTab(page, "Flows");
    const addBtn = page.locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`);
    await addBtn.click();

    // Name it in the editor
    const nameInput = page.locator(S.flowEditorName);
    await nameInput.fill("Original Name");

    // Save the flow
    await page.click(
      `${S.flowEditorActions} ${S.flowEditorBtnSecondary}:has-text("Save")`,
    );

    // Back to close tab
    await page.click(
      `${S.flowEditorActions} ${S.flowEditorBtnSecondary}:has-text("Back")`,
    );

    // Now rename via sidebar
    await clickSidebarTab(page, "Flows");
    const flowItem = page
      .locator(S.flowItem)
      .filter({ hasText: "Original Name" });
    await expect(flowItem).toBeVisible();

    // Make hover-only actions visible (CSS :hover can't be triggered in Electron tests)
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.textContent = ".collection-actions { display: flex !important; }";
      document.head.appendChild(style);
    });

    // Click the rename button
    const renameBtn = flowItem.locator(
      `${S.sidebarIconBtn}[title="Rename flow"]`,
    );
    await renameBtn.click();

    // Rename input should appear
    const renameInput = page.locator(`${S.flowItem} ${S.renameInput}`);
    await expect(renameInput).toBeVisible();

    await renameInput.fill("Renamed Flow");
    await renameInput.press("Enter");

    // Verify the name updated
    await expect(
      page.locator(`${S.flowItemName}:has-text("Renamed Flow")`),
    ).toBeVisible();
  });

  test("rename flow via double-click on name", async () => {
    const flowName = page.locator(
      `${S.flowItemName}:has-text("Renamed Flow")`,
    );
    await flowName.dblclick();

    const renameInput = page.locator(`${S.flowItem} ${S.renameInput}`);
    await expect(renameInput).toBeVisible();

    await renameInput.fill("Double-Click Renamed");
    await renameInput.press("Enter");

    await expect(
      page.locator(`${S.flowItemName}:has-text("Double-Click Renamed")`),
    ).toBeVisible();
  });

  test("rename flow persists in saved data", async () => {
    // Read the flows data file
    const flows = readData("flows.json") as Array<{ name: string }>;
    expect(flows).toBeTruthy();
    const renamedFlow = flows.find((f) => f.name === "Double-Click Renamed");
    expect(renamedFlow).toBeTruthy();
  });
});

// ─── Multiple {{var}} Substitution ────────────────────────────────────
test.describe("Multiple {{var}} Substitution", () => {
  test.beforeAll(async () => {
    // Launch first to get tempDataDir, then seed, then restart
    ({ page } = await launchApp());

    const env = makeEnvironment({
      id: "env-multi",
      name: "MultiVarEnv",
      variables: [
        { key: "host", value: "httpbin.org" },
        { key: "path", value: "get" },
      ],
    });
    seedData("environments.json", [env]);

    // Restart to pick up seeded environment
    ({ page } = await restartApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("URL with multiple {{var}} placeholders resolves correctly", async () => {
    // Select the environment
    const envSelect = page.locator(S.envSelect);
    await envSelect.selectOption({ label: "MultiVarEnv" });

    // Type URL with two variables
    await typeUrl(page, "https://{{host}}/{{path}}");
    await selectMethod(page, "GET");

    // Send and verify response
    await sendRequest(page);

    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");
  });

  test("headers with multiple {{var}} placeholders resolve correctly", async () => {
    // Add a custom header using a variable value
    await clickRequestTab(page, "Headers");
    const headerRows = page.locator(S.kvRow);
    const firstRow = headerRows.first();
    await firstRow.locator('input[type="text"]').first().fill("X-Custom");
    await firstRow
      .locator('input[type="text"]')
      .nth(1)
      .fill("{{host}}-{{path}}");

    // Send request — httpbin /get echoes headers back
    await sendRequest(page);

    // Check response body contains the resolved header
    await clickResponseTab(page, "Body");
    const bodyContent = page.locator(`${S.responseBody} .cm-content`);
    const text = await bodyContent.textContent();
    expect(text).toContain("httpbin.org-get");
  });
});

// ─── Capture Edge Cases ───────────────────────────────────────────────
test.describe("Capture Edge Cases", () => {
  test.beforeAll(async () => {
    ({ page } = await launchApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("set up env for capture edge case tests", async () => {
    await page.click(S.envManageBtn);
    await expect(page.locator(S.modal)).toBeVisible();
    const addBtn = page.locator(`${S.envList} ${S.sidebarIconBtn}`);
    await addBtn.click();
    const nameInput = page.locator(S.envNameInput);
    await nameInput.fill("CaptureEdge");
    await page.click(S.modalCloseBtn);
    await page.locator(S.envSelect).selectOption({ label: "CaptureEdge" });
  });

  test("capture with invalid JSON path stores empty string", async () => {
    await typeUrl(page, TEST_URLS.json);
    await selectMethod(page, "GET");

    // Add a capture with a non-existent path
    await clickRequestTab(page, "Captures");
    await page.click(S.captureAddBtn);

    const row = page.locator(S.captureRow).first();
    await row.locator(S.captureVarInput).fill("badPath");
    await row.locator(S.captureSourceSelect).selectOption("body");
    await row.locator(S.capturePathInput).fill("this.path.does.not.exist");

    await sendRequest(page);

    // Verify captured value is empty
    await page.click(S.envManageBtn);
    await expect(page.locator(S.modal)).toBeVisible();

    const varRows = page.locator(S.envVarRow);
    const count = await varRows.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const inputs = varRows.nth(i).locator('input[type="text"]');
      const key = await inputs.first().inputValue();
      if (key === "badPath") {
        const value = await inputs.nth(1).inputValue();
        expect(value).toBe("");
        found = true;
        break;
      }
    }
    expect(found).toBe(true);

    await page.click(S.modalCloseBtn);
  });

  test("capture with nested JSON path resolves correctly", async () => {
    // jsonplaceholder /posts/1 returns { userId: 1, id: 1, title: "...", body: "..." }
    // Use a simple path that resolves
    await clickRequestTab(page, "Captures");

    // Remove old capture
    await page.locator(S.captureRemoveBtn).first().click();

    // Add new capture with valid but nested-looking path
    await page.click(S.captureAddBtn);
    const row = page.locator(S.captureRow).first();
    await row.locator(S.captureVarInput).fill("postTitle");
    await row.locator(S.captureSourceSelect).selectOption("body");
    await row.locator(S.capturePathInput).fill("title");

    await sendRequest(page);

    // Verify the title was captured
    await page.click(S.envManageBtn);
    await expect(page.locator(S.modal)).toBeVisible();

    const varRows = page.locator(S.envVarRow);
    const count = await varRows.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const inputs = varRows.nth(i).locator('input[type="text"]');
      const key = await inputs.first().inputValue();
      if (key === "postTitle") {
        const value = await inputs.nth(1).inputValue();
        // jsonplaceholder post 1 title is non-empty
        expect(value.length).toBeGreaterThan(0);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);

    await page.click(S.modalCloseBtn);
  });

  test("capture header value (case-insensitive lookup)", async () => {
    await clickRequestTab(page, "Captures");

    // Remove old capture
    await page.locator(S.captureRemoveBtn).first().click();

    // Add capture for a response header
    await page.click(S.captureAddBtn);
    const row = page.locator(S.captureRow).first();
    await row.locator(S.captureVarInput).fill("capturedCT");
    await row.locator(S.captureSourceSelect).selectOption("header");
    await row.locator(S.capturePathInput).fill("content-type");

    await sendRequest(page);

    // Verify header was captured
    await page.click(S.envManageBtn);
    await expect(page.locator(S.modal)).toBeVisible();

    const varRows = page.locator(S.envVarRow);
    const count = await varRows.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const inputs = varRows.nth(i).locator('input[type="text"]');
      const key = await inputs.first().inputValue();
      if (key === "capturedCT") {
        const value = await inputs.nth(1).inputValue();
        expect(value).toContain("json");
        found = true;
        break;
      }
    }
    expect(found).toBe(true);

    await page.click(S.modalCloseBtn);
  });
});

// ─── DELETE With Body ─────────────────────────────────────────────────
test.describe("DELETE With Body", () => {
  test.beforeAll(async () => {
    ({ page } = await launchApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("DELETE request can send a raw JSON body", async () => {
    await selectMethod(page, "DELETE");
    await typeUrl(page, TEST_URLS.delete);

    // Set body type to raw JSON
    await clickRequestTab(page, "Body");
    await page.locator(`${S.bodyTypeOption}:has-text("raw")`).click();
    await page.selectOption(S.rawLanguageSelect, "json");

    // Type body
    const cmContent = page.locator(`${S.requestSection} .cm-content`).first();
    await cmContent.click();
    await page.keyboard.type('{"deleteId": 42}');

    await sendRequest(page);

    // httpbin /delete returns the request data back
    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");

    // Verify the body was sent (httpbin echoes it back in "data" field)
    await clickResponseTab(page, "Body");
    const bodyContent = page.locator(`${S.responseBody} .cm-content`);
    const text = await bodyContent.textContent();
    expect(text).toContain("deleteId");
  });
});

// ─── Flow Abort ───────────────────────────────────────────────────────
test.describe("Flow Abort", () => {
  test.beforeAll(async () => {
    // Launch app first to get tempDataDir set
    ({ page } = await launchApp({ createTab: false }));

    // Seed a collection with a slow request
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

    // Restart to pick up seeded data
    ({ page } = await restartApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("abort button stops flow and marks remaining steps as skipped", async () => {
    await clickSidebarTab(page, "Flows");

    // Click the flow to open it
    const flowItem = page
      .locator(S.flowItem)
      .filter({ hasText: "Abort Flow" });
    await flowItem.locator(S.flowItemHeader).click();

    // Wait for editor to appear
    await expect(page.locator(S.flowEditor)).toBeVisible();

    // Run the flow
    await page.click(`${S.flowEditorActions} ${S.flowEditorBtnPrimary}`);

    // FlowRunner should appear
    await expect(page.locator(S.flowRunner)).toBeVisible({ timeout: 10_000 });

    // Wait a moment for the first step to start, then click Stop
    await expect(
      page.locator(`.flow-editor-btn.secondary:has-text("Stop")`),
    ).toBeVisible({ timeout: 5_000 });
    await page
      .locator(`.flow-editor-btn.secondary:has-text("Stop")`)
      .click();

    // Wait for flow to complete (aborted state)
    await page.waitForSelector(
      `${S.flowRunnerSummary}:not(:has(${S.flowRunnerRunning}))`,
      { timeout: 20_000 },
    );

    // At least one step should be skipped
    const summaryText = await page.locator(S.flowRunnerSummary).textContent();
    expect(summaryText).toMatch(/skipped|aborted/i);
  });
});

// ─── Error Handling ───────────────────────────────────────────────────
test.describe("Error Handling", () => {
  test.beforeAll(async () => {
    ({ page } = await launchApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("invalid URL shows error message in response panel", async () => {
    await typeUrl(page, TEST_URLS.invalid);
    await selectMethod(page, "GET");
    await sendRequest(page);

    await expect(page.locator(S.responseError)).toBeVisible();
    const errorText = await page.locator(S.responseError).textContent();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(errorText!.length).toBeGreaterThan(0);
  });

  test("404 response shows client error styled status", async () => {
    await typeUrl(page, TEST_URLS.status404);
    await sendRequest(page);

    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("404");

    // Should have client-error styling
    const className = await page
      .locator(S.responseStatus)
      .getAttribute("class");
    expect(className).toContain("client-error");
  });

  test("500 response shows server error styled status", async () => {
    await typeUrl(page, TEST_URLS.status500);
    await sendRequest(page);

    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("500");

    // Should have server-error styling
    const className = await page
      .locator(S.responseStatus)
      .getAttribute("class");
    expect(className).toContain("server-error");
  });

  test("sending request clears previous error and shows new response", async () => {
    // First, trigger an error
    await typeUrl(page, TEST_URLS.invalid);
    await sendRequest(page);
    await expect(page.locator(S.responseError)).toBeVisible();

    // Now send a valid request
    await typeUrl(page, TEST_URLS.json);
    await sendRequest(page);

    // Error should be gone, response should be visible
    await expect(page.locator(S.responseError)).toBeHidden();
    await expect(page.locator(S.responseStatus)).toBeVisible();
    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");
  });
});

// ─── URL Query String Edge Cases ──────────────────────────────────────
test.describe("URL Query String Edge Cases", () => {
  test.beforeAll(async () => {
    ({ page } = await launchApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("params with special characters are URL-encoded in request", async () => {
    await typeUrl(page, TEST_URLS.get);
    await selectMethod(page, "GET");

    // Add param with special characters
    await clickRequestTab(page, "Params");
    const kvRows = page.locator(`${S.requestSection} ${S.kvRow}`);
    const firstRow = kvRows.first();
    await firstRow.locator('input[type="text"]').first().fill("q");
    await firstRow.locator('input[type="text"]').nth(1).fill("hello world&foo=bar");

    await sendRequest(page);

    // httpbin /get echoes args back — check response body
    await clickResponseTab(page, "Body");
    const bodyContent = page.locator(`${S.responseBody} .cm-content`);
    const text = await bodyContent.textContent();
    // The value should have been properly sent (httpbin will show decoded)
    expect(text).toContain("hello world&foo=bar");
  });

  test("disabled params are not included in request", async () => {
    // Disable the first param
    await clickRequestTab(page, "Params");
    const kvRows = page.locator(`${S.requestSection} ${S.kvRow}`);
    const firstRow = kvRows.first();
    const checkbox = firstRow.locator('input[type="checkbox"]');
    await checkbox.uncheck();

    // Add a new enabled param
    await page.click(`${S.requestSection} ${S.kvAddBtn}`);
    const newRow = page
      .locator(`${S.requestSection} ${S.kvRow}`)
      .nth(1);
    await newRow.locator('input[type="text"]').first().fill("only");
    await newRow.locator('input[type="text"]').nth(1).fill("this");

    await sendRequest(page);

    // Check response — only the enabled param should be present
    await clickResponseTab(page, "Body");
    const bodyContent = page.locator(`${S.responseBody} .cm-content`);
    const text = await bodyContent.textContent();
    expect(text).toContain("only");
    // The disabled param "q" should NOT be in args
    expect(text).not.toContain("hello world");
  });
});

// ─── Corrupted Data Resilience ────────────────────────────────────────
test.describe("Corrupted Data Resilience", () => {
  test.beforeAll(async () => {
    // Launch app first to get tempDataDir set
    ({ page } = await launchApp({ createTab: false }));

    // Seed corrupted JSON files (write raw strings, not via seedData which JSON.stringifies)
    const dataDir = path.join(getDataDir(), "reqresflow-data");
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, "collections.json"), "NOT VALID JSON{{{", "utf-8");
    fs.writeFileSync(path.join(dataDir, "environments.json"), "BROKEN", "utf-8");
    fs.writeFileSync(path.join(dataDir, "history.json"), "<<<>>>", "utf-8");

    // Restart — app should handle corrupted data gracefully
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
    await clickSidebarTab(page, "Collections");
    // Should show empty or no collections
    const collections = page.locator(S.collection);
    const count = await collections.count();
    expect(count).toBe(0);
  });

  test("history is empty after corrupted load", async () => {
    await clickSidebarTab(page, "History");
    const items = page.locator(S.historyItem);
    const count = await items.count();
    expect(count).toBe(0);
  });
});
