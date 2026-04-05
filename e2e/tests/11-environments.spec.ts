import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import { typeUrl, sendRequest } from "../helpers/data";
import type { Page } from "@playwright/test";

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
    // Click "+" to add environment
    const addBtn = page.locator(`${S.envList} ${S.sidebarIconBtn}`);
    await addBtn.click();

    // New environment should appear in list
    await expect(page.locator(S.envListItem)).toHaveCount(1);
  });

  test("rename environment via name input", async () => {
    const nameInput = page.locator(S.envNameInput);
    await nameInput.fill("Production");

    // Name should update
    await expect(nameInput).toHaveValue("Production");
  });

  test("add variable key/value pairs", async () => {
    // Click "Add Variable"
    await page.click(`${S.modal} .kv-add-btn`);

    const varRows = page.locator(S.envVarRow);
    const count = await varRows.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Fill in key and value
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
    // Close modal
    await page.click(S.modalCloseBtn);
    await expect(page.locator(S.modal)).toBeHidden();

    // Select the environment from dropdown
    const envSelect = page.locator(S.envSelect);
    const options = envSelect.locator("option");
    const count = await options.count();
    // Should have "No Environment" + our new one
    expect(count).toBeGreaterThanOrEqual(2);

    // Select the second option (our "Production" env)
    await envSelect.selectOption({ index: 1 });
  });

  test("{{var}} in URL gets substituted when sending request", async () => {
    // First add a variable to the environment
    await page.click(S.envManageBtn);
    await page.click(`${S.modal} .kv-add-btn`);

    const lastRow = page.locator(S.envVarRow).last();
    const inputs = lastRow.locator('input[type="text"]');
    await inputs.first().fill("testHost");
    await inputs.nth(1).fill("jsonplaceholder.typicode.com");

    await page.click(S.modalCloseBtn);

    // Type URL with variable
    await typeUrl(page, "https://{{testHost}}/posts/1");
    await sendRequest(page);

    // Should get a response (variable was substituted)
    await expect(page.locator(S.responseMeta)).toBeVisible();
    const statusText = await page.locator(S.responseStatus).textContent();
    expect(statusText).toContain("200");
  });

  test("delete environment from the modal", async () => {
    await page.click(S.envManageBtn);
    const deleteBtn = page.locator(`${S.envListItem} ${S.sidebarIconBtnDanger}`).first();
    await deleteBtn.click();

    await expect(page.locator(S.envListItem)).toHaveCount(0);
    await page.click(S.modalCloseBtn);
  });
});
