import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface AutoSuggestInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variables: { key: string; value: string }[];
  onValueChange: (value: string) => void;
  value: string;
  /** Plain-text suggestions (e.g. header names). Shown when not inside {{ }} */
  suggestions?: string[];
}

const AutoSuggestInput: React.FC<AutoSuggestInputProps> = ({
  variables,
  onValueChange,
  value,
  suggestions,
  ...inputProps
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  /** "variables" = {{env}} mode, "suggestions" = plain autocomplete mode */
  const [suggestMode, setSuggestMode] = useState<"variables" | "suggestions">("variables");
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updateDropdownPos = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 2, left: rect.left, width: rect.width });
    }
  }, []);

  const filtered =
    suggestMode === "variables"
      ? variables.filter(
          (v) => v.key && v.key.toLowerCase().includes(filter.toLowerCase()),
        )
      : [];

  const filteredSuggestions =
    suggestMode === "suggestions" && suggestions
      ? suggestions.filter(
          (s) => s.toLowerCase().includes(filter.toLowerCase()) && s.toLowerCase() !== filter.toLowerCase(),
        )
      : [];

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter, suggestMode]);

  // Reposition dropdown when visible
  useEffect(() => {
    if (!showSuggestions) return;
    updateDropdownPos();
    const onScrollOrResize = () => updateDropdownPos();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [showSuggestions, updateDropdownPos]);

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
      setSuggestMode("variables");
      setFilter(match.partial);
      setShowSuggestions(true);
    } else if (suggestions && suggestions.length > 0 && newValue.length > 0 && !newValue.includes("{{")) {
      setSuggestMode("suggestions");
      setFilter(newValue);
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

  const insertSuggestion = (suggestion: string) => {
    onValueChange(suggestion);
    setShowSuggestions(false);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(suggestion.length, suggestion.length);
      }
    });
  };

  const activeList =
    suggestMode === "variables"
      ? filtered.map((v) => ({ label: v.key, detail: v.value }))
      : filteredSuggestions.map((s) => ({ label: s, detail: "" }));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || activeList.length === 0) {
      inputProps.onKeyDown?.(e);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, activeList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (suggestMode === "variables") {
        insertVariable(filtered[selectedIndex].key);
      } else {
        insertSuggestion(filteredSuggestions[selectedIndex]);
      }
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

  // Build highlighted segments for the overlay
  const highlightedParts = React.useMemo(() => {
    const parts: { text: string; isVar: boolean }[] = [];
    const regex = /\{\{\w+\}\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(value)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: value.slice(lastIndex, match.index), isVar: false });
      }
      parts.push({ text: match[0], isVar: true });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < value.length) {
      parts.push({ text: value.slice(lastIndex), isVar: false });
    }
    return parts;
  }, [value]);

  const hasVars = highlightedParts.some((p) => p.isVar);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Sync overlay scroll with input scroll
  const handleScroll = useCallback(() => {
    if (inputRef.current && highlightRef.current) {
      highlightRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  }, []);

  // Strip out props we handle ourselves so they don't conflict
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onKeyDown: _ok, onBlur: _ob, onChange: _oc, ...rest } = inputProps;

  return (
    <div className={`autosuggest-wrapper${hasVars ? " has-vars" : ""}`}>
      {hasVars && (
        <div className="autosuggest-highlight" ref={highlightRef} aria-hidden>
          {highlightedParts.map((part, i) =>
            part.isVar ? (
              <span key={i} className="env-var-highlight">{part.text}</span>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </div>
      )}
      <input
        {...rest}
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onScroll={handleScroll}
      />
      {showSuggestions && activeList.length > 0 && createPortal(
        <div
          className="autosuggest-dropdown"
          ref={dropdownRef}
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          {activeList.map((item, i) => (
            <div
              key={item.label}
              className={`autosuggest-item ${i === selectedIndex ? "selected" : ""}`}
              onMouseDown={() =>
                suggestMode === "variables"
                  ? insertVariable(item.label)
                  : insertSuggestion(item.label)
              }
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="autosuggest-var-name">{item.label}</span>
              {item.detail && (
                <span className="autosuggest-var-value">{item.detail}</span>
              )}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
};

export default AutoSuggestInput;
