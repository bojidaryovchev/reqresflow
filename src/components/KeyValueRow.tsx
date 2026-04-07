import React from "react";
import AutoSuggestInput from "./AutoSuggestInput";
import { KeyValuePair } from "./KeyValueEditor";

interface KeyValueRowProps {
  pair: KeyValuePair;
  keySuggestions?: string[];
  valueSuggestions: string[];
  variables: { key: string; value: string }[];
  envName?: string;
  onUpdate: (field: keyof KeyValuePair, value: string | boolean) => void;
  onRemove: () => void;
}

const KeyValueRow: React.FC<KeyValueRowProps> = ({
  pair,
  keySuggestions,
  valueSuggestions,
  variables,
  envName,
  onUpdate,
  onRemove,
}) => (
  <div className="kv-row">
    <input
      type="checkbox"
      checked={pair.enabled}
      onChange={(e) => onUpdate("enabled", e.target.checked)}
    />
    <AutoSuggestInput
      type="text"
      placeholder="Key"
      value={pair.key}
      onValueChange={(v) => onUpdate("key", v)}
      variables={variables}
      suggestions={keySuggestions}
      envName={envName}
    />
    <AutoSuggestInput
      type="text"
      placeholder="Value"
      value={pair.value}
      onValueChange={(v) => onUpdate("value", v)}
      variables={variables}
      suggestions={valueSuggestions}
      envName={envName}
    />
    <button className="kv-remove-btn" onClick={onRemove} title="Remove">
      ×
    </button>
  </div>
);

export default KeyValueRow;
