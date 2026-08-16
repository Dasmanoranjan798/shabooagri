import React, { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import type { Invoice, PaymentMethod } from "../../types/payment";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

interface ReceivePaymentModalProps {
 invoice: Invoice | null;
 isOpen: boolean;
 onClose: () => void;
 onSuccess: () => void;
}

export const ReceivePaymentModal: React.FC<ReceivePaymentModalProps> = ({
 invoice,
 isOpen,
 onClose,
 onSuccess,
}) => {
 const customerTerm = getTerm("customer");

 const [amount, setAmount] = useState<string>("");
 const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
 const [referenceNumber, setReferenceNumber] = useState<string>("");
 const [notes, setNotes] = useState<string>("");

 const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 if (invoice && isOpen) {
 setAmount(invoice.balanceAmount.toString());
 setPaymentMethod("CASH");
 setReferenceNumber("");
 setNotes("");
 setError(null);
 }
 }, [invoice, isOpen]);

 if (!invoice) return null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 const parsedAmount = parseFloat(amount);

 if (isNaN(parsedAmount) || parsedAmount <= 0) {
 setError("Please enter a valid payment amount greater than 0");
 return;
 }

 if (parsedAmount > invoice.balanceAmount) {
 setError(`Payment amount cannot exceed remaining balance of ₹${Number(invoice.balanceAmount).toLocaleString("en-IN")}`);
 return;
 }

 setIsSubmitting(true);
 setError(null);

 try {
 await api.receivePayment(invoice.id, {
 amount: parsedAmount,
 paymentMethod,
 referenceNumber: referenceNumber.trim() || undefined,
 notes: notes.trim() || undefined,
 });

 onSuccess();
 onClose();
 } catch (err: any) {
 setError(err.message || "Failed to record payment");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <Modal
 isOpen={isOpen}
 onClose={onClose}
 title={`Receive Payment — ${invoice.invoiceNumber}`}
 maxWidth="500px"
 >
 <form onSubmit={handleSubmit} className="sa-booking-form">
 {error && <div className="sa-alert sa-alert-danger">{error}</div>}

 {/* Invoice Summary Card */}
 <div className="sa-field-header-card" style={{ marginBottom: "1rem" }}>
 <div className="sa-field-machine">
 <span className="sa-field-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
 <FileText size={28} color="var(--color-primary)" />
 </span>
 <div>
 <h3>{invoice.customer?.name || customerTerm}</h3>
 <span className="sa-field-sub">
 Invoice #{invoice.invoiceNumber} • Village: {invoice.customer?.village?.name || "N/A"}
 </span>
 </div>
 </div>
 </div>

 {/* Balance Financial Summary Box */}
 <div className="sa-detail-grid" style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
 <div className="sa-detail-item">
 <span className="sa-detail-label">Total Invoice Amount</span>
 <span className="sa-detail-val">₹{Number(invoice.totalAmount).toLocaleString("en-IN")}</span>
 </div>

 <div className="sa-detail-item">
 <span className="sa-detail-label">Already Paid</span>
 <span className="sa-detail-val" style={{ color: "#16a34a" }}>
 ₹{Number(invoice.paidAmount).toLocaleString("en-IN")}
 </span>
 </div>

 <div className="sa-detail-item" style={{ gridColumn: "1 / -1", paddingTop: "0.5rem", borderTop: "1px dashed #cbd5e1" }}>
 <span className="sa-detail-label" style={{ fontWeight: 600, fontSize: "0.95rem" }}>
 Outstanding Balance Due
 </span>
 <span className="sa-detail-val" style={{ fontSize: "1.25rem", fontWeight: 700, color: "#dc2626" }}>
 ₹{Number(invoice.balanceAmount).toLocaleString("en-IN")}
 </span>
 </div>
 </div>

 {/* 1. Payment Amount & Method */}
 <div className="sa-form-grid-2" style={{ marginTop: "1rem" }}>
 <Input
 label="Amount Received (₹) *"
 type="number"
 min="1"
 max={Number(invoice.balanceAmount)}
 step="1"
 value={amount}
 onChange={(e) => setAmount(e.target.value)}
 required
 autoFocus
 />

 <div className="sa-input-group">
 <label className="sa-input-label">Payment Method *</label>
 <select
 className="sa-input"
 value={paymentMethod}
 onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
 required
 >
 <option value="CASH">Cash Collection</option>
 <option value="UPI">UPI / GPay / PhonePe</option>
 <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
 <option value="CREDIT">Customer Credit Account</option>
 </select>
 </div>
 </div>

 {/* 2. Reference Number (Optional) */}
 <Input
 label="Transaction / Reference Number (Optional)"
 type="text"
 placeholder="e.g. UPI-98723489234 or Bank Txn ID"
 value={referenceNumber}
 onChange={(e) => setReferenceNumber(e.target.value)}
 />

 {/* 3. Payment Notes */}
 <div className="sa-input-group">
 <label className="sa-input-label">Payment Notes (Optional)</label>
 <input
 type="text"
 className="sa-input"
 placeholder="e.g. Received in field from farmer's son"
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 />
 </div>

 {/* Actions */}
 <div className="sa-form-actions" style={{ marginTop: "1.5rem" }}>
 <Button type="button" variant="secondary" onClick={onClose}>
 Cancel
 </Button>
 <Button type="submit" variant="primary" isLoading={isSubmitting}>
 Record Payment
 </Button>
 </div>
 </form>
 </Modal>
 );
};
