import React, { useState, useCallback } from "react";
import CodeEditor from "./CodeEditor";
import { formatSize, getStatusClass, tryPrettyJson } from "../utils/helpers";
import { detectResponseLanguage } from "../utils/http";

interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

type ResponsePanelTab = "body" | "headers";

interface ResponsePanelProps {
  response: ResponseData | null;
  error: string | null;
  responsePanel: ResponsePanelTab;
  onPanelChange: (panel: ResponsePanelTab) => void;
  style?: React.CSSProperties;
}

const ResponsePanel: React.FC<ResponsePanelProps> = ({
  response,
  error,
  responsePanel,
  onPanelChange,
  style,
}) => {
  const [wordWrap, setWordWrap] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedHeaders, setCopiedHeaders] = useState(false);

  const copyBody = useCallback(async () => {
    if (!response) return;
    await navigator.clipboard.writeText(tryPrettyJson(response.body));
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 1500);
  }, [response]);

  const copyHeaders = useCallback(async () => {
    if (!response) return;
    const text = Object.entries(response.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedHeaders(true);
    setTimeout(() => setCopiedHeaders(false), 1500);
  }, [response]);

  return (
    <div className="response-section" style={style}>
      <div className="tabs">
        {(["body", "headers"] as ResponsePanelTab[]).map((tab) => (
          <button
            key={tab}
            className={`tab ${responsePanel === tab ? "active" : ""}`}
            onClick={() => onPanelChange(tab)}
          >
            {tab === "body" ? "Response Body" : "Response Headers"}
          </button>
        ))}
      </div>

      {error && <div className="response-error">{error}</div>}

      {!response && !error && (
        <div className="response-empty">Send a request to see the response</div>
      )}

      {response && (
        <>
          <div className="response-meta">
            <span
              className={`response-status ${getStatusClass(response.status)}`}
            >
              {response.status} {response.statusText}
            </span>
            <span className="response-time">{response.time} ms</span>
            <span className="response-size">{formatSize(response.size)}</span>
          </div>

          {responsePanel === "body" && (
            <div className={`response-body ${wordWrap ? "word-wrap-on" : ""}`}>
              <div className="response-body-toolbar">
                <button
                  className="response-toolbar-btn response-copy-body-btn"
                  onClick={copyBody}
                >
                  {copiedBody ? "Copied!" : "Copy"}
                </button>
                <button
                  className={`response-toolbar-btn response-word-wrap-btn ${wordWrap ? "active" : ""}`}
                  onClick={() => setWordWrap((w) => !w)}
                >
                  Word Wrap
                </button>
              </div>
              <CodeEditor
                value={tryPrettyJson(response.body)}
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                onChange={() => {}}
                language={detectResponseLanguage(response)}
                readOnly
              />
            </div>
          )}

          {responsePanel === "headers" && (
            <div className="response-headers-list">
              <div className="response-headers-toolbar">
                <button
                  className="response-toolbar-btn response-copy-headers-btn"
                  onClick={copyHeaders}
                >
                  {copiedHeaders ? "Copied!" : "Copy"}
                </button>
              </div>
              {Object.entries(response.headers).map(([key, value]) => (
                <div className="response-header-row" key={key}>
                  <span className="response-header-key">{key}</span>
                  <span className="response-header-value">{value}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export type { ResponsePanelTab };
export default ResponsePanel;
