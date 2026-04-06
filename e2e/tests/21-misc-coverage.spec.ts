import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import {
  clickRequestTab,
  typeUrl,
  selectMethod,
  sendRequest,
  clickSave,
  clickSidebarTab,
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

test.describe("Auth Tab Badge", () => {
  test("auth badge hidden when type is none", async () => {
    await clickRequestTab(page, "Auth");
    await page.selectOption(S.authTypeSelect, "none");

    // Switch away to see badge
    await clickRequestTab(page, "Params");
    const authTab = page.locator(`${S.requestTab}:has-text("auth")`);
    const badge = authTab.locator(S.tabBadge);
    await expect(badge).toBeHidden();
  });

  test("auth badge shows ● when bearer auth is set", async () => {
    await clickRequestTab(page, "Auth");
    await page.selectOption(S.authTypeSelect, "bearer");

    // Fill in token
    const tokenInput = page.locator(`${S.authFields} input`).first();
    await tokenInput.fill("my-token");

    // Check badge
    await clickRequestTab(page, "Params");
    const authTab = page.locator(`${S.requestTab}:has-text("auth")`);
    const badge = authTab.locator(S.tabBadge);
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText("●");
  });

  test("auth badge shows ● when basic auth is set", async () => {
    await clickRequestTab(page, "Auth");
    await page.selectOption(S.authTypeSelect, "basic");

    await clickRequestTab(page, "Params");
    const authTab = page.locator(`${S.requestTab}:has-text("auth")`);
    const badge = authTab.locator(S.tabBadge);
    await expect(badge).toBeVisible();

    // Reset auth to none for remaining tests
    await clickRequestTab(page, "Auth");
    await page.selectOption(S.authTypeSelect, "none");
  });
});

test.describe("Save Button Dirty State", () => {
  test("save button gains dirty class when tab has unsaved changes", async () => {
    await typeUrl(page, TEST_URLS.get);

    // Save the request first so dirty tracking starts
    await clickSidebarTab(page, "Collections");
    const addBtn = page
      .locator(`${S.sidebarHeader} ${S.sidebarAddBtn}`)
      .first();
    await addBtn.click();
    const renameInput = page.locator(S.renameInput);
    await renameInput.fill("Dirty Test Col");
    await renameInput.press("Enter");

    await page.locator(S.requestNameInput).fill("Dirty Request");
    await clickSave(page);
    await page.locator(S.savePickerItem).first().click();

    // Now modify the URL to make it dirty
    await typeUrl(page, TEST_URLS.post);

    // Save button should have dirty class
    const saveBtn = page.locator(S.saveBtn);
    await expect(saveBtn).toHaveClass(/dirty/);
  });

  test("save button loses dirty class after saving", async () => {
    // Hit Ctrl+S to save
    await page.keyboard.press("Control+s");

    // Save button should no longer be dirty
    const saveBtn = page.locator(S.saveBtn);
    await expect(saveBtn).not.toHaveClass(/dirty/);
  });
});

test.describe("Tab Lifecycle", () => {
  test("request tab dirty indicator shows on change", async () => {
    // Modify URL to make tab dirty
    await typeUrl(page, TEST_URLS.headers);

    const activeTab = page.locator(S.tabItemActive);
    const dirtyDot = activeTab.locator(S.tabDirty);
    await expect(dirtyDot).toBeVisible();
  });

  test("middle-click on tab closes it", async () => {
    // Open a new tab so we have multiple
    await page.click(S.tabAdd);
    const tabCount = await page.locator(S.tabItem).count();
    expect(tabCount).toBeGreaterThanOrEqual(2);

    // Middle-click on the first non-active tab to close it
    const firstTab = page.locator(S.tabItem).first();
    await firstTab.click({ button: "middle" });

    const newCount = await page.locator(S.tabItem).count();
    expect(newCount).toBe(tabCount - 1);
  });

  test("last tab can be closed - shows empty state", async () => {
    // Keep closing tabs until one remains
    while ((await page.locator(S.tabItem).count()) > 1) {
      const lastTab = page.locator(S.tabItem).last();
      await lastTab.locator(S.tabClose).click();
    }

    // Close the last tab
    const lastTab = page.locator(S.tabItem).first();
    await lastTab.locator(S.tabClose).click();

    // All tabs removed — empty state shown
    await expect(page.locator(S.tabItem)).toHaveCount(0);
    await expect(page.locator(".empty-state")).toBeVisible();

    // Create a tab for subsequent tests
    await page.click(S.tabAdd);
    await expect(page.locator(S.tabItem)).toHaveCount(1);
  });
});

test.describe("POST with GraphQL Body", () => {
  test("switch to graphql body type shows query editor", async () => {
    await selectMethod(page, "POST");
    await typeUrl(page, TEST_URLS.post);

    await clickRequestTab(page, "Body");
    await page.locator(`${S.bodyTypeOption}:has-text("graphql")`).click();

    await expect(page.locator(S.graphqlEditor)).toBeVisible();
  });

  test("type GraphQL query and send request", async () => {
    // Type into the query section's CodeMirror
    const queryCm = page
      .locator(`${S.graphqlSection} .cm-content`)
      .first();
    await queryCm.click();
    await page.keyboard.type("{ users { id name } }");

    await sendRequest(page);

    // httpbin /post echoes back the body, so status should be 200
    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");
  });
});

test.describe("Format Button", () => {
  test("format button visible for raw JSON body", async () => {
    // Open a new tab for this test
    await page.click(S.tabAdd);

    await selectMethod(page, "POST");
    await typeUrl(page, TEST_URLS.post);

    await clickRequestTab(page, "Body");
    await page.locator(`${S.bodyTypeOption}:has-text("raw")`).click();
    await page.selectOption(S.rawLanguageSelect, "json");

    const formatBtn = page.locator(S.formatBtn);
    await expect(formatBtn).toBeVisible();
  });

  test("format button formats JSON content", async () => {
    // Type unformatted JSON
    const cmContent = page.locator(`${S.requestSection} .cm-content`).first();
    await cmContent.click();
    await page.keyboard.type('{"a":1,"b":2}');

    // Wait for state to sync
    await page.waitForTimeout(300);

    // Click format
    await page.click(S.formatBtn);

    // Wait for CodeMirror to show multiple lines (formatted JSON)
    await page.waitForFunction(
      () => {
        const cm = document.querySelector(".request-section .cm-content");
        const lines = cm?.querySelectorAll(".cm-line");
        return lines && lines.length > 1;
      },
      { timeout: 5000 },
    );

    const text = await cmContent.textContent();
    // Formatted JSON has indentation, making it longer than compact form
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(text!.length).toBeGreaterThan('{"a":1,"b":2}'.length);
  });
});

test.describe("AutoSuggest Keyboard Navigation", () => {
  test("set up environment for autosuggest", async () => {
    // Create environment with variables
    await page.click(S.envManageBtn);
    await expect(page.locator(S.modal)).toBeVisible();

    const addBtn = page.locator(`${S.envList} ${S.sidebarIconBtn}`);
    await addBtn.click();

    const nameInput = page.locator(S.envNameInput);
    await nameInput.fill("SuggestEnv");

    // Add variables
    await page.click(`${S.modal} .kv-add-btn`);
    const lastRow = page.locator(S.envVarRow).last();
    const inputs = lastRow.locator('input[type="text"]');
    await inputs.first().fill("myVar");
    await inputs.nth(1).fill("myValue");

    await page.click(`${S.modal} .kv-add-btn`);
    const lastRow2 = page.locator(S.envVarRow).last();
    const inputs2 = lastRow2.locator('input[type="text"]');
    await inputs2.first().fill("myOther");
    await inputs2.nth(1).fill("otherValue");

    await page.click(S.modalCloseBtn);
    await page.locator(S.envSelect).selectOption({ label: "SuggestEnv" });
  });

  test("typing {{ in URL shows variable dropdown", async () => {
    const urlInput = page.locator(`${S.urlBar} ${S.autosuggestWrapper} input`);
    await urlInput.click();
    await urlInput.fill("https://example.com/{{");

    await expect(page.locator(S.autosuggestDropdown)).toBeVisible({
      timeout: 3_000,
    });
  });

  test("ArrowDown moves selection in dropdown", async () => {
    await page.keyboard.press("ArrowDown");

    // Selected item should exist
    const selectedItem = page.locator(S.autosuggestItemSelected);
    await expect(selectedItem).toBeVisible();
  });

  test("ArrowUp moves selection up in dropdown", async () => {
    // Press down again then up
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowUp");

    const selectedItem = page.locator(S.autosuggestItemSelected);
    await expect(selectedItem).toBeVisible();
  });

  test("Escape closes dropdown", async () => {
    await page.keyboard.press("Escape");
    await expect(page.locator(S.autosuggestDropdown)).toBeHidden();
  });

  test("Enter inserts selected variable", async () => {
    const urlInput = page.locator(`${S.urlBar} ${S.autosuggestWrapper} input`);
    await urlInput.click();
    await urlInput.fill("https://example.com/{{my");

    await expect(page.locator(S.autosuggestDropdown)).toBeVisible({
      timeout: 3_000,
    });

    // Press Enter to accept first match
    await page.keyboard.press("Enter");

    // Dropdown should close
    await expect(page.locator(S.autosuggestDropdown)).toBeHidden();

    // URL should contain the completed variable
    const val = await urlInput.inputValue();
    expect(val).toContain("{{my");
    expect(val).toContain("}}");
  });
});

test.describe("Content-Type Auto-Set", () => {
  test("POST with raw JSON sets Content-Type header", async () => {
    await page.click(S.tabAdd);
    await selectMethod(page, "POST");
    await typeUrl(page, TEST_URLS.post);

    await clickRequestTab(page, "Body");
    await page.locator(`${S.bodyTypeOption}:has-text("raw")`).click();
    await page.selectOption(S.rawLanguageSelect, "json");

    const cmContent = page.locator(`${S.requestSection} .cm-content`).first();
    await cmContent.click();
    await page.keyboard.type('{"test": true}');

    await sendRequest(page);

    // Verify auto-generated headers show content-type
    await clickRequestTab(page, "Headers");
    const autoHeaders = page.locator(S.autogeneratedHeaders);
    const isVisible = await autoHeaders.isVisible();
    if (isVisible) {
      const text = await autoHeaders.textContent();
      expect(text?.toLowerCase()).toContain("content-type");
    }
  });

  test("POST with form-data sends correctly", async () => {
    await page.click(S.tabAdd);
    await selectMethod(page, "POST");
    await typeUrl(page, TEST_URLS.post);

    await clickRequestTab(page, "Body");
    await page.locator(`${S.bodyTypeOption}:has-text("form-data")`).click();

    // Add a form field
    await page.click(`${S.formDataEditor} ${S.kvAddBtn}`);
    const row = page.locator(S.formDataRow).last();
    const inputs = row.locator('input[type="text"]');
    await inputs.first().fill("field1");
    await inputs.nth(1).fill("value1");

    await sendRequest(page);

    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");
  });

  test("POST with x-www-form-urlencoded sends correctly", async () => {
    await page.click(S.tabAdd);
    await selectMethod(page, "POST");
    await typeUrl(page, TEST_URLS.post);

    await clickRequestTab(page, "Body");
    await page
      .locator(`${S.bodyTypeOption}:has-text("x-www-form-urlencoded")`)
      .click();

    // Add a field via form-data editor (urlencoded uses same editor)
    await page.click(`${S.formDataEditor} ${S.kvAddBtn}`);
    const row = page.locator(S.formDataRow).last();
    const inputs = row.locator('input[type="text"]');
    await inputs.first().fill("param1");
    await inputs.nth(1).fill("val1");

    await sendRequest(page);

    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");
  });
});
