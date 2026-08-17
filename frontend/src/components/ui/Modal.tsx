import React, { useEffect } from "react";
import "./Modal/modal.css";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

// Tracks every currently-open Modal — some screens (e.g. Jobs' quick
// actions) open a small sub-modal on top of a larger one that's still
// open. Only the most recently opened modal should respond to Escape, and
// the body scroll lock should only lift once none are left open.
let openModals: Array<() => void> = [];

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "550px",
}) => {
  useEffect(() => {
    if (!isOpen) return;

    openModals.push(onClose);
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openModals[openModals.length - 1] === onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      openModals = openModals.filter((fn) => fn !== onClose);
      if (openModals.length === 0) {
        document.body.style.overflow = "";
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="sa-modal-overlay" onClick={onClose}>
      <div
        className="sa-modal-content"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sa-modal-header">
          <h3 className="sa-modal-title">{title}</h3>
          <button className="sa-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="sa-modal-body">{children}</div>

        {footer && <div className="sa-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};
