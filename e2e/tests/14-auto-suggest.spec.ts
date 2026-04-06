import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import type { Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// 14 — Auto Suggest
//
// Covers: {{var}} dropdown in URL, variable insertion, highlight overlay,
//         tooltip with value/warning, keyboard navigation (↓↑, Escape,
//         Enter inserts), header name autosuggest
// ─────────────────────────────────────────────────────────────────────

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());

  // Set up an environment with variables for autosuggest tests
  await page.click(S.envManageBtn);
  const addBtn = page.locator(`${S.envList} ${S.sidebarIconBtn}`);
  await addBtn.click();
  const nameInput = page.locator(S.envNameInput);
  await nameInput.fill("Test Env");

  await page.click(`${S.modal} .kv-add-btn`);
  const row1 = page.locator(S.envVarRow).last();
  const row1Inputs = row1.locator('input[type="text"]');
  await row1Inputs.first().fill("baseUrl");
  await row1Inputs.nth(1).fill("https://api.example.com");

  await page.click(`${S.modal} .kv-add-btn`);
  const row2 = page.locator(S.envVarRow).last();
  const row2Inputs = row2.locator('input[type="text"]');
  await row2Inputs.first().fill("apiToken");
  await row2Inputs.nth(1).fill("secret-123");

  await page.click(S.modalCloseBtn);
  await page.locator(S.envSelect).selectOption({ index: 1 });
});

test.afterAll(async () => {
  await closeApp();
});

// ═══════════════════════════════════════════════════════════════════════
// Section 1 — Variable Dropdown & Insertion
// ═══════════════════════════════════════════════════════════════════════

test.describe("AutoSuggest Variables", () => {
  test('typing "{{" in URL shows variable dropdown', async () => {
    const urlInput = page.locator(`${S.urlBar} .autosuggest-wrapper input`);
    await urlInput.click();
    await urlInput.fill("https://{{");

    await expect(page.locator(S.autosuggestDropdown)).toBeVisible({
      timeout: 3_000,
    });

    const items = page.locator(S.autosuggestItem);
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    await urlInput.press("Escape");
  });

  test("selecting variable from dropdown inserts {{varName}}", async () => {
    const urlInput = page.locator(`${S.urlBar} .autosuggest-wrapper input`);
    await urlInput.fill("");
    await urlInput.type("https://{{base");

    await expect(page.locator(S.autosuggestDropdown)).toBeVisible({
      timeout: 3_000,
    });

    await page.locator(S.autosuggestItem).first().click();

    const value = await urlInput.inputValue();
    expect(value).toContain("{{baseUrl}}");
  });

  test("{{var}} in input shows colored highlight overlay", async () => {
    const urlInput = page.locator(`${S.urlBar} .autosuggest-wrapper input`);
    await urlInput.fill("https://{{baseUrl}}/api");

    const wrapper = page.locator(`${S.urlBar} ${S.autosuggestWrapper}`);
    await expect(wrapper).toHaveClass(/has-vars/);

    await expect(
      page.locator(`${S.urlBar} ${S.envVarHighlight}`),
    ).toBeVisible();
  });

  test("hovering variable highlight shows tooltip with value", async () => {
    const highlight = page.locator(`${S.urlBar} ${S.envVarHighlight}`).first();
    await highlight.hover();

    await expect(page.locator(S.envVarTooltip)).toBeVisible({
      timeout: 3_000,
    });

    const tooltipText = await page.locator(S.envVarTooltip).textContent();
    expect(tooltipText).toContain("baseUrl");
    expect(tooltipText).toContain("https://api.example.com");

    await page.mouse.move(0, 0);
  });

  test("undefined variable shows warning in tooltip", async () => {
    const urlInput = page.locator(`${S.urlBar} .autosuggest-wrapper input`);
    await urlInput.fill("https://{{undefinedVar}}/api");

    const highlight = page.locator(`${S.urlBar} ${S.envVarHighlight}`).first();
    await highlight.hover();

    await expect(page.locator(S.envVarTooltip)).toBeVisible({
      timeout: 3_000,
    });
    await expect(page.locator(S.envVarTooltipWarning)).toBeVisible();

    await page.mouse.move(0, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Section 2 — Keyboard Navigation
// ═══════════════════════════════════════════════════════════════════════

test.describe("AutoSuggest Keyboard Navigation", () => {
  test("typing {{ in URL shows dropdown for keyboard nav", async () => {
    const urlInput = page.locator(`${S.urlBar} ${S.autosuggestWrapper} input`);
    await urlInput.click();
    await urlInput.fill("https://example.com/{{");

    await expect(page.locator(S.autosuggestDropdown)).toBeVisible({
      timeout: 3_000,
    });
  });

  test("ArrowDown moves selection in dropdown", async () => {
    await page.keyboard.press("ArrowDown");

    const selectedItem = page.locator(S.autosuggestItemSelected);
    await expect(selectedItem).toBeVisible();
  });

  test("ArrowUp moves selection up in dropdown", async () => {
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
    await urlInput.fill("https://example.com/{{base");

    await expect(page.locator(S.autosuggestDropdown)).toBeVisible({
      timeout: 3_000,
    });

    await page.keyboard.press("Enter");

    await expect(page.locator(S.autosuggestDropdown)).toBeHidden();

    const val = await urlInput.inputValue();
    expect(val).toContain("{{base");
    expect(val).toContain("}}");
  });
});
