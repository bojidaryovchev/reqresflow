import type { RawLanguage } from "../types/electron";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export const METHOD_COLORS: Record<string, string> = {
  GET: "var(--method-get)",
  POST: "var(--method-post)",
  PUT: "var(--method-put)",
  PATCH: "var(--method-patch)",
  DELETE: "var(--method-delete)",
};

export function detectResponseLanguage(response: {
  headers: Record<string, string>;
  body: string;
}): RawLanguage {
  const ct = (
    response.headers["content-type"] ||
    response.headers["Content-Type"] ||
    ""
  ).toLowerCase();
  if (ct.includes("json")) return "json";
  if (ct.includes("xml")) return "xml";
  if (ct.includes("html")) return "html";
  if (ct.includes("javascript")) return "javascript";
  // Sniff body
  const trimmed = response.body.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (trimmed.startsWith("<?xml") || trimmed.startsWith("<rss")) return "xml";
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html"))
    return "html";
  return "text";
}

// Replace {{variable}} placeholders with environment values
// Supports both {{varName}} for env vars and {{$generatorName}} for generators
export function substituteVars(
  text: string,
  variables: { key: string; value: string }[],
): string {
  return text.replace(/\{\{([\w$]+)\}\}/g, (match, name) => {
    const found = variables.find((v) => v.key === name);
    return found ? found.value : match;
  });
}
