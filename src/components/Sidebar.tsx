import React, { useState, useEffect } from "react";
import {
  Collection,
  Flow,
  GeneratorConfig,
  GeneratorInfo,
  SavedRequest,
  HistoryEntry,
} from "../types/electron";
import { generateId } from "../utils/helpers";
import CollectionsSection from "./CollectionsSection";
import GeneratorsSection from "./GeneratorsSection";
import HistorySection from "./HistorySection";
import FlowsSection from "./FlowsSection";

interface SidebarProps {
  collections: Collection[];
  onCollectionsChange: (collections: Collection[]) => void;
  onLoadRequest: (
    request: SavedRequest,
    collectionId?: string,
    requestId?: string,
  ) => void;
  onSaveRequest: () => SavedRequest | null;
  history: HistoryEntry[];
  onLoadHistory: (entry: HistoryEntry) => void;
  onClearHistory: () => void;
  activeCollectionId: string | null;
  activeRequestId: string | null;
  flows: Flow[];
  onFlowsChange: (flows: Flow[]) => void;
  onEditFlow: (flow: Flow) => void;
  onRunFlow: (flow: Flow) => void;
  onCreateFlow: () => void;
  onRenameFlow: (flowId: string, name: string) => void;
  onRunVariant: (
    request: SavedRequest,
    collectionId: string,
    requestId: string,
    payloadId: string,
  ) => void;
  onRenamePayload: (
    collectionId: string,
    requestId: string,
    payloadId: string,
    name: string,
  ) => void;
  onRequestPanelChange: (panel: string) => void;
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
  activeFlowId: string | null;
  // Generators
  generatorConfig: GeneratorConfig | null;
  generators: GeneratorInfo[];
  containerStatus: "stopped" | "starting" | "running" | "error";
  statusError: string | null;
  onPickProjectDir: () => void;
  onBuildGenerators: () => Promise<{ success: boolean; error?: string }>;
  onStartGenerators: () => Promise<{ success: boolean; error?: string }>;
  onStopGenerators: () => void;
  onRemoveGenerators: () => void;
  onRefreshGenerators: () => void;
  onRebuildGenerators: () => Promise<void>;
  containerLogs: string;
  onFetchLogs: () => Promise<void>;
  style?: React.CSSProperties;
}

export type { SidebarSection };

type SidebarSection = "collections" | "history" | "flows" | "generators";

