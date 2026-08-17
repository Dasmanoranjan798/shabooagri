import React, { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import "./ActionMenu/actionMenu.css";

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  // Items conditionally excluded by role or by whether the record is
  // currently unlocked for that action (e.g. no Cancel on an already
  // CANCELLED job) — filtered out entirely rather than shown disabled, so
  // the menu only ever lists things that could plausibly be done next.
  hidden?: boolean;
}

// Single reusable kebab (⋮) menu used across every module's row actions
// (Bookings, Jobs, Payments, Machines, Drivers, Villages, Customers,
// Employees) — one place owns the open/close/outside-click/Escape
// behavior instead of each page re-implementing its own icon-button row.
export const ActionMenu: React.FC<{ items: ActionMenuItem[]; label?: string }> = ({
  items,
  label = "More actions",
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleItems = items.filter((item) => !item.hidden);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (visibleItems.length === 0) return null;

  return (
    <div className="sa-action-menu" ref={containerRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="sa-icon-action"
        title={label}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div className="sa-action-menu-dropdown" role="menu">
          {visibleItems.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className={`sa-action-menu-item${item.danger ? " sa-action-menu-item--danger" : ""}`}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
