import React from "react";
import AutoSuggestInput from "./AutoSuggestInput";

interface FormDataField {
  enabled: boolean;
  key: string;
  value: string;
  type: "text" | "file";
}

interface FormDataRowProps {
  field: FormDataField;
  bodyType: "form-data" | "x-www-form-urlencoded";
  envVariables: { key: string; value: string }[];
  envName?: string;
  onUpdate: (updates: Partial<FormDataField>) => void;
  onRemove: () => void;
}

const FormDataRow: React.FC<FormDataRowProps> = ({
  field,
  bodyType,
  envVariables,
  envName,
  onUpdate,
  onRemove,
}) => (
  <div className="form-data-row">
    <input
      type="checkbox"
      checked={field.enabled}
      onChange={(e) => onUpdate({ enabled: e.target.checked })}
    />
    <AutoSuggestInput
      type="text"
      placeholder="Key"
      value={field.key}
      onValueChange={(v) => onUpdate({ key: v })}
      variables={envVariables}
      envName={envName}
    />
    <AutoSuggestInput
      type="text"
      placeholder="Value"
      value={field.value}
      onValueChange={(v) => onUpdate({ value: v })}
      variables={envVariables}
      envName={envName}
    />
    {bodyType === "form-data" && (
      <select
        className="form-data-type-select"
        value={field.type}
        onChange={(e) => onUpdate({ type: e.target.value as "text" | "file" })}
      >
        <option value="text">Text</option>
        <option value="file">File</option>
      </select>
    )}
    <button className="kv-remove-btn" onClick={onRemove} title="Remove">
      ×
    </button>
  </div>
);

export default FormDataRow;
