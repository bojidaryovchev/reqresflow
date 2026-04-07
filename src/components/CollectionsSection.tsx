import React from "react";
import {
  Collection,
  SavedRequest,
} from "../types/electron";
import { METHOD_COLORS } from "../utils/http";

interface RenameState {
  editingId: string | null;
  editingName: string;
  setEditingName: (name: string) => void;
  startRename: (id: string, name: string) => void;
  commitRename: () => void;
  handleRenameKeyDown: (e: React.KeyboardEvent) => void;
}

interface CollectionsSectionProps extends RenameState {
  collections: Collection[];
  expandedCollections: Set<string>;
  activeCollectionId: string | null;
  activeRequestId: string | null;
  onToggleExpanded: (id: string) => void;
  onAddCollection: () => void;
  onSaveToCollection: (collectionId: string) => void;
  onDeleteCollection: (collectionId: string) => void;
  onDeleteRequest: (collectionId: string, requestId: string) => void;
  onLoadRequest: (
    request: SavedRequest,
    collectionId?: string,
    requestId?: string,
  ) => void;
  onRunVariant: (
    request: SavedRequest,
    collectionId: string,
    requestId: string,
    payloadId: string,
  ) => void;
  onRequestPanelChange: (panel: string) => void;
}

const CollectionsSection: React.FC<CollectionsSectionProps> = ({
  collections,
  expandedCollections,
  activeCollectionId,
  activeRequestId,
  editingId,
  editingName,
  setEditingName,
  startRename,
  commitRename,
  handleRenameKeyDown,
  onToggleExpanded,
  onAddCollection,
  onSaveToCollection,
  onDeleteCollection,
  onDeleteRequest,
  onLoadRequest,
  onRunVariant,
  onRequestPanelChange,
}) => (
  <>
    <div className="sidebar-header">
      <span className="sidebar-header-title">Collections</span>
      <button
        className="sidebar-add-btn"
        onClick={onAddCollection}
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
            onClick={() => onToggleExpanded(collection.id)}
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
                onClick={() => onSaveToCollection(collection.id)}
                title="Save current request here"
              >
                +
              </button>
              <button
                className="sidebar-icon-btn"
                onClick={() => startRename(collection.id, collection.name)}
                title="Rename"
              >
                ✎
              </button>
              <button
                className="sidebar-icon-btn danger"
                onClick={() => onDeleteCollection(collection.id)}
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
                const hasVariants = req.payloads && req.payloads.length > 1;
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
                            onDeleteRequest(collection.id, req.id)
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
);

export type { RenameState };
export default CollectionsSection;