const Sidebar: React.FC<SidebarProps> = ({
  collections,
  onCollectionsChange,
  onLoadRequest,
  onSaveRequest,
  history,
  onLoadHistory,
  onClearHistory,
  activeCollectionId,
  activeRequestId,
  flows,
  onFlowsChange,
  onEditFlow,
  onRunFlow,
  onCreateFlow,
  onRenameFlow,
  onRunVariant,
  onRenamePayload,
  onRequestPanelChange,
  activeSection,
  onSectionChange,
  activeFlowId,
  generatorConfig,
  generators,
  containerStatus,
  statusError,
  onPickProjectDir,
  onBuildGenerators,
  onStartGenerators,
  onStopGenerators,
  onRemoveGenerators,
  onRefreshGenerators,
  onRebuildGenerators,
  containerLogs,
  onFetchLogs,
  style,
}) => {
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(
    new Set(),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Auto-expand collection containing the active request
  useEffect(() => {
    if (activeCollectionId) {
      setExpandedCollections((prev) => {
        if (prev.has(activeCollectionId)) return prev;
        return new Set(prev).add(activeCollectionId);
      });
    }
  }, [activeCollectionId]);

  const toggleExpanded = (id: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCollection = () => {
    const newCollection: Collection = {
      id: generateId(),
      name: "New Collection",
      requests: [],
    };
    const updated = [...collections, newCollection];
    onCollectionsChange(updated);
    setExpandedCollections((prev) => new Set(prev).add(newCollection.id));
    setEditingId(newCollection.id);
    setEditingName("New Collection");
  };

  const saveToCollection = (collectionId: string) => {
    const request = onSaveRequest();
    if (!request) return;
    const updated = collections.map((c) => {
      if (c.id !== collectionId) return c;
      return {
        ...c,
        requests: [...c.requests, { ...request, id: generateId() }],
      };
    });
    onCollectionsChange(updated);
  };

  const deleteRequest = (collectionId: string, requestId: string) => {
    const updated = collections.map((c) => {
      if (c.id !== collectionId) return c;
      return { ...c, requests: c.requests.filter((r) => r.id !== requestId) };
    });
    onCollectionsChange(updated);
  };

  const deleteCollection = (collectionId: string) => {
    onCollectionsChange(collections.filter((c) => c.id !== collectionId));
  };

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const commitRename = () => {
    if (!editingId || !editingName.trim()) {
      setEditingId(null);
      return;
    }
    // Check if it's a collection, request, or payload
    const updated = collections.map((c) => {
      if (c.id === editingId) return { ...c, name: editingName.trim() };
      return {
        ...c,
        requests: c.requests.map((r) => {
          if (r.id === editingId) return { ...r, name: editingName.trim() };
          if (r.payloads) {
            const hasPayload = r.payloads.some((p) => p.id === editingId);
            if (hasPayload) {
              // Find the collection and request this payload belongs to
              onRenamePayload(c.id, r.id, editingId, editingName.trim());
              return {
                ...r,
                payloads: r.payloads.map((p) =>
                  p.id === editingId ? { ...p, name: editingName.trim() } : p,
                ),
              };
            }
          }
          return r;
        }),
      };
    });
    onCollectionsChange(updated);
    // Check if it's a flow
    const flowMatch = flows.find((f) => f.id === editingId);
    if (flowMatch) {
      onRenameFlow(editingId, editingName.trim());
    }
    setEditingId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") setEditingId(null);
  };

  const renameState = {
    editingId,
    editingName,
    setEditingName,
    startRename,
    commitRename,
    handleRenameKeyDown,
  };

  return (
    <div className="sidebar" style={style}>
      <div className="sidebar-section-tabs">
        <button
          className={`sidebar-section-tab ${activeSection === "collections" ? "active" : ""}`}
          onClick={() => onSectionChange("collections")}
        >
          Collections
        </button>
        <button
          className={`sidebar-section-tab ${activeSection === "flows" ? "active" : ""}`}
          onClick={() => onSectionChange("flows")}
        >
          Flows
          {flows.length > 0 && (
            <span className="history-badge">{flows.length}</span>
          )}
        </button>
        <button
          className={`sidebar-section-tab ${activeSection === "history" ? "active" : ""}`}
          onClick={() => onSectionChange("history")}
        >
          History{" "}
          {history.length > 0 && (
            <span className="history-badge">{history.length}</span>
          )}
        </button>
        <button
          className={`sidebar-section-tab ${activeSection === "generators" ? "active" : ""}`}
          onClick={() => onSectionChange("generators")}
        >
          Generators
        </button>
      </div>

      {activeSection === "collections" && (
        <CollectionsSection
          {...renameState}
          collections={collections}
          expandedCollections={expandedCollections}
          activeCollectionId={activeCollectionId}
          activeRequestId={activeRequestId}
          onToggleExpanded={toggleExpanded}
          onAddCollection={addCollection}
          onSaveToCollection={saveToCollection}
          onDeleteCollection={deleteCollection}
          onDeleteRequest={deleteRequest}
          onLoadRequest={onLoadRequest}
          onRunVariant={onRunVariant}
          onRequestPanelChange={onRequestPanelChange}
        />
      )}

      {activeSection === "history" && (
        <HistorySection
          history={history}
          onLoadHistory={onLoadHistory}
          onClearHistory={onClearHistory}
        />
      )}

      {activeSection === "flows" && (
        <FlowsSection
          {...renameState}
          flows={flows}
          activeFlowId={activeFlowId}
          onCreateFlow={onCreateFlow}
          onEditFlow={onEditFlow}
          onRunFlow={onRunFlow}
          onDeleteFlow={(id) => onFlowsChange(flows.filter((f) => f.id !== id))}
        />
      )}

      {activeSection === "generators" && (
        <GeneratorsSection
          generatorConfig={generatorConfig}
          generators={generators}
          containerStatus={containerStatus}
          statusError={statusError}
          containerLogs={containerLogs}
          onPickProjectDir={onPickProjectDir}
          onBuild={onBuildGenerators}
          onStart={onStartGenerators}
          onRebuild={onRebuildGenerators}
          onStop={onStopGenerators}
          onRemove={onRemoveGenerators}
          onRefresh={onRefreshGenerators}
          onFetchLogs={onFetchLogs}
        />
      )}
    </div>
  );
};

export default Sidebar;
