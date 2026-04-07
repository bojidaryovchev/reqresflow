import React from "react";
import { ResponseCapture } from "../types/electron";

interface CaptureRowProps {
  capture: ResponseCapture;
  onUpdate: (id: string, updates: Partial<ResponseCapture>) => void;
  onRemove: (id: string) => void;
}

const CaptureRow: React.FC<CaptureRowProps> = ({
  capture,
  onUpdate,
  onRemove,
}) => (
  <div className="capture-row">
    <input
      type="checkbox"
      checked={capture.enabled}
      onChange={(e) => onUpdate(capture.id, { enabled: e.target.checked })}
    />
    <input
      className="capture-var-input"
      type="text"
      placeholder="Variable name"
      value={capture.varName}
      onChange={(e) => onUpdate(capture.id, { varName: e.target.value })}
    />
    <span className="capture-eq">=</span>
    <select
      className="capture-source-select"
      value={capture.source}
      onChange={(e) =>
        onUpdate(capture.id, {
          source: e.target.value as ResponseCapture["source"],
        })
      }
    >
      <option value="body">Body (JSON path)</option>
      <option value="header">Header</option>
      <option value="status">Status code</option>
    </select>
    {capture.source !== "status" && (
      <input
        className="capture-path-input"
        type="text"
        placeholder={
          capture.source === "body" ? "data.token" : "x-request-id"
        }
        value={capture.path}
        onChange={(e) => onUpdate(capture.id, { path: e.target.value })}
      />
    )}
    <button
      className="capture-remove-btn"
      onClick={() => onRemove(capture.id)}
    >
      ×
    </button>
  </div>
);

export default CaptureRow;
