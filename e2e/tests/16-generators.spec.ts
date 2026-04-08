import { test, expect } from "@playwright/test";
import { launchApp, closeApp, seedData } from "../helpers/app";
import { S } from "../helpers/selectors";
import {
  clickSidebarTab,
  typeUrl,
  selectMethod,
  sendRequest,
  clickRequestTab,
} from "../helpers/data";
import type { Page } from "@playwright/test";
import path from "node:path";
import { execSync } from "node:child_process";

// ═══════════════════════════════════════════════════════════════════════
// UF-16: Generators (Docker-based dynamic value generation)
//
// NOTE: These tests require Docker to be installed and running.
// The example generators project (examples/generators/) must have been
// built at least once via `docker build -t reqresflow-generators .`
// in that directory.
//
// Covers: sidebar tab, empty state, config display, build & start,
//         generator listing, container logs, stop, rebuild, refresh,
//         remove, generator substitution in requests, autocomplete
// ═══════════════════════════════════════════════════════════════════════

const GENERATORS_PROJECT_DIR = path.resolve(
  __dirname,
  "../../examples/generators",
);

// Generous timeout for Docker operations
test.setTimeout(120_000);

// ═══════════════════════════════════════════════════════════════════════
// Section 1 — Generators Sidebar & Empty State
// ═══════════════════════════════════════════════════════════════════════

