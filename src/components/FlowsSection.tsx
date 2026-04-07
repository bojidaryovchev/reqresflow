import React from "react";
import { Flow } from "../types/electron";
import { RenameState } from "./CollectionsSection";

interface FlowsSectionProps extends RenameState {
  flows: Flow[];
  activeFlowId: string | null;
  onCreateFlow: () => void;
  onEditFlow: (flow: Flow) => void;
  onRunFlow: (flow: Flow) => void;
  onDeleteFlow: (flowId: string) => void;
}

const FlowsSection: React.FC<FlowsSectionProps> = ({
  flows,
  activeFlowId,
  editingId,
  editingName,
  setEditingName,
  startRename,
  commitRename,
  handleRenameKeyDown,
  onCreateFlow,
  onEditFlow,
  onRunFlow,
  onDeleteFlow,
}) => (
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
              onClick={() => onDeleteFlow(flow.id)}
              title="Delete flow"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  </>
);

export default FlowsSection;
