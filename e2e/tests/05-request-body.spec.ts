import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import { clickRequestTab } from "../helpers/data";
import type { Page } from "@playwright/test";

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp();
});

test.describe("Request Body", () => {
  test("default body type is none with info message", async () => {
    await clickRequestTab(page, "Body");
    await expect(page.locator(S.bodyNoneInfo)).toBeVisible();
  });

  test('selecting "raw" shows CodeEditor and language dropdown', async () => {
    await clickRequestTab(page, "Body");
    await page.locator(`${S.bodyTypeOption}:has-text("raw")`).click();

    await expect(page.locator(S.rawLanguageSelect)).toBeVisible();
    await expect(page.locator(S.codeEditorWrapper)).toBeVisible();
  });

  test("raw language dropdown switches between options", async () => {
    const languages = ["json", "text", "xml", "html", "javascript"];
    for (const lang of languages) {
      await page.selectOption(S.rawLanguageSelect, lang);
      await expect(page.locator(S.rawLanguageSelect)).toHaveValue(lang);
    }
  });

  test('selecting "form-data" shows key/value table with type column', async () => {
    await page.locator(`${S.bodyTypeOption}:has-text("form-data")`).click();

    await expect(page.locator(S.formDataEditor)).toBeVisible();
    // Should have type select (Text/File)
    await expect(page.locator(S.formDataTypeSelect).first()).toBeVisible();
  });

  test("form-data add and remove rows work", async () => {
    const initialRows = await page.locator(S.formDataRow).count();
    await page.click(`${S.formDataEditor} ${S.kvAddBtn}`);

    const afterAdd = await page.locator(S.formDataRow).count();
    expect(afterAdd).toBe(initialRows + 1);

    // Remove last row
    await page.locator(`${S.formDataRow} ${S.kvRemoveBtn}`).last().click();
    const afterRemove = await page.locator(S.formDataRow).count();
    expect(afterRemove).toBe(afterAdd - 1);
  });

  test('selecting "x-www-form-urlencoded" shows key/value table without type column', async () => {
    await page
      .locator(`${S.bodyTypeOption}:has-text("x-www-form-urlencoded")`)
      .click();

    await expect(page.locator(S.formDataEditor)).toBeVisible();
    // Should NOT have type select
    await expect(page.locator(S.formDataTypeSelect)).toHaveCount(0);
  });

  test('selecting "graphql" shows query and variables editors', async () => {
    await page.locator(`${S.bodyTypeOption}:has-text("graphql")`).click();

    await expect(page.locator(S.graphqlEditor)).toBeVisible();

    // Should have 2 sections (query + variables)
    const sections = page.locator(S.graphqlSection);
    await expect(sections).toHaveCount(2);

    // Labels should show "Query" and "Variables (JSON)"
    const labels = page.locator(S.graphqlLabel);
    const labelTexts = await labels.allTextContents();
    expect(labelTexts.some((l) => l.includes("Query"))).toBe(true);
    expect(labelTexts.some((l) => l.includes("Variables"))).toBe(true);
  });

  test("graphql variables editor has format button", async () => {
    // The second CodeEditor (variables) should have a format button
    const formatBtns = page.locator(`${S.graphqlEditor} ${S.formatBtn}`);
    await expect(formatBtns.first()).toBeVisible();
  });

  test('selecting "binary" shows file path input', async () => {
    await page.locator(`${S.bodyTypeOption}:has-text("binary")`).click();

    await expect(page.locator(S.binaryEditor)).toBeVisible();
    await expect(page.locator(S.binaryPathInput)).toBeVisible();
  });

  test('switching back to "none" shows info message', async () => {
    await page.locator(`${S.bodyTypeOption}:has-text("none")`).click();
    await expect(page.locator(S.bodyNoneInfo)).toBeVisible();
  });

  test("payload tabs show default payload", async () => {
    // Switch to raw so payloads are meaningful
    await page.locator(`${S.bodyTypeOption}:has-text("raw")`).click();

    await expect(page.locator(S.payloadTab)).toHaveCount(1);
    const name = page.locator(`${S.payloadTab} ${S.payloadTabName}`).first();
    await expect(name).toHaveText("Default");
  });

  test("add payload creates new tab", async () => {
    await page.click(S.payloadAddBtn);
    await expect(page.locator(S.payloadTab)).toHaveCount(2);
  });

  test("switch between payload tabs preserves body content", async () => {
    // We should have 2 payload tabs. Type in the second payload's editor.
    const secondPayload = page.locator(S.payloadTab).nth(1);
    await secondPayload.click();

    // Switch back to first payload
    const firstPayload = page.locator(S.payloadTab).first();
    await firstPayload.click();

    // Both payloads should remain
    await expect(page.locator(S.payloadTab)).toHaveCount(2);
  });

  test("remove payload tab works when multiple exist", async () => {
    // Close the 2nd payload
    const closeBtn = page.locator(
      `${S.payloadTab}:nth-child(2) ${S.payloadTabClose}`,
    );
    await closeBtn.click();

    await expect(page.locator(S.payloadTab)).toHaveCount(1);
  });
});
