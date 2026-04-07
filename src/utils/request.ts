import type {
  AuthConfig,
  BodyType,
  Payload,
  RequestTab,
} from "../types/electron";
import { generateId } from "./helpers";
import { substituteVars } from "./http";

// Parse query params from a URL string (preserving {{var}} templates)
export function parseQueryParams(
  url: string,
): { enabled: boolean; key: string; value: string }[] {
  const qIdx = url.indexOf("?");
  if (qIdx === -1) return [];
  const qs = url.slice(qIdx + 1);
  if (!qs) return [];
  return qs.split("&").map((pair) => {
    const eqIdx = pair.indexOf("=");
    const key = eqIdx === -1 ? pair : pair.slice(0, eqIdx);
    const value = eqIdx === -1 ? "" : pair.slice(eqIdx + 1);
    return { enabled: true, key, value };
  });
}

// Get the base URL (everything before ?)
export function getBaseUrl(url: string): string {
  const qIdx = url.indexOf("?");
  return qIdx === -1 ? url : url.slice(0, qIdx);
}

// Build query string from params (raw, no encoding — encoding happens at send time)
export function buildQueryString(
  params: { enabled: boolean; key: string; value: string }[],
): string {
  const filled = params.filter((p) => p.enabled && p.key.trim());
  if (filled.length === 0) return "";
  return filled.map((p) => `${p.key}=${p.value}`).join("&");
}

// Fields that represent request config (not response/UI state)
export const REQUEST_FIELDS = new Set([
  "method",
  "url",
  "params",
  "headers",
  "payloads",
  "activePayloadId",
  "bodyType",
  "rawLanguage",
  "captures",
  "auth",
  "name",
]);

// Shared request-building logic used by both sendRequest and executeRequest
export function buildRequestConfig(input: {
  method: string;
  url: string;
  params: { enabled: boolean; key: string; value: string }[];
  headers: { enabled: boolean; key: string; value: string }[];
  auth: AuthConfig;
  bodyType: BodyType;
  rawLanguage: string;
  rawBody: string;
  payload: Payload | null;
  vars: { key: string; value: string }[];
}): {
  fullUrl: string;
  headers: Record<string, string>;
  body: string | undefined;
} {
  const { method, params, headers, auth, bodyType, rawLanguage, rawBody, payload, vars } = input;

  // Build URL
  const baseUrl = substituteVars(getBaseUrl(input.url.trim()), vars);
  const enabledParams = params.filter((p) => p.enabled && p.key.trim());
  let fullUrl = baseUrl;
  if (enabledParams.length > 0) {
    const qs = enabledParams
      .map(
        (p) =>
          `${encodeURIComponent(substituteVars(p.key, vars))}=${encodeURIComponent(substituteVars(p.value, vars))}`,
      )
      .join("&");
    fullUrl += (fullUrl.includes("?") ? "&" : "?") + qs;
  }

  // Build headers
  const headerObj: Record<string, string> = {
    "User-Agent": "ReqResFlow/1.0",
    Accept: "*/*",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
  };
  headers
    .filter((h) => h.enabled && h.key.trim())
    .forEach((h) => {
      headerObj[substituteVars(h.key, vars)] = substituteVars(h.value, vars);
    });

  // Apply auth
  if (auth.type === "bearer" && auth.token.trim()) {
    headerObj["Authorization"] =
      `Bearer ${substituteVars(auth.token.trim(), vars)}`;
  } else if (
    auth.type === "basic" &&
    (auth.username.trim() || auth.password.trim())
  ) {
    const user = substituteVars(auth.username, vars);
    const pass = substituteVars(auth.password, vars);
    headerObj["Authorization"] = `Basic ${btoa(`${user}:${pass}`)}`;
  }

  // Resolve body
  const resolvedBody = (() => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return undefined;
    if (bodyType === "none") return undefined;
    if (bodyType === "raw") return substituteVars(rawBody, vars);
    if (bodyType === "graphql" && payload) {
      const q = substituteVars(payload.graphql.query, vars);
      const v = payload.graphql.variables.trim()
        ? substituteVars(payload.graphql.variables, vars)
        : undefined;
      try {
        return JSON.stringify({
          query: q,
          variables: v ? JSON.parse(v) : undefined,
        });
      } catch {
        return JSON.stringify({ query: q, variables: v });
      }
    }
    if (bodyType === "x-www-form-urlencoded" && payload) {
      const pairs = payload.formData.filter((f) => f.enabled && f.key.trim());
      return pairs
        .map(
          (f) =>
            `${encodeURIComponent(substituteVars(f.key, vars))}=${encodeURIComponent(substituteVars(f.value, vars))}`,
        )
        .join("&");
    }
    if (bodyType === "form-data" && payload) {
      const boundary = `----ReqResFlow${Date.now()}`;
      const pairs = payload.formData.filter((f) => f.enabled && f.key.trim());
      let multipart = "";
      for (const f of pairs) {
        multipart += `--${boundary}\r\nContent-Disposition: form-data; name="${substituteVars(f.key, vars)}"\r\n\r\n${substituteVars(f.value, vars)}\r\n`;
      }
      multipart += `--${boundary}--\r\n`;
      headerObj["Content-Type"] = `multipart/form-data; boundary=${boundary}`;
      return multipart;
    }
    if (bodyType === "binary" && payload?.binaryFilePath) {
      return payload.binaryFilePath;
    }
    return undefined;
  })();

  // Set Content-Type if not already set
  const hasContentType = Object.keys(headerObj).some(
    (k) => k.toLowerCase() === "content-type",
  );
  if (resolvedBody && !hasContentType) {
    if (bodyType === "raw") {
      const langMap: Record<string, string> = {
        json: "application/json",
        text: "text/plain",
        xml: "application/xml",
        html: "text/html",
        javascript: "application/javascript",
      };
      headerObj["Content-Type"] = langMap[rawLanguage] || "text/plain";
    } else if (bodyType === "x-www-form-urlencoded") {
      headerObj["Content-Type"] = "application/x-www-form-urlencoded";
    } else if (bodyType === "graphql") {
      headerObj["Content-Type"] = "application/json";
    }
  }

  return { fullUrl, headers: headerObj, body: resolvedBody };
}

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
