import React from "react";

interface VariableHighlightOverlayProps {
  parts: { text: string; isVar: boolean }[];
  onVarMouseEnter: (
    e: React.MouseEvent<HTMLSpanElement>,
    varName: string,
  ) => void;
  onVarMouseLeave: () => void;
  highlightRef: React.RefObject<HTMLDivElement | null>;
}

const VariableHighlightOverlay: React.FC<VariableHighlightOverlayProps> = ({
  parts,
  onVarMouseEnter,
  onVarMouseLeave,
  highlightRef,
}) => (
  <div className="autosuggest-highlight" ref={highlightRef} aria-hidden>
    {parts.map((part, i) =>
      part.isVar ? (
        <span
          key={i}
          className="env-var-highlight"
          onMouseEnter={(e) => onVarMouseEnter(e, part.text.slice(2, -2))}
          onMouseLeave={onVarMouseLeave}
        >
          {part.text}
        </span>
      ) : (
        <span key={i}>{part.text}</span>
      ),
    )}
  </div>
);

export default VariableHighlightOverlay;
