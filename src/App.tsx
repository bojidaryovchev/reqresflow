import React, { useCallback, useEffect, useRef, useState } from "react";
import { Reorder, useDragControls } from "motion/react";
import AutoSuggestInput from "./components/AutoSuggestInput";
import EnvManager from "./components/EnvManager";
import KeyValueEditor from "./components/KeyValueEditor";
import CodeEditor from "./components/CodeEditor";
import Sidebar from "./components/Sidebar";
import {
  AuthConfig,
  BodyType,
  Collection,
  Environment,
  HistoryEntry,
  Payload,
  RawLanguage,
  RequestTab as RequestTabType,
  ResponseCapture,
  SavedRequest,
  SessionState,
} from "./types/electron";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type RequestPanel = "params" | "headers" | "body" | "auth" | "captures";
type ResponsePanel = "body" | "headers";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "var(--method-get)",
  POST: "var(--method-post)",
  PUT: "var(--method-put)",
  PATCH: "var(--method-patch)",
  DELETE: "var(--method-delete)",
};

function getStatusClass(status: number): string {
  if (status >= 200 && status < 300) return "success";
  if (status >= 300 && status < 400) return "redirect";
  if (status >= 400 && status < 500) return "client-error";
  return "server-error";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function tryPrettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function detectResponseLanguage(response: {
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
function substituteVars(
  text: string,
  variables: { key: string; value: string }[],
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    const found = variables.find((v) => v.key === name);
    return found ? found.value : match;
  });
}

// Parse query params from a URL string (preserving {{var}} templates)
function parseQueryParams(
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
function getBaseUrl(url: string): string {
  const qIdx = url.indexOf("?");
  return qIdx === -1 ? url : url.slice(0, qIdx);
}

// Build query string from params (raw, no encoding — encoding happens at send time)
function buildQueryString(
  params: { enabled: boolean; key: string; value: string }[],
): string {
  const filled = params.filter((p) => p.enabled && p.key.trim());
  if (filled.length === 0) return "";
  return filled.map((p) => `${p.key}=${p.value}`).join("&");
}

function createEmptyTab(): RequestTabType {
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
    isDirty: false,
  };
}

// Resolve a dot-notation path against a JSON object (e.g. "data.token" or "items.0.id")
function resolvePath(obj: unknown, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[part];
  }
  return current == null ? "" : String(current);
}

function getTabDisplayName(tab: RequestTabType): string {
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

interface TabItemProps {
  tab: RequestTabType;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function TabItem({
  tab,
  isActive,
  onActivate,
  onClose,
  onContextMenu,
}: TabItemProps) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      as="div"
      value={tab}
      id={tab.id}
      dragListener={false}
      dragControls={controls}
      className={`request-tab-item ${isActive ? "active" : ""}`}
      onClick={onActivate}
      onContextMenu={onContextMenu}
      onPointerDown={(e) => controls.start(e)}
      whileDrag={{ boxShadow: "0 2px 8px rgba(0,0,0,0.32)", zIndex: 1 }}
      transition={{ duration: 0.15 }}
    >
      <span
        className="request-tab-method"
        style={{
          color:
            METHOD_COLORS[tab.method as HttpMethod] || "var(--text-secondary)",
        }}
      >
        {tab.method}
      </span>
      <span className="request-tab-name">{getTabDisplayName(tab)}</span>
      {tab.isDirty && (
        <span className="request-tab-dirty" title="Unsaved changes">
          ●
        </span>
      )}
      <button
        className="request-tab-close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        ×
      </button>
    </Reorder.Item>
  );
}

