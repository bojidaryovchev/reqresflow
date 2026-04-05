import {
  _electron as electron,
  type ElectronApplication,
  type Page,
} from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

let app: ElectronApplication;
let page: Page;
let tempDataDir: string;

/**
 * Launch the Electron app with an isolated data directory.
 * The main process is the Vite-built output at .vite/build/main.js.
 */
export async function launchApp(): Promise<{
  app: ElectronApplication;
  page: Page;
}> {
  // Create isolated temp dir so tests don't pollute real user data
  tempDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "reqresflow-e2e-"));

  const mainPath = path.resolve(__dirname, "../../.vite/build/main.js");

  app = await electron.launch({
    args: [mainPath],
    env: {
      ...process.env,
      // Override Electron's userData path to our temp dir
      ELECTRON_USER_DATA: tempDataDir,
      NODE_ENV: "test",
    },
  });

  // Wait for the first BrowserWindow
  page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");

  // Wait for React to mount
  await page.waitForSelector(".app", { timeout: 10_000 });

  return { app, page };
}

/**
 * Clean up: close app and remove temp data directory.
 */
export async function closeApp(): Promise<void> {
  if (app) {
    await app.close();
  }
  if (tempDataDir && fs.existsSync(tempDataDir)) {
    fs.rmSync(tempDataDir, { recursive: true, force: true });
  }
}

/**
 * Seed data files into the temp data directory before launching,
 * or into an already-running app's data dir.
 */
export function seedData(filename: string, data: unknown): void {
  const dataDir = path.join(tempDataDir, "reqresflow-data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, filename),
    JSON.stringify(data, null, 2),
    "utf-8",
  );
}

/**
 * Read a persisted data file from the temp data directory.
 */
export function readData(filename: string): unknown {
  const filePath = path.join(tempDataDir, "reqresflow-data", filename);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/**
 * Get the temp data directory path (for advanced assertions).
 */
export function getDataDir(): string {
  return tempDataDir;
}
