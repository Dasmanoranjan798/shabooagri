import React, { useEffect, useState } from "react";
import type { Customer } from "../../types/customer";
import type { PaymentMethod } from "../../types/payment";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

interface RecordAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS: { label: string; value: PaymentMethod }[] = [
  { label: "Cash", value: "CASH" },
  { label: "UPI", value: "UPI" },
  { label: "Bank Transfer", value: "BANK_TRANSFER" },
  { label: "Credit", value: "CREDIT" },
];

export const RecordAdvanceModal: React.FC<RecordAdvanceModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const customerTerm = getTerm("customer");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [isLoadingCustomers, setIsLoadingCustomers] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCustomerId("");
    setAmount("");
    setPaymentMethod("CASH");
    setReferenceNumber("");
    setNotes("");
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
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than zero");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await api.recordCustomerAdvance({
        customerId,
        amount: parsedAmount,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to record advance payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Advance Payment" maxWidth="550px">
      <form onSubmit={handleSubmit} className="sa-booking-form">
        {error && <div className="sa-alert sa-alert-danger">{error}</div>}
        <p className="sa-text-muted" style={{ fontSize: "0.82rem", marginTop: 0 }}>
          Use this to record money received from a {customerTerm.toLowerCase()} that isn't tied to an
          invoice yet — an advance before a job starts, or a walk-in collection.
        </p>
        {isLoadingCustomers && <div className="sa-alert sa-alert-info">Loading {customerTerm.toLowerCase()} directory...</div>}

        <div className="sa-input-group">
          <label className="sa-input-label">{customerTerm} *</label>
          <select
            className="sa-input"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
          >
            <option value="">-- Select {customerTerm} --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.village ? `(${c.village.name})` : ""}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Amount Received (₹) *"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 2000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        <div className="sa-input-group">
          <label className="sa-input-label">Payment Method *</label>
          <div className="sa-segmented-control">
            {PAYMENT_METHODS.map((pm) => (
              <button
                type="button"
                key={pm.value}
                className={`sa-segmented-btn ${paymentMethod === pm.value ? "is-active" : ""}`}
                onClick={() => setPaymentMethod(pm.value)}
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
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
        />

        <div className="sa-input-group">
          <label className="sa-input-label">Notes (Optional)</label>
          <textarea
            className="sa-input sa-textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any extra context..."
          />
        </div>

        <div className="sa-form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Record Advance
          </Button>
        </div>
      </form>
    </Modal>
  );
};
