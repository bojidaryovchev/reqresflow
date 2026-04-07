import React from "react";
import { Reorder, useDragControls } from "motion/react";
import { type HttpMethod, METHOD_COLORS } from "../utils/http";
import { getTabDisplayName } from "../utils/request";
import { RequestTab as RequestTabType, FlowTab } from "../types/electron";

interface BaseTabItemProps<T> {
  tab: T;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

function BaseTabItem<T>({
  tab,
  isActive,
  onActivate,
  onClose,
  onContextMenu,
  children,
}: BaseTabItemProps<T>) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      as="div"
      value={tab}
      id={(tab as any).id}
      dragListener={false}
      dragControls={controls}
      className={`request-tab-item ${isActive ? "active" : ""}`}
      onClick={onActivate}
      onContextMenu={onContextMenu}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          onClose();
        }
      }}
      onPointerDown={(e) => controls.start(e)}
      whileDrag={{ boxShadow: "0 2px 8px rgba(0,0,0,0.32)", zIndex: 1 }}
      transition={{ duration: 0.15 }}
    >
      {children}
      <button
        className="request-tab-close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        ×
      </button>
    </Reorder.Item>
  );
}

interface TabItemProps {
  tab: RequestTabType;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function TabItem(props: TabItemProps) {
  const { tab } = props;
  return (
    <BaseTabItem {...props}>
      <span
        className="request-tab-method"
        style={{
          color:
            METHOD_COLORS[tab.method as HttpMethod] || "var(--text-secondary)",
        }}
      >
        {tab.method}
      </span>
      <span className="request-tab-name">{getTabDisplayName(tab)}</span>
      {tab.isDirty && (
        <span className="request-tab-dirty" title="Unsaved changes">
          ●
        </span>
      )}
    </BaseTabItem>
  );
}

interface FlowTabItemProps {
  tab: FlowTab;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function FlowTabItem(props: FlowTabItemProps) {
  const { tab } = props;
  return (
    <BaseTabItem {...props}>
      <span className="request-tab-name">
        {tab.mode === "runner" ? "▶ " : ""}
        {tab.name}
      </span>
      {tab.isDirty && (
        <span className="request-tab-dirty" title="Unsaved changes">
          ●
        </span>
      )}
    </BaseTabItem>
  );
}
