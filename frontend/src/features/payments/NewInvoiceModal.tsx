import React, { useEffect, useState } from "react";
import type { Customer } from "../../types/customer";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SearchableSelect } from "../../components/ui/SearchableSelect/SearchableSelect";

interface NewInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewInvoiceModal: React.FC<NewInvoiceModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const customerTerm = getTerm("customer");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  const [isLoadingCustomers, setIsLoadingCustomers] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCustomerId("");
    setTotalAmount("");
    setDescription("");
    setDueDate("");
    setError(null);

    setIsLoadingCustomers(true);
    api
      .listCustomers()
      .then(setCustomers)
      .catch(() => {})
      .finally(() => setIsLoadingCustomers(false));
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError(`Please select a ${customerTerm.toLowerCase()}`);
      return;
    }
    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount greater than zero");
      return;
    }
    if (!description.trim()) {
      setError("Please describe what this invoice is for");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await api.createManualInvoice({
        customerId,
        totalAmount: amount,
        description: description.trim(),
        dueDate: dueDate || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Invoice" maxWidth="550px">
      <form onSubmit={handleSubmit} className="sa-booking-form">
        {error && <div className="sa-alert sa-alert-danger">{error}</div>}
        {isLoadingCustomers && <div className="sa-alert sa-alert-info">Loading {customerTerm.toLowerCase()} directory...</div>}

        <div className="sa-input-group">
          <label className="sa-input-label">{customerTerm} *</label>
          <SearchableSelect
            placeholder={`-- Select ${customerTerm} --`}
            value={customerId}
            onChange={setCustomerId}
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
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          required
        />

        <div className="sa-input-group">
          <label className="sa-input-label">Description *</label>
          <textarea
            className="sa-input sa-textarea"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this invoice for? e.g. Spare parts sale, pre-2026 backlog balance..."
            required
          />
        </div>

        <Input
          label="Due Date (Optional)"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <div className="sa-form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Create Invoice
          </Button>
        </div>
      </form>
    </Modal>
  );
};
