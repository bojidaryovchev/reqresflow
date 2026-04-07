import React from "react";
import FormDataRow from "./FormDataRow";

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
        <FormDataRow
          key={i}
          field={field}
          bodyType={bodyType}
          envVariables={envVariables}
          envName={envName}
          onUpdate={(updates) => {
            const updated = [...fields];
            updated[i] = { ...updated[i], ...updates };
            onUpdate(updated);
          }}
          onRemove={() => onUpdate(fields.filter((_, j) => j !== i))}
        />
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
