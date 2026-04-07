import React from "react";
import { FlowRunStepResult } from "../types/electron";

const StepCapturesContent: React.FC<{
  execution: FlowRunStepResult["execution"];
}> = ({ execution }) => {
  if (!execution) return null;
  const exec = execution;

  return (
    <div className="flow-runner-detail-content">
      {exec.capturedValues.length === 0 ? (
        <div className="flow-runner-detail-empty">
          No values were captured in this step.
        </div>
      ) : (
        <table className="flow-runner-captures-table">
          <thead>
            <tr>
              <th>Variable</th>
              <th>Source</th>
              <th>Path</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {exec.capturedValues.map((cv, i) => (
              <tr key={i}>
                <td className="flow-runner-capture-var">
                  {`{{${cv.varName}}}`}
                </td>
                <td>{cv.source}</td>
                <td>{cv.path || "—"}</td>
                <td className="flow-runner-capture-value">{cv.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StepCapturesContent;
