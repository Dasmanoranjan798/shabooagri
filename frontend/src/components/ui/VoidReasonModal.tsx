import { useState } from "react";
import { api } from "../../lib/api";
import { notifyDataRefresh } from "../../lib/dataRefreshBus";
import { useTaskDraft, type TaskContentComponent } from "../../context/TaskTrayContext";
import { Button } from "./Button";

// Migrated onto the shared task-tray system (Pass 2, Batch 1) — see
// BookingFormModal.tsx for the full explanation of the new contract. One
// generic task type ("void-reason") shared by both Invoice void
// (PaymentsPage) and Payment void (ReceiptModal, which previously used a
// raw window.prompt — inconsistent with Invoice void already using this
// component). The reason is mandatory server-side too (§ dependency-locked
// deletion, Rule 1), this just fails fast in the UI instead of
// round-tripping to find out.

export interface VoidReasonInitProps {
  kind: "invoice" | "payment";
  targetId: string;
  description?: string;
}

interface VoidReasonDraft {
  reason: string;
}

export const VoidReasonTask: TaskContentComponent<VoidReasonInitProps> = ({ taskId, initProps, onRequestClose }) => {
  const { kind, targetId, description } = initProps;
  const [draft, setDraft] = useTaskDraft<VoidReasonDraft>(taskId, { reason: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!draft.reason.trim()) {
      setError("A reason is required to void this.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      if (kind === "invoice") {
        await api.voidInvoice(targetId, draft.reason.trim());
      } else {
        await api.voidPayment(targetId, draft.reason.trim());
      }
      // Both cases affect the invoices list (a voided payment changes its
      // parent invoice's paid/balance amounts too) — one topic covers both.
      notifyDataRefresh("invoices");
      onRequestClose();
    } catch (err: any) {
      setError(err.message || "Failed to void");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1 }}>
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
          value={draft.reason}
          onChange={(e) => setDraft({ reason: e.target.value })}
          placeholder="Why is this being voided?"
          autoFocus
        />
        {error && (
          <p style={{ color: "var(--color-danger)", fontSize: "0.85rem", marginTop: "0.5rem", marginBottom: 0 }}>
            {error}
          </p>
        )}
      </div>
      <div className="sa-form-actions">
        <Button variant="secondary" onClick={onRequestClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm} isLoading={isSubmitting}>
          Void
        </Button>
      </div>
    </div>
  );
};
