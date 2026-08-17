import React, { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

// Shared by both Invoice void and Payment void (Payments page) — the
// reason is mandatory server-side too (§ dependency-locked deletion, Rule
// 1), this just fails fast in the UI instead of round-tripping to find out.
export const VoidReasonModal: React.FC<{
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}> = ({ isOpen, title, description, onClose, onConfirm }) => {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setReason("");
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError("A reason is required to void this.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      handleClose();
    } catch (err: any) {
      setError(err.message || "Failed to void");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      maxWidth="480px"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} isLoading={isSubmitting}>
            Void
          </Button>
        </>
      }
    >
      {description && (
        <p style={{ marginTop: 0, marginBottom: "0.75rem", color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
          {description}
        </p>
      )}
      <label className="sa-input-label" htmlFor="void-reason">
        Reason (required)
      </label>
      <textarea
        id="void-reason"
        className="sa-input"
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why is this being voided?"
        autoFocus
      />
      {error && (
        <p style={{ color: "var(--color-danger)", fontSize: "0.85rem", marginTop: "0.5rem", marginBottom: 0 }}>
          {error}
        </p>
      )}
    </Modal>
  );
};
