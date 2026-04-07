import React from "react";
import AutoSuggestInput from "./AutoSuggestInput";
import CodeEditor from "./CodeEditor";
import {
  BodyType,
  Payload,
  RawLanguage,
  RequestTab,
} from "../types/electron";

interface BodyEditorProps {
  tab: RequestTab;
  activePayload: Payload | null;
  body: string;
  envVariables: { key: string; value: string }[];
  envName?: string;
  onUpdateTab: (updates: Partial<RequestTab>) => void;
  onAddPayload: () => void;
  onRemovePayload: (id: string) => void;
  onRenamePayload: (id: string, name: string) => void;
  onUpdatePayloadBody: (value: string) => void;
}

const BodyEditor: React.FC<BodyEditorProps> = ({
  tab,
  activePayload,
  body,
  envVariables,
  envName,
  onUpdateTab,
  onAddPayload,
  onRemovePayload,
  onRenamePayload,
  onUpdatePayloadBody,
}) => {
  const updateFormData = (
    updated: { enabled: boolean; key: string; value: string; type: "text" | "file" }[],
  ) => {
    onUpdateTab({
      payloads: tab.payloads.map((p) =>
        p.id === tab.activePayloadId ? { ...p, formData: updated } : p,
      ),
    });
  };

  return (
    <div className="body-editor">
      <div className="body-type-bar">
        {(
          [
            "none",
            "form-data",
            "x-www-form-urlencoded",
            "raw",
            "binary",
            "graphql",
          ] as BodyType[]
        ).map((bt) => (
          <label key={bt} className="body-type-option">
            <input
              type="radio"
              name="bodyType"
              checked={tab.bodyType === bt}
              onChange={() => {
                if (activePayload) {
                  onUpdateTab({
                    bodyType: bt,
                    payloads: tab.payloads.map((p) =>
                      p.id === tab.activePayloadId
                        ? { ...p, bodyType: bt }
                        : p,
                    ),
                  });
                } else {
                  onUpdateTab({ bodyType: bt });
                }
              }}
            />
            <span>{bt}</span>
          </label>
        ))}
        {tab.bodyType === "raw" && (
          <select
            className="raw-language-select"
            value={tab.rawLanguage}
            onChange={(e) => {
              const lang = e.target.value as RawLanguage;
              onUpdateTab({
                rawLanguage: lang,
                payloads: tab.payloads.map((p) =>
                  p.id === tab.activePayloadId
                    ? { ...p, rawLanguage: lang }
                    : p,
                ),
              });
            }}
          >
            <option value="json">JSON</option>
            <option value="text">Text</option>
            <option value="xml">XML</option>
            <option value="html">HTML</option>
            <option value="javascript">JavaScript</option>
          </select>
        )}
      </div>
      <div className="payload-bar">
        <div className="payload-tabs">
          {tab.payloads.map((p) => (
            <div
              key={p.id}
              className={`payload-tab ${p.id === tab.activePayloadId ? "active" : ""}`}
              onClick={() => onUpdateTab({ activePayloadId: p.id })}
            >
              <span className="payload-tab-name">{p.name}</span>
              {tab.payloads.length > 1 && (
                <button
                  className="payload-tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePayload(p.id);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            className="payload-add-btn"
            onClick={onAddPayload}
            title="Add payload variant"
          >
            +
          </button>
        </div>
        {activePayload && (
          <input
            className="payload-rename-input"
            value={activePayload.name}
            onChange={(e) => onRenamePayload(activePayload.id, e.target.value)}
            title="Rename payload"
          />
        )}
      </div>
      {tab.bodyType === "none" && (
        <div className="body-none-info">
          This request does not have a body.
        </div>
      )}
      {tab.bodyType === "raw" && (
        <CodeEditor
          value={body}
          onChange={onUpdatePayloadBody}
          language={tab.rawLanguage}
          placeholder={
            tab.rawLanguage === "json"
              ? '{"key": "value"}'
              : "Enter request body..."
          }
          showFormatButton
          variables={envVariables}
          envName={envName}
        />
      )}
      {(tab.bodyType === "form-data" ||
        tab.bodyType === "x-www-form-urlencoded") &&
        activePayload && (
          <div className="form-data-editor">
            {activePayload.formData.map((field, i) => (
              <div className="form-data-row" key={i}>
                <input
                  type="checkbox"
                  checked={field.enabled}
                  onChange={(e) => {
                    const updated = [...activePayload.formData];
                    updated[i] = { ...updated[i], enabled: e.target.checked };
                    updateFormData(updated);
                  }}
                />
                <AutoSuggestInput
                  type="text"
                  placeholder="Key"
                  value={field.key}
                  onValueChange={(v) => {
                    const updated = [...activePayload.formData];
                    updated[i] = { ...updated[i], key: v };
                    updateFormData(updated);
                  }}
                  variables={envVariables}
                  envName={envName}
                />
                <AutoSuggestInput
                  type="text"
                  placeholder="Value"
                  value={field.value}
                  onValueChange={(v) => {
                    const updated = [...activePayload.formData];
                    updated[i] = { ...updated[i], value: v };
                    updateFormData(updated);
                  }}
                  variables={envVariables}
                  envName={envName}
                />
                {tab.bodyType === "form-data" && (
                  <select
                    className="form-data-type-select"
                    value={field.type}
                    onChange={(e) => {
                      const updated = [...activePayload.formData];
                      updated[i] = {
                        ...updated[i],
                        type: e.target.value as "text" | "file",
                      };
                      updateFormData(updated);
                    }}
                  >
                    <option value="text">Text</option>
                    <option value="file">File</option>
                  </select>
                )}
                <button
                  className="kv-remove-btn"
                  onClick={() => {
                    const updated = activePayload.formData.filter(
                      (_, j) => j !== i,
                    );
                    updateFormData(updated);
                  }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              className="kv-add-btn"
              onClick={() => {
                const updated = [
                  ...activePayload.formData,
                  { enabled: true, key: "", value: "", type: "text" as const },
                ];
                updateFormData(updated);
              }}
            >
              + Add
            </button>
          </div>
        )}
      {tab.bodyType === "binary" && activePayload && (
        <div className="binary-editor">
          <div className="binary-info">
            Select a file to send as the request body.
          </div>
          <input
            type="text"
            className="binary-path-input"
            placeholder="File path (e.g. C:\files\image.png)"
            value={activePayload.binaryFilePath}
            onChange={(e) =>
              onUpdateTab({
                payloads: tab.payloads.map((p) =>
                  p.id === tab.activePayloadId
                    ? { ...p, binaryFilePath: e.target.value }
                    : p,
                ),
              })
            }
          />
        </div>
      )}
      {tab.bodyType === "graphql" && activePayload && (
        <div className="graphql-editor">
          <div className="graphql-section">
            <label className="graphql-label">Query</label>
            <CodeEditor
              value={activePayload.graphql.query}
              onChange={(val) =>
                onUpdateTab({
                  payloads: tab.payloads.map((p) =>
                    p.id === tab.activePayloadId
                      ? { ...p, graphql: { ...p.graphql, query: val } }
                      : p,
                  ),
                })
              }
              language="javascript"
              placeholder={"query {\n  users {\n    id\n    name\n  }\n}"}
              className="graphql-query"
              variables={envVariables}
              envName={envName}
            />
          </div>
          <div className="graphql-section">
            <label className="graphql-label">Variables (JSON)</label>
            <CodeEditor
              value={activePayload.graphql.variables}
              onChange={(val) =>
                onUpdateTab({
                  payloads: tab.payloads.map((p) =>
                    p.id === tab.activePayloadId
                      ? { ...p, graphql: { ...p.graphql, variables: val } }
                      : p,
                  ),
                })
              }
              language="json"
              placeholder='{"id": 1}'
              className="graphql-variables"
              showFormatButton
              variables={envVariables}
              envName={envName}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BodyEditor;
