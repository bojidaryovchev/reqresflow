import React from "react";

interface TabContextMenuProps {
  x: number;
  y: number;
  onDuplicate: () => void;
  onClose: () => void;
  onCloseAll: () => void;
  onDismiss: () => void;
  duplicateLabel?: string;
  menuRef: React.RefObject<HTMLDivElement | null>;
}

const TabContextMenu: React.FC<TabContextMenuProps> = ({
  x,
  y,
  onDuplicate,
  onClose,
  onCloseAll,
  onDismiss,
  duplicateLabel = "Duplicate Request",
  menuRef,
}) => (
  <div ref={menuRef} className="tab-context-menu" style={{ top: y, left: x }}>
    <button
      onClick={() => {
        onDuplicate();
        onDismiss();
      }}
    >
      {duplicateLabel}
    </button>
    <button
      onClick={() => {
        onClose();
        onDismiss();
      }}
    >
      Close Tab
    </button>
    <button
      onClick={() => {
        onCloseAll();
        onDismiss();
      }}
    >
      Close All Tabs
    </button>
  </div>
);

export default TabContextMenu;
