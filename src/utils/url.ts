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
