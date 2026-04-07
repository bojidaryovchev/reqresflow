import React from "react";
import { SavedRequest } from "../types/electron";
import { METHOD_COLORS } from "../utils/http";
import type { RenameState } from "./CollectionsSection";

interface CollectionRequestItemProps {
  req: SavedRequest;
  collectionId: string;
  isActive: boolean;
  editingId: RenameState["editingId"];
  editingName: RenameState["editingName"];
  setEditingName: RenameState["setEditingName"];
  startRename: RenameState["startRename"];
  commitRename: RenameState["commitRename"];
  handleRenameKeyDown: RenameState["handleRenameKeyDown"];
  onLoadRequest: (
    req: SavedRequest,
    collectionId: string,
    requestId: string,
  ) => void;
  onDeleteRequest: (collectionId: string, requestId: string) => void;
  onRunVariant: (
    req: SavedRequest,
    collectionId: string,
    requestId: string,
    payloadId: string,
  ) => void;
  onRequestPanelChange: (panel: string) => void;
}

const CollectionRequestItem: React.FC<CollectionRequestItemProps> = ({
  req,
  collectionId,
  isActive,
  editingId,
  editingName,
  setEditingName,
  startRename,
  commitRename,
  handleRenameKeyDown,
  onLoadRequest,
  onDeleteRequest,
  onRunVariant,
  onRequestPanelChange,
}) => {
  const hasVariants = req.payloads && req.payloads.length > 1;

  return (
    <div>
      <div
        className={`request-item${isActive ? " active" : ""}`}
        onClick={() => onLoadRequest(req, collectionId, req.id)}
      >
        <span
          className="request-method-badge"
          style={{
            color: METHOD_COLORS[req.method] || "var(--text-secondary)",
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
            onClick={() => onDeleteRequest(collectionId, req.id)}
            title="Delete request"
          >
            ×
          </button>
        </div>
        <button
          className="sidebar-icon-btn request-play-btn"
          onClick={(e) => {
            e.stopPropagation();
            const payloadId = req.activePayloadId || req.payloads?.[0]?.id;
            if (payloadId) {
              onRunVariant(req, collectionId, req.id, payloadId);
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
                  collectionId,
                  req.id,
                );
                onRequestPanelChange("body");
              }}
            >
              {editingId === payload.id ? (
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
                  onClick={() => startRename(payload.id, payload.name)}
                  title="Rename payload"
                >
                  ✎
                </button>
              </div>
              <button
                className="sidebar-icon-btn request-variant-play"
                onClick={(e) => {
                  e.stopPropagation();
                  onRunVariant(req, collectionId, req.id, payload.id);
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
};

export default CollectionRequestItem;
