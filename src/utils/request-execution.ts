import type {
  BodyType,
  FlowStepExecutionDetail,
  GeneratorConfig,
  ResponseCapture,
  SavedRequest,
} from "../types/electron";
import { extractCaptures } from "./captures";
import { resolveGenerators } from "./generators";
import { buildRequestConfig } from "./request-builder";

export async function executeRequest(
  req: SavedRequest,
  vars: { key: string; value: string }[],
  generatorConfig?: GeneratorConfig | null,
): Promise<{
  detail: FlowStepExecutionDetail;
  updatedVars: { key: string; value: string }[];
  captures: ResponseCapture[];
}> {
  const bodyType = (req.bodyType || "none") as BodyType;
  const payload =
    req.payloads && req.payloads.length > 0
      ? req.payloads.find((p) => p.id === req.activePayloadId) ||
        req.payloads[0]
      : null;

  // Resolve generator placeholders into virtual env vars
  const substitutableFields = [
    req.url,
    ...(req.params || [])
      .filter((p) => p.enabled)
      .flatMap((p) => [p.key, p.value]),
    ...(req.headers || [])
      .filter((h) => h.enabled)
      .flatMap((h) => [h.key, h.value]),
    payload?.body || req.body || "",
  ];
  const generatorVars = await resolveGenerators(
    substitutableFields,
    generatorConfig || null,
  );
  const allVars = [...vars, ...generatorVars];

  const built = buildRequestConfig({
    method: req.method,
    url: req.url,
    params: req.params || [],
    headers: req.headers || [],
    auth: req.auth || { type: "none" as const },
    bodyType,
    rawLanguage: req.rawLanguage || payload?.rawLanguage || "json",
    rawBody: payload?.body || req.body || "",
    payload,
    vars: allVars,
  });

  const detail: FlowStepExecutionDetail = {
    resolvedUrl: built.fullUrl,
    resolvedMethod: req.method,
    resolvedHeaders: { ...built.headers },
    resolvedBody: built.body,
    response: null,
    error: null,
    capturedValues: [],
  };

  try {
    const result = await window.electronAPI.sendRequest({
      method: req.method,
      url: built.fullUrl,
      headers: built.headers,
      body: built.body,
      bodyType,
    });
    detail.response = result;

    const allCaptures = req.captures || [];
    const { capturedValues, updatedVars } = extractCaptures(
      result,
      allCaptures,
      vars,
    );
    detail.capturedValues = capturedValues;

    return { detail, updatedVars, captures: allCaptures };
  } catch (err: unknown) {
    detail.error = err instanceof Error ? err.message : String(err);
    return { detail, updatedVars: vars, captures: [] };
  }
}
