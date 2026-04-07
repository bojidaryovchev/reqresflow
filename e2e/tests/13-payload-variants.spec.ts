import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import { S } from "../helpers/selectors";
import { clickRequestTab } from "../helpers/data";
import type { Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// 13 — Payload Variants
//
// Covers: additional payload variant behaviors not in 03 (request
//         building) or 09 (sidebar). Specifically: removing the active
//         payload switches to first remaining, and last payload cannot
//         be removed.
// ─────────────────────────────────────────────────────────────────────

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp();
});

test.describe("Payload Variant Edge Cases", () => {
  test("set up body with multiple payloads", async () => {
    await clickRequestTab(page, "Body");
    await page.locator(`${S.bodyTypeOption}:has-text("raw")`).click();

    // Default payload exists
    await expect(page.locator(S.payloadTab)).toHaveCount(1);

    // Add two more payloads
    await page.click(S.payloadAddBtn);
    await page.click(S.payloadAddBtn);
    await expect(page.locator(S.payloadTab)).toHaveCount(3);
  });

  test("removing active payload switches to first remaining", async () => {
    // Activate the second payload (index 1)
    await page.locator(S.payloadTab).nth(1).click();

    // Verify it's active (has .active class)
    await expect(page.locator(S.payloadTab).nth(1)).toHaveClass(/active/);

    // Remember the name of the first payload
    const firstPayloadName = await page
      .locator(`${S.payloadTab} ${S.payloadTabName}`)
      .first()
      .textContent();

    // Remove the second (active) payload via its close button
    await page
      .locator(`${S.payloadTab}:nth-child(2) ${S.payloadTabClose}`)
      .click();

    // Should now have 2 payloads
    await expect(page.locator(S.payloadTab)).toHaveCount(2);

    // The first payload should now be active
    await expect(page.locator(S.payloadTab).first()).toHaveClass(/active/);

    // And it should be the same first payload as before
    const activeName = await page
      .locator(`${S.payloadTab} ${S.payloadTabName}`)
      .first()
      .textContent();
    expect(activeName).toBe(firstPayloadName);
  });

  test("cannot remove the last payload", async () => {
    // Remove second payload to get down to 1
    await page
      .locator(`${S.payloadTab}:nth-child(2) ${S.payloadTabClose}`)
      .click();
    await expect(page.locator(S.payloadTab)).toHaveCount(1);

    // The close button should not be visible on the last remaining payload
    const closeBtn = page.locator(
      `${S.payloadTab}:first-child ${S.payloadTabClose}`,
    );
    await expect(closeBtn).toHaveCount(0);
  });
});
