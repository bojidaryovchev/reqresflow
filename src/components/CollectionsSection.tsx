import React from "react";
import { Collection, SavedRequest } from "../types/electron";
import CollectionRequestItem from "./CollectionRequestItem";

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
                <div className="sidebar-empty" style={{ padding: "8px 16px" }}>
                  Empty collection
                </div>
              )}
              {collection.requests.map((req) => {
                return (
                  <CollectionRequestItem
                    key={req.id}
                    req={req}
                    collectionId={collection.id}
                    isActive={
                      activeCollectionId === collection.id &&
                      activeRequestId === req.id
                    }
                    editingId={editingId}
                    editingName={editingName}
                    setEditingName={setEditingName}
                    startRename={startRename}
                    commitRename={commitRename}
                    handleRenameKeyDown={handleRenameKeyDown}
                    onLoadRequest={onLoadRequest}
                    onDeleteRequest={onDeleteRequest}
                    onRunVariant={onRunVariant}
                    onRequestPanelChange={onRequestPanelChange}
                  />
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
