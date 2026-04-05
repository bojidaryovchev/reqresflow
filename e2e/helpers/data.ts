import type { Page } from "@playwright/test";

/**
 * Test fixture data for predictable E2E tests.
 */

// ── Mock server / test endpoints ──
// We use httpbin.org-style endpoints for real HTTP testing,
// or intercept IPC calls for isolated tests.

export const TEST_URLS = {
  get: "https://httpbin.org/get",
  post: "https://httpbin.org/post",
  put: "https://httpbin.org/put",
  delete: "https://httpbin.org/delete",
  status200: "https://httpbin.org/status/200",
  status404: "https://httpbin.org/status/404",
  status500: "https://httpbin.org/status/500",
  delay1s: "https://httpbin.org/delay/1",
  headers: "https://httpbin.org/headers",
  json: "https://jsonplaceholder.typicode.com/posts/1",
  jsonList: "https://jsonplaceholder.typicode.com/posts",
  invalid: "http://this-host-does-not-exist.invalid/test",
} as const;

// ── Seed data factories ──

export function makeCollection(overrides: Record<string, unknown> = {}) {
  return {
    id: "col-test-1",
    name: "Test Collection",
    requests: [] as unknown[],
    ...overrides,
  };
}

export function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "req-test-1",
    name: "Test Request",
    method: "GET",
    url: "https://httpbin.org/get",
    params: [{ enabled: true, key: "", value: "" }],
    headers: [{ enabled: true, key: "", value: "" }],
    body: "",
    bodyType: "none",
    rawLanguage: "json",
    formData: [{ enabled: true, key: "", value: "", type: "text" }],
    graphql: { query: "", variables: "" },
    binaryFilePath: "",
    payloads: [] as unknown[],
    captures: [] as unknown[],
    auth: { type: "none" },
    ...overrides,
  };
}

export function makeEnvironment(overrides: Record<string, unknown> = {}) {
  return {
    id: "env-test-1",
    name: "Test Environment",
    variables: [
      { key: "baseUrl", value: "https://httpbin.org" },
      { key: "token", value: "test-token-123" },
    ],
    ...overrides,
  };
}

export function makeHistoryEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "hist-test-1",
    timestamp: Date.now(),
    method: "GET",
    url: "https://httpbin.org/get",
    status: 200,
    statusText: "OK",
    time: 150,
    request: makeRequest(),
    ...overrides,
  };
}

export function makeFlow(overrides: Record<string, unknown> = {}) {
  return {
    id: "flow-test-1",
    name: "Test Flow",
    steps: [] as unknown[],
    ...overrides,
  };
}

// ── UI Helpers ──

/**
 * Click a request panel tab by name (Params, Headers, Body, Auth, Captures).
 */
export async function clickRequestTab(
  page: Page,
  tabName: string,
): Promise<void> {
  await page.click(`.request-section .tab:has-text("${tabName}")`);
}

/**
 * Click a response panel tab by name (Body, Headers).
 */
export async function clickResponseTab(
  page: Page,
  tabName: string,
): Promise<void> {
  await page.click(`.response-section .tab:has-text("${tabName}")`);
}

/**
 * Click a sidebar section tab (Collections, Flows, History).
 */
export async function clickSidebarTab(
  page: Page,
  tabName: string,
): Promise<void> {
  await page.click(`.sidebar-section-tab:has-text("${tabName}")`);
}

/**
 * Type a URL into the URL input (clears first).
 */
export async function typeUrl(page: Page, url: string): Promise<void> {
  const input = page.locator(".url-bar .autosuggest-wrapper input");
  await input.click();
  await input.fill(url);
}

/**
 * Select an HTTP method from the method dropdown.
 */
export async function selectMethod(page: Page, method: string): Promise<void> {
  await page.selectOption(".method-select", method);
}

/**
 * Click the Send button and wait for the response to appear.
 */
export async function sendRequest(page: Page): Promise<void> {
  await page.click(".send-btn");
  // Wait for loading to finish (button text goes back to "Send")
  await page.waitForFunction(
    () => {
      const btn = document.querySelector(".send-btn");
      return btn && !btn.textContent?.includes("Sending");
    },
    { timeout: 15_000 },
  );
}

/**
 * Click the Save button.
 */
export async function clickSave(page: Page): Promise<void> {
  await page.click(".save-btn");
}

/**
 * Wait for a selector to be visible on the page.
 */
export async function waitForVisible(
  page: Page,
  selector: string,
  timeout = 5_000,
): Promise<void> {
  await page.waitForSelector(selector, { state: "visible", timeout });
}
