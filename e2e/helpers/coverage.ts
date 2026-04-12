import type { Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const NYC_OUTPUT_DIR = path.resolve(__dirname, "../../.nyc_output");

export async function collectCoverage(page: Page): Promise<void> {
  const coverage = await page.evaluate(() => {
    return (window as unknown as { __coverage__?: unknown }).__coverage__;
  });

  if (!coverage) return;

  fs.mkdirSync(NYC_OUTPUT_DIR, { recursive: true });
  const outFile = path.join(NYC_OUTPUT_DIR, `coverage-${randomUUID()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(coverage), "utf-8");
}
