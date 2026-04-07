import React from "react";
import { FlowStep, ResponseCapture } from "../types/electron";
import { METHOD_COLORS } from "../utils/http";

interface FlowStepRowProps {
  step: FlowStep;
  index: number;
  totalSteps: number;
  isExpanded: boolean;
  reqMethod?: string;
  reqName?: string;
  reqUrl?: string;
  collectionFound: boolean;
  onToggleExpand: () => void;
  onMoveStep: (direction: -1 | 1) => void;
  onRemove: () => void;
  onToggleContinueOnError: () => void;
  onAddCapture: () => void;
  onUpdateCapture: (captureId: string, updates: Partial<ResponseCapture>) => void;
  onRemoveCapture: (captureId: string) => void;
}

const FlowStepRow: React.FC<FlowStepRowProps> = ({
  step,
  index,
  totalSteps,
  isExpanded,
  reqMethod,
  reqName,
  reqUrl,
  collectionFound,
  onToggleExpand,
  onMoveStep,
  onRemove,
  onToggleContinueOnError,
  onAddCapture,
  onUpdateCapture,
  onRemoveCapture,
}) => {
  return (
    <div className="flow-step" key={step.id}>
      <div className="flow-step-header" onClick={onToggleExpand}>
        <span className="flow-step-index">{index + 1}</span>
        {reqMethod ? (
          <>
            <span
              className="flow-step-method"
              style={{
                color: METHOD_COLORS[reqMethod] || "var(--text-secondary)",
              }}
            >
              {reqMethod}
            </span>
            <span className="flow-step-name">{reqName}</span>
            <span className="flow-step-url">{reqUrl}</span>
          </>
        ) : (
          <span className="flow-step-missing">
            Missing request
            {collectionFound ? "" : " (collection deleted)"}
          </span>
        )}
        <div className="flow-step-controls">
          <button
            className="flow-step-move"
            onClick={(e) => {
              e.stopPropagation();
              onMoveStep(-1);
            }}
            disabled={index === 0}
            title="Move up"
          >
            ↑
          </button>
          <button
            className="flow-step-move"
            onClick={(e) => {
              e.stopPropagation();
              onMoveStep(1);
            }}
            disabled={index === totalSteps - 1}
            title="Move down"
          >
            ↓
          </button>
          <button
            className="flow-step-remove"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Remove step"
          >
            ×
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="flow-step-detail">
          <label className="flow-step-checkbox">
            <input
              type="checkbox"
              checked={step.continueOnError}
              onChange={onToggleContinueOnError}
            />
            Continue on error
          </label>

          <div className="flow-step-captures">
            <div className="flow-step-captures-header">
              <span>Step Captures</span>
              <button
                className="flow-step-captures-add"
                onClick={onAddCapture}
              >
                + Capture
              </button>
            </div>
            {step.captures.length === 0 && (
              <div className="flow-step-captures-empty">
                No step-level captures. The request's own captures will still
                apply.
              </div>
            )}
            {step.captures.map((cap) => (
              <div className="flow-step-capture-row" key={cap.id}>
                <input
                  className="flow-step-capture-input"
                  placeholder="Variable name"
                  value={cap.varName}
                  onChange={(e) =>
                    onUpdateCapture(cap.id, { varName: e.target.value })
                  }
                />
                <select
                  className="flow-step-capture-select"
                  value={cap.source}
                  onChange={(e) =>
                    onUpdateCapture(cap.id, {
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
                    cap.source === "body"
                      ? "JSON path (e.g. data.token)"
                      : cap.source === "header"
                        ? "Header name"
                        : ""
                  }
                  value={cap.path}
                  onChange={(e) =>
                    onUpdateCapture(cap.id, { path: e.target.value })
                  }
                  disabled={cap.source === "status"}
                />
                <button
                  className="flow-step-capture-remove"
                  onClick={() => onRemoveCapture(cap.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {index < totalSteps - 1 && (
        <div className="flow-step-connector">↓</div>
      )}
    </div>
  );
};

export default FlowStepRow;
