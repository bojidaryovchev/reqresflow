import React from "react";
import AutoSuggestInput from "./AutoSuggestInput";
import { type HttpMethod, METHOD_COLORS } from "../utils/http";

interface UrlBarProps {
  method: string;
  url: string;
  loading: boolean;
  isDirty: boolean;
  savedRequestId: string | null;
  envVariables: { key: string; value: string }[];
  envName?: string;
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  onSave: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

const UrlBar: React.FC<UrlBarProps> = ({
  method,
  url,
  loading,
  isDirty,
  savedRequestId,
  envVariables,
  envName,
  onMethodChange,
  onUrlChange,
  onSend,
  onSave,
  onKeyDown,
}) => (
  <div className="url-bar">
    <select
      className="method-select"
      value={method}
      onChange={(e) => onMethodChange(e.target.value)}
      style={{
        color: METHOD_COLORS[method as HttpMethod],
      }}
    >
      {(["GET", "POST", "PUT", "PATCH", "DELETE"] as HttpMethod[]).map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
    <AutoSuggestInput
      className="url-input"
      type="text"
      placeholder="Enter request URL..."
      value={url}
      onValueChange={onUrlChange}
      variables={envVariables}
      envName={envName}
      onKeyDown={onKeyDown}
    />
    <button
      className="send-btn"
      onClick={onSend}
      disabled={loading || !url.trim()}
    >
      {loading ? "Sending..." : "Send"}
    </button>
    <button
      className={`save-btn${isDirty ? " dirty" : ""}`}
      onClick={onSave}
      disabled={savedRequestId ? !isDirty : false}
      title={
        !savedRequestId
          ? "Save to collection (Ctrl+S)"
          : isDirty
            ? "Save changes to collection (Ctrl+S)"
            : "No unsaved changes"
      }
    >
      {savedRequestId ? "Save" : "Save"}
    </button>
  </div>
);

export default UrlBar;