const App: React.FC = () => {
  // Tabs
  const [tabs, setTabs] = useState<RequestTabType[]>(() => [createEmptyTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [requestPanel, setRequestPanel] = useState<RequestPanel>("params");
  const [responsePanel, setResponsePanel] = useState<ResponsePanel>("body");
  const [loading, setLoading] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Collections
  const [collections, setCollections] = useState<Collection[]>([]);

  // Environments
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null);
  const [showEnvManager, setShowEnvManager] = useState(false);

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Save-to-collection picker
  const [showSavePicker, setShowSavePicker] = useState(false);

  // Tab context menu
  const [tabContextMenu, setTabContextMenu] = useState<{
    x: number;
    y: number;
    tabId: string;
  } | null>(null);
  const tabContextMenuRef = useRef<HTMLDivElement>(null);

  const activeEnv = environments.find((e) => e.id === activeEnvId) || null;
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Fields that represent request config (not response/UI state)
  const REQUEST_FIELDS = new Set([
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

  // Helper to update the active tab
  const updateTab = useCallback(
    (id: string, updates: Partial<RequestTabType>) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          // Auto-set isDirty when request fields change
          const touchesRequestField = Object.keys(updates).some((k) =>
            REQUEST_FIELDS.has(k),
          );
          const dirty = touchesRequestField ? { isDirty: true } : {};
          return { ...t, ...updates, ...dirty };
        }),
      );
    },
    [],
  );

  // Tab management
  const addTab = useCallback(() => {
    const newTab = createEmptyTab();
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        if (prev.length <= 1) {
          // Can't close last tab — reset it instead
          const fresh = createEmptyTab();
          setActiveTabId(fresh.id);
          return [fresh];
        }
        const idx = prev.findIndex((t) => t.id === id);
        const remaining = prev.filter((t) => t.id !== id);
        if (activeTabId === id) {
          const newIdx = Math.min(idx, remaining.length - 1);
          setActiveTabId(remaining[newIdx].id);
        }
        return remaining;
      });
    },
    [activeTabId],
  );

  const duplicateTab = useCallback((id: string) => {
    setTabs((prev) => {
      const source = prev.find((t) => t.id === id);
      if (!source) return prev;
      const newPayloads = source.payloads.map((p) => ({
        ...p,
        id: generateId(),
      }));
      const activePayloadIdx = source.payloads.findIndex(
        (p) => p.id === source.activePayloadId,
      );
      const dup: RequestTabType = {
        ...source,
        id: generateId(),
        payloads: newPayloads,
        activePayloadId:
          newPayloads[activePayloadIdx >= 0 ? activePayloadIdx : 0].id,
        response: null,
        error: null,
        savedToCollectionId: null,
        savedRequestId: null,
        isDirty: false,
      };
      const idx = prev.findIndex((t) => t.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, dup);
      setActiveTabId(dup.id);
      return next;
    });
  }, []);

  const closeAllTabs = useCallback(() => {
    const fresh = createEmptyTab();
    setTabs([fresh]);
    setActiveTabId(fresh.id);
  }, []);

  // Load collections, environments, history & session on mount
  useEffect(() => {
    Promise.all([
      window.electronAPI.loadCollections(),
      window.electronAPI.loadEnvironments(),
      window.electronAPI.loadHistory(),
      window.electronAPI.loadSession(),
    ]).then(([cols, envs, hist, session]) => {
      setCollections(cols);
      setEnvironments(envs);
      setHistory(hist);

      if (session && session.tabs && session.tabs.length > 0) {
        // Migrate old session tabs that may be missing new fields
        const migratedTabs = session.tabs.map((t: RequestTabType) => ({
          ...t,
          bodyType: t.bodyType || ("none" as BodyType),
          rawLanguage: t.rawLanguage || ("json" as RawLanguage),
          captures: t.captures || [],
          auth: t.auth || { type: "none" as const },
          savedToCollectionId: t.savedToCollectionId ?? null,
          savedRequestId: t.savedRequestId ?? null,
          isDirty: t.isDirty ?? false,
          payloads: (t.payloads || []).map((p) => ({
            ...p,
            bodyType: p.bodyType || ("none" as BodyType),
            rawLanguage: p.rawLanguage || ("json" as RawLanguage),
            formData: p.formData || [
              { enabled: true, key: "", value: "", type: "text" as const },
            ],
            graphql: p.graphql || { query: "", variables: "" },
            binaryFilePath: p.binaryFilePath || "",
          })),
        }));
        setTabs(migratedTabs);
        setActiveTabId(session.activeTabId);
        setActiveEnvId(session.activeEnvId);
      } else {
        if (envs.length > 0) setActiveEnvId(envs[0].id);
      }
      setSessionLoaded(true);
    });
  }, []);

  // Auto-save session when tabs or active selections change
  useEffect(() => {
    if (!sessionLoaded) return;
    const session: SessionState = { tabs, activeTabId, activeEnvId };
    window.electronAPI.saveSession(session);
  }, [tabs, activeTabId, activeEnvId, sessionLoaded]);

  // Close tab context menu when clicking outside
  useEffect(() => {
    if (!tabContextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (
        tabContextMenuRef.current &&
        !tabContextMenuRef.current.contains(e.target as Node)
      ) {
        setTabContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [tabContextMenu]);

  // Persist collections when they change
  const handleCollectionsChange = useCallback((updated: Collection[]) => {
    setCollections(updated);
    window.electronAPI.saveCollections(updated);
  }, []);

  // Rename active request and sync with collection if linked
  const renameActiveRequest = useCallback(
    (newName: string) => {
      updateTab(activeTab.id, { name: newName });
      // Sync with collection
      if (activeTab.savedToCollectionId && activeTab.savedRequestId) {
        setCollections((prev) => {
          const updated = prev.map((c) => {
            if (c.id !== activeTab.savedToCollectionId) return c;
            return {
              ...c,
              requests: c.requests.map((r) =>
                r.id === activeTab.savedRequestId ? { ...r, name: newName } : r,
              ),
            };
          });
          window.electronAPI.saveCollections(updated);
          return updated;
        });
      }
    },
    [
      activeTab.id,
      activeTab.savedToCollectionId,
      activeTab.savedRequestId,
      updateTab,
    ],
  );

  // Persist environments when they change
  const handleEnvironmentsChange = useCallback(
    (updated: Environment[]) => {
      setEnvironments(updated);
      window.electronAPI.saveEnvironments(updated);
      if (activeEnvId && !updated.find((e) => e.id === activeEnvId)) {
        setActiveEnvId(updated.length > 0 ? updated[0].id : null);
      }
    },
    [activeEnvId],
  );

  // Active payload helpers (operate on activeTab)
  const activePayload =
    activeTab.payloads.find((p) => p.id === activeTab.activePayloadId) ||
    activeTab.payloads[0];
  const body = activePayload?.body || "";

  const updatePayloadBody = (value: string) => {
    updateTab(activeTab.id, {
      payloads: activeTab.payloads.map((p) =>
        p.id === activeTab.activePayloadId ? { ...p, body: value } : p,
      ),
    });
  };

  const addPayload = () => {
    const newPayload: Payload = {
      id: generateId(),
      name: `Payload ${activeTab.payloads.length + 1}`,
      body: "",
      bodyType: activeTab.bodyType,
      rawLanguage: activeTab.rawLanguage,
      formData: [{ enabled: true, key: "", value: "", type: "text" }],
      graphql: { query: "", variables: "" },
      binaryFilePath: "",
    };
    updateTab(activeTab.id, {
      payloads: [...activeTab.payloads, newPayload],
      activePayloadId: newPayload.id,
    });
  };

  const removePayload = (id: string) => {
    if (activeTab.payloads.length <= 1) return;
    const updated = activeTab.payloads.filter((p) => p.id !== id);
    updateTab(activeTab.id, {
      payloads: updated,
      activePayloadId:
        activeTab.activePayloadId === id
          ? updated[0].id
          : activeTab.activePayloadId,
    });
  };

  const renamePayload = (id: string, name: string) => {
    updateTab(activeTab.id, {
      payloads: activeTab.payloads.map((p) =>
        p.id === id ? { ...p, name } : p,
      ),
    });
  };

  // Capture helpers
  const addCapture = () => {
    const newCapture: ResponseCapture = {
      id: generateId(),
      enabled: true,
      varName: "",
      source: "body",
      path: "",
    };
    updateTab(activeTab.id, { captures: [...activeTab.captures, newCapture] });
  };

  const updateCapture = (id: string, updates: Partial<ResponseCapture>) => {
    updateTab(activeTab.id, {
      captures: activeTab.captures.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    });
  };

  const removeCapture = (id: string) => {
    updateTab(activeTab.id, {
      captures: activeTab.captures.filter((c) => c.id !== id),
    });
  };

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
        const vars = [...env.variables];
        for (const cap of enabledCaptures) {
          let value = "";
          if (cap.source === "status") {
            value = String(result.status);
          } else if (cap.source === "header") {
            // Case-insensitive header lookup
            const headerKey = Object.keys(result.headers).find(
              (k) => k.toLowerCase() === cap.path.toLowerCase(),
            );
            value = headerKey ? result.headers[headerKey] : "";
          } else {
            // body — parse JSON and resolve path
            try {
              const parsed = JSON.parse(result.body);
              value = resolvePath(parsed, cap.path);
            } catch {
              value = "";
            }
          }
          const existing = vars.findIndex((v) => v.key === cap.varName.trim());
          if (existing >= 0) {
            vars[existing] = { ...vars[existing], value };
          } else {
            vars.push({ key: cap.varName.trim(), value });
          }
        }
        return { ...env, variables: vars };
      });

      setEnvironments(updatedEnvs);
      window.electronAPI.saveEnvironments(updatedEnvs);
    },
    [activeEnvId, environments],
  );

  // Get current request state as a SavedRequest
  const getCurrentRequest = useCallback((): SavedRequest => {
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
    (req: SavedRequest, collectionId?: string, requestId?: string) => {
      // If this request is already open in a tab, just focus it
      if (collectionId && requestId) {
        const existing = tabs.find(
          (t) =>
            t.savedToCollectionId === collectionId &&
            t.savedRequestId === requestId,
        );
        if (existing) {
          // Sync name from saved request if it differs
          if (existing.name !== req.name) {
            setTabs((prev) =>
              prev.map((t) =>
                t.id === existing.id ? { ...t, name: req.name } : t,
              ),
            );
          }
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
      const newTab: RequestTabType = {
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
        isDirty: false,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    },
    [tabs],
  );

  // Load a history entry into a new tab
  const loadHistoryEntry = useCallback(
    (entry: HistoryEntry) => {
      loadRequest(entry.request);
    },
    [loadRequest],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    window.electronAPI.saveHistory([]);
  }, []);

  // Save current tab's request back to its collection (overwrite) or open picker
  const saveRequestToCollection = useCallback(() => {
    const tab = activeTab;

    // If not linked to a collection yet, show the picker
    if (!tab.savedToCollectionId || !tab.savedRequestId) {
      setShowSavePicker(true);
      return;
    }

    const request = getCurrentRequest();
    const updated = collections.map((c) => {
      if (c.id !== tab.savedToCollectionId) return c;
      return {
        ...c,
        requests: c.requests.map((r) =>
          r.id === tab.savedRequestId
            ? {
                ...request,
                id: r.id,
                name: tab.name && tab.name !== "Untitled" ? tab.name : r.name,
              }
            : r,
        ),
      };
    });
    setCollections(updated);
    window.electronAPI.saveCollections(updated);
    // Mark tab as clean
    setTabs((prev) =>
      prev.map((t) => (t.id === tab.id ? { ...t, isDirty: false } : t)),
    );
  }, [activeTab, collections, getCurrentRequest]);

  // Save to a specific collection (for the picker)
  const saveToPickedCollection = useCallback(
    (collectionId: string) => {
      const request = getCurrentRequest();
      const newRequestId = generateId();
      const updated = collections.map((c) => {
        if (c.id !== collectionId) return c;
        return {
          ...c,
          requests: [...c.requests, { ...request, id: newRequestId }],
        };
      });
      setCollections(updated);
      window.electronAPI.saveCollections(updated);
      // Link the tab to this saved request
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTab.id
            ? {
                ...t,
                savedToCollectionId: collectionId,
                savedRequestId: newRequestId,
                isDirty: false,
              }
            : t,
        ),
      );
      setShowSavePicker(false);
    },
    [activeTab, collections, getCurrentRequest],
  );

  // Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveRequestToCollection();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [saveRequestToCollection]);

  const sendRequest = useCallback(async () => {
    if (!activeTab.url.trim()) return;

    setLoading(true);
    updateTab(activeTab.id, { error: null, response: null });

    const vars = activeEnv?.variables || [];

    // Build the final URL: use base URL + encode enabled params with substituted vars
    const baseUrl = substituteVars(getBaseUrl(activeTab.url.trim()), vars);
    const enabledParams = activeTab.params.filter(
      (p) => p.enabled && p.key.trim(),
    );
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

    // Build headers — start with auto-generated defaults (like Postman)
    const headerObj: Record<string, string> = {
      "User-Agent": "ReqResFlow/1.0",
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
    };
    // User-defined headers override defaults
    activeTab.headers
      .filter((h) => h.enabled && h.key.trim())
      .forEach((h) => {
        headerObj[substituteVars(h.key, vars)] = substituteVars(h.value, vars);
      });

    // Apply auth
    const auth = activeTab.auth;
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

    const resolvedBody = (() => {
      if (!["POST", "PUT", "PATCH"].includes(activeTab.method))
        return undefined;
      const bt = activeTab.bodyType;
      if (bt === "none") return undefined;
      if (bt === "raw") return substituteVars(body, vars);
      if (bt === "graphql" && activePayload) {
        const q = substituteVars(activePayload.graphql.query, vars);
        const v = activePayload.graphql.variables.trim()
          ? substituteVars(activePayload.graphql.variables, vars)
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
      if (bt === "x-www-form-urlencoded" && activePayload) {
        const pairs = activePayload.formData.filter(
          (f) => f.enabled && f.key.trim(),
        );
        return pairs
          .map(
            (f) =>
              `${encodeURIComponent(substituteVars(f.key, vars))}=${encodeURIComponent(substituteVars(f.value, vars))}`,
          )
          .join("&");
      }
      if (bt === "form-data" && activePayload) {
        // For form-data we build a multipart boundary manually (text fields only)
        const boundary = `----ReqResFlow${Date.now()}`;
        const pairs = activePayload.formData.filter(
          (f) => f.enabled && f.key.trim(),
        );
        let multipart = "";
        for (const f of pairs) {
          multipart += `--${boundary}\r\nContent-Disposition: form-data; name="${substituteVars(f.key, vars)}"\r\n\r\n${substituteVars(f.value, vars)}\r\n`;
        }
        multipart += `--${boundary}--\r\n`;
        headerObj["Content-Type"] = `multipart/form-data; boundary=${boundary}`;
        return multipart;
      }
      if (bt === "binary" && activePayload?.binaryFilePath) {
        return activePayload.binaryFilePath; // handled in main process
      }
      return undefined;
    })();

    // Set appropriate Content-Type if not already set
    const hasContentType = Object.keys(headerObj).some(
      (k) => k.toLowerCase() === "content-type",
    );
    if (resolvedBody && !hasContentType) {
      const bt = activeTab.bodyType;
      if (bt === "raw") {
        const langMap: Record<string, string> = {
          json: "application/json",
          text: "text/plain",
          xml: "application/xml",
          html: "text/html",
          javascript: "application/javascript",
        };
        headerObj["Content-Type"] =
          langMap[activeTab.rawLanguage] || "text/plain";
      } else if (bt === "x-www-form-urlencoded") {
        headerObj["Content-Type"] = "application/x-www-form-urlencoded";
      } else if (bt === "graphql") {
        headerObj["Content-Type"] = "application/json";
      }
    }

    try {
      const result = await window.electronAPI.sendRequest({
        method: activeTab.method,
        url: fullUrl,
        headers: headerObj,
        body: resolvedBody,
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
      const updatedHistory = [entry, ...history].slice(0, 100); // keep max 100
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
    history,
    getCurrentRequest,
    updateTab,
    applyCaptures,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") sendRequest();
  };

  // Derive tab display name
  const response = activeTab.response;
  const error = activeTab.error;

  return (
    <div className="app">
      {/* Sidebar */}
      <Sidebar
        collections={collections}
        onCollectionsChange={handleCollectionsChange}
        onLoadRequest={loadRequest}
        onSaveRequest={getCurrentRequest}
        history={history}
        onLoadHistory={loadHistoryEntry}
        onClearHistory={clearHistory}
        activeCollectionId={activeTab.savedToCollectionId}
        activeRequestId={activeTab.savedRequestId}
      />

      {/* Main Panel */}
      <div className="main-panel">
        {/* Request Tabs Bar */}
        <div className="request-tabs-bar">
          <div className="request-tabs-scroll">
            <Reorder.Group
              as="div"
              axis="x"
              values={tabs}
              onReorder={setTabs}
              className="request-tabs-list"
            >
              {tabs.map((tab) => (
                <TabItem
                  key={tab.id}
                  tab={tab}
                  isActive={tab.id === activeTabId}
                  onActivate={() => setActiveTabId(tab.id)}
                  onClose={() => closeTab(tab.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setTabContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      tabId: tab.id,
                    });
                  }}
                />
              ))}
            </Reorder.Group>
          </div>
          <button className="request-tab-add" onClick={addTab} title="New Tab">
            +
          </button>
        </div>

        {/* Tab Context Menu */}
        {tabContextMenu && (
          <div
            ref={tabContextMenuRef}
            className="tab-context-menu"
            style={{ top: tabContextMenu.y, left: tabContextMenu.x }}
          >
            <button
              onClick={() => {
                duplicateTab(tabContextMenu.tabId);
                setTabContextMenu(null);
              }}
            >
              Duplicate Request
            </button>
            <button
              onClick={() => {
                closeTab(tabContextMenu.tabId);
                setTabContextMenu(null);
              }}
            >
              Close Tab
            </button>
            <button
              onClick={() => {
                closeAllTabs();
                setTabContextMenu(null);
              }}
            >
              Close All Tabs
            </button>
          </div>
        )}

        {/* Environment Bar */}
        <div className="env-bar">
          <input
            className="request-name-input"
            type="text"
            value={activeTab.name === "Untitled" ? "" : activeTab.name}
            placeholder="Request name..."
            onChange={(e) => renameActiveRequest(e.target.value || "Untitled")}
          />
          <div className="env-bar-separator" />
          <select
            className="env-select"
            value={activeEnvId || ""}
            onChange={(e) => setActiveEnvId(e.target.value || null)}
          >
            <option value="">No Environment</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
          <button
            className="env-manage-btn"
            onClick={() => setShowEnvManager(true)}
          >
            Manage
          </button>
        </div>

        {/* URL Bar */}
        <div className="url-bar">
          <select
            className="method-select"
            value={activeTab.method}
            onChange={(e) =>
              updateTab(activeTab.id, { method: e.target.value })
            }
            style={{ color: METHOD_COLORS[activeTab.method as HttpMethod] }}
          >
            {(["GET", "POST", "PUT", "PATCH", "DELETE"] as HttpMethod[]).map(
              (m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ),
            )}
          </select>
          <AutoSuggestInput
            className="url-input"
            type="text"
            placeholder="Enter request URL..."
            value={activeTab.url}
            onValueChange={(v) => {
              const parsed = parseQueryParams(v);
              const params =
                parsed.length > 0
                  ? [...parsed, { enabled: true, key: "", value: "" }]
                  : [{ enabled: true, key: "", value: "" }];
              updateTab(activeTab.id, { url: v, params });
            }}
            variables={activeEnv?.variables ?? []}
            envName={activeEnv?.name}
            onKeyDown={handleKeyDown}
          />
          <button
            className="send-btn"
            onClick={sendRequest}
            disabled={loading || !activeTab.url.trim()}
          >
            {loading ? "Sending..." : "Send"}
          </button>
          <button
            className={`save-btn${activeTab.isDirty ? " dirty" : ""}`}
            onClick={saveRequestToCollection}
            disabled={activeTab.savedRequestId ? !activeTab.isDirty : false}
            title={
              !activeTab.savedRequestId
                ? "Save to collection (Ctrl+S)"
                : activeTab.isDirty
                  ? "Save changes to collection (Ctrl+S)"
                  : "No unsaved changes"
            }
          >
            {activeTab.savedRequestId ? "Save" : "Save"}
          </button>
        </div>

        <div className="request-response">
          {/* Request Section */}
          <div className="request-section">
            <div className="tabs">
              {(
                [
                  "params",
                  "headers",
                  "body",
                  "auth",
                  "captures",
                ] as RequestPanel[]
              ).map((tab) => (
                <button
                  key={tab}
                  className={`tab ${requestPanel === tab ? "active" : ""}`}
                  onClick={() => setRequestPanel(tab)}
                >
                  {tab}
                  {tab === "auth" && activeTab.auth.type !== "none" && (
                    <span className="tab-badge">●</span>
                  )}
                  {tab === "captures" && activeTab.captures.length > 0 && (
                    <span className="tab-badge">
                      {activeTab.captures.filter((c) => c.enabled).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {requestPanel === "params" && (
              <KeyValueEditor
                pairs={activeTab.params}
                onChange={(p) => {
                  const base = getBaseUrl(activeTab.url);
                  const qs = buildQueryString(p);
                  const url = qs ? `${base}?${qs}` : base;
                  updateTab(activeTab.id, { params: p, url });
                }}
                variables={activeEnv?.variables ?? []}
                envName={activeEnv?.name}
              />
            )}
            {requestPanel === "headers" && (
              <>
                <KeyValueEditor
                  pairs={activeTab.headers}
                  onChange={(h) => updateTab(activeTab.id, { headers: h })}
                  variables={activeEnv?.variables ?? []}
                  envName={activeEnv?.name}
                  headerMode
                />
                <div className="autogenerated-headers">
                  <div className="autogenerated-headers-title">
                    Auto-generated headers
                    <span className="autogenerated-headers-hint">
                      (override by adding a header with the same key)
                    </span>
                  </div>
                  <div className="autogenerated-header-row">
                    <span className="header-key">User-Agent</span>
                    <span className="header-value">ReqResFlow/1.0</span>
                  </div>
                  <div className="autogenerated-header-row">
                    <span className="header-key">Accept</span>
                    <span className="header-value">*/*</span>
                  </div>
                  <div className="autogenerated-header-row">
                    <span className="header-key">Accept-Encoding</span>
                    <span className="header-value">gzip, deflate, br</span>
                  </div>
                  <div className="autogenerated-header-row">
                    <span className="header-key">Connection</span>
                    <span className="header-value">keep-alive</span>
                  </div>
                </div>
              </>
            )}
            {requestPanel === "body" && (
              <div className="body-editor">
                <div className="body-type-bar">
                  {(
                    [
                      "none",
                      "form-data",
                      "x-www-form-urlencoded",
                      "raw",
                      "binary",
                      "graphql",
                    ] as BodyType[]
                  ).map((bt) => (
                    <label key={bt} className="body-type-option">
                      <input
                        type="radio"
                        name="bodyType"
                        checked={activeTab.bodyType === bt}
                        onChange={() => {
                          updateTab(activeTab.id, { bodyType: bt });
                          if (activePayload) {
                            updateTab(activeTab.id, {
                              bodyType: bt,
                              payloads: activeTab.payloads.map((p) =>
                                p.id === activeTab.activePayloadId
                                  ? { ...p, bodyType: bt }
                                  : p,
                              ),
                            });
                          }
                        }}
                      />
                      <span>{bt}</span>
                    </label>
                  ))}
                  {activeTab.bodyType === "raw" && (
                    <select
                      className="raw-language-select"
                      value={activeTab.rawLanguage}
                      onChange={(e) => {
                        const lang = e.target.value as RawLanguage;
                        updateTab(activeTab.id, {
                          rawLanguage: lang,
                          payloads: activeTab.payloads.map((p) =>
                            p.id === activeTab.activePayloadId
                              ? { ...p, rawLanguage: lang }
                              : p,
                          ),
                        });
                      }}
                    >
                      <option value="json">JSON</option>
                      <option value="text">Text</option>
                      <option value="xml">XML</option>
                      <option value="html">HTML</option>
                      <option value="javascript">JavaScript</option>
                    </select>
                  )}
                </div>
                <div className="payload-bar">
                  <div className="payload-tabs">
                    {activeTab.payloads.map((p) => (
                      <div
                        key={p.id}
                        className={`payload-tab ${p.id === activeTab.activePayloadId ? "active" : ""}`}
                        onClick={() =>
                          updateTab(activeTab.id, { activePayloadId: p.id })
                        }
                      >
                        <span className="payload-tab-name">{p.name}</span>
                        {activeTab.payloads.length > 1 && (
                          <button
                            className="payload-tab-close"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePayload(p.id);
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      className="payload-add-btn"
                      onClick={addPayload}
                      title="Add payload variant"
                    >
                      +
                    </button>
                  </div>
                  {activePayload && (
                    <input
                      className="payload-rename-input"
                      value={activePayload.name}
                      onChange={(e) =>
                        renamePayload(activePayload.id, e.target.value)
                      }
                      title="Rename payload"
                    />
                  )}
                </div>
                {activeTab.bodyType === "none" && (
                  <div className="body-none-info">
                    This request does not have a body.
                  </div>
                )}
                {activeTab.bodyType === "raw" && (
                  <CodeEditor
                    value={body}
                    onChange={updatePayloadBody}
                    language={activeTab.rawLanguage}
                    placeholder={
                      activeTab.rawLanguage === "json"
                        ? '{"key": "value"}'
                        : "Enter request body..."
                    }
                    showFormatButton
                  />
                )}
                {(activeTab.bodyType === "form-data" ||
                  activeTab.bodyType === "x-www-form-urlencoded") &&
                  activePayload && (
                    <div className="form-data-editor">
                      {activePayload.formData.map((field, i) => (
                        <div className="form-data-row" key={i}>
                          <input
                            type="checkbox"
                            checked={field.enabled}
                            onChange={(e) => {
                              const updated = [...activePayload.formData];
                              updated[i] = {
                                ...updated[i],
                                enabled: e.target.checked,
                              };
                              updateTab(activeTab.id, {
                                payloads: activeTab.payloads.map((p) =>
                                  p.id === activeTab.activePayloadId
                                    ? { ...p, formData: updated }
                                    : p,
                                ),
                              });
                            }}
                          />
                          <AutoSuggestInput
                            type="text"
                            placeholder="Key"
                            value={field.key}
                            onValueChange={(v) => {
                              const updated = [...activePayload.formData];
                              updated[i] = { ...updated[i], key: v };
                              updateTab(activeTab.id, {
                                payloads: activeTab.payloads.map((p) =>
                                  p.id === activeTab.activePayloadId
                                    ? { ...p, formData: updated }
                                    : p,
                                ),
                              });
                            }}
                            variables={activeEnv?.variables ?? []}
                            envName={activeEnv?.name}
                          />
                          <AutoSuggestInput
                            type="text"
                            placeholder="Value"
                            value={field.value}
                            onValueChange={(v) => {
                              const updated = [...activePayload.formData];
                              updated[i] = { ...updated[i], value: v };
                              updateTab(activeTab.id, {
                                payloads: activeTab.payloads.map((p) =>
                                  p.id === activeTab.activePayloadId
                                    ? { ...p, formData: updated }
                                    : p,
                                ),
                              });
                            }}
                            variables={activeEnv?.variables ?? []}
                            envName={activeEnv?.name}
                          />
                          {activeTab.bodyType === "form-data" && (
                            <select
                              className="form-data-type-select"
                              value={field.type}
                              onChange={(e) => {
                                const updated = [...activePayload.formData];
                                updated[i] = {
                                  ...updated[i],
                                  type: e.target.value as "text" | "file",
                                };
                                updateTab(activeTab.id, {
                                  payloads: activeTab.payloads.map((p) =>
                                    p.id === activeTab.activePayloadId
                                      ? { ...p, formData: updated }
                                      : p,
                                  ),
                                });
                              }}
                            >
                              <option value="text">Text</option>
                              <option value="file">File</option>
                            </select>
                          )}
                          <button
                            className="kv-remove-btn"
                            onClick={() => {
                              const updated = activePayload.formData.filter(
                                (_, j) => j !== i,
                              );
                              updateTab(activeTab.id, {
                                payloads: activeTab.payloads.map((p) =>
                                  p.id === activeTab.activePayloadId
                                    ? { ...p, formData: updated }
                                    : p,
                                ),
                              });
                            }}
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        className="kv-add-btn"
                        onClick={() => {
                          const updated = [
                            ...activePayload.formData,
                            {
                              enabled: true,
                              key: "",
                              value: "",
                              type: "text" as const,
                            },
                          ];
                          updateTab(activeTab.id, {
                            payloads: activeTab.payloads.map((p) =>
                              p.id === activeTab.activePayloadId
                                ? { ...p, formData: updated }
                                : p,
                            ),
                          });
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  )}
                {activeTab.bodyType === "binary" && activePayload && (
                  <div className="binary-editor">
                    <div className="binary-info">
                      Select a file to send as the request body.
                    </div>
                    <input
                      type="text"
                      className="binary-path-input"
                      placeholder="File path (e.g. C:\files\image.png)"
                      value={activePayload.binaryFilePath}
                      onChange={(e) =>
                        updateTab(activeTab.id, {
                          payloads: activeTab.payloads.map((p) =>
                            p.id === activeTab.activePayloadId
                              ? { ...p, binaryFilePath: e.target.value }
                              : p,
                          ),
                        })
                      }
                    />
                  </div>
                )}
                {activeTab.bodyType === "graphql" && activePayload && (
                  <div className="graphql-editor">
                    <div className="graphql-section">
                      <label className="graphql-label">Query</label>
                      <CodeEditor
                        value={activePayload.graphql.query}
                        onChange={(val) =>
                          updateTab(activeTab.id, {
                            payloads: activeTab.payloads.map((p) =>
                              p.id === activeTab.activePayloadId
                                ? {
                                    ...p,
                                    graphql: {
                                      ...p.graphql,
                                      query: val,
                                    },
                                  }
                                : p,
                            ),
                          })
                        }
                        language="javascript"
                        placeholder={
                          "query {\n  users {\n    id\n    name\n  }\n}"
                        }
                        className="graphql-query"
                      />
                    </div>
                    <div className="graphql-section">
                      <label className="graphql-label">Variables (JSON)</label>
                      <CodeEditor
                        value={activePayload.graphql.variables}
                        onChange={(val) =>
                          updateTab(activeTab.id, {
                            payloads: activeTab.payloads.map((p) =>
                              p.id === activeTab.activePayloadId
                                ? {
                                    ...p,
                                    graphql: {
                                      ...p.graphql,
                                      variables: val,
                                    },
                                  }
                                : p,
                            ),
                          })
                        }
                        language="json"
                        placeholder='{"id": 1}'
                        className="graphql-variables"
                        showFormatButton
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            {requestPanel === "auth" && (
              <div className="auth-editor">
                <div className="auth-type-row">
                  <label className="auth-label">Type</label>
                  <select
                    className="auth-type-select"
                    value={activeTab.auth.type}
                    onChange={(e) => {
                      const type = e.target.value as AuthConfig["type"];
                      if (type === "none") {
                        updateTab(activeTab.id, { auth: { type: "none" } });
                      } else if (type === "bearer") {
                        updateTab(activeTab.id, {
                          auth: { type: "bearer", token: "" },
                        });
                      } else if (type === "basic") {
                        updateTab(activeTab.id, {
                          auth: { type: "basic", username: "", password: "" },
                        });
                      }
                    }}
                  >
                    <option value="none">No Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                  </select>
                </div>
                {activeTab.auth.type === "bearer" && (
                  <div className="auth-fields">
                    <div className="auth-field">
                      <label className="auth-label">Token</label>
                      <AutoSuggestInput
                        className="auth-input"
                        type="text"
                        placeholder="{{token}} or paste token"
                        value={activeTab.auth.token}
                        onValueChange={(v) =>
                          updateTab(activeTab.id, {
                            auth: { type: "bearer", token: v },
                          })
                        }
                        variables={activeEnv?.variables ?? []}
                        envName={activeEnv?.name}
                      />
                    </div>
                    <div className="auth-info">
                      Will send as: Authorization: Bearer &lt;token&gt;
                    </div>
                  </div>
                )}
                {activeTab.auth.type === "basic" && (
                  <div className="auth-fields">
                    <div className="auth-field">
                      <label className="auth-label">Username</label>
                      <AutoSuggestInput
                        className="auth-input"
                        type="text"
                        placeholder="{{username}} or enter username"
                        value={activeTab.auth.username}
                        onValueChange={(v) =>
                          updateTab(activeTab.id, {
                            auth: {
                              type: "basic",
                              username: v,
                              password:
                                activeTab.auth.type === "basic"
                                  ? activeTab.auth.password
                                  : "",
                            },
                          })
                        }
                        variables={activeEnv?.variables ?? []}
                        envName={activeEnv?.name}
                      />
                    </div>
                    <div className="auth-field">
                      <label className="auth-label">Password</label>
                      <AutoSuggestInput
                        className="auth-input"
                        type="text"
                        placeholder="{{password}} or enter password"
                        value={activeTab.auth.password}
                        onValueChange={(v) =>
                          updateTab(activeTab.id, {
                            auth: {
                              type: "basic",
                              username:
                                activeTab.auth.type === "basic"
                                  ? activeTab.auth.username
                                  : "",
                              password: v,
                            },
                          })
                        }
                        variables={activeEnv?.variables ?? []}
                        envName={activeEnv?.name}
                      />
                    </div>
                    <div className="auth-info">
                      Will send as: Authorization: Basic
                      base64(username:password)
                    </div>
                  </div>
                )}
                {activeTab.auth.type === "none" && (
                  <div className="auth-info" style={{ marginTop: 12 }}>
                    No authentication will be applied to this request.
                  </div>
                )}
              </div>
            )}
            {requestPanel === "captures" && (
              <div className="captures-editor">
                <div className="captures-info">
                  Extract values from responses and save them as environment
                  variables.
                  {!activeEnvId && (
                    <span className="captures-warning">
                      {" "}
                      Select an environment first.
                    </span>
                  )}
                </div>
                {activeTab.captures.length === 0 && (
                  <div className="captures-empty">
                    No captures yet. Add one to extract response values into env
                    variables.
                  </div>
                )}
                {activeTab.captures.map((cap) => (
                  <div className="capture-row" key={cap.id}>
                    <input
                      type="checkbox"
                      checked={cap.enabled}
                      onChange={(e) =>
                        updateCapture(cap.id, { enabled: e.target.checked })
                      }
                    />
                    <input
                      className="capture-var-input"
                      type="text"
                      placeholder="Variable name"
                      value={cap.varName}
                      onChange={(e) =>
                        updateCapture(cap.id, { varName: e.target.value })
                      }
                    />
                    <span className="capture-eq">=</span>
                    <select
                      className="capture-source-select"
                      value={cap.source}
                      onChange={(e) =>
                        updateCapture(cap.id, {
                          source: e.target.value as ResponseCapture["source"],
                        })
                      }
                    >
                      <option value="body">Body (JSON path)</option>
                      <option value="header">Header</option>
                      <option value="status">Status code</option>
                    </select>
                    {cap.source !== "status" && (
                      <input
                        className="capture-path-input"
                        type="text"
                        placeholder={
                          cap.source === "body" ? "data.token" : "x-request-id"
                        }
                        value={cap.path}
                        onChange={(e) =>
                          updateCapture(cap.id, { path: e.target.value })
                        }
                      />
                    )}
                    <button
                      className="capture-remove-btn"
                      onClick={() => removeCapture(cap.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button className="capture-add-btn" onClick={addCapture}>
                  + Add Capture
                </button>
              </div>
            )}
          </div>

          {/* Response Section */}
          <div className="response-section">
            <div className="tabs">
              {(["body", "headers"] as ResponsePanel[]).map((tab) => (
                <button
                  key={tab}
                  className={`tab ${responsePanel === tab ? "active" : ""}`}
                  onClick={() => setResponsePanel(tab)}
                >
                  {tab === "body" ? "Response Body" : "Response Headers"}
                </button>
              ))}
            </div>

            {error && <div className="response-error">{error}</div>}

            {!response && !error && (
              <div className="response-empty">
                Send a request to see the response
              </div>
            )}

            {response && (
              <>
                <div className="response-meta">
                  <span
                    className={`response-status ${getStatusClass(response.status)}`}
                  >
                    {response.status} {response.statusText}
                  </span>
                  <span className="response-time">{response.time} ms</span>
                  <span className="response-size">
                    {formatSize(response.size)}
                  </span>
                </div>

                {responsePanel === "body" && (
                  <div className="response-body">
                    <CodeEditor
                      value={tryPrettyJson(response.body)}
                      // eslint-disable-next-line @typescript-eslint/no-empty-function
                      onChange={() => {}}
                      language={detectResponseLanguage(response)}
                      readOnly
                    />
                  </div>
                )}

                {responsePanel === "headers" && (
                  <div className="response-headers-list">
                    {Object.entries(response.headers).map(([key, value]) => (
                      <div className="response-header-row" key={key}>
                        <span className="response-header-key">{key}</span>
                        <span className="response-header-value">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Environment Manager Modal */}
      {showEnvManager && (
        <EnvManager
          environments={environments}
          onEnvironmentsChange={handleEnvironmentsChange}
          onClose={() => setShowEnvManager(false)}
        />
      )}

      {/* Save to Collection Picker Modal */}
      {showSavePicker && (
        <div className="modal-overlay" onClick={() => setShowSavePicker(false)}>
          <div
            className="save-picker-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="save-picker-header">
              <span className="save-picker-title">Save to Collection</span>
              <button
                className="save-picker-close"
                onClick={() => setShowSavePicker(false)}
              >
                ×
              </button>
            </div>
            <div className="save-picker-body">
              {collections.length === 0 ? (
                <div className="save-picker-empty">
                  No collections yet. Create one from the sidebar first.
                </div>
              ) : (
                <div className="save-picker-list">
                  {collections.map((c) => (
                    <button
                      key={c.id}
                      className="save-picker-item"
                      onClick={() => saveToPickedCollection(c.id)}
                    >
                      <span className="save-picker-collection-name">
                        {c.name}
                      </span>
                      <span className="save-picker-collection-count">
                        {c.requests.length} request
                        {c.requests.length !== 1 ? "s" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
