import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import type { Page } from "@playwright/test";

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());

  // Set up an environment with variables for autosuggest tests
  await page.click(S.envManageBtn);

  // Create environment
  const addBtn = page.locator(`${S.envList} ${S.sidebarIconBtn}`);
  await addBtn.click();

  const nameInput = page.locator(S.envNameInput);
  await nameInput.fill("Test Env");

  // Add variables
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

  // Select the environment
  await page.locator(S.envSelect).selectOption({ index: 1 });
});

test.afterAll(async () => {
  await closeApp();
});

test.describe("AutoSuggest & Environment Variables", () => {
  test('typing "{{" in URL shows variable dropdown', async () => {
    const urlInput = page.locator(`${S.urlBar} .autosuggest-wrapper input`);
    await urlInput.click();
    await urlInput.fill("https://{{");

    // Dropdown should appear with matching variables
    await expect(page.locator(S.autosuggestDropdown)).toBeVisible({
      timeout: 3_000,
    });

    const items = page.locator(S.autosuggestItem);
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    // Clean up by pressing Escape
    await urlInput.press("Escape");
  });

  test("selecting variable from dropdown inserts {{varName}}", async () => {
    const urlInput = page.locator(`${S.urlBar} .autosuggest-wrapper input`);
    await urlInput.fill("");
    await urlInput.type("https://{{base");

    // Wait for dropdown
    await expect(page.locator(S.autosuggestDropdown)).toBeVisible({
      timeout: 3_000,
    });

    // Click the first suggestion
    await page.locator(S.autosuggestItem).first().click();

    // URL should contain the full variable
    const value = await urlInput.inputValue();
    expect(value).toContain("{{baseUrl}}");
  });

  test("{{var}} in input shows colored highlight overlay", async () => {
    const urlInput = page.locator(`${S.urlBar} .autosuggest-wrapper input`);
    await urlInput.fill("https://{{baseUrl}}/api");

    // Highlight overlay should be visible
    const wrapper = page.locator(`${S.urlBar} ${S.autosuggestWrapper}`);
    await expect(wrapper).toHaveClass(/has-vars/);

    // Variable highlight should be rendered
    await expect(
      page.locator(`${S.urlBar} ${S.envVarHighlight}`),
    ).toBeVisible();
  });

  test("hovering variable highlight shows tooltip with value", async () => {
    const highlight = page.locator(`${S.urlBar} ${S.envVarHighlight}`).first();
    await highlight.hover();

    // Tooltip should appear (rendered as a portal on document.body)
    await expect(page.locator(S.envVarTooltip)).toBeVisible({ timeout: 3_000 });

    // Tooltip should show the variable name and value
    const tooltipText = await page.locator(S.envVarTooltip).textContent();
    expect(tooltipText).toContain("baseUrl");
    expect(tooltipText).toContain("https://api.example.com");

    // Move mouse away to dismiss
    await page.mouse.move(0, 0);
  });

  test("undefined variable shows warning in tooltip", async () => {
    const urlInput = page.locator(`${S.urlBar} .autosuggest-wrapper input`);
    await urlInput.fill("https://{{undefinedVar}}/api");

    // Hover the variable highlight
    const highlight = page.locator(`${S.urlBar} ${S.envVarHighlight}`).first();
    await highlight.hover();

    await expect(page.locator(S.envVarTooltip)).toBeVisible({ timeout: 3_000 });

    // Should show warning about undefined variable
    await expect(page.locator(S.envVarTooltipWarning)).toBeVisible();

    await page.mouse.move(0, 0);
  });
});
