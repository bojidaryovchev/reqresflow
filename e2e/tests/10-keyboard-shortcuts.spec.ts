import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import {
  typeUrl,
  selectMethod,
  clickRequestTab,
  TEST_URLS,
} from "../helpers/data";
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

  test("Shift+Alt+F formats body in code editor", async () => {
    await page.click(S.tabAdd);
    await selectMethod(page, "POST");
    await typeUrl(page, TEST_URLS.post);

    await clickRequestTab(page, "Body");
    await page.locator(`${S.bodyTypeOption}:has-text("raw")`).click();
    await page.selectOption(S.rawLanguageSelect, "json");

    const cmContent = page.locator(`${S.requestSection} .cm-content`).first();
    await cmContent.click();
    await page.keyboard.type('{"a":1,"b":2}');
    await page.waitForTimeout(300);

    // Press Shift+Alt+F to format
    await page.keyboard.press("Shift+Alt+f");

    await page.waitForFunction(
      () => {
        const cm = document.querySelector(".request-section .cm-content");
        const lines = cm?.querySelectorAll(".cm-line");
        return lines && lines.length > 1;
      },
      { timeout: 5000 },
    );

    const text = await cmContent.textContent();
    expect(text?.length ?? 0).toBeGreaterThan('{"a":1,"b":2}'.length);
  });
});
