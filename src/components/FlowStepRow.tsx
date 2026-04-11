import React from "react";
import { FlowStep, Payload, ResponseCapture } from "../types/electron";
import { METHOD_COLORS } from "../utils/http";
import StepCaptureRow from "./StepCaptureRow";

interface FlowStepRowProps {
  step: FlowStep;
  index: number;
  totalSteps: number;
  isExpanded: boolean;
  reqMethod?: string;
  reqName?: string;
  reqUrl?: string;
  payloads?: Payload[];
  collectionFound: boolean;
  onToggleExpand: () => void;
  onMoveStep: (direction: -1 | 1) => void;
  onRemove: () => void;
  onToggleContinueOnError: () => void;
  onChangePayload: (payloadId: string | null) => void;
  onAddCapture: () => void;
  onUpdateCapture: (
    captureId: string,
    updates: Partial<ResponseCapture>,
  ) => void;
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
  payloads,
  collectionFound,
  onToggleExpand,
  onMoveStep,
  onRemove,
  onToggleContinueOnError,
  onChangePayload,
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

          {payloads && payloads.length > 1 && (
            <div className="flow-step-payload">
              <label className="flow-step-payload-label">Payload Variant</label>
              <select
                className="flow-step-payload-select"
                value={step.payloadId || ""}
                onChange={(e) => onChangePayload(e.target.value || null)}
              >
                <option value="">Default (request's active payload)</option>
                {payloads.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || "Unnamed payload"}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flow-step-captures">
            <div className="flow-step-captures-header">
              <span>Step Captures</span>
              <button className="flow-step-captures-add" onClick={onAddCapture}>
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
              <StepCaptureRow
                key={cap.id}
                capture={cap}
                onUpdate={onUpdateCapture}
                onRemove={onRemoveCapture}
              />
            ))}
          </div>
        </div>
      )}

      {index < totalSteps - 1 && <div className="flow-step-connector">↓</div>}
    </div>
  );
};

export default FlowStepRow;
