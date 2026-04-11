import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Reorder } from "motion/react";
import EnvManager from "./components/EnvManager";
import EnvironmentBar from "./components/EnvironmentBar";
import FlowTabContent from "./components/FlowTabContent";
import HistoryDetailPanel from "./components/HistoryDetailPanel";
import RequestPanelSection, {
  type RequestPanel,
} from "./components/RequestPanelSection";
import ResponsePanelComponent from "./components/ResponsePanel";
import SavePickerModal from "./components/SavePickerModal";
import Sidebar, { SidebarSection } from "./components/Sidebar";
import TabContextMenu from "./components/TabContextMenu";
import { TabItem, FlowTabItem } from "./components/TabItems";
import UrlBar from "./components/UrlBar";
import { useCollections } from "./hooks/useCollections";
import { useContextMenu } from "./hooks/useContextMenu";
import { useEnvironments } from "./hooks/useEnvironments";
import { useFlowExecution } from "./hooks/useFlowExecution";
import { useFlowTabs } from "./hooks/useFlowTabs";
import { useGenerators } from "./hooks/useGenerators";
import { useHistory } from "./hooks/useHistory";
import { HistoryEntry } from "./types/electron";
import { usePayloads } from "./hooks/usePayloads";
import { useSaveToCollection } from "./hooks/useSaveToCollection";
import { useSendRequest } from "./hooks/useSendRequest";
import { useSession } from "./hooks/useSession";
import { useResponseResize } from "./hooks/useResponseResize";
import { useSidebarResize } from "./hooks/useSidebarResize";
import { useTabs } from "./hooks/useTabs";
import { parseQueryParams } from "./utils/url";

