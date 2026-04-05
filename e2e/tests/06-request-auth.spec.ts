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

test.describe("Request Auth", () => {
  test('default auth is "No Auth" with info message', async () => {
    await clickRequestTab(page, "Auth");

    await expect(page.locator(S.authTypeSelect)).toHaveValue("none");
    await expect(page.locator(S.authInfo)).toBeVisible();
  });

  test('selecting "Bearer Token" shows token input', async () => {
    await clickRequestTab(page, "Auth");
    await page.selectOption(S.authTypeSelect, "bearer");

    await expect(page.locator(S.authFields)).toBeVisible();
    const labels = page.locator(S.authLabel);
    const labelTexts = await labels.allTextContents();
    expect(labelTexts.some((l) => l.includes("Token"))).toBe(true);
  });

  test("bearer auth info shows Authorization header preview", async () => {
    const info = page.locator(S.authInfo);
    await expect(info).toBeVisible();
    const text = await info.textContent();
    expect(text).toContain("Authorization");
    expect(text).toContain("Bearer");
  });

  test('selecting "Basic Auth" shows username and password inputs', async () => {
    await page.selectOption(S.authTypeSelect, "basic");

    await expect(page.locator(S.authFields)).toBeVisible();
    const labels = page.locator(S.authLabel);
    const labelTexts = await labels.allTextContents();
    expect(labelTexts.some((l) => l.includes("Username"))).toBe(true);
    expect(labelTexts.some((l) => l.includes("Password"))).toBe(true);
  });

  test("basic auth info shows Base64 preview", async () => {
    const info = page.locator(S.authInfo);
    await expect(info).toBeVisible();
    const text = await info.textContent();
    expect(text).toContain("Basic");
  });
});
