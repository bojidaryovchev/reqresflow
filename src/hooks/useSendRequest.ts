import { useCallback, useEffect, useRef } from "react";
import {
  BodyType,
  Environment,
  GeneratorConfig,
  HistoryEntry,
  Payload,
  RawLanguage,
  RequestTab,
  ResponseCapture,
  SavedRequest,
} from "../types/electron";
import { generateId } from "../utils/helpers";
import { buildRequestConfig } from "../utils/request-builder";
import { extractCaptures } from "../utils/captures";
import { resolveGenerators } from "../utils/generators";

interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

interface UseSendRequestDeps {
  tabs: RequestTab[];
  setTabs: React.Dispatch<React.SetStateAction<RequestTab[]>>;
  activeTab: RequestTab | null;
  setActiveTabId: React.Dispatch<React.SetStateAction<string>>;
  updateTab: (id: string, updates: Partial<RequestTab>) => void;
  activeEnv: Environment | null;
  activeEnvId: string | null;
  environments: Environment[];
  setEnvironments: React.Dispatch<React.SetStateAction<Environment[]>>;
  history: HistoryEntry[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
  activePayload: Payload | null;
  body: string;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  generatorConfig: GeneratorConfig | null;
}

export function useSendRequest({
  tabs,
  setTabs,
  activeTab,
  setActiveTabId,
  updateTab,
  activeEnv,
  activeEnvId,
  environments,
  setEnvironments,
  history,
  setHistory,
  activePayload,
  body,
  setLoading,
  generatorConfig,
}: UseSendRequestDeps) {
  const pendingSendRef = useRef<string | null>(null);

  // Apply captures: extract values from response and set them as env vars
  const applyCaptures = useCallback(
    (result: ResponseData, captures: ResponseCapture[]) => {
      if (!activeEnvId || captures.length === 0) return;
      const enabledCaptures = captures.filter(
        (c) => c.enabled && c.varName.trim(),
      );
      if (enabledCaptures.length === 0) return;

      const updatedEnvs = environments.map((env) => {
        if (env.id !== activeEnvId) return env;
        const { updatedVars } = extractCaptures(
          result,
          captures,
          env.variables,
        );
        return { ...env, variables: updatedVars };
      });

      setEnvironments(updatedEnvs);
      window.electronAPI.saveEnvironments(updatedEnvs);
    },
    [activeEnvId, environments],
  );

  // Get current request state as a SavedRequest
  const getCurrentRequest = useCallback((): SavedRequest | null => {
    if (!activeTab) return null;
    return {
      id: "",
      name:
        activeTab.name && activeTab.name !== "Untitled"
          ? activeTab.name
          : activeTab.url.trim()
            ? (() => {
                try {
                  return (
                    new URL(
                      activeTab.url.trim().startsWith("http")
                        ? activeTab.url.trim()
                        : `https://${activeTab.url.trim()}`,
                    ).pathname || activeTab.url.trim()
                  );
                } catch {
                  return activeTab.url.trim();
                }
              })()
            : "Untitled Request",
      method: activeTab.method,
      url: activeTab.url,
      params: activeTab.params,
      headers: activeTab.headers,
      body,
      bodyType: activeTab.bodyType,
      rawLanguage: activeTab.rawLanguage,
      formData: activePayload?.formData,
      graphql: activePayload?.graphql,
      binaryFilePath: activePayload?.binaryFilePath,
      payloads: activeTab.payloads,
      activePayloadId: activeTab.activePayloadId,
      captures: activeTab.captures,
      auth: activeTab.auth,
    };
  }, [activeTab, body]);

  // Load a saved request into a new tab
  const loadRequest = useCallback(
    (
      req: SavedRequest,
      collectionId?: string,
      requestId?: string,
      historyId?: string,
    ) => {
      // If this request is already open in a tab, just focus it
      if (collectionId && requestId) {
        const existing = tabs.find(
          (t) =>
            t.savedToCollectionId === collectionId &&
            t.savedRequestId === requestId,
        );
        if (existing) {
          if (
            existing.name !== req.name ||
            (req.activePayloadId &&
              existing.activePayloadId !== req.activePayloadId)
          ) {
            setTabs((prev) =>
              prev.map((t) =>
                t.id === existing.id
                  ? {
                      ...t,
                      name: req.name,
                      ...(req.activePayloadId
                        ? { activePayloadId: req.activePayloadId }
                        : {}),
                    }
                  : t,
              ),
            );
          }
          setActiveTabId(existing.id);
          return;
        }
      }
      if (historyId) {
        const existing = tabs.find((t) => t.sourceHistoryId === historyId);
        if (existing) {
          setActiveTabId(existing.id);
          return;
        }
      }

      const defaultPayload: Payload = {
        id: generateId(),
        name: "Default",
        body: req.body,
        bodyType: req.bodyType || "none",
        rawLanguage: req.rawLanguage || "json",
        formData: req.formData || [
          { enabled: true, key: "", value: "", type: "text" },
        ],
        graphql: req.graphql || { query: "", variables: "" },
        binaryFilePath: req.binaryFilePath || "",
      };
      const payloads =
        req.payloads && req.payloads.length > 0
          ? req.payloads.map((p) => ({
              ...p,
              bodyType: p.bodyType || req.bodyType || ("none" as BodyType),
              rawLanguage:
                p.rawLanguage || req.rawLanguage || ("json" as RawLanguage),
              formData: p.formData || [
                { enabled: true, key: "", value: "", type: "text" as const },
              ],
              graphql: p.graphql || { query: "", variables: "" },
              binaryFilePath: p.binaryFilePath || "",
            }))
          : [defaultPayload];
      const newTab: RequestTab = {
        id: generateId(),
        name: req.name,
        method: req.method,
        url: req.url,
        params:
          req.params.length > 0
            ? req.params
            : [{ enabled: true, key: "", value: "" }],
        headers:
          req.headers.length > 0
            ? req.headers
            : [{ enabled: true, key: "", value: "" }],
        payloads,
        activePayloadId: req.activePayloadId || payloads[0].id,
        bodyType: req.bodyType || "none",
        rawLanguage: req.rawLanguage || "json",
        response: null,
        error: null,
        captures: req.captures || [],
        auth: req.auth || { type: "none" },
        savedToCollectionId: collectionId || null,
        savedRequestId: requestId || null,
        sourceHistoryId: historyId || null,
        isDirty: false,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    },
    [tabs],
  );

  // Load a history entry into a tab (reuses if already open)
  const loadHistoryEntry = useCallback(
    (entry: HistoryEntry) => {
      loadRequest(entry.request, undefined, undefined, entry.id);
    },
    [loadRequest],
  );

  const sendRequest = useCallback(async () => {
    if (!activeTab) return;
    if (!activeTab.url.trim()) return;

    setLoading(true);
    updateTab(activeTab.id, { error: null, response: null });

    const vars = activeEnv?.variables || [];

    // Resolve generator placeholders into virtual env vars
    const substitutableFields = [
      activeTab.url,
      ...activeTab.params
        .filter((p) => p.enabled)
        .flatMap((p) => [p.key, p.value]),
      ...activeTab.headers
        .filter((h) => h.enabled)
        .flatMap((h) => [h.key, h.value]),
      body,
    ];
    const generatorVars = await resolveGenerators(
      substitutableFields,
      generatorConfig,
    );
    const allVars = [...vars, ...generatorVars];

    const built = buildRequestConfig({
      method: activeTab.method,
      url: activeTab.url,
      params: activeTab.params,
      headers: activeTab.headers,
      auth: activeTab.auth,
      bodyType: activeTab.bodyType,
      rawLanguage: activeTab.rawLanguage,
      rawBody: body,
      payload: activePayload,
      vars: allVars,
    });

    try {
      const result = await window.electronAPI.sendRequest({
        method: activeTab.method,
        url: built.fullUrl,
        headers: built.headers,
        body: built.body,
        bodyType: activeTab.bodyType,
      });
      updateTab(activeTab.id, { response: result, error: null });

      // Apply response captures to environment
      applyCaptures(result, activeTab.captures);

      // Add to history
      const entry: HistoryEntry = {
        id: generateId(),
        timestamp: Date.now(),
        method: activeTab.method,
        url: activeTab.url.trim(),
        status: result.status,
        statusText: result.statusText,
        time: result.time,
        request: getCurrentRequest(),
      };
      const updatedHistory = [entry, ...history].slice(0, 100);
      setHistory(updatedHistory);
      window.electronAPI.saveHistory(updatedHistory);
    } catch (err: unknown) {
      updateTab(activeTab.id, {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    body,
    activeEnv,
    activePayload,
    history,
    getCurrentRequest,
    updateTab,
    applyCaptures,
    generatorConfig,
  ]);

  // Auto-send when a variant run was triggered
  useEffect(() => {
    if (
      activeTab &&
      pendingSendRef.current &&
      activeTab.activePayloadId === pendingSendRef.current
    ) {
      pendingSendRef.current = null;
      sendRequest();
    }
  }, [activeTab?.activePayloadId, activeTab?.id, sendRequest]);

  // Load a request with a specific payload variant and immediately send it
  const runVariant = useCallback(
    (
      req: SavedRequest,
      collectionId: string,
      requestId: string,
      payloadId: string,
    ) => {
      if (
        activeTab &&
        activeTab.savedToCollectionId === collectionId &&
        activeTab.savedRequestId === requestId &&
        activeTab.activePayloadId === payloadId
      ) {
        sendRequest();
        return;
      }
      loadRequest(
        { ...req, activePayloadId: payloadId },
        collectionId,
        requestId,
      );
      pendingSendRef.current = payloadId;
    },
    [loadRequest, activeTab, sendRequest],
  );

  return {
    sendRequest,
    getCurrentRequest,
    loadRequest,
    loadHistoryEntry,
    runVariant,
    applyCaptures,
  };
}
