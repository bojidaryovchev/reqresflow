import type {
  RequestTab,
} from "../types/electron";
import { generateId } from "./helpers";

export function createEmptyTab(): RequestTab {
  const payloadId = generateId();
  return {
    id: generateId(),
    name: "Untitled",
    method: "GET",
    url: "",
    params: [{ enabled: true, key: "", value: "" }],
    headers: [{ enabled: true, key: "", value: "" }],
    payloads: [
      {
        id: payloadId,
        name: "Default",
        body: "",
        bodyType: "none",
        rawLanguage: "json",
        formData: [{ enabled: true, key: "", value: "", type: "text" }],
        graphql: { query: "", variables: "" },
        binaryFilePath: "",
      },
    ],
    activePayloadId: payloadId,
    bodyType: "none",
    rawLanguage: "json",
    response: null,
    error: null,
    captures: [],
    auth: { type: "none" },
    savedToCollectionId: null,
    savedRequestId: null,
    sourceHistoryId: null,
    isDirty: false,
  };
}

// Resolve a dot-notation path against a JSON object (e.g. "data.token" or "items.0.id")
export function resolvePath(obj: unknown, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[part];
  }
  return current == null ? "" : String(current);
}

export function getTabDisplayName(tab: RequestTab): string {
  // Prefer the explicit name if it's been set
  if (tab.name && tab.name !== "Untitled") {
    return tab.name;
  }
  // Otherwise derive from URL
  if (tab.url.trim()) {
    try {
      const u = new URL(
        tab.url.trim().startsWith("http")
          ? tab.url.trim()
          : `https://${tab.url.trim()}`,
      );
      return u.pathname || tab.url.trim();
    } catch {
      return tab.url.trim();
    }
  }
  return tab.name || "Untitled";
}
