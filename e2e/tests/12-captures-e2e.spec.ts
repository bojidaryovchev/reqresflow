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

// ─────────────────────────────────────────────────────────────────────
// 12 — Response Captures End-to-End
//
// Covers: capturing body JSON path, status, header, disabled capture,
//         badge count, warning when no env, capture edge cases
// ─────────────────────────────────────────────────────────────────────

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp();
});

async function createAndSelectEnv(
  p: Page,
  envName: string,
): Promise<void> {
  await p.click(S.envManageBtn);
  await expect(p.locator(S.modal)).toBeVisible();
  const addBtn = p.locator(`${S.envList} ${S.sidebarIconBtn}`);
  await addBtn.click();
  const nameInput = p.locator(S.envNameInput);
  await nameInput.fill(envName);
  await p.click(S.modalCloseBtn);
  await expect(p.locator(S.modal)).toBeHidden();
  await p.locator(S.envSelect).selectOption({ label: envName });
}

async function findEnvVar(
  p: Page,
  varName: string,
): Promise<string | null> {
  await p.click(S.envManageBtn);
  await expect(p.locator(S.modal)).toBeVisible();
  const varRows = p.locator(S.envVarRow);
  const count = await varRows.count();
  for (let i = 0; i < count; i++) {
    const inputs = varRows.nth(i).locator('input[type="text"]');
    const key = await inputs.first().inputValue();
    if (key === varName) {
      const value = await inputs.nth(1).inputValue();
      await p.click(S.modalCloseBtn);
      return value;
    }
  }
  await p.click(S.modalCloseBtn);
  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// Section 1 — Core Captures
// ═══════════════════════════════════════════════════════════════════════

test.describe("Captures End-to-End", () => {
  test("set up environment for capture tests", async () => {
    await createAndSelectEnv(page, "CaptureEnv");
    const envSelect = page.locator(S.envSelect);
    const selectedText = await envSelect
      .locator("option:checked")
      .textContent();
    expect(selectedText).toContain("CaptureEnv");
  });

  test("capture body JSON path value after send", async () => {
    await typeUrl(page, TEST_URLS.json);
    await selectMethod(page, "GET");

    await clickRequestTab(page, "Captures");
    await page.click(S.captureAddBtn);

    const row = page.locator(S.captureRow).first();
    await row.locator(S.captureVarInput).fill("capturedId");
    await row.locator(S.captureSourceSelect).selectOption("body");
    await row.locator(S.capturePathInput).fill("id");

    await sendRequest(page);

    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");

    const value = await findEnvVar(page, "capturedId");
    expect(value).toBe("1");
  });

  test("capture status code stores numeric status", async () => {
    await clickRequestTab(page, "Captures");
    await page.click(S.captureAddBtn);

    const lastRow = page.locator(S.captureRow).last();
    await lastRow.locator(S.captureVarInput).fill("capturedStatus");
    await lastRow.locator(S.captureSourceSelect).selectOption("status");
    await expect(lastRow.locator(S.capturePathInput)).toHaveCount(0);

    await sendRequest(page);

    const value = await findEnvVar(page, "capturedStatus");
    expect(value).toBe("200");
  });

  test("capture response header value", async () => {
    await typeUrl(page, TEST_URLS.get);
    await sendRequest(page);

    await clickRequestTab(page, "Captures");
    await page.click(S.captureAddBtn);

    const lastRow = page.locator(S.captureRow).last();
    await lastRow.locator(S.captureVarInput).fill("capturedContentType");
    await lastRow.locator(S.captureSourceSelect).selectOption("header");
    await lastRow.locator(S.capturePathInput).fill("content-type");

    await sendRequest(page);

    const value = await findEnvVar(page, "capturedContentType");
    expect(value?.toLowerCase()).toContain("application/json");
  });

  test("captured variable usable in subsequent request via {{var}}", async () => {
    await typeUrl(
      page,
      "https://jsonplaceholder.typicode.com/posts/{{capturedId}}",
    );
    await selectMethod(page, "GET");

    await clickRequestTab(page, "Captures");
    while ((await page.locator(S.captureRow).count()) > 0) {
      await page.locator(S.captureRemoveBtn).first().click();
    }

    await sendRequest(page);

    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");

    await clickResponseTab(page, "Body");
    const bodyContent = await page
      .locator(`${S.responseBody} .cm-content`)
      .textContent();
    expect(bodyContent).toContain('"id"');
  });

  test("disabled capture is not applied", async () => {
    await typeUrl(page, TEST_URLS.json);
    await selectMethod(page, "GET");

    await clickRequestTab(page, "Captures");
    await page.click(S.captureAddBtn);

    const lastRow = page.locator(S.captureRow).last();
    await lastRow.locator(S.captureVarInput).fill("shouldNotExist");
    await lastRow.locator(S.captureSourceSelect).selectOption("body");
    await lastRow.locator(S.capturePathInput).fill("title");

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
    await clickRequestTab(page, "Captures");
    await page.click(S.captureAddBtn);
    const newRow = page.locator(S.captureRow).last();
    await newRow.locator(S.captureVarInput).fill("badgeTestVar");
    await newRow.locator(S.captureSourceSelect).selectOption("status");

    await clickRequestTab(page, "Params"); // switch away
    const capturesTab = page.locator(
      `${S.requestTab}:has-text("captures")`,
    );
    const badge = capturesTab.locator(S.tabBadge);
    await expect(badge).toBeVisible();
    const text = await badge.textContent();
    const num = parseInt(text || "0", 10);
    expect(num).toBeGreaterThan(0);
  });

  test("captures warning hidden when environment is selected", async () => {
    await clickRequestTab(page, "Captures");
    await expect(page.locator(S.capturesWarning)).toBeHidden();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Section 2 — Capture Edge Cases
// ═══════════════════════════════════════════════════════════════════════

test.describe("Capture Edge Cases", () => {
  let edgePage: Page;

  test.beforeAll(async () => {
    ({ page: edgePage } = await launchApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("set up env for capture edge case tests", async () => {
    await edgePage.click(S.envManageBtn);
    await expect(edgePage.locator(S.modal)).toBeVisible();
    const addBtn = edgePage.locator(`${S.envList} ${S.sidebarIconBtn}`);
    await addBtn.click();
    const nameInput = edgePage.locator(S.envNameInput);
    await nameInput.fill("CaptureEdge");
    await edgePage.click(S.modalCloseBtn);
    await edgePage
      .locator(S.envSelect)
      .selectOption({ label: "CaptureEdge" });
  });

  test("capture with invalid JSON path stores empty string", async () => {
    await typeUrl(edgePage, TEST_URLS.json);
    await selectMethod(edgePage, "GET");

    await clickRequestTab(edgePage, "Captures");
    await edgePage.click(S.captureAddBtn);

    const row = edgePage.locator(S.captureRow).first();
    await row.locator(S.captureVarInput).fill("badPath");
    await row.locator(S.captureSourceSelect).selectOption("body");
    await row.locator(S.capturePathInput).fill("this.path.does.not.exist");

    await sendRequest(edgePage);

    await edgePage.click(S.envManageBtn);
    await expect(edgePage.locator(S.modal)).toBeVisible();

    const varRows = edgePage.locator(S.envVarRow);
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
    await edgePage.click(S.modalCloseBtn);
  });

  test("capture with nested JSON path resolves correctly", async () => {
    await clickRequestTab(edgePage, "Captures");
    await edgePage.locator(S.captureRemoveBtn).first().click();

    await edgePage.click(S.captureAddBtn);
    const row = edgePage.locator(S.captureRow).first();
    await row.locator(S.captureVarInput).fill("postTitle");
    await row.locator(S.captureSourceSelect).selectOption("body");
    await row.locator(S.capturePathInput).fill("title");

    await sendRequest(edgePage);

    await edgePage.click(S.envManageBtn);
    await expect(edgePage.locator(S.modal)).toBeVisible();

    const varRows = edgePage.locator(S.envVarRow);
    const count = await varRows.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const inputs = varRows.nth(i).locator('input[type="text"]');
      const key = await inputs.first().inputValue();
      if (key === "postTitle") {
        const value = await inputs.nth(1).inputValue();
        expect(value.length).toBeGreaterThan(0);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
    await edgePage.click(S.modalCloseBtn);
  });

  test("capture header value (case-insensitive lookup)", async () => {
    await clickRequestTab(edgePage, "Captures");
    await edgePage.locator(S.captureRemoveBtn).first().click();

    await edgePage.click(S.captureAddBtn);
    const row = edgePage.locator(S.captureRow).first();
    await row.locator(S.captureVarInput).fill("capturedCT");
    await row.locator(S.captureSourceSelect).selectOption("header");
    await row.locator(S.capturePathInput).fill("content-type");

    await sendRequest(edgePage);

    await edgePage.click(S.envManageBtn);
    await expect(edgePage.locator(S.modal)).toBeVisible();

    const varRows = edgePage.locator(S.envVarRow);
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
    await edgePage.click(S.modalCloseBtn);
  });
});
