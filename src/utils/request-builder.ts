import type {
  AuthConfig,
  BodyType,
  Payload,
} from "../types/electron";
import { getBaseUrl } from "./url";
import { substituteVars } from "./http";

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
