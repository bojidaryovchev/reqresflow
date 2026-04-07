import React from "react";
import { Environment } from "../types/electron";

interface EnvDetailPanelProps {
  selectedEnv: Environment | null;
  onUpdateName: (id: string, name: string) => void;
  onUpdateVariable: (index: number, field: "key" | "value", val: string) => void;
  onRemoveVariable: (index: number) => void;
  onAddVariable: () => void;
}

const EnvVariableRow: React.FC<{
  variable: { key: string; value: string };
  index: number;
  onUpdate: (index: number, field: "key" | "value", val: string) => void;
  onRemove: (index: number) => void;
}> = ({ variable, index, onUpdate, onRemove }) => (
  <div className="env-var-row">
    <input
      type="text"
      placeholder="VARIABLE_NAME"
      value={variable.key}
      onChange={(e) => onUpdate(index, "key", e.target.value)}
    />
    <input
      type="text"
      placeholder="value"
      value={variable.value}
      onChange={(e) => onUpdate(index, "value", e.target.value)}
    />
    <button className="kv-remove-btn" onClick={() => onRemove(index)}>
      ×
    </button>
  </div>
);

const EnvDetailPanel: React.FC<EnvDetailPanelProps> = ({
  selectedEnv,
  onUpdateName,
  onUpdateVariable,
  onRemoveVariable,
  onAddVariable,
}) => (
  <div className="env-detail">
    {selectedEnv ? (
      <>
        <div className="env-name-row">
          <label>Name:</label>
          <input
            type="text"
            value={selectedEnv.name}
            onChange={(e) => onUpdateName(selectedEnv.id, e.target.value)}
            className="env-name-input"
          />
        </div>
        <div className="env-vars-header">
          <span>Variable</span>
          <span>Value</span>
          <span></span>
        </div>
        <div className="env-vars-list">
          {selectedEnv.variables.map((v, i) => (
            <EnvVariableRow
              key={i}
              variable={v}
              index={i}
              onUpdate={onUpdateVariable}
              onRemove={onRemoveVariable}
            />
          ))}
        </div>
        <button className="kv-add-btn" onClick={onAddVariable}>
          + Add Variable
        </button>
      </>
    ) : (
      <div className="env-detail-empty">
        Select or create an environment
      </div>
    )}
  </div>
);

export default EnvDetailPanel;
