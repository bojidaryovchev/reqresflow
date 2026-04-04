import React from 'react';

export interface KeyValuePair {
  enabled: boolean;
  key: string;
  value: string;
}

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
}

const KeyValueEditor: React.FC<KeyValueEditorProps> = ({ pairs, onChange }) => {
  const updatePair = (index: number, field: keyof KeyValuePair, value: string | boolean) => {
    const updated = pairs.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    onChange(updated);
  };

  const removePair = (index: number) => {
    onChange(pairs.filter((_, i) => i !== index));
  };

  const addPair = () => {
    onChange([...pairs, { enabled: true, key: '', value: '' }]);
  };

  return (
    <div className="kv-editor">
      {pairs.map((pair, i) => (
        <div className="kv-row" key={i}>
          <input
            type="checkbox"
            checked={pair.enabled}
            onChange={(e) => updatePair(i, 'enabled', e.target.checked)}
          />
          <input
            type="text"
            placeholder="Key"
            value={pair.key}
            onChange={(e) => updatePair(i, 'key', e.target.value)}
          />
          <input
            type="text"
            placeholder="Value"
            value={pair.value}
            onChange={(e) => updatePair(i, 'value', e.target.value)}
          />
          <button className="kv-remove-btn" onClick={() => removePair(i)} title="Remove">
            ×
          </button>
        </div>
      ))}
      <button className="kv-add-btn" onClick={addPair}>+ Add</button>
    </div>
  );
};

export default KeyValueEditor;
