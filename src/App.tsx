import React, { useCallback, useEffect, useState } from "react";
import AutoSuggestInput from "./components/AutoSuggestInput";
import EnvManager from "./components/EnvManager";
import KeyValueEditor from "./components/KeyValueEditor";
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

  const activeEnv = environments.find((e) => e.id === activeEnvId) || null;
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Helper to update the active tab
  const updateTab = useCallback(
    (id: string, updates: Partial<RequestTabType>) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
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
          bodyType: t.bodyType || "none" as BodyType,
          rawLanguage: t.rawLanguage || "json" as RawLanguage,
          captures: t.captures || [],
          auth: t.auth || { type: "none" as const },
          payloads: (t.payloads || []).map((p) => ({
            ...p,
            bodyType: p.bodyType || "none" as BodyType,
            rawLanguage: p.rawLanguage || "json" as RawLanguage,
            formData: p.formData || [{ enabled: true, key: "", value: "", type: "text" as const }],
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

  // Persist collections when they change
  const handleCollectionsChange = useCallback((updated: Collection[]) => {
    setCollections(updated);
    window.electronAPI.saveCollections(updated);
  }, []);

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
      name: activeTab.url.trim()
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
  const loadRequest = useCallback((req: SavedRequest) => {
    const defaultPayload: Payload = {
      id: generateId(),
      name: "Default",
      body: req.body,
      bodyType: req.bodyType || "none",
      rawLanguage: req.rawLanguage || "json",
      formData: req.formData || [{ enabled: true, key: "", value: "", type: "text" }],
      graphql: req.graphql || { query: "", variables: "" },
      binaryFilePath: req.binaryFilePath || "",
    };
    const payloads =
      req.payloads && req.payloads.length > 0
        ? req.payloads.map((p) => ({
            ...p,
            bodyType: p.bodyType || req.bodyType || "none" as BodyType,
            rawLanguage: p.rawLanguage || req.rawLanguage || "json" as RawLanguage,
            formData: p.formData || [{ enabled: true, key: "", value: "", type: "text" as const }],
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
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

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

  const sendRequest = useCallback(async () => {
    if (!activeTab.url.trim()) return;

    setLoading(true);
    updateTab(activeTab.id, { error: null, response: null });

    const vars = activeEnv?.variables || [];

    // Build query string from enabled params
    let fullUrl = substituteVars(activeTab.url.trim(), vars);
    const enabledParams = activeTab.params.filter(
      (p) => p.enabled && p.key.trim(),
    );
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
    const headerObj: Record<string, string> = {};
    activeTab.headers
      .filter((h) => h.enabled && h.key.trim())
      .forEach((h) => {
        headerObj[substituteVars(h.key, vars)] = substituteVars(h.value, vars);
      });

    // Apply auth
    const auth = activeTab.auth;
    if (auth.type === "bearer" && auth.token.trim()) {
      headerObj["Authorization"] = `Bearer ${substituteVars(auth.token.trim(), vars)}`;
    } else if (auth.type === "basic" && (auth.username.trim() || auth.password.trim())) {
      const user = substituteVars(auth.username, vars);
      const pass = substituteVars(auth.password, vars);
      headerObj["Authorization"] = `Basic ${btoa(`${user}:${pass}`)}`;
    }

    const resolvedBody = (() => {
      if (!["POST", "PUT", "PATCH"].includes(activeTab.method)) return undefined;
      const bt = activeTab.bodyType;
      if (bt === "none") return undefined;
      if (bt === "raw") return substituteVars(body, vars);
      if (bt === "graphql" && activePayload) {
        const q = substituteVars(activePayload.graphql.query, vars);
        const v = activePayload.graphql.variables.trim()
          ? substituteVars(activePayload.graphql.variables, vars)
          : undefined;
        try {
          return JSON.stringify({ query: q, variables: v ? JSON.parse(v) : undefined });
        } catch {
          return JSON.stringify({ query: q, variables: v });
        }
      }
      if (bt === "x-www-form-urlencoded" && activePayload) {
        const pairs = activePayload.formData.filter((f) => f.enabled && f.key.trim());
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
        const pairs = activePayload.formData.filter((f) => f.enabled && f.key.trim());
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
        headerObj["Content-Type"] = langMap[activeTab.rawLanguage] || "text/plain";
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
  const getTabName = (tab: RequestTabType) => {
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
  };

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
      />

      {/* Main Panel */}
      <div className="main-panel">
        {/* Request Tabs Bar */}
        <div className="request-tabs-bar">
          <div className="request-tabs-list">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`request-tab-item ${tab.id === activeTabId ? "active" : ""}`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <span
                  className="request-tab-method"
                  style={{
                    color:
                      METHOD_COLORS[tab.method as HttpMethod] ||
                      "var(--text-secondary)",
                  }}
                >
                  {tab.method}
                </span>
                <span className="request-tab-name">{getTabName(tab)}</span>
                <button
                  className="request-tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button className="request-tab-add" onClick={addTab} title="New Tab">
            +
          </button>
        </div>

        {/* Environment Bar */}
        <div className="env-bar">
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
            onValueChange={(v) => updateTab(activeTab.id, { url: v })}
            variables={activeEnv?.variables ?? []}
            onKeyDown={handleKeyDown}
          />
          <button
            className="send-btn"
            onClick={sendRequest}
            disabled={loading || !activeTab.url.trim()}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>

        <div className="request-response">
          {/* Request Section */}
          <div className="request-section">
            <div className="tabs">
              {(
                ["params", "headers", "body", "auth", "captures"] as RequestPanel[]
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
                onChange={(p) => updateTab(activeTab.id, { params: p })}
                variables={activeEnv?.variables ?? []}
              />
            )}
            {requestPanel === "headers" && (
              <KeyValueEditor
                pairs={activeTab.headers}
                onChange={(h) => updateTab(activeTab.id, { headers: h })}
                variables={activeEnv?.variables ?? []}
              />
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
                  <textarea
                    className="body-textarea"
                    placeholder={
                      activeTab.rawLanguage === "json"
                        ? '{"key": "value"}'
                        : "Enter request body..."
                    }
                    value={body}
                    onChange={(e) => updatePayloadBody(e.target.value)}
                    spellCheck={false}
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
                      <textarea
                        className="body-textarea graphql-query"
                        placeholder={`query {\n  users {\n    id\n    name\n  }\n}`}
                        value={activePayload.graphql.query}
                        onChange={(e) =>
                          updateTab(activeTab.id, {
                            payloads: activeTab.payloads.map((p) =>
                              p.id === activeTab.activePayloadId
                                ? {
                                    ...p,
                                    graphql: {
                                      ...p.graphql,
                                      query: e.target.value,
                                    },
                                  }
                                : p,
                            ),
                          })
                        }
                        spellCheck={false}
                      />
                    </div>
                    <div className="graphql-section">
                      <label className="graphql-label">
                        Variables (JSON)
                      </label>
                      <textarea
                        className="body-textarea graphql-variables"
                        placeholder='{"id": 1}'
                        value={activePayload.graphql.variables}
                        onChange={(e) =>
                          updateTab(activeTab.id, {
                            payloads: activeTab.payloads.map((p) =>
                              p.id === activeTab.activePayloadId
                                ? {
                                    ...p,
                                    graphql: {
                                      ...p.graphql,
                                      variables: e.target.value,
                                    },
                                  }
                                : p,
                            ),
                          })
                        }
                        spellCheck={false}
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
                              password: activeTab.auth.type === "basic" ? activeTab.auth.password : "",
                            },
                          })
                        }
                        variables={activeEnv?.variables ?? []}
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
                              username: activeTab.auth.type === "basic" ? activeTab.auth.username : "",
                              password: v,
                            },
                          })
                        }
                        variables={activeEnv?.variables ?? []}
                      />
                    </div>
                    <div className="auth-info">
                      Will send as: Authorization: Basic base64(username:password)
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
                    <pre>{tryPrettyJson(response.body)}</pre>
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
    </div>
  );
};

export default App;
