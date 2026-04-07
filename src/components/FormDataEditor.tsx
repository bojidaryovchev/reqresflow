import React from "react";
import AutoSuggestInput from "./AutoSuggestInput";

interface FormDataField {
  enabled: boolean;
  key: string;
  value: string;
  type: "text" | "file";
}

interface FormDataEditorProps {
  fields: FormDataField[];
  bodyType: "form-data" | "x-www-form-urlencoded";
  envVariables: { key: string; value: string }[];
  envName?: string;
  onUpdate: (updated: FormDataField[]) => void;
}

const FormDataEditor: React.FC<FormDataEditorProps> = ({
  fields,
  bodyType,
  envVariables,
  envName,
  onUpdate,
}) => {
  return (
    <div className="form-data-editor">
      {fields.map((field, i) => (
        <div className="form-data-row" key={i}>
          <input
            type="checkbox"
            checked={field.enabled}
            onChange={(e) => {
              const updated = [...fields];
              updated[i] = { ...updated[i], enabled: e.target.checked };
              onUpdate(updated);
            }}
          />
          <AutoSuggestInput
            type="text"
            placeholder="Key"
            value={field.key}
            onValueChange={(v) => {
              const updated = [...fields];
              updated[i] = { ...updated[i], key: v };
              onUpdate(updated);
            }}
            variables={envVariables}
            envName={envName}
          />
          <AutoSuggestInput
            type="text"
            placeholder="Value"
            value={field.value}
            onValueChange={(v) => {
              const updated = [...fields];
              updated[i] = { ...updated[i], value: v };
              onUpdate(updated);
            }}
            variables={envVariables}
            envName={envName}
          />
          {bodyType === "form-data" && (
            <select
              className="form-data-type-select"
              value={field.type}
              onChange={(e) => {
                const updated = [...fields];
                updated[i] = {
                  ...updated[i],
                  type: e.target.value as "text" | "file",
                };
                onUpdate(updated);
              }}
            >
              <option value="text">Text</option>
              <option value="file">File</option>
            </select>
          )}
          <button
            className="kv-remove-btn"
            onClick={() => {
              const updated = fields.filter((_, j) => j !== i);
              onUpdate(updated);
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
            ...fields,
            { enabled: true, key: "", value: "", type: "text" as const },
          ];
          onUpdate(updated);
        }}
      >
        + Add
      </button>
    </div>
  );
};

export default FormDataEditor;
