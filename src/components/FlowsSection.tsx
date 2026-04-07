import React from "react";
import FlowItem from "./FlowItem";
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
        <FlowItem
          key={flow.id}
          flow={flow}
          isActive={activeFlowId === flow.id}
          editingId={editingId}
          editingName={editingName}
          setEditingName={setEditingName}
          startRename={startRename}
          commitRename={commitRename}
          handleRenameKeyDown={handleRenameKeyDown}
          onEdit={() => onEditFlow(flow)}
          onRun={() => onRunFlow(flow)}
          onDelete={() => onDeleteFlow(flow.id)}
        />
      ))}
    </div>
  </>
);

export default FlowsSection;
