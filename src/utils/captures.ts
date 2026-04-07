import { ResponseCapture } from "../types/electron";
import { resolvePath } from "./request";

interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

export interface CapturedValue {
  varName: string;
  value: string;
  source: string;
  path: string;
}

/**
 * Extract capture values from a response based on capture definitions.
 * Returns the captured values and an updated copy of the variables array.
 */
export function extractCaptures(
  result: ResponseData,
  captures: ResponseCapture[],
  vars: { key: string; value: string }[],
): { capturedValues: CapturedValue[]; updatedVars: { key: string; value: string }[] } {
  const enabledCaptures = captures.filter(
    (c) => c.enabled && c.varName.trim(),
  );
  if (enabledCaptures.length === 0) {
    return { capturedValues: [], updatedVars: vars };
  }

  const capturedValues: CapturedValue[] = [];
  const updatedVars = [...vars];

  for (const cap of enabledCaptures) {
    let value = "";
    if (cap.source === "status") {
      value = String(result.status);
    } else if (cap.source === "header") {
      const headerKey = Object.keys(result.headers).find(
        (k) => k.toLowerCase() === cap.path.toLowerCase(),
      );
      value = headerKey ? result.headers[headerKey] : "";
    } else {
      try {
        const parsed = JSON.parse(result.body);
        value = resolvePath(parsed, cap.path);
      } catch {
        value = "";
      }
    }

    capturedValues.push({
      varName: cap.varName.trim(),
      value,
      source: cap.source,
      path: cap.path,
    });

    const existing = updatedVars.findIndex(
      (v) => v.key === cap.varName.trim(),
    );
    if (existing >= 0) {
      updatedVars[existing] = { ...updatedVars[existing], value };
    } else {
      updatedVars.push({ key: cap.varName.trim(), value });
    }
  }

  return { capturedValues, updatedVars };
}
