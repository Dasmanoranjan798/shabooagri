import { useEffect, useState } from "react";
import type { Customer } from "../../types/customer";
import type { PaymentMethod } from "../../types/payment";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { notifyDataRefresh } from "../../lib/dataRefreshBus";
import { useTaskDraft, type TaskContentComponent } from "../../context/TaskTrayContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SearchableSelect } from "../../components/ui/SearchableSelect/SearchableSelect";

// Migrated onto the shared task-tray system (Pass 2, Batch 2) — see
// BookingFormModal.tsx for the full explanation of the new contract.
// Always a create-only form (no edit mode), so no initProps are needed.

export type RecordAdvanceInitProps = Record<string, never>;

export interface RecordAdvanceDraft {
  customerId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  notes: string;
}

export function defaultRecordAdvanceDraft(): RecordAdvanceDraft {
  return { customerId: "", amount: "", paymentMethod: "CASH", referenceNumber: "", notes: "" };
}

const PAYMENT_METHODS: { label: string; value: PaymentMethod }[] = [
  { label: "Cash", value: "CASH" },
  { label: "UPI", value: "UPI" },
  { label: "Bank Transfer", value: "BANK_TRANSFER" },
  { label: "Credit", value: "CREDIT" },
];

export const RecordAdvanceTask: TaskContentComponent<RecordAdvanceInitProps> = ({ taskId, onRequestClose }) => {
  const customerTerm = getTerm("customer");
  const [draft, setDraft] = useTaskDraft<RecordAdvanceDraft>(taskId, defaultRecordAdvanceDraft());

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoadingCustomers(true);
    api
      .listCustomers()
      .then(setCustomers)
      .catch(() => {})
      .finally(() => setIsLoadingCustomers(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.customerId) {
      setError(`Please select a ${customerTerm.toLowerCase()}`);
      return;
    }
    const parsedAmount = parseFloat(draft.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than zero");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await api.recordCustomerAdvance({
        customerId: draft.customerId,
        amount: parsedAmount,
        paymentMethod: draft.paymentMethod,
        referenceNumber: draft.referenceNumber.trim() || undefined,
        notes: draft.notes.trim() || undefined,
      });
      notifyDataRefresh("invoices");
      onRequestClose();
    } catch (err: any) {
      setError(err.message || "Failed to record advance payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="sa-booking-form" style={{ padding: "1.5rem" }}>
      {error && <div className="sa-alert sa-alert-danger">{error}</div>}
      <p className="sa-text-muted" style={{ fontSize: "0.82rem", marginTop: 0 }}>
        Use this to record money received from a {customerTerm.toLowerCase()} that isn't tied to an
        invoice yet — an advance before a job starts, or a walk-in collection.
      </p>
      {isLoadingCustomers && <div className="sa-alert sa-alert-info">Loading {customerTerm.toLowerCase()} directory...</div>}

      <div className="sa-input-group">
        <label className="sa-input-label">{customerTerm} *</label>
        <SearchableSelect
          placeholder={`-- Select ${customerTerm} --`}
          value={draft.customerId}
          onChange={(v) => setDraft({ customerId: v })}
          options={customers.map((c) => ({
            value: c.id,
            label: `${c.name}${c.village ? ` (${c.village.name})` : ""}`,
          }))}
        />
      </div>

      <Input
        label="Amount Received (₹) *"
        type="number"
        min="0"
        step="0.01"
        placeholder="e.g. 2000"
        value={draft.amount}
        onChange={(e) => setDraft({ amount: e.target.value })}
        required
      />

      <div className="sa-input-group">
        <label className="sa-input-label">Payment Method *</label>
        <div className="sa-segmented-control">
          {PAYMENT_METHODS.map((pm) => (
            <button
              type="button"
              key={pm.value}
              className={`sa-segmented-btn ${draft.paymentMethod === pm.value ? "is-active" : ""}`}
              onClick={() => setDraft({ paymentMethod: pm.value })}
            >
              {pm.label}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Reference Number (Optional)"
        type="text"
        placeholder="UPI transaction ID, cheque number..."
        value={draft.referenceNumber}
        onChange={(e) => setDraft({ referenceNumber: e.target.value })}
      />

      <div className="sa-input-group">
        <label className="sa-input-label">Notes (Optional)</label>
        <textarea
          className="sa-input sa-textarea"
          rows={2}
          value={draft.notes}
          onChange={(e) => setDraft({ notes: e.target.value })}
          placeholder="Any extra context..."
        />
      </div>

      <div className="sa-form-actions">
        <Button type="button" variant="secondary" onClick={onRequestClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          Record Advance
        </Button>
      </div>
    </form>
  );
};