type ResponsePanel = "body" | "headers";

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

  // Collections
  const { collections, setCollections, handleCollectionsChange } =
    useCollections();

  // Environments
  const {
    environments,
    setEnvironments,
    activeEnvId,
    setActiveEnvId,
    activeEnv,
    showEnvManager,
    setShowEnvManager,
    handleEnvironmentsChange,
  } = useEnvironments();

  // History
  const { history, setHistory, clearHistory } = useHistory();

  // Generators
  const {
    generatorConfig,
    setGeneratorConfig,
    generators,
    containerStatus,
    statusError,
    containerLogs,
    pickProjectDir,
    buildImage,
    startContainer,
    rebuildContainer,
    stopContainer,
    removeConfig,
    refreshGenerators,
    fetchLogs,
  } = useGenerators();

  // Sidebar resize
  const { sidebarWidth, handleResizeMouseDown } = useSidebarResize();

  // Response panel resize
  const { responseFraction, containerRef, handleResponseResizeMouseDown } =
    useResponseResize();

  // Sidebar section
  const [sidebarSection, setSidebarSection] =
    useState<SidebarSection>("collections");

  // History detail
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null,
  );

  // Auto-send after Replay Exact loads a history entry
  const autoSendPendingRef = useRef(false);

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
    generatorConfig,
  });

  // Session loading & auto-save
  useSession({
    setTabs,
    setActiveTabId,
    setCollections,
    setEnvironments,
    setActiveEnvId,
    setHistory,
    setFlows,
    setGeneratorConfig,
    tabs,
    activeTabId,
    activeEnvId,
  });

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
    if (section !== "history") {
      setSelectedHistoryId(null);
    }
  }, []);

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

  // Send request, load request, history, variants
  const {
    sendRequest,
    getCurrentRequest,
    loadRequest,
    loadHistoryEntry,
    runVariant,
  } = useSendRequest({
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
  });

  // Save to collection
  const {
    showSavePicker,
    setShowSavePicker,
    saveRequestToCollection,
    saveToPickedCollection,
  } = useSaveToCollection({
    activeTab,
    collections,
    setCollections,
    setTabs,
    getCurrentRequest,
  });

  // Auto-send effect: fires after Replay Exact loads the tab
  useEffect(() => {
    if (autoSendPendingRef.current && activeTab && activeTab.url.trim()) {
      autoSendPendingRef.current = false;
      sendRequest();
    }
  }, [activeTab?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rename active request and sync with collection if linked
  const renameActiveRequest = useCallback(
    (newName: string) => {
      if (!activeTab) return;
      updateTab(activeTab.id, { name: newName });
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

  // Combine env vars with generator names for autocomplete
  const allVariables = useMemo(() => {
    const envVars = activeEnv?.variables ?? [];
    const genVars = generators.map((g) => ({
      key: `$${g.name}`,
      value: g.description || "(generator)",
    }));
    return [...envVars, ...genVars];
  }, [activeEnv?.variables, generators]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") sendRequest();
  };

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
        onLoadHistory={(entry: HistoryEntry) => {
          setSelectedHistoryId(entry.id);
          setSidebarSection("history");
        }}
        onClearHistory={() => {
          clearHistory();
          setSelectedHistoryId(null);
        }}
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
        selectedHistoryId={selectedHistoryId}
        activeFlowId={
          flowTabs.find((ft) => ft.id === activeFlowTabId)?.flowId ?? null
        }
        generatorConfig={generatorConfig}
        generators={generators}
        containerStatus={containerStatus}
        statusError={statusError}
        onPickProjectDir={pickProjectDir}
        onBuildGenerators={buildImage}
        onStartGenerators={startContainer}
        onStopGenerators={stopContainer}
        onRemoveGenerators={removeConfig}
        onRefreshGenerators={refreshGenerators}
        onRebuildGenerators={rebuildContainer}
        containerLogs={containerLogs}
        onFetchLogs={fetchLogs}
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

            {/* History Detail Panel */}
            {sidebarSection === "history" &&
              selectedHistoryId &&
              (() => {
                const selectedEntry = history.find(
                  (h) => h.id === selectedHistoryId,
                );
                if (!selectedEntry) return null;
                return (
                  <HistoryDetailPanel
                    entry={selectedEntry}
                    onReplayExact={() => {
                      loadHistoryEntry(selectedEntry);
                      autoSendPendingRef.current = true;
                      setSelectedHistoryId(null);
                      setSidebarSection("collections");
                    }}
                    onReplayAsNew={() => {
                      loadRequest(selectedEntry.request);
                      setSelectedHistoryId(null);
                      setSidebarSection("collections");
                    }}
                    onClose={() => setSelectedHistoryId(null)}
                  />
                );
              })()}

            {/* Normal request editing (hidden when viewing history detail) */}
            {!(sidebarSection === "history" && selectedHistoryId) && (
              <>
                {!activeTab && (
                  <div className="empty-state">
                    <div className="empty-state-icon">↗</div>
                    <div className="empty-state-title">No open requests</div>
                    <div className="empty-state-hint">
                      Open a request from a collection, history, or create a new
                      tab with the + button above.
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
                      envVariables={allVariables}
                      envName={activeEnv?.name}
                      onMethodChange={(method) =>
                        updateTab(activeTab.id, { method })
                      }
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

                    <div className="request-response" ref={containerRef}>
                      {/* Request Section */}
                      <RequestPanelSection
                        activeTab={activeTab}
                        requestPanel={requestPanel}
                        onRequestPanelChange={setRequestPanel}
                        envVariables={allVariables}
                        envName={activeEnv?.name}
                        onUpdateTab={(updates) =>
                          updateTab(activeTab.id, updates)
                        }
                        activePayload={activePayload}
                        body={body}
                        onAddPayload={addPayload}
                        onRemovePayload={removePayload}
                        onRenamePayload={renamePayload}
                        onUpdatePayloadBody={updatePayloadBody}
                        activeEnvId={activeEnvId}
                        onAddCapture={addCapture}
                        onUpdateCapture={updateCapture}
                        onRemoveCapture={removeCapture}
                        style={{ flex: `${1 - responseFraction}` }}
                      />

                      {/* Resize Handle */}
                      <div
                        className="response-resize-handle"
                        onMouseDown={handleResponseResizeMouseDown}
                      />

                      {/* Response Section */}
                      <ResponsePanelComponent
                        response={response}
                        error={error}
                        responsePanel={responsePanel}
                        onPanelChange={setResponsePanel}
                        style={{ flex: `${responseFraction}` }}
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {sidebarSection === "flows" && (
          <div className="flow-tab-content">
            <FlowTabContent
              flowTabs={flowTabs}
              activeFlowTabId={activeFlowTabId}
              flows={flows}
              collections={collections}
              flowRunState={flowRunState}
              flowRunHistory={flowRunHistory}
              flowAbortRef={flowAbortRef}
              setFlowTabs={setFlowTabs}
              setFlowRunState={setFlowRunState}
              handleSaveFlow={handleSaveFlow}
              closeFlowTab={closeFlowTab}
              runFlow={runFlow}
              handleFlowChange={handleFlowChange}
            />
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
