import { test, expect } from "@playwright/test";
import { launchApp, closeApp, restartApp, seedData } from "../helpers/app";
import { S } from "../helpers/selectors";
import {
  typeUrl,
  selectMethod,
  sendRequest,
  clickRequestTab,
  clickResponseTab,
  makeEnvironment,
} from "../helpers/data";
import type { Page } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════
// UF-06: Environments
// Covers: env dropdown, manage modal, create/rename/delete envs,
//         add/edit/remove variables, {{var}} in URL, multi-var
//         substitution, {{var}} in headers
// ═══════════════════════════════════════════════════════════════════════

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp();
});

test.describe("Environments", () => {
  test('environment dropdown starts with "No Environment"', async () => {
    const envSelect = page.locator(S.envSelect);
    await expect(envSelect).toBeVisible();
    const text = await envSelect.locator("option:checked").textContent();
    expect(text).toContain("No Environment");
  });

  test('"Manage" button opens EnvManager modal', async () => {
    await page.click(S.envManageBtn);
    await expect(page.locator(S.modal)).toBeVisible();
  });

  test("create new environment in modal", async () => {
    const addBtn = page.locator(`${S.envList} ${S.sidebarIconBtn}`);
    await addBtn.click();

    await expect(page.locator(S.envListItem)).toHaveCount(1);
  });

  test("rename environment via name input", async () => {
    const nameInput = page.locator(S.envNameInput);
    await nameInput.fill("Production");

    await expect(nameInput).toHaveValue("Production");
  });

  test("add variable key/value pairs", async () => {
    await page.click(`${S.modal} .kv-add-btn`);

    const varRows = page.locator(S.envVarRow);
    const count = await varRows.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const lastRow = varRows.last();
    const inputs = lastRow.locator('input[type="text"]');
    await inputs.first().fill("baseUrl");
    await inputs.nth(1).fill("https://api.example.com");
  });

  test("delete variable from environment", async () => {
    const countBefore = await page.locator(S.envVarRow).count();
    await page.locator(`${S.envVarRow} .kv-remove-btn`).last().click();

    const countAfter = await page.locator(S.envVarRow).count();
    expect(countAfter).toBe(countBefore - 1);
  });

  test("close env manager and select environment in dropdown", async () => {
    await page.click(S.modalCloseBtn);
    await expect(page.locator(S.modal)).toBeHidden();

    const envSelect = page.locator(S.envSelect);
    const options = envSelect.locator("option");
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await envSelect.selectOption({ index: 1 });
  });

  test("{{var}} in URL gets substituted when sending request", async () => {
    await page.click(S.envManageBtn);
    await page.click(`${S.modal} .kv-add-btn`);

    const lastRow = page.locator(S.envVarRow).last();
    const inputs = lastRow.locator('input[type="text"]');
    await inputs.first().fill("testHost");
    await inputs.nth(1).fill("jsonplaceholder.typicode.com");

    await page.click(S.modalCloseBtn);

    await typeUrl(page, "https://{{testHost}}/posts/1");
    await sendRequest(page);

    await expect(page.locator(S.responseMeta)).toBeVisible();
    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");
  });

  test("delete environment from the modal", async () => {
    await page.click(S.envManageBtn);
    const deleteBtn = page
      .locator(`${S.envListItem} ${S.sidebarIconBtnDanger}`)
      .first();
    await deleteBtn.click();

    await expect(page.locator(S.envListItem)).toHaveCount(0);
    await page.click(S.modalCloseBtn);
  });
});

// ── Multiple {{var}} Substitution ─────────────────────────────────────

test.describe("Multiple {{var}} Substitution", () => {
  let multiPage: Page;

  test.beforeAll(async () => {
    ({ page: multiPage } = await launchApp());

    const env = makeEnvironment({
      id: "env-multi",
      name: "MultiVarEnv",
      variables: [
        { key: "host", value: "httpbin.org" },
        { key: "path", value: "get" },
      ],
    });
    seedData("environments.json", [env]);

    ({ page: multiPage } = await restartApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("URL with multiple {{var}} placeholders resolves correctly", async () => {
    const envSelect = multiPage.locator(S.envSelect);
    await envSelect.selectOption({ label: "MultiVarEnv" });

    await typeUrl(multiPage, "https://{{host}}/{{path}}");
    await selectMethod(multiPage, "GET");

    await sendRequest(multiPage);

    const statusText = await multiPage.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");
  });

  test("headers with multiple {{var}} placeholders resolve correctly", async () => {
    await clickRequestTab(multiPage, "Headers");
    const headerRows = multiPage.locator(S.kvRow);
    const firstRow = headerRows.first();
    await firstRow.locator('input[type="text"]').first().fill("X-Custom");
    await firstRow
      .locator('input[type="text"]')
      .nth(1)
      .fill("{{host}}-{{path}}");

    await sendRequest(multiPage);

    await clickResponseTab(multiPage, "Body");
    const bodyContent = multiPage.locator(`${S.responseBody} .cm-content`);
    const text = await bodyContent.textContent();
    expect(text).toContain("httpbin.org-get");
  });
});
