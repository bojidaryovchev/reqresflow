import React from "react";
import { createPortal } from "react-dom";

interface HoverVar {
  key: string;
  value: string;
  top: number;
  left: number;
}

interface VariableValueTooltipProps {
  hoverVar: HoverVar;
  variables: { key: string; value: string }[];
  envName?: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const VariableValueTooltip: React.FC<VariableValueTooltipProps> = ({
  hoverVar,
  variables,
  envName,
  onMouseEnter,
  onMouseLeave,
}) =>
  createPortal(
    <div
      className="env-var-tooltip"
      style={{ top: hoverVar.top, left: hoverVar.left }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="env-var-tooltip-row">
        <span className="env-var-tooltip-label">Variable</span>
        <span className="env-var-tooltip-val">{hoverVar.key}</span>
      </div>
      <div className="env-var-tooltip-row">
        <span className="env-var-tooltip-label">Value</span>
        <span className="env-var-tooltip-val">
          {hoverVar.value || (
            <span className="env-var-tooltip-empty">empty</span>
          )}
        </span>
      </div>
      {envName && (
        <div className="env-var-tooltip-row">
          <span className="env-var-tooltip-label">Environment</span>
          <span className="env-var-tooltip-val">{envName}</span>
        </div>
      )}
      {!variables.find((v) => v.key === hoverVar.key) && (
        <div className="env-var-tooltip-warning">
          Variable not defined in current environment
        </div>
      )}
    </div>,
    document.body,
  );

export type { HoverVar };
export default VariableValueTooltip;
