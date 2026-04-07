import React, { useCallback, useEffect, useRef, useState } from "react";
import { Reorder } from "motion/react";
import AuthEditor from "./components/AuthEditor";
import BodyEditor from "./components/BodyEditor";
import CapturesEditor from "./components/CapturesEditor";
import EnvManager from "./components/EnvManager";
import EnvironmentBar from "./components/EnvironmentBar";
import KeyValueEditor from "./components/KeyValueEditor";
import ResponsePanelComponent from "./components/ResponsePanel";
import SavePickerModal from "./components/SavePickerModal";
import Sidebar, { SidebarSection } from "./components/Sidebar";
import FlowEditor from "./components/FlowEditor";
import FlowRunner from "./components/FlowRunner";
import TabContextMenu from "./components/TabContextMenu";
import { TabItem, FlowTabItem } from "./components/TabItems";
import UrlBar from "./components/UrlBar";
import { useContextMenu } from "./hooks/useContextMenu";
import { useFlowExecution } from "./hooks/useFlowExecution";
import { useFlowTabs } from "./hooks/useFlowTabs";
import { usePayloads } from "./hooks/usePayloads";
import { useSidebarResize } from "./hooks/useSidebarResize";
import { useTabs } from "./hooks/useTabs";
import {
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
import { generateId } from "./utils/helpers";
import {
  parseQueryParams,
  getBaseUrl,
  buildQueryString,
  buildRequestConfig,
  resolvePath,
} from "./utils/request";

type RequestPanel = "params" | "headers" | "body" | "auth" | "captures";
type ResponsePanel = "body" | "headers";

interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

const App: React.FC = () => {
  // Tabs
  const {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    activeTab,
    updateTab,
    addTab,
    closeTab,
    duplicateTab,
    closeAllTabs,
  } = useTabs();
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

  // Sidebar resize
  const { sidebarWidth, handleResizeMouseDown } = useSidebarResize();

  // Sidebar section
  const [sidebarSection, setSidebarSection] =
    useState<SidebarSection>("collections");

  // Flows & flow tabs
  const {
    flows,
    setFlows,
    flowTabs,
    setFlowTabs,
    activeFlowTabId,
    setActiveFlowTabId,
    handleFlowsChange,
    openFlowTab,
    closeFlowTab,
    duplicateFlowTab,
    closeAllFlowTabs,
    handleCreateFlow,
    handleSaveFlow,
    handleEditFlow,
    handleFlowChange,
    handleRenameFlow,
  } = useFlowTabs({ onSidebarSectionChange: setSidebarSection });

  // Flow execution
  const activeEnv = environments.find((e) => e.id === activeEnvId) || null;
  const {
    flowRunState,
    setFlowRunState,
    flowRunHistory,
    flowAbortRef,
    runFlow,
  } = useFlowExecution({
    collections,
    activeEnv,
    activeEnvId,
    environments,
    setEnvironments,
    setHistory,
    openFlowTab,
  });

  // Pending send after loading a variant
  const pendingSendRef = useRef<string | null>(null);

  // Save-to-collection picker
  const [showSavePicker, setShowSavePicker] = useState(false);

  // Tab context menu
  const {
    menu: tabContextMenu,
    setMenu: setTabContextMenu,
    menuRef: tabContextMenuRef,
  } = useContextMenu<string>();

  // Flow tab context menu
  const {
    menu: flowTabContextMenu,
    setMenu: setFlowTabContextMenu,
    menuRef: flowTabContextMenuRef,
  } = useContextMenu<string>();

  // Handle sidebar section switching
  const handleSectionChange = useCallback((section: SidebarSection) => {
    setSidebarSection(section);
  }, []);

  // Load collections, environments, history & session on mount
  useEffect(() => {
    Promise.all([
      window.electronAPI.loadCollections(),
      window.electronAPI.loadEnvironments(),
      window.electronAPI.loadHistory(),
      window.electronAPI.loadSession(),
      window.electronAPI.loadFlows(),
    ]).then(([cols, envs, hist, session, loadedFlows]) => {
      setCollections(cols);
      setEnvironments(envs);
      setHistory(hist);
      setFlows(loadedFlows);

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
          sourceHistoryId: (t as RequestTabType).sourceHistoryId ?? null,
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

  // Persist collections when they change
  const handleCollectionsChange = useCallback((updated: Collection[]) => {
    setCollections(updated);
    window.electronAPI.saveCollections(updated);
  }, []);

  // Rename active request and sync with collection if linked
  const renameActiveRequest = useCallback(
    (newName: string) => {
      if (!activeTab) return;
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
      activeTab?.id,
      activeTab?.savedToCollectionId,
      activeTab?.savedRequestId,
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

  // Payload & capture helpers
  const {
    activePayload,
    body,
    updatePayloadBody,
    addPayload,
    removePayload,
    renamePayload,
    addCapture,
    updateCapture,
    removeCapture,
  } = usePayloads(activeTab, updateTab, setCollections);

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
          // Sync name from saved request if it differs
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

  // Sync payload rename from sidebar to open tab
  const handleRenamePayload = useCallback(
    (
      collectionId: string,
      requestId: string,
      payloadId: string,
      name: string,
    ) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (
            t.savedToCollectionId !== collectionId ||
            t.savedRequestId !== requestId
          )
            return t;
          return {
            ...t,
            payloads: t.payloads.map((p) =>
              p.id === payloadId ? { ...p, name } : p,
            ),
          };
        }),
      );
    },
    [],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    window.electronAPI.saveHistory([]);
  }, []);

  // Save current tab's request back to its collection (overwrite) or open picker
  const saveRequestToCollection = useCallback(() => {
    const tab = activeTab;
    if (!tab) return;

    // If not linked to a collection yet, show the picker
    if (!tab.savedToCollectionId || !tab.savedRequestId) {
      setShowSavePicker(true);
      return;
    }

    // Verify the linked collection and request still exist
    const linkedCollection = collections.find(
      (c) => c.id === tab.savedToCollectionId,
    );
    const linkedRequest = linkedCollection?.requests.find(
      (r) => r.id === tab.savedRequestId,
    );
    if (!linkedCollection || !linkedRequest) {
      // Clear stale references and show the picker
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tab.id
            ? {
                ...t,
                savedToCollectionId: null,
                savedRequestId: null,
              }
            : t,
        ),
      );
      setShowSavePicker(true);
      return;
    }

    const request = getCurrentRequest();
    if (!request) return;
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
      if (!activeTab) return;
      const request = getCurrentRequest();
      if (!request) return;
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
    if (!activeTab) return;
    if (!activeTab.url.trim()) return;

    setLoading(true);
    updateTab(activeTab.id, { error: null, response: null });

    const vars = activeEnv?.variables || [];

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
      vars,
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
    activePayload,
    history,
    getCurrentRequest,
    updateTab,
    applyCaptures,
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
      // If already the active tab with the same payload, just send directly
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") sendRequest();
  };

  // Derive tab display name
  const response = activeTab?.response ?? null;
  const error = activeTab?.error ?? null;

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
        activeCollectionId={activeTab?.savedToCollectionId ?? null}
        activeRequestId={activeTab?.savedRequestId ?? null}
        flows={flows}
        onFlowsChange={handleFlowsChange}
        onEditFlow={handleEditFlow}
        onRunFlow={runFlow}
        onCreateFlow={handleCreateFlow}
        onRenameFlow={handleRenameFlow}
        onRunVariant={runVariant}
        onRenamePayload={handleRenamePayload}
        onRequestPanelChange={(p: string) => setRequestPanel(p as RequestPanel)}
        activeSection={sidebarSection}
        onSectionChange={handleSectionChange}
        activeFlowId={
          flowTabs.find((ft) => ft.id === activeFlowTabId)?.flowId ?? null
        }
        style={{ width: sidebarWidth }}
      />

      {/* Resize Handle */}
      <div
        className="sidebar-resize-handle"
        onMouseDown={handleResizeMouseDown}
      />

      {/* Main Panel */}
      <div className="main-panel">
        {/* Tabs Bar */}
        <div className="request-tabs-bar">
          {sidebarSection !== "flows" && (
            <>
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
              <button
                className="request-tab-add"
                onClick={addTab}
                title="New Tab"
              >
                +
              </button>
            </>
          )}
          {sidebarSection === "flows" && (
            <>
              <div className="request-tabs-scroll">
                <Reorder.Group
                  as="div"
                  axis="x"
                  values={flowTabs}
                  onReorder={setFlowTabs}
                  className="request-tabs-list"
                >
                  {flowTabs.map((ft) => (
                    <FlowTabItem
                      key={ft.id}
                      tab={ft}
                      isActive={ft.id === activeFlowTabId}
                      onActivate={() => setActiveFlowTabId(ft.id)}
                      onClose={() => closeFlowTab(ft.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setFlowTabContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          tabId: ft.id,
                        });
                      }}
                    />
                  ))}
                </Reorder.Group>
              </div>
              <button
                className="request-tab-add"
                onClick={handleCreateFlow}
                title="New Flow"
              >
                +
              </button>
            </>
          )}
        </div>

        {/* Flow Tab Context Menu */}
        {flowTabContextMenu && (
          <TabContextMenu
            x={flowTabContextMenu.x}
            y={flowTabContextMenu.y}
            menuRef={flowTabContextMenuRef}
            duplicateLabel="Duplicate Flow"
            onDuplicate={() => duplicateFlowTab(flowTabContextMenu.tabId)}
            onClose={() => closeFlowTab(flowTabContextMenu.tabId)}
            onCloseAll={closeAllFlowTabs}
            onDismiss={() => setFlowTabContextMenu(null)}
          />
        )}

        {sidebarSection !== "flows" && (
          <>
            {/* Tab Context Menu */}
            {tabContextMenu && (
              <TabContextMenu
                x={tabContextMenu.x}
                y={tabContextMenu.y}
                menuRef={tabContextMenuRef}
                onDuplicate={() => duplicateTab(tabContextMenu.tabId)}
                onClose={() => closeTab(tabContextMenu.tabId)}
                onCloseAll={closeAllTabs}
                onDismiss={() => setTabContextMenu(null)}
              />
            )}

            {!activeTab && (
              <div className="empty-state">
                <div className="empty-state-icon">↗</div>
                <div className="empty-state-title">No open requests</div>
                <div className="empty-state-hint">
                  Open a request from a collection, history, or create a new tab
                  with the + button above.
                </div>
              </div>
            )}

            {activeTab && (
              <>
                {/* Environment Bar */}
                <EnvironmentBar
                  requestName={activeTab.name}
                  environments={environments}
                  activeEnvId={activeEnvId}
                  onRename={renameActiveRequest}
                  onEnvChange={setActiveEnvId}
                  onManageEnvs={() => setShowEnvManager(true)}
                />

                {/* URL Bar */}
                <UrlBar
                  method={activeTab.method}
                  url={activeTab.url}
                  loading={loading}
                  isDirty={activeTab.isDirty}
                  savedRequestId={activeTab.savedRequestId}
                  envVariables={activeEnv?.variables ?? []}
                  envName={activeEnv?.name}
                  onMethodChange={(method) => updateTab(activeTab.id, { method })}
                  onUrlChange={(v) => {
                    const parsed = parseQueryParams(v);
                    const params =
                      parsed.length > 0
                        ? [...parsed, { enabled: true, key: "", value: "" }]
                        : [{ enabled: true, key: "", value: "" }];
                    updateTab(activeTab.id, { url: v, params });
                  }}
                  onSend={sendRequest}
                  onSave={saveRequestToCollection}
                  onKeyDown={handleKeyDown}
                />

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
                          {tab === "captures" &&
                            activeTab.captures.length > 0 && (
                              <span className="tab-badge">
                                {
                                  activeTab.captures.filter((c) => c.enabled)
                                    .length
                                }
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
                          onChange={(h) =>
                            updateTab(activeTab.id, { headers: h })
                          }
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
                            <span className="header-value">
                              gzip, deflate, br
                            </span>
                          </div>
                          <div className="autogenerated-header-row">
                            <span className="header-key">Connection</span>
                            <span className="header-value">keep-alive</span>
                          </div>
                          {activeTab.bodyType !== "none" &&
                            activeTab.bodyType !== "binary" &&
                            !activeTab.headers.some(
                              (h) =>
                                h.enabled &&
                                h.key.toLowerCase() === "content-type",
                            ) && (
                              <div className="autogenerated-header-row">
                                <span className="header-key">Content-Type</span>
                                <span className="header-value">
                                  {activeTab.bodyType === "raw"
                                    ? {
                                        json: "application/json",
                                        text: "text/plain",
                                        xml: "application/xml",
                                        html: "text/html",
                                        javascript: "application/javascript",
                                      }[activeTab.rawLanguage] || "text/plain"
                                    : activeTab.bodyType ===
                                        "x-www-form-urlencoded"
                                      ? "application/x-www-form-urlencoded"
                                      : activeTab.bodyType === "form-data"
                                        ? "multipart/form-data"
                                        : activeTab.bodyType === "graphql"
                                          ? "application/json"
                                          : ""}
                                </span>
                              </div>
                            )}
                        </div>
                      </>
                    )}
                    {requestPanel === "body" && (
                      <BodyEditor
                        tab={activeTab}
                        activePayload={activePayload}
                        body={body}
                        envVariables={activeEnv?.variables ?? []}
                        envName={activeEnv?.name}
                        onUpdateTab={(updates) => updateTab(activeTab.id, updates)}
                        onAddPayload={addPayload}
                        onRemovePayload={removePayload}
                        onRenamePayload={renamePayload}
                        onUpdatePayloadBody={updatePayloadBody}
                      />
                    )}
                    {requestPanel === "auth" && (
                      <AuthEditor
                        auth={activeTab.auth}
                        envVariables={activeEnv?.variables ?? []}
                        envName={activeEnv?.name}
                        onAuthChange={(auth) => updateTab(activeTab.id, { auth })}
                      />
                    )}
                    {requestPanel === "captures" && (
                      <CapturesEditor
                        captures={activeTab.captures}
                        activeEnvId={activeEnvId}
                        onAdd={addCapture}
                        onUpdate={updateCapture}
                        onRemove={removeCapture}
                      />
                    )}
                  </div>

                  {/* Response Section */}
                  <ResponsePanelComponent
                    response={response}
                    error={error}
                    responsePanel={responsePanel}
                    onPanelChange={setResponsePanel}
                  />
                </div>
              </>
            )}
          </>
        )}

        {sidebarSection === "flows" && (
          <div className="flow-tab-content">
            {(() => {
              const activeFlowTab = flowTabs.find(
                (ft) => ft.id === activeFlowTabId,
              );
              if (!activeFlowTab) {
                return (
                  <div className="flow-empty-state">
                    Open or create a flow to get started
                  </div>
                );
              }
              const flow = flows.find((f) => f.id === activeFlowTab.flowId);
              if (!flow) {
                return (
                  <div className="flow-empty-state">
                    Flow not found — it may have been deleted
                  </div>
                );
              }
              if (activeFlowTab.mode === "runner" && flowRunState) {
                return (
                  <FlowRunner
                    runState={flowRunState}
                    onClose={() => {
                      setFlowTabs((prev) =>
                        prev.map((ft) =>
                          ft.id === activeFlowTab.id
                            ? { ...ft, mode: "editor" }
                            : ft,
                        ),
                      );
                      setFlowRunState(null);
                    }}
                    onAbort={() => {
                      flowAbortRef.current = true;
                    }}
                  />
                );
              }
              return (
                <FlowEditor
                  key={activeFlowTab.id}
                  flow={flow}
                  collections={collections}
                  onSave={handleSaveFlow}
                  onCancel={() => closeFlowTab(activeFlowTab.id)}
                  onRun={runFlow}
                  onChange={handleFlowChange}
                  lastRunState={flowRunHistory[flow.id] ?? null}
                />
              );
            })()}
          </div>
        )}
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
        <SavePickerModal
          collections={collections}
          onSave={saveToPickedCollection}
          onClose={() => setShowSavePicker(false)}
        />
      )}
    </div>
  );
};

export default App;
