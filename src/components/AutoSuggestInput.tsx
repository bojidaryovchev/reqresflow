import React, { useEffect, useRef, useState } from "react";

interface AutoSuggestInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variables: { key: string; value: string }[];
  onValueChange: (value: string) => void;
  value: string;
}

const AutoSuggestInput: React.FC<AutoSuggestInputProps> = ({
  variables,
  onValueChange,
  value,
  ...inputProps
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = variables.filter(
    (v) => v.key && v.key.toLowerCase().includes(filter.toLowerCase()),
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const findOpenBraces = (
    text: string,
    cursor: number,
  ): { start: number; partial: string } | null => {
    // Look backwards from cursor for {{ without a closing }}
    const before = text.slice(0, cursor);
    const lastOpen = before.lastIndexOf("{{");
    if (lastOpen === -1) return null;
    const between = before.slice(lastOpen + 2);
    // If there's a }} between the {{ and cursor, it's already closed
    if (between.includes("}}")) return null;
    return { start: lastOpen, partial: between };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart ?? newValue.length;
    onValueChange(newValue);
    setCursorPos(cursor);

    const match = findOpenBraces(newValue, cursor);
    if (match) {
      setFilter(match.partial);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const insertVariable = (varName: string) => {
    const match = findOpenBraces(value, cursorPos);
    if (!match) return;

    const before = value.slice(0, match.start);
    const after = value.slice(cursorPos);
    // Check if }} already follows
    const closingBraces = after.startsWith("}}") ? "" : "}}";
    const newValue = `${before}{{${varName}${closingBraces}${after}`;
    onValueChange(newValue);
    setShowSuggestions(false);

    // Restore focus and move cursor after the inserted variable
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursor =
          before.length + 2 + varName.length + closingBraces.length;
        inputRef.current.setSelectionRange(newCursor, newCursor);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filtered.length === 0) {
      // Call the original onKeyDown if provided
      inputProps.onKeyDown?.(e);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertVariable(filtered[selectedIndex].key);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowSuggestions(false);
    } else {
      inputProps.onKeyDown?.(e);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Delay to allow click on dropdown item
    setTimeout(() => setShowSuggestions(false), 150);
    inputProps.onBlur?.(e);
  };

  // Strip out props we handle ourselves so they don't conflict
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onKeyDown: _ok, onBlur: _ob, onChange: _oc, ...rest } = inputProps;

  return (
    <div className="autosuggest-wrapper">
      <input
        {...rest}
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
      {showSuggestions && filtered.length > 0 && (
        <div className="autosuggest-dropdown" ref={dropdownRef}>
          {filtered.map((v, i) => (
            <div
              key={v.key}
              className={`autosuggest-item ${i === selectedIndex ? "selected" : ""}`}
              onMouseDown={() => insertVariable(v.key)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="autosuggest-var-name">{v.key}</span>
              <span className="autosuggest-var-value">{v.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutoSuggestInput;
