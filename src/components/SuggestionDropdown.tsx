import React from "react";
import { createPortal } from "react-dom";

interface SuggestionItem {
  label: string;
  detail: string;
}

interface SuggestionDropdownProps {
  items: SuggestionItem[];
  selectedIndex: number;
  dropdownPos: { top: number; left: number; width: number };
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
}

const SuggestionDropdown: React.FC<SuggestionDropdownProps> = ({
  items,
  selectedIndex,
  dropdownPos,
  dropdownRef,
  onSelect,
  onHover,
}) =>
  createPortal(
    <div
      className="autosuggest-dropdown"
      ref={dropdownRef}
      style={{
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`autosuggest-item ${i === selectedIndex ? "selected" : ""}`}
          onMouseDown={() => onSelect(i)}
          onMouseEnter={() => onHover(i)}
        >
          <span className="autosuggest-var-name">{item.label}</span>
          {item.detail && (
            <span className="autosuggest-var-value">{item.detail}</span>
          )}
        </div>
      ))}
    </div>,
    document.body,
  );

export default SuggestionDropdown;
