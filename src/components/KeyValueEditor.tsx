import React, { useMemo } from "react";
import AutoSuggestInput from "./AutoSuggestInput";
import { HTTP_HEADER_NAMES, HEADER_VALUE_SUGGESTIONS } from "../utils/http-headers";

export interface KeyValuePair {
  enabled: boolean;
  key: string;
  value: string;
}

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  variables?: { key: string; value: string }[];
  /** When true, show HTTP header name/value autocomplete */
  headerMode?: boolean;
  /** Name of the active environment (shown in hover tooltip) */
  envName?: string;
}

const KeyValueEditor: React.FC<KeyValueEditorProps> = ({
  pairs,
  onChange,
  variables = [],
  headerMode = false,
  envName,
}) => {
  const updatePair = (
    index: number,
    field: keyof KeyValuePair,
    value: string | boolean,
  ) => {
    const updated = pairs.map((p, i) =>
      i === index ? { ...p, [field]: value } : p,
    );
    onChange(updated);
  };

  const removePair = (index: number) => {
    onChange(pairs.filter((_, i) => i !== index));
  };

  const addPair = () => {
    onChange([...pairs, { enabled: true, key: "", value: "" }]);
  };

  /** Get value suggestions based on the current header key */
  const getValueSuggestions = (key: string): string[] => {
    if (!headerMode || !key) return [];
    const normalized = key.toLowerCase();
    const match = Object.keys(HEADER_VALUE_SUGGESTIONS).find(
      (k) => k.toLowerCase() === normalized,
    );
    return match ? HEADER_VALUE_SUGGESTIONS[match] : [];
  };

  const keySuggestions = useMemo(
    () => (headerMode ? HTTP_HEADER_NAMES : undefined),
    [headerMode],
  );

  return (
    <div className="kv-editor">
      {pairs.map((pair, i) => (
        <div className="kv-row" key={i}>
          <input
            type="checkbox"
            checked={pair.enabled}
            onChange={(e) => updatePair(i, "enabled", e.target.checked)}
          />
          <AutoSuggestInput
            type="text"
            placeholder="Key"
            value={pair.key}
            onValueChange={(v) => updatePair(i, "key", v)}
            variables={variables}
            suggestions={keySuggestions}
            envName={envName}
          />
          <AutoSuggestInput
            type="text"
            placeholder="Value"
            value={pair.value}
            onValueChange={(v) => updatePair(i, "value", v)}
            variables={variables}
            suggestions={getValueSuggestions(pair.key)}
            envName={envName}
          />
          <button
            className="kv-remove-btn"
            onClick={() => removePair(i)}
            title="Remove"
          >
            ×
          </button>
        </div>
      ))}
      <button className="kv-add-btn" onClick={addPair}>
        + Add
      </button>
    </div>
  );
};

export default KeyValueEditor;
