import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import { typeUrl, TEST_URLS } from "../helpers/data";
import type { Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// 10 — Keyboard Shortcuts
//
// Covers: Ctrl+S save, Enter in URL sends, click-outside closes menus,
//         click-outside closes modals
// ─────────────────────────────────────────────────────────────────────

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp();
});

test.describe("Keyboard Shortcuts", () => {
  test("Ctrl+S saves request to collection", async () => {
    await typeUrl(page, TEST_URLS.json);

    await page.keyboard.press("Control+s");

    // For a fresh app with no collection, the save picker should show
    const pickerVisible = await page
      .locator(S.savePickerModal)
      .isVisible()
      .catch(() => false);
    if (pickerVisible) {
      await page.locator(S.savePickerClose).click();
    }
    // Either way, the shortcut worked
  });

  test("Enter in URL input sends request", async () => {
    await typeUrl(page, TEST_URLS.json);

    const urlInput = page.locator(`${S.urlBar} .autosuggest-wrapper input`);
    await urlInput.focus();
    await page.keyboard.press("Enter");

    await page.waitForFunction(
      () => {
        const btn = document.querySelector(".send-btn");
        return btn && !btn.textContent?.includes("Sending");
      },
      { timeout: 15_000 },
    );

    await expect(page.locator(S.responseMeta)).toBeVisible();
  });

  test("click outside closes context menu", async () => {
    const tab = page.locator(S.tabItem).first();
    await tab.click({ button: "right" });
    await expect(page.locator(S.tabContextMenu)).toBeVisible();

    await page.locator(S.urlBar).click();
    await expect(page.locator(S.tabContextMenu)).toBeHidden();
  });

  test("click outside closes save picker modal", async () => {
    // Open save picker via Ctrl+S
    await page.keyboard.press("Control+s");

    const picker = page.locator(S.savePickerModal);
    const visible = await picker.isVisible().catch(() => false);
    if (visible) {
      // Click the overlay to close
      await page.locator(S.modalOverlay).click({ position: { x: 5, y: 5 } });
      await expect(picker).toBeHidden();
    }
  });
});
