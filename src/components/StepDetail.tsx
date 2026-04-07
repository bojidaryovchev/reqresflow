import React, { useState } from "react";
import { FlowRunStepResult } from "../types/electron";
import { formatSize, getStatusClass, tryPrettyJson } from "../utils/helpers";
import { METHOD_COLORS, detectResponseLanguage } from "../utils/http";
import CodeEditor from "./CodeEditor";

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

type DetailTab = "response" | "request" | "captures";

const StepDetail: React.FC<{ result: FlowRunStepResult }> = ({ result }) => {
  const [detailTab, setDetailTab] = useState<DetailTab>("response");
  const exec = result.execution;

  if (!exec) {
    return <div className="flow-runner-detail-empty">Step was skipped.</div>;
  }

  const responseBody = exec.response?.body || "";
  const responseLang = exec.response
    ? detectResponseLanguage(exec.response)
    : "text";

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

      {detailTab === "response" && (
        <div className="flow-runner-detail-content">
          {exec.error && (
            <div className="flow-runner-error-box">{exec.error}</div>
          )}
          {exec.response && (
            <>
              <div className="flow-runner-response-meta">
                <span
                  className={`flow-runner-status status-${getStatusClass(exec.response.status)}`}
                >
                  {exec.response.status} {exec.response.statusText}
                </span>
                <span className="flow-runner-meta-item">
                  {exec.response.time}ms
                </span>
                <span className="flow-runner-meta-item">
                  {formatSize(exec.response.size)}
                </span>
              </div>
              <div className="flow-runner-response-headers">
                <strong>Headers</strong>
                <div className="flow-runner-headers-grid">
                  {Object.entries(exec.response.headers).map(([k, v]) => (
                    <React.Fragment key={k}>
                      <span className="flow-runner-header-key">{k}</span>
                      <span className="flow-runner-header-value">{v}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div className="flow-runner-response-body">
                <strong>Body</strong>
                <CodeEditor
                  value={
                    responseLang === "json"
                      ? tryPrettyJson(responseBody)
                      : responseBody
                  }
                  onChange={noop}
                  language={responseLang}
                  readOnly={true}
                />
              </div>
            </>
          )}
          {!exec.response && !exec.error && (
            <div className="flow-runner-detail-empty">No response.</div>
          )}
        </div>
      )}

      {detailTab === "request" && (
        <div className="flow-runner-detail-content">
          <div className="flow-runner-request-line">
            <span
              style={{
                color:
                  METHOD_COLORS[exec.resolvedMethod] || "var(--text-secondary)",
                fontWeight: 600,
              }}
            >
              {exec.resolvedMethod}
            </span>{" "}
            <span className="flow-runner-request-url">{exec.resolvedUrl}</span>
          </div>
          <div className="flow-runner-response-headers">
            <strong>Headers Sent</strong>
            <div className="flow-runner-headers-grid">
              {Object.entries(exec.resolvedHeaders).map(([k, v]) => (
                <React.Fragment key={k}>
                  <span className="flow-runner-header-key">{k}</span>
                  <span className="flow-runner-header-value">{v}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
          {exec.resolvedBody && (
            <div className="flow-runner-response-body">
              <strong>Body Sent</strong>
              <CodeEditor
                value={tryPrettyJson(exec.resolvedBody)}
                onChange={noop}
                language="json"
                readOnly={true}
              />
            </div>
          )}
        </div>
      )}

      {detailTab === "captures" && (
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
      )}
    </div>
  );
};

export default StepDetail;
