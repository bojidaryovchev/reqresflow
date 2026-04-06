import { test } from "@playwright/test";
import { launchApp, closeApp } from "../helpers/app";
import type { Page } from "@playwright/test";

let page: Page;

test.beforeAll(async () => {
  ({ page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp();
});

test("debug: dump page HTML structure", async () => {
  // Wait a bit for state to settle
  await page.waitForTimeout(3000);

  const html = await page.evaluate(() => {
    const el = document.querySelector(".app");
    if (!el) return "NO .app ELEMENT FOUND";
    // Get a summary of child elements with classes
    function summarize(element: Element, depth: number): string {
      if (depth > 4) return "";
      const tag = element.tagName.toLowerCase();
      const cls = element.className
        ? `.${String(element.className).split(" ").join(".")}`
        : "";
      const children = Array.from(element.children)
        .map((c) => summarize(c, depth + 1))
        .filter(Boolean)
        .join("\n");
      const indent = "  ".repeat(depth);
      return `${indent}<${tag}${cls}>\n${children}`;
    }
    return summarize(el, 0);
  });
  console.log("=== PAGE STRUCTURE ===");
  console.log(html);
  console.log("=== END ===");
});
