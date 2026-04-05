import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import { typeUrl, selectMethod, sendRequest, clickRequestTab, clickResponseTab, TEST_URLS } from "../helpers/data";
import type { Page } from "@playwright/test";

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp();
});

test.describe("Send Request & Response", () => {
  test("send button disabled when URL is empty", async () => {
    // Clear URL
    await typeUrl(page, "");
    await expect(page.locator(S.sendBtn)).toBeDisabled();
  });

  test("send GET request shows response status, time, and size", async () => {
    await typeUrl(page, TEST_URLS.json);
    await sendRequest(page);

    // Response meta should be visible
    await expect(page.locator(S.responseMeta)).toBeVisible();
    await expect(page.locator(S.responseStatus)).toBeVisible();
    await expect(page.locator(S.responseTime)).toBeVisible();
    await expect(page.locator(S.responseSize)).toBeVisible();

    // Status should be 200
    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");
  });

  test("response body panel shows response content", async () => {
    await clickResponseTab(page, "Body");
    await expect(page.locator(S.responseBody)).toBeVisible();

    // The CodeEditor inside should have content
    const editorContent = page.locator(`${S.responseBody} .cm-content`);
    const text = await editorContent.textContent();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(text!.length).toBeGreaterThan(0);
  });

  test("response headers panel shows header rows", async () => {
    await clickResponseTab(page, "Headers");
    await expect(page.locator(S.responseHeadersList)).toBeVisible();

    const headerRows = page.locator(S.responseHeaderRow);
    const count = await headerRows.count();
    expect(count).toBeGreaterThan(0);
  });

  test("successful response status is styled green", async () => {
    const statusEl = page.locator(S.responseStatus);
    const className = await statusEl.getAttribute("class");
    expect(className).toContain("success");
  });

  test("error response shows error message", async () => {
    await typeUrl(page, TEST_URLS.invalid);
    await sendRequest(page);

    await expect(page.locator(S.responseError)).toBeVisible();
  });

  test("send button shows loading state during request", async () => {
    await typeUrl(page, TEST_URLS.delay1s);

    // Click send but don't wait for completion
    await page.click(S.sendBtn);

    // Button should show "Sending..." immediately
    await expect(page.locator(S.sendBtn)).toContainText("Sending");

    // Wait for request to complete
    await page.waitForFunction(
      () => !document.querySelector(".send-btn")?.textContent?.includes("Sending"),
      { timeout: 15_000 },
    );
  });

  test("POST with JSON raw body sends correctly", async () => {
    await selectMethod(page, "POST");
    await typeUrl(page, TEST_URLS.post);

    // Set body to raw JSON
    await clickRequestTab(page, "Body");
    await page.locator(`${S.bodyTypeOption}:has-text("raw")`).click();
    await page.selectOption(S.rawLanguageSelect, "json");

    // Type JSON body into CodeMirror
    const cmContent = page.locator(`${S.requestSection} .cm-content`).first();
    await cmContent.click();
    await page.keyboard.type('{"name": "test"}');

    await sendRequest(page);

    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");
  });

  test("POST with form-data sends correctly", async () => {
    await selectMethod(page, "POST");
    await typeUrl(page, TEST_URLS.post);

    await clickRequestTab(page, "Body");
    await page.locator(`${S.bodyTypeOption}:has-text("form-data")`).click();

    // Fill first form field
    const firstRow = page.locator(S.formDataRow).first();
    const keyInput = firstRow.locator(".autosuggest-wrapper input").first();
    const valueInput = firstRow.locator(".autosuggest-wrapper input").nth(1);
    await keyInput.fill("username");
    await valueInput.fill("testuser");

    await sendRequest(page);

    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");
  });

  test("POST with x-www-form-urlencoded sends correctly", async () => {
    await selectMethod(page, "POST");
    await typeUrl(page, TEST_URLS.post);

    await clickRequestTab(page, "Body");
    await page.locator(`${S.bodyTypeOption}:has-text("x-www-form-urlencoded")`).click();

    // Fill first form field
    const firstRow = page.locator(S.formDataRow).first();
    const keyInput = firstRow.locator(".autosuggest-wrapper input").first();
    const valueInput = firstRow.locator(".autosuggest-wrapper input").nth(1);
    await keyInput.fill("key1");
    await valueInput.fill("value1");

    await sendRequest(page);

    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");
  });
});
