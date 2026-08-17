import { useEffect, useState } from "react";
import type { Customer } from "../../types/customer";
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

export type NewInvoiceInitProps = Record<string, never>;

export interface NewInvoiceDraft {
  customerId: string;
  totalAmount: string;
  description: string;
  dueDate: string;
}

export function defaultNewInvoiceDraft(): NewInvoiceDraft {
  return { customerId: "", totalAmount: "", description: "", dueDate: "" };
}

export const NewInvoiceTask: TaskContentComponent<NewInvoiceInitProps> = ({ taskId, onRequestClose }) => {
  const customerTerm = getTerm("customer");
  const [draft, setDraft] = useTaskDraft<NewInvoiceDraft>(taskId, defaultNewInvoiceDraft());

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
    const amount = parseFloat(draft.totalAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount greater than zero");
      return;
    }
    if (!draft.description.trim()) {
      setError("Please describe what this invoice is for");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await api.createManualInvoice({
        customerId: draft.customerId,
        totalAmount: amount,
        description: draft.description.trim(),
        dueDate: draft.dueDate || undefined,
      });
      notifyDataRefresh("invoices");
      onRequestClose();
    } catch (err: any) {
      setError(err.message || "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="sa-booking-form" style={{ padding: "1.5rem" }}>
      {error && <div className="sa-alert sa-alert-danger">{error}</div>}
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
        label="Invoice Amount (₹) *"
        type="number"
        min="0"
        step="0.01"
        placeholder="e.g. 5000"
        value={draft.totalAmount}
        onChange={(e) => setDraft({ totalAmount: e.target.value })}
        required
      />

      <div className="sa-input-group">
        <label className="sa-input-label">Description *</label>
        <textarea
          className="sa-input sa-textarea"
          rows={2}
          value={draft.description}
          onChange={(e) => setDraft({ description: e.target.value })}
          placeholder="What is this invoice for? e.g. Spare parts sale, pre-2026 backlog balance..."
          required
        />
      </div>

      <Input
        label="Due Date (Optional)"
        type="date"
        value={draft.dueDate}
        onChange={(e) => setDraft({ dueDate: e.target.value })}
      />

      <div className="sa-form-actions">
        <Button type="button" variant="secondary" onClick={onRequestClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          Create Invoice
        </Button>
      </div>
    </form>
  );
};
