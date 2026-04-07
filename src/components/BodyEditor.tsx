import React from "react";
import { Payload, RequestTab } from "../types/electron";
import BodyTypeSelector from "./BodyTypeSelector";
import CodeEditor from "./CodeEditor";
import FormDataEditor from "./FormDataEditor";
import GraphQLEditor from "./GraphQLEditor";
import PayloadTabsBar from "./PayloadTabsBar";

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
    updated: {
      enabled: boolean;
      key: string;
      value: string;
      type: "text" | "file";
    }[],
  ) => {
    onUpdateTab({
      payloads: tab.payloads.map((p) =>
        p.id === tab.activePayloadId ? { ...p, formData: updated } : p,
      ),
    });
  };

  return (
    <div className="body-editor">
      <BodyTypeSelector
        bodyType={tab.bodyType}
        rawLanguage={tab.rawLanguage}
        activePayloadId={tab.activePayloadId}
        payloads={tab.payloads}
        onUpdateTab={onUpdateTab}
      />
      <PayloadTabsBar
        payloads={tab.payloads}
        activePayloadId={tab.activePayloadId}
        activePayloadName={activePayload?.name}
        onSelectPayload={(id) => onUpdateTab({ activePayloadId: id })}
        onAddPayload={onAddPayload}
        onRemovePayload={onRemovePayload}
        onRenamePayload={onRenamePayload}
      />
      {tab.bodyType === "none" && (
        <div className="body-none-info">This request does not have a body.</div>
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
          <FormDataEditor
            fields={activePayload.formData}
            bodyType={tab.bodyType}
            envVariables={envVariables}
            envName={envName}
            onUpdate={updateFormData}
          />
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
        <GraphQLEditor
          query={activePayload.graphql.query}
          variables={activePayload.graphql.variables}
          envVariables={envVariables}
          envName={envName}
          onQueryChange={(val) =>
            onUpdateTab({
              payloads: tab.payloads.map((p) =>
                p.id === tab.activePayloadId
                  ? { ...p, graphql: { ...p.graphql, query: val } }
                  : p,
              ),
            })
          }
          onVariablesChange={(val) =>
            onUpdateTab({
              payloads: tab.payloads.map((p) =>
                p.id === tab.activePayloadId
                  ? { ...p, graphql: { ...p.graphql, variables: val } }
                  : p,
              ),
            })
          }
        />
      )}
    </div>
  );
};

export default BodyEditor;
