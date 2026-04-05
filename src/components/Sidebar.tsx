import React, { useState, useEffect } from "react";
import {
  Collection,
  Flow,
  SavedRequest,
  HistoryEntry,
} from "../types/electron";

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
  style?: React.CSSProperties;
}

export type { SidebarSection };

type SidebarSection = "collections" | "history" | "flows";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const METHOD_COLORS: Record<string, string> = {
  GET: "var(--method-get)",
  POST: "var(--method-post)",
  PUT: "var(--method-put)",
  PATCH: "var(--method-patch)",
  DELETE: "var(--method-delete)",
};

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

  const formatTimestamp = (ts: number): string => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (isToday) return time;
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
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
      </div>

      {activeSection === "collections" && (
        <>
          <div className="sidebar-header">
            <span className="sidebar-header-title">Collections</span>
            <button
              className="sidebar-add-btn"
              onClick={addCollection}
              title="New Collection"
            >
              +
            </button>
          </div>
          <div className="sidebar-content">
            {collections.length === 0 && (
              <div className="sidebar-empty">
                No collections yet.
                <br />
                Click + to create one.
              </div>
            )}
            {collections.map((collection) => (
              <div className="collection" key={collection.id}>
                <div
                  className="collection-header"
                  onClick={() => toggleExpanded(collection.id)}
                >
                  <span className="collection-arrow">
                    {expandedCollections.has(collection.id) ? "▼" : "▶"}
                  </span>
                  {editingId === collection.id ? (
                    <input
                      className="rename-input"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={handleRenameKeyDown}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="collection-name">{collection.name}</span>
                  )}
                  <div
                    className="collection-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="sidebar-icon-btn"
                      onClick={() => saveToCollection(collection.id)}
                      title="Save current request here"
                    >
                      +
                    </button>
                    <button
                      className="sidebar-icon-btn"
                      onClick={() =>
                        startRename(collection.id, collection.name)
                      }
                      title="Rename"
                    >
                      ✎
                    </button>
                    <button
                      className="sidebar-icon-btn danger"
                      onClick={() => deleteCollection(collection.id)}
                      title="Delete collection"
                    >
                      ×
                    </button>
                  </div>
                </div>
                {expandedCollections.has(collection.id) && (
                  <div className="collection-requests">
                    {collection.requests.length === 0 && (
                      <div
                        className="sidebar-empty"
                        style={{ padding: "8px 16px" }}
                      >
                        Empty collection
                      </div>
                    )}
                    {collection.requests.map((req) => {
                      const hasVariants =
                        req.payloads && req.payloads.length > 1;
                      return (
                        <div key={req.id}>
                          <div
                            className={`request-item${activeCollectionId === collection.id && activeRequestId === req.id ? " active" : ""}`}
                            onClick={() =>
                              onLoadRequest(req, collection.id, req.id)
                            }
                          >
                            <span
                              className="request-method-badge"
                              style={{
                                color:
                                  METHOD_COLORS[req.method] ||
                                  "var(--text-secondary)",
                              }}
                            >
                              {req.method}
                            </span>
                            {editingId === req.id ? (
                              <input
                                className="rename-input"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={commitRename}
                                onKeyDown={handleRenameKeyDown}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span className="request-name">{req.name}</span>
                            )}
                            <div
                              className="collection-actions"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className="sidebar-icon-btn"
                                onClick={() => startRename(req.id, req.name)}
                                title="Rename"
                              >
                                ✎
                              </button>
                              <button
                                className="sidebar-icon-btn danger"
                                onClick={() =>
                                  deleteRequest(collection.id, req.id)
                                }
                                title="Delete request"
                              >
                                ×
                              </button>
                            </div>
                            <button
                              className="sidebar-icon-btn request-play-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                const payloadId =
                                  req.activePayloadId || req.payloads?.[0]?.id;
                                if (payloadId) {
                                  onRunVariant(
                                    req,
                                    collection.id,
                                    req.id,
                                    payloadId,
                                  );
                                }
                              }}
                              title="Send request"
                            >
                              ▶
                            </button>
                          </div>
                          {hasVariants && (
                            <div className="request-variants">
                              {req.payloads?.map((payload) => (
                                <div
                                  className="request-variant-item"
                                  key={payload.id}
                                  onClick={() => {
                                    onLoadRequest(
                                      { ...req, activePayloadId: payload.id },
                                      collection.id,
                                      req.id,
                                    );
                                    onRequestPanelChange("body");
                                  }}
                                >
                                  {editingId === payload.id ? (
                                    <input
                                      className="rename-input"
                                      value={editingName}
                                      onChange={(e) =>
                                        setEditingName(e.target.value)
                                      }
                                      onBlur={commitRename}
                                      onKeyDown={handleRenameKeyDown}
                                      autoFocus
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    <span
                                      className="request-variant-name"
                                      onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        startRename(payload.id, payload.name);
                                      }}
                                    >
                                      {payload.name}
                                    </span>
                                  )}
                                  <div
                                    className="collection-actions"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      className="sidebar-icon-btn"
                                      onClick={() =>
                                        startRename(payload.id, payload.name)
                                      }
                                      title="Rename payload"
                                    >
                                      ✎
                                    </button>
                                  </div>
                                  <button
                                    className="sidebar-icon-btn request-variant-play"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRunVariant(
                                        req,
                                        collection.id,
                                        req.id,
                                        payload.id,
                                      );
                                    }}
                                    title={`Send with ${payload.name}`}
                                  >
                                    ▶
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {activeSection === "history" && (
        <>
          <div className="sidebar-header">
            <span className="sidebar-header-title">History</span>
            {history.length > 0 && (
              <button
                className="sidebar-add-btn"
                onClick={onClearHistory}
                title="Clear History"
              >
                ×
              </button>
            )}
          </div>
          <div className="sidebar-content">
            {history.length === 0 && (
              <div className="sidebar-empty">
                No request history yet.
                <br />
                Send a request to see it here.
              </div>
            )}
            {history.map((entry) => (
              <div
                className="history-item"
                key={entry.id}
                onClick={() => onLoadHistory(entry)}
              >
                <div className="history-item-top">
                  <span
                    className="request-method-badge"
                    style={{
                      color:
                        METHOD_COLORS[entry.method] || "var(--text-secondary)",
                    }}
                  >
                    {entry.method}
                  </span>
                  <span
                    className={`history-status ${entry.status >= 200 && entry.status < 300 ? "success" : entry.status >= 400 ? "error" : ""}`}
                  >
                    {entry.status}
                  </span>
                  <span className="history-time">{entry.time}ms</span>
                </div>
                <div className="history-item-url">{entry.url}</div>
                <div className="history-item-timestamp">
                  {entry.flowName && (
                    <span className="history-flow-badge">{entry.flowName}</span>
                  )}
                  {formatTimestamp(entry.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeSection === "flows" && (
        <>
          <div className="sidebar-header">
            <span className="sidebar-header-title">Flows</span>
            <button
              className="sidebar-add-btn"
              onClick={onCreateFlow}
              title="New Flow"
            >
              +
            </button>
          </div>
          <div className="sidebar-content">
            {flows.length === 0 && (
              <div className="sidebar-empty">
                No flows yet.
                <br />
                Click + to create one.
              </div>
            )}
            {flows.map((flow) => (
              <div
                className={`flow-item${activeFlowId === flow.id ? " active" : ""}`}
                key={flow.id}
              >
                <div
                  className="flow-item-header"
                  onClick={() => onEditFlow(flow)}
                >
                  {editingId === flow.id ? (
                    <input
                      className="rename-input"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={handleRenameKeyDown}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className="flow-item-name"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        startRename(flow.id, flow.name);
                      }}
                    >
                      {flow.name}
                    </span>
                  )}
                  <span className="flow-item-steps">
                    {flow.steps.length} step
                    {flow.steps.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div
                  className="collection-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="sidebar-icon-btn"
                    onClick={() => startRename(flow.id, flow.name)}
                    title="Rename flow"
                  >
                    ✎
                  </button>
                  <button
                    className="sidebar-icon-btn"
                    onClick={() => onRunFlow(flow)}
                    title="Run flow"
                  >
                    ▶
                  </button>
                  <button
                    className="sidebar-icon-btn danger"
                    onClick={() =>
                      onFlowsChange(flows.filter((f) => f.id !== flow.id))
                    }
                    title="Delete flow"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Sidebar;
