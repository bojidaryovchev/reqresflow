import React from "react";
import { Flow } from "../types/electron";

interface FlowItemProps {
  flow: Flow;
  isActive: boolean;
  editingId: string | null;
  editingName: string;
  setEditingName: (name: string) => void;
  startRename: (id: string, name: string) => void;
  commitRename: () => void;
  handleRenameKeyDown: (e: React.KeyboardEvent) => void;
  onEdit: () => void;
  onRun: () => void;
  onDelete: () => void;
}

const FlowItem: React.FC<FlowItemProps> = ({
  flow,
  isActive,
  editingId,
  editingName,
  setEditingName,
  startRename,
  commitRename,
  handleRenameKeyDown,
  onEdit,
  onRun,
  onDelete,
}) => (
  <div className={`flow-item${isActive ? " active" : ""}`}>
    <div className="flow-item-header" onClick={onEdit}>
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
    <div className="collection-actions" onClick={(e) => e.stopPropagation()}>
      <button
        className="sidebar-icon-btn"
        onClick={() => startRename(flow.id, flow.name)}
        title="Rename flow"
      >
        ✎
      </button>
      <button className="sidebar-icon-btn" onClick={onRun} title="Run flow">
        ▶
      </button>
      <button
        className="sidebar-icon-btn danger"
        onClick={onDelete}
        title="Delete flow"
      >
        ×
      </button>
    </div>
  </div>
);

export default FlowItem;
