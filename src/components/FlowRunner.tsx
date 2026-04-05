import React, { useState } from "react";
import { FlowRunState, FlowRunStepResult, RawLanguage } from "../types/electron";
import CodeEditor from "./CodeEditor";

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

interface FlowRunnerProps {
  runState: FlowRunState;
  onClose: () => void;
  onAbort: () => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "var(--method-get)",
  POST: "var(--method-post)",
  PUT: "var(--method-put)",
  PATCH: "var(--method-patch)",
  DELETE: "var(--method-delete)",
};

function getStatusClass(status: number): string {
  if (status >= 200 && status < 300) return "success";
  if (status >= 300 && status < 400) return "redirect";
  if (status >= 400 && status < 500) return "client-error";
  return "server-error";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function tryPrettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function detectLanguage(headers: Record<string, string>, body: string): RawLanguage {
  const ct = (
    headers["content-type"] ||
    headers["Content-Type"] ||
    ""
  ).toLowerCase();
  if (ct.includes("json")) return "json";
  if (ct.includes("xml")) return "xml";
  if (ct.includes("html")) return "html";
  const trimmed = body.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (trimmed.startsWith("<?xml")) return "xml";
  return "text";
}

type DetailTab = "response" | "request" | "captures";

const StepDetail: React.FC<{ result: FlowRunStepResult }> = ({ result }) => {
  const [detailTab, setDetailTab] = useState<DetailTab>("response");
  const exec = result.execution;

  if (!exec) {
    return (
      <div className="flow-runner-detail-empty">
        Step was skipped.
      </div>
    );
  }

  const responseBody = exec.response?.body || "";
  const responseLang = exec.response
    ? detectLanguage(exec.response.headers, exec.response.body)
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
                  METHOD_COLORS[exec.resolvedMethod] ||
                  "var(--text-secondary)",
                fontWeight: 600,
              }}
            >
              {exec.resolvedMethod}
            </span>{" "}
            <span className="flow-runner-request-url">
              {exec.resolvedUrl}
            </span>
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
            <div
              className={`flow-runner-step ${selectedStepIndex === index ? "selected" : ""} ${result.status}`}
              key={result.stepId}
              onClick={() => setSelectedStepIndex(index)}
            >
              <span className="flow-runner-step-icon">
                {result.status === "success"
                  ? "✓"
                  : result.status === "error"
                    ? "✗"
                    : result.status === "skipped"
                      ? "⏭"
                      : "⋯"}
              </span>
              <span className="flow-runner-step-index">{index + 1}.</span>
              <span
                className="flow-runner-step-method"
                style={{
                  color:
                    METHOD_COLORS[result.requestMethod] ||
                    "var(--text-secondary)",
                }}
              >
                {result.requestMethod}
              </span>
              <span className="flow-runner-step-name">
                {result.requestName}
              </span>
              {result.execution?.response && (
                <span
                  className={`flow-runner-step-status status-${getStatusClass(result.execution.response.status)}`}
                >
                  {result.execution.response.status}
                </span>
              )}
              <span className="flow-runner-step-time">
                {result.durationMs}ms
              </span>
            </div>
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
