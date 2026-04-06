import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import {
  clickRequestTab,
  clickResponseTab,
  typeUrl,
  selectMethod,
  sendRequest,
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
 * Create an environment and select it so captures have somewhere to store values.
 */
async function createAndSelectEnv(page: Page, envName: string): Promise<void> {
  await page.click(S.envManageBtn);
  await expect(page.locator(S.modal)).toBeVisible();

  // Create new environment
  const addBtn = page.locator(`${S.envList} ${S.sidebarIconBtn}`);
  await addBtn.click();

  // Rename it
  const nameInput = page.locator(S.envNameInput);
  await nameInput.fill(envName);

  // Close modal
  await page.click(S.modalCloseBtn);
  await expect(page.locator(S.modal)).toBeHidden();

  // Select it from dropdown
  const envSelect = page.locator(S.envSelect);
  await envSelect.selectOption({ label: envName });
}

test.describe("Captures End-to-End", () => {
  test("set up environment for capture tests", async () => {
    await createAndSelectEnv(page, "CaptureEnv");

    // Verify environment is selected
    const envSelect = page.locator(S.envSelect);
    const selectedText = await envSelect
      .locator("option:checked")
      .textContent();
    expect(selectedText).toContain("CaptureEnv");
  });

  test("capture body JSON path value after send", async () => {
    // Set up request to jsonplaceholder which returns { id: 1, title: "..." ... }
    await typeUrl(page, TEST_URLS.json);
    await selectMethod(page, "GET");

    // Configure a capture for body JSON path "id"
    await clickRequestTab(page, "Captures");
    await page.click(S.captureAddBtn);

    const row = page.locator(S.captureRow).first();
    await row.locator(S.captureVarInput).fill("capturedId");
    await row.locator(S.captureSourceSelect).selectOption("body");
    await row.locator(S.capturePathInput).fill("id");

    // Send request
    await sendRequest(page);

    // Verify response came back
    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");

    // Now open EnvManager and check that capturedId was stored
    await page.click(S.envManageBtn);
    await expect(page.locator(S.modal)).toBeVisible();

    // Look for the variable row with key "capturedId"
    const varRows = page.locator(S.envVarRow);
    const count = await varRows.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const inputs = varRows.nth(i).locator('input[type="text"]');
      const key = await inputs.first().inputValue();
      if (key === "capturedId") {
        const value = await inputs.nth(1).inputValue();
        expect(value).toBe("1");
        found = true;
        break;
      }
    }
    expect(found).toBe(true);

    await page.click(S.modalCloseBtn);
  });

  test("capture status code stores numeric status", async () => {
    // Add a capture for status
    await clickRequestTab(page, "Captures");
    await page.click(S.captureAddBtn);

    const rows = page.locator(S.captureRow);
    const lastRow = rows.last();
    await lastRow.locator(S.captureVarInput).fill("capturedStatus");
    await lastRow.locator(S.captureSourceSelect).selectOption("status");

    // Path input is not rendered when source is status
    await expect(lastRow.locator(S.capturePathInput)).toHaveCount(0);

    // Send request
    await sendRequest(page);

    // Verify in environment
    await page.click(S.envManageBtn);
    const varRows = page.locator(S.envVarRow);
    const count = await varRows.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const inputs = varRows.nth(i).locator('input[type="text"]');
      const key = await inputs.first().inputValue();
      if (key === "capturedStatus") {
        const value = await inputs.nth(1).inputValue();
        expect(value).toBe("200");
        found = true;
        break;
      }
    }
    expect(found).toBe(true);

    await page.click(S.modalCloseBtn);
  });

  test("capture response header value", async () => {
    // Use httpbin /get which returns content-type header
    await typeUrl(page, TEST_URLS.get);
    await sendRequest(page);

    // Add a header capture
    await clickRequestTab(page, "Captures");
    await page.click(S.captureAddBtn);

    const lastRow = page.locator(S.captureRow).last();
    await lastRow.locator(S.captureVarInput).fill("capturedContentType");
    await lastRow.locator(S.captureSourceSelect).selectOption("header");
    await lastRow.locator(S.capturePathInput).fill("content-type");

    // Send again so capture triggers
    await sendRequest(page);

    // Verify in environment
    await page.click(S.envManageBtn);
    const varRows = page.locator(S.envVarRow);
    const count = await varRows.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const inputs = varRows.nth(i).locator('input[type="text"]');
      const key = await inputs.first().inputValue();
      if (key === "capturedContentType") {
        const value = await inputs.nth(1).inputValue();
        expect(value.toLowerCase()).toContain("application/json");
        found = true;
        break;
      }
    }
    expect(found).toBe(true);

    await page.click(S.modalCloseBtn);
  });

  test("captured variable usable in subsequent request via {{var}}", async () => {
    // capturedId should be "1" from step above
    // Use it in a URL: https://jsonplaceholder.typicode.com/posts/{{capturedId}}
    await typeUrl(
      page,
      "https://jsonplaceholder.typicode.com/posts/{{capturedId}}",
    );
    await selectMethod(page, "GET");

    // Remove existing captures so this is a clean test
    await clickRequestTab(page, "Captures");
    while ((await page.locator(S.captureRow).count()) > 0) {
      await page.locator(S.captureRemoveBtn).first().click();
    }

    await sendRequest(page);

    // Should get 200 because {{capturedId}} = "1" → /posts/1
    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");

    // Verify body contains the expected post
    await clickResponseTab(page, "Body");
    const bodyContent = await page
      .locator(`${S.responseBody} .cm-content`)
      .textContent();
    expect(bodyContent).toContain('"id"');
  });

  test("disabled capture is not applied", async () => {
    await typeUrl(page, TEST_URLS.json);
    await selectMethod(page, "GET");

    // Add a new capture (disabled)
    await clickRequestTab(page, "Captures");
    await page.click(S.captureAddBtn);

    const lastRow = page.locator(S.captureRow).last();
    await lastRow.locator(S.captureVarInput).fill("shouldNotExist");
    await lastRow.locator(S.captureSourceSelect).selectOption("body");
    await lastRow.locator(S.capturePathInput).fill("title");

    // Uncheck the capture
    const checkbox = lastRow.locator('input[type="checkbox"]');
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();

    await sendRequest(page);

    // Verify shouldNotExist is NOT in environment
    await page.click(S.envManageBtn);
    const varRows = page.locator(S.envVarRow);
    const count = await varRows.count();
    for (let i = 0; i < count; i++) {
      const inputs = varRows.nth(i).locator('input[type="text"]');
      const key = await inputs.first().inputValue();
      expect(key).not.toBe("shouldNotExist");
    }

    await page.click(S.modalCloseBtn);
  });

  test("captures tab badge shows count of enabled captures", async () => {
    // Previous test left 1 disabled capture. Add an enabled one so badge shows > 0.
    await clickRequestTab(page, "Captures");
    await page.click(S.captureAddBtn);
    const newRow = page.locator(S.captureRow).last();
    await newRow.locator(S.captureVarInput).fill("badgeTestVar");
    await newRow.locator(S.captureSourceSelect).selectOption("status");

    await clickRequestTab(page, "Params"); // switch away first
    const capturesTab = page.locator(
      `${S.requestTab}:has-text("captures")`,
    );
    const badge = capturesTab.locator(S.tabBadge);

    // Should show badge with the number of enabled captures
    await expect(badge).toBeVisible();
    const text = await badge.textContent();
    const num = parseInt(text || "0", 10);
    expect(num).toBeGreaterThan(0);
  });

  test("captures warning hidden when environment is selected", async () => {
    await clickRequestTab(page, "Captures");
    // We have an env selected, so warning should be hidden
    await expect(page.locator(S.capturesWarning)).toBeHidden();
  });
});
