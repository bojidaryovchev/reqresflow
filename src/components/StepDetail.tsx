import React, { useState } from "react";
import { FlowRunStepResult } from "../types/electron";
import StepCapturesContent from "./StepCapturesContent";
import StepRequestContent from "./StepRequestContent";
import StepResponseContent from "./StepResponseContent";

type DetailTab = "response" | "request" | "captures";

const StepDetail: React.FC<{ result: FlowRunStepResult }> = ({ result }) => {
  const [detailTab, setDetailTab] = useState<DetailTab>("response");
  const exec = result.execution;

  if (!exec) {
    return <div className="flow-runner-detail-empty">Step was skipped.</div>;
  }

  return (
    <div className="flow-runner-detail">
      <div className="flow-runner-detail-tabs">
        <button
          className={`flow-runner-detail-tab ${detailTab === "response" ? "active" : ""}`}
          onClick={() => setDetailTab("response")}
        >
          Response
        </button>
        <button
          className={`flow-runner-detail-tab ${detailTab === "request" ? "active" : ""}`}
          onClick={() => setDetailTab("request")}
        >
          Request
        </button>
        <button
          className={`flow-runner-detail-tab ${detailTab === "captures" ? "active" : ""}`}
          onClick={() => setDetailTab("captures")}
        >
          Captures
          {exec.capturedValues.length > 0 && (
            <span className="flow-runner-detail-badge">
              {exec.capturedValues.length}
            </span>
          )}
        </button>
      </div>

      {detailTab === "response" && <StepResponseContent execution={exec} />}
      {detailTab === "request" && <StepRequestContent execution={exec} />}
      {detailTab === "captures" && <StepCapturesContent execution={exec} />}
    </div>
  );
};

export default StepDetail;
