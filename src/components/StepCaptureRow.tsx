import React from "react";
import { ResponseCapture } from "../types/electron";

interface StepCaptureRowProps {
  capture: ResponseCapture;
  onUpdate: (captureId: string, updates: Partial<ResponseCapture>) => void;
  onRemove: (captureId: string) => void;
}

const StepCaptureRow: React.FC<StepCaptureRowProps> = ({
  capture,
  onUpdate,
  onRemove,
}) => (
  <div className="flow-step-capture-row">
    <input
      className="flow-step-capture-input"
      placeholder="Variable name"
      value={capture.varName}
      onChange={(e) => onUpdate(capture.id, { varName: e.target.value })}
    />
    <select
      className="flow-step-capture-select"
      value={capture.source}
      onChange={(e) =>
        onUpdate(capture.id, {
          source: e.target.value as "body" | "header" | "status",
        })
      }
    >
      <option value="body">Body</option>
      <option value="header">Header</option>
      <option value="status">Status</option>
    </select>
    <input
      className="flow-step-capture-input"
      placeholder={
        capture.source === "body"
          ? "JSON path (e.g. data.token)"
          : capture.source === "header"
            ? "Header name"
            : ""
      }
      value={capture.path}
      onChange={(e) => onUpdate(capture.id, { path: e.target.value })}
      disabled={capture.source === "status"}
    />
    <button
      className="flow-step-capture-remove"
      onClick={() => onRemove(capture.id)}
      title="Remove capture"
    >
      ×
    </button>
  </div>
);

export default StepCaptureRow;
