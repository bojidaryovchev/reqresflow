import React, { useState } from "react";
import { FlowRunState } from "../types/electron";
import FlowStepResultItem from "./FlowStepResultItem";
import StepDetail from "./StepDetail";

interface FlowRunnerProps {
  runState: FlowRunState;
  onClose: () => void;
  onAbort: () => void;
}

const FlowRunner: React.FC<FlowRunnerProps> = ({
  runState,
  onClose,
  onAbort,
}) => {
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(
    null,
  );

  const selectedResult =
    selectedStepIndex !== null
      ? runState.stepResults[selectedStepIndex] || null
      : null;

  const passedCount = runState.stepResults.filter(
    (r) => r.status === "success",
  ).length;
  const failedCount = runState.stepResults.filter(
    (r) => r.status === "error",
  ).length;
  const skippedCount = runState.stepResults.filter(
    (r) => r.status === "skipped",
  ).length;

  return (
    <div className="flow-runner">
      <div className="flow-runner-header">
        <span className="flow-runner-title">Flow Results</span>
        <div className="flow-runner-header-actions">
          {runState.status === "running" && (
            <button className="flow-editor-btn secondary" onClick={onAbort}>
              ■ Stop
            </button>
          )}
          <button className="flow-editor-btn secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="flow-runner-summary">
        {runState.status === "running" && (
          <span className="flow-runner-running">
            Running step {runState.currentStepIndex + 1}...
          </span>
        )}
        {runState.status !== "running" && (
          <>
            <span className="flow-runner-stat success">
              {passedCount} passed
            </span>
            {failedCount > 0 && (
              <span className="flow-runner-stat error">
                {failedCount} failed
              </span>
            )}
            {skippedCount > 0 && (
              <span className="flow-runner-stat skipped">
                {skippedCount} skipped
              </span>
            )}
            <span className="flow-runner-stat">
              {runState.totalTime}ms total
            </span>
          </>
        )}
      </div>

      <div className="flow-runner-body">
        <div className="flow-runner-steps">
          {runState.stepResults.map((result, index) => (
            <FlowStepResultItem
              key={result.stepId}
              result={result}
              index={index}
              isSelected={selectedStepIndex === index}
              onClick={() => setSelectedStepIndex(index)}
              classPrefix="flow-runner"
            />
          ))}

          {/* Show placeholder for steps not yet run */}
          {runState.status === "running" &&
            runState.currentStepIndex >= runState.stepResults.length && (
              <div className="flow-runner-step running">
                <span className="flow-runner-step-icon">⋯</span>
                <span>Running...</span>
              </div>
            )}
        </div>

        <div className="flow-runner-detail-panel">
          {selectedResult ? (
            <StepDetail result={selectedResult} />
          ) : (
            <div className="flow-runner-detail-empty">
              Click a step to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlowRunner;