test.describe("Generators: Empty State & Navigation", () => {
  let page: Page;

  test.beforeAll(async () => {
    ({ page } = await launchApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("generators tab is visible in sidebar", async () => {
    const genTab = page.locator(
      `${S.sidebarSectionTab}:has-text("Generators")`,
    );
    await expect(genTab).toBeVisible();
  });

  test("clicking generators tab shows empty state", async () => {
    await clickSidebarTab(page, "Generators");
    await expect(page.locator(S.generatorsSection)).toBeVisible();
    await expect(page.locator(S.generatorsEmpty)).toBeVisible();
    await expect(page.locator(S.generatorsEmptyText)).toContainText(
      "Docker-based generator project",
    );
  });

  test("empty state shows Select Generator Project button", async () => {
    await expect(page.locator(S.generatorsSetupBtn)).toBeVisible();
    await expect(page.locator(S.generatorsSetupBtn)).toHaveText(
      "Select Generator Project",
    );
  });

  test("switching to generators keeps request tabs visible", async () => {
    await clickSidebarTab(page, "Generators");
    // Request tabs should still be visible (not flow tabs)
    await expect(page.locator(S.tabBar)).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Section 2 — Seeded Config (no Docker yet)
// ═══════════════════════════════════════════════════════════════════════

test.describe("Generators: Seeded Config Display", () => {
  let page: Page;

  test.beforeAll(async () => {
    // Ensure no stale container from a prior run
    try {
      execSync("docker rm -f reqresflow-generators-e2e", { stdio: "ignore" });
    } catch {
      // Ignore — container may not exist
    }

    // Seed the generator config before launching
    // We need to launch first to get the temp dir, then seed and restart
    ({ page } = await launchApp());
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("seeding config and reloading shows config panel", async () => {
    // Seed config pointing to the example generators project
    seedData("generator-config.json", {
      projectDir: GENERATORS_PROJECT_DIR,
      containerName: "reqresflow-generators-e2e",
      port: 7891,
    });

    // Restart to pick up the seeded config
    const { restartApp } = await import("../helpers/app");
    ({ page } = await restartApp());
    await page.click(".request-tab-add");
    await page.waitForSelector(".url-bar", { timeout: 5_000 });

    await clickSidebarTab(page, "Generators");
    await expect(page.locator(S.generatorsConfig)).toBeVisible();
  });

  test("config shows project folder name", async () => {
    const configValue = page
      .locator(S.generatorsConfigRow)
      .first()
      .locator(S.generatorsConfigValue);
    await expect(configValue).toHaveText("generators");
  });

  test("config shows status as stopped initially", async () => {
    const statusRow = page.locator(S.generatorsConfigRow).nth(1);
    await expect(statusRow).toContainText("stopped");
    await expect(page.locator(S.genStatusStopped)).toBeVisible();
  });

  test("stopped state shows Build & Start button", async () => {
    const buildBtn = page.locator(
      `${S.generatorsActionBtn}:has-text("Build & Start")`,
    );
    await expect(buildBtn).toBeVisible();
  });

  test("Remove button is always visible", async () => {
    await expect(page.locator(S.generatorsActionBtnDanger)).toBeVisible();
    await expect(page.locator(S.generatorsActionBtnDanger)).toHaveText(
      "Remove",
    );
  });

  test("container logs toggle is visible", async () => {
    await expect(page.locator(S.generatorsLogsToggle)).toBeVisible();
    await expect(page.locator(S.generatorsLogsToggle)).toContainText(
      "Container Logs",
    );
  });

  test("clicking log toggle expands logs panel", async () => {
    await page.locator(S.generatorsLogsToggle).click();
    await expect(page.locator(S.generatorsLogs)).toBeVisible();
  });

  test("clicking log toggle again collapses logs panel", async () => {
    await page.locator(S.generatorsLogsToggle).click();
    await expect(page.locator(S.generatorsLogs)).not.toBeVisible();
  });

  test("remove button clears config and shows empty state", async () => {
    await page.locator(S.generatorsActionBtnDanger).click();
    await expect(page.locator(S.generatorsEmpty)).toBeVisible();
    await expect(page.locator(S.generatorsConfig)).not.toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Section 3 — Docker Lifecycle (requires Docker)
// ═══════════════════════════════════════════════════════════════════════

test.describe("Generators: Docker Lifecycle", () => {
  let page: Page;

  test.beforeAll(async () => {
    // Ensure no stale container from a prior run
    try {
      execSync("docker rm -f reqresflow-generators-e2e", { stdio: "ignore" });
    } catch {
      // Ignore — container may not exist
    }

    ({ page } = await launchApp());

    // Seed config with a unique port to avoid conflicts
    seedData("generator-config.json", {
      projectDir: GENERATORS_PROJECT_DIR,
      containerName: "reqresflow-generators-e2e",
      port: 7891,
    });

    const { restartApp } = await import("../helpers/app");
    ({ page } = await restartApp());
    await page.click(".request-tab-add");
    await page.waitForSelector(".url-bar", { timeout: 5_000 });
    await clickSidebarTab(page, "Generators");
  });

  test.afterAll(async () => {
    // Clean up the Docker container
    try {
      execSync("docker rm -f reqresflow-generators-e2e", { stdio: "ignore" });
    } catch {
      // Ignore — container may not exist
    }
    await closeApp();
  });

  test("Build & Start builds image and starts container", async () => {
    const buildBtn = page.locator(
      `${S.generatorsActionBtn}:has-text("Build & Start")`,
    );
    await buildBtn.click();

    // Wait for the container to be running (longer timeout for Docker build)
    // Note: "Building..." transient state may complete too fast with cached layers to assert on
    await expect(page.locator(S.genStatusRunning)).toBeVisible({
      timeout: 90_000,
    });
  });

  test("running state shows Stop, Rebuild, and Refresh buttons", async () => {
    await expect(
      page.locator(`${S.generatorsActionBtn}:has-text("Stop")`),
    ).toBeVisible();
    await expect(
      page.locator(`${S.generatorsActionBtn}:has-text("Rebuild")`),
    ).toBeVisible();
    await expect(
      page.locator(`${S.generatorsActionBtn}:has-text("Refresh")`),
    ).toBeVisible();
  });

  test("generators list shows available generators", async () => {
    await expect(page.locator(S.generatorsList)).toBeVisible();
    await expect(page.locator(S.generatorsListHeader)).toContainText(
      "Available Generators",
    );

    // Should have at least some generators
    const count = await page.locator(S.generatorItem).count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("generator items show $name prefix", async () => {
    const firstGenName = page.locator(S.generatorName).first();
    const text = await firstGenName.textContent();
    expect(text).toMatch(/^\$/);
  });

  test("container logs have build output", async () => {
    await page.locator(S.generatorsLogsToggle).click();
    await expect(page.locator(S.generatorsLogs)).toBeVisible();

    const logsContent = page.locator(S.generatorsLogsContent);
    await expect(logsContent).toBeVisible();

    const logs = await logsContent.textContent();
    // Build logs should contain Docker build progress
    expect(logs?.length ?? 0).toBeGreaterThan(0);
  });

  test("Refresh Logs button fetches fresh logs", async () => {
    const refreshLogsBtn = page.locator(
      `${S.generatorsActionBtn}:has-text("Refresh Logs")`,
    );
    await refreshLogsBtn.click();

    // Logs should now contain server output (from docker logs)
    await page.waitForTimeout(1000);
    const logsContent = page.locator(S.generatorsLogsContent);
    const logs = await logsContent.textContent();
    expect(logs).toContain("Generator server listening");
  });

  test("collapse logs panel", async () => {
    await page.locator(S.generatorsLogsToggle).click();
    await expect(page.locator(S.generatorsLogs)).not.toBeVisible();
  });

  test("Stop stops the container", async () => {
    await page.locator(`${S.generatorsActionBtn}:has-text("Stop")`).click();
    await expect(page.locator(S.genStatusStopped)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator(S.generatorsList)).not.toBeVisible();
  });

  test("Build & Start after stop restarts the container", async () => {
    const buildBtn = page.locator(
      `${S.generatorsActionBtn}:has-text("Build & Start")`,
    );
    await buildBtn.click();

    await expect(page.locator(S.genStatusRunning)).toBeVisible({
      timeout: 90_000,
    });

    // Generators list should reappear
    await expect(page.locator(S.generatorsList)).toBeVisible();
  });

  test("Rebuild rebuilds image and restarts container", async () => {
    await page.locator(`${S.generatorsActionBtn}:has-text("Rebuild")`).click();

    // Wait for running status (longer timeout for Docker rebuild)
    // Note: "Rebuilding..." transient state may complete too fast with cached layers to assert on
    await expect(page.locator(S.genStatusRunning)).toBeVisible({
      timeout: 90_000,
    });

    // Generators list should be populated
    const count = await page.locator(S.generatorItem).count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("Refresh re-fetches generator list without restart", async () => {
    const countBefore = await page.locator(S.generatorItem).count();
    await page.locator(`${S.generatorsActionBtn}:has-text("Refresh")`).click();
    // Wait a moment for the refresh
    await page.waitForTimeout(1500);
    const countAfter = await page.locator(S.generatorItem).count();
    expect(countAfter).toBe(countBefore);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Section 4 — Generator Substitution in Requests (requires Docker)
// ═══════════════════════════════════════════════════════════════════════

test.describe("Generators: Request Substitution", () => {
  let page: Page;

  test.beforeAll(async () => {
    ({ page } = await launchApp());

    // Seed generator config
    seedData("generator-config.json", {
      projectDir: GENERATORS_PROJECT_DIR,
      containerName: "reqresflow-generators-e2e",
      port: 7891,
    });

    const { restartApp } = await import("../helpers/app");
    ({ page } = await restartApp());
    await page.click(".request-tab-add");
    await page.waitForSelector(".url-bar", { timeout: 5_000 });

    // Build & start via sidebar
    await clickSidebarTab(page, "Generators");

    // Check if already running from previous test
    const isRunning = await page.locator(S.genStatusRunning).isVisible();
    if (!isRunning) {
      const buildBtn = page.locator(
        `${S.generatorsActionBtn}:has-text("Build & Start")`,
      );
      await buildBtn.click();
      await expect(page.locator(S.genStatusRunning)).toBeVisible({
        timeout: 90_000,
      });
    }
  });

  test.afterAll(async () => {
    try {
      execSync("docker rm -f reqresflow-generators-e2e", { stdio: "ignore" });
    } catch {
      // Ignore — container may not exist
    }
    await closeApp();
  });

  test("{{$timestamp}} in POST body is substituted with a numeric value", async () => {
    await selectMethod(page, "POST");
    await typeUrl(page, "https://httpbin.org/post");

    // Set body to raw JSON
    await clickRequestTab(page, "Body");
    await page.locator('.body-type-option:has-text("raw")').click();

    // Type body with generator reference
    const codeMirror = page.locator(
      `${S.bodyEditor} ${S.codeEditorWrapper} .cm-content`,
    );
    await codeMirror.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type('{"ts": "{{$timestamp}}"}');

    await sendRequest(page);

    // httpbin.org/post echoes the body in `json` field
    const responseBody = page.locator(`${S.responseBody} .cm-content`);
    const responseText = await responseBody.textContent();

    // The response should contain the resolved timestamp (a number), not the literal {{$timestamp}}
    expect(responseText).not.toContain("{{$timestamp}}");
    // Parse the echoed body — ts should be a numeric string
    const match = responseText?.match(/"ts":\s*"(\d+)"/);
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBeGreaterThan(1_000_000_000);
  });

  test("{{$randomEmail}} in POST body is substituted with an email", async () => {
    const codeMirror = page.locator(
      `${S.bodyEditor} ${S.codeEditorWrapper} .cm-content`,
    );
    await codeMirror.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type('{"email": "{{$randomEmail}}"}');

    await sendRequest(page);

    const responseBody = page.locator(`${S.responseBody} .cm-content`);
    const responseText = await responseBody.textContent();

    expect(responseText).not.toContain("{{$randomEmail}}");
    // Should contain an @ sign (email)
    expect(responseText).toContain("@");
  });

  test("multiple generators in same body each get unique values", async () => {
    const codeMirror = page.locator(
      `${S.bodyEditor} ${S.codeEditorWrapper} .cm-content`,
    );
    await codeMirror.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type(
      '{"card": "{{$visa}}", "expiry": "{{$cardExpiry}}"}',
    );

    await sendRequest(page);

    const responseBody = page.locator(`${S.responseBody} .cm-content`);
    const responseText = await responseBody.textContent();

    // visa should be a 16-digit number starting with 4
    expect(responseText).not.toContain("{{$visa}}");
    expect(responseText).not.toContain("{{$cardExpiry}}");
    expect(responseText).toMatch(/4\d{15}/);
    // cardExpiry should be MM/YYYY
    expect(responseText).toMatch(/\d{2}\/\d{4}/);
  });

  test("generator in URL is substituted", async () => {
    await selectMethod(page, "GET");
    await typeUrl(page, "https://httpbin.org/get?ts={{$timestamp}}");

    await sendRequest(page);

    const responseBody = page.locator(`${S.responseBody} .cm-content`);
    const responseText = await responseBody.textContent();

    // httpbin.org/get echoes args — ts should be a numeric string
    expect(responseText).not.toContain("{{$timestamp}}");
    expect(responseText).toMatch(/"ts":\s*"\d+"/);
  });

  test("generator in header is substituted", async () => {
    // Force-click to bypass the env-var-highlight overlay left by the previous test's {{$timestamp}} URL
    const urlInput = page.locator(".url-bar .autosuggest-wrapper input");
    await urlInput.click({ force: true });
    await urlInput.fill("https://httpbin.org/headers");
    await clickRequestTab(page, "Headers");

    // Add a header with a generator value
    const addBtn = page.locator(S.kvAddBtn);
    await addBtn.click();

    const rows = page.locator(S.kvRow);
    const lastRow = rows.last();

    const keyInput = lastRow.locator(`${S.autosuggestWrapper} input`).first();
    const valueInput = lastRow.locator(`${S.autosuggestWrapper} input`).last();

    await keyInput.fill("X-Test-Id");
    await valueInput.fill("{{$uuidv4}}");

    await sendRequest(page);

    const responseBody = page.locator(`${S.responseBody} .cm-content`);
    const responseText = await responseBody.textContent();

    // httpbin.org/headers echoes all headers — should have X-Test-Id with a resolved value
    expect(responseText).toContain("X-Test-Id");
    expect(responseText).not.toContain("{{$uuidv4}}");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Section 5 — Generator Autocomplete
// ═══════════════════════════════════════════════════════════════════════

test.describe("Generators: Autocomplete", () => {
  let page: Page;

  test.beforeAll(async () => {
    ({ page } = await launchApp());

    // Seed generator config and environment
    seedData("generator-config.json", {
      projectDir: GENERATORS_PROJECT_DIR,
      containerName: "reqresflow-generators-e2e",
      port: 7891,
    });
    seedData("environments.json", [
      {
        id: "env-gen-test",
        name: "Gen Test Env",
        variables: [{ key: "baseUrl", value: "https://httpbin.org" }],
      },
    ]);

    const { restartApp } = await import("../helpers/app");
    ({ page } = await restartApp());
    await page.click(".request-tab-add");
    await page.waitForSelector(".url-bar", { timeout: 5_000 });

    // Select environment
    await page.selectOption(S.envSelect, { label: "Gen Test Env" });

    // Ensure generators are running
    await clickSidebarTab(page, "Generators");
    const isRunning = await page.locator(S.genStatusRunning).isVisible();
    if (!isRunning) {
      const buildBtn = page.locator(
        `${S.generatorsActionBtn}:has-text("Build & Start")`,
      );
      await buildBtn.click();
      await expect(page.locator(S.genStatusRunning)).toBeVisible({
        timeout: 90_000,
      });
    }

    // Go back to collections to use the URL bar normally
    await clickSidebarTab(page, "Collections");
  });

  test.afterAll(async () => {
    try {
      execSync("docker rm -f reqresflow-generators-e2e", { stdio: "ignore" });
    } catch {
      // Ignore — container may not exist
    }
    await closeApp();
  });

  test("typing {{ in URL bar shows generators alongside env vars", async () => {
    const urlInput = page.locator(".url-bar .autosuggest-wrapper input");
    await urlInput.click();
    await urlInput.fill("{{");

    // Wait for dropdown to appear
    await expect(page.locator(S.autosuggestDropdown)).toBeVisible({
      timeout: 3_000,
    });

    // Should show both env vars (baseUrl) and generators ($timestamp, etc.)
    const items = page.locator(S.autosuggestItem);
    const count = await items.count();
    expect(count).toBeGreaterThan(1);

    // Check that at least one item starts with $ (a generator)
    const allTexts: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).textContent();
      if (text) allTexts.push(text);
    }
    const hasGenerator = allTexts.some((t) => t.includes("$"));
    expect(hasGenerator).toBe(true);

    // Escape to close dropdown
    await page.keyboard.press("Escape");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Section 6 — Remove Config Cleans Up
// ═══════════════════════════════════════════════════════════════════════

test.describe("Generators: Remove Config", () => {
  let page: Page;

  test.beforeAll(async () => {
    // Ensure no stale container from a prior run
    try {
      execSync("docker rm -f reqresflow-generators-e2e", { stdio: "ignore" });
    } catch {
      // Ignore — container may not exist
    }

    ({ page } = await launchApp());

    seedData("generator-config.json", {
      projectDir: GENERATORS_PROJECT_DIR,
      containerName: "reqresflow-generators-e2e",
      port: 7891,
    });

    const { restartApp } = await import("../helpers/app");
    ({ page } = await restartApp());
    await page.click(".request-tab-add");
    await page.waitForSelector(".url-bar", { timeout: 5_000 });
    await clickSidebarTab(page, "Generators");
  });

  test.afterAll(async () => {
    await closeApp();
  });

  test("Remove button resets to empty state", async () => {
    // Config should be visible
    await expect(page.locator(S.generatorsConfig)).toBeVisible();

    // Click Remove
    await page.locator(S.generatorsActionBtnDanger).click();

    // Should return to empty state
    await expect(page.locator(S.generatorsEmpty)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator(S.generatorsConfig)).not.toBeVisible();
    await expect(page.locator(S.generatorsSetupBtn)).toBeVisible();
  });
});
