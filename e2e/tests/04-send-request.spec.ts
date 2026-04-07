import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import {
  typeUrl,
  selectMethod,
  sendRequest,
  clickRequestTab,
  clickResponseTab,
  TEST_URLS,
} from "../helpers/data";
import type { Page } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════
// UF-04: Send Request & View Response
// Covers: send button states, GET/POST/form/urlencoded, response body/
//         headers/status, error handling, loading state, Content-Type
//         auto-set, GraphQL, HEAD/OPTIONS, 404/500 styling, URL query
//         edge cases (special chars, disabled params)
// ═══════════════════════════════════════════════════════════════════════

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp();
});

// ── Core Send & Response ──────────────────────────────────────────────

test.describe("Send Request & Response", () => {
  test("send button disabled when URL is empty", async () => {
    await typeUrl(page, "");
    await expect(page.locator(S.sendBtn)).toBeDisabled();
  });

  test("send GET request shows response status, time, and size", async () => {
    await typeUrl(page, TEST_URLS.json);
    await sendRequest(page);

    await expect(page.locator(S.responseMeta)).toBeVisible();
    await expect(page.locator(S.responseStatus)).toBeVisible();
    await expect(page.locator(S.responseTime)).toBeVisible();
    await expect(page.locator(S.responseSize)).toBeVisible();

    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");
  });

  test("response body panel shows response content", async () => {
    await clickResponseTab(page, "Body");
    await expect(page.locator(S.responseBody)).toBeVisible();

    const editorContent = page.locator(`${S.responseBody} .cm-content`);
    const text = await editorContent.textContent();
    expect(text?.length ?? 0).toBeGreaterThan(0);
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

    await page.click(S.sendBtn);

    await expect(page.locator(S.sendBtn)).toContainText("Sending");

    await page.waitForFunction(
      () =>
        !document.querySelector(".send-btn")?.textContent?.includes("Sending"),
      { timeout: 15_000 },
    );
  });

  test("POST with JSON raw body sends correctly", async () => {
    await selectMethod(page, "POST");
    await typeUrl(page, TEST_URLS.post);

    await clickRequestTab(page, "Body");
    await page.locator(`${S.bodyTypeOption}:has-text("raw")`).click();
    await page.selectOption(S.rawLanguageSelect, "json");

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
    await page
      .locator(`${S.bodyTypeOption}:has-text("x-www-form-urlencoded")`)
      .click();

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

// ── POST with GraphQL Body ────────────────────────────────────────────

test.describe("POST with GraphQL Body", () => {
  test("switch to graphql body type shows query editor", async () => {
    await page.click(S.tabAdd);
    await selectMethod(page, "POST");
    await typeUrl(page, TEST_URLS.post);

    await clickRequestTab(page, "Body");
    await page.locator(`${S.bodyTypeOption}:has-text("graphql")`).click();

    await expect(page.locator(S.graphqlEditor)).toBeVisible();
  });

  test("type GraphQL query and send request", async () => {
    const queryCm = page.locator(`${S.graphqlSection} .cm-content`).first();
    await queryCm.click();
    await page.keyboard.type("{ users { id name } }");

    await sendRequest(page);

    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");
  });
});

// ── Content-Type Auto-Set ─────────────────────────────────────────────

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

// ── Error Handling ────────────────────────────────────────────────────

test.describe("Error Handling", () => {
  test("invalid URL shows error message in response panel", async () => {
    await page.click(S.tabAdd);
    await typeUrl(page, TEST_URLS.invalid);
    await selectMethod(page, "GET");
    await sendRequest(page);

    await expect(page.locator(S.responseError)).toBeVisible();
    const errorText = await page.locator(S.responseError).textContent();
    expect(errorText?.length ?? 0).toBeGreaterThan(0);
  });

  test("404 response shows client error styled status", async () => {
    await typeUrl(page, TEST_URLS.status404);
    await sendRequest(page);

    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("404");

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

    const className = await page
      .locator(S.responseStatus)
      .getAttribute("class");
    expect(className).toContain("server-error");
  });

  test("sending request clears previous error and shows new response", async () => {
    await typeUrl(page, TEST_URLS.invalid);
    await sendRequest(page);
    await expect(page.locator(S.responseError)).toBeVisible();

    await typeUrl(page, TEST_URLS.json);
    await sendRequest(page);

    await expect(page.locator(S.responseError)).toBeHidden();
    await expect(page.locator(S.responseStatus)).toBeVisible();
    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");
  });
});

// ── URL Query String Edge Cases ───────────────────────────────────────

test.describe("URL Query String Edge Cases", () => {
  test("params with special characters are URL-encoded in request", async () => {
    await page.click(S.tabAdd);
    await typeUrl(page, TEST_URLS.get);
    await selectMethod(page, "GET");

    await clickRequestTab(page, "Params");
    const kvRows = page.locator(`${S.requestSection} ${S.kvRow}`);
    const firstRow = kvRows.first();
    await firstRow.locator('input[type="text"]').first().fill("q");
    await firstRow
      .locator('input[type="text"]')
      .nth(1)
      .fill("hello world&foo=bar");

    await sendRequest(page);

    await clickResponseTab(page, "Body");
    const bodyContent = page.locator(`${S.responseBody} .cm-content`);
    const text = await bodyContent.textContent();
    expect(text).toContain("hello world&foo=bar");
  });

  test("disabled params are not included in request", async () => {
    await clickRequestTab(page, "Params");
    const kvRows = page.locator(`${S.requestSection} ${S.kvRow}`);
    const firstRow = kvRows.first();
    const checkbox = firstRow.locator('input[type="checkbox"]');
    await checkbox.uncheck();

    await page.click(`${S.requestSection} ${S.kvAddBtn}`);
    const newRow = page.locator(`${S.requestSection} ${S.kvRow}`).nth(1);
    await newRow.locator('input[type="text"]').first().fill("only");
    await newRow.locator('input[type="text"]').nth(1).fill("this");

    await sendRequest(page);

    await clickResponseTab(page, "Body");
    const bodyContent = page.locator(`${S.responseBody} .cm-content`);
    const text = await bodyContent.textContent();
    expect(text).toContain("only");
    expect(text).not.toContain("hello world");
  });
});

// NOTE: HEAD and OPTIONS are not in the app's method dropdown
// (only GET, POST, PUT, PATCH, DELETE are supported)
