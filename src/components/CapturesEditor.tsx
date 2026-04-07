import React from "react";
import { ResponseCapture } from "../types/electron";

interface CapturesEditorProps {
  captures: ResponseCapture[];
  activeEnvId: string | null;
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<ResponseCapture>) => void;
  onRemove: (id: string) => void;
}

const CapturesEditor: React.FC<CapturesEditorProps> = ({
  captures,
  activeEnvId,
  onAdd,
  onUpdate,
  onRemove,
}) => (
  <div className="captures-editor">
    <div className="captures-info">
      Extract values from responses and save them as environment variables.
      {!activeEnvId && (
        <span className="captures-warning"> Select an environment first.</span>
      )}
    </div>
    {captures.length === 0 && (
      <div className="captures-empty">
        No captures yet. Add one to extract response values into env variables.
      </div>
    )}
    {captures.map((cap) => (
      <div className="capture-row" key={cap.id}>
        <input
          type="checkbox"
          checked={cap.enabled}
          onChange={(e) => onUpdate(cap.id, { enabled: e.target.checked })}
        />
        <input
          className="capture-var-input"
          type="text"
          placeholder="Variable name"
          value={cap.varName}
          onChange={(e) => onUpdate(cap.id, { varName: e.target.value })}
        />
        <span className="capture-eq">=</span>
        <select
          className="capture-source-select"
          value={cap.source}
          onChange={(e) =>
            onUpdate(cap.id, {
              source: e.target.value as ResponseCapture["source"],
            })
          }
        >
          <option value="body">Body (JSON path)</option>
          <option value="header">Header</option>
          <option value="status">Status code</option>
        </select>
        {cap.source !== "status" && (
          <input
            className="capture-path-input"
            type="text"
            placeholder={
              cap.source === "body" ? "data.token" : "x-request-id"
            }
            value={cap.path}
            onChange={(e) => onUpdate(cap.id, { path: e.target.value })}
          />
        )}
        <button className="capture-remove-btn" onClick={() => onRemove(cap.id)}>
          ×
        </button>
      </div>
    ))}
    <button className="capture-add-btn" onClick={onAdd}>
      + Add Capture
    </button>
  </div>
);

export default CapturesEditor;
