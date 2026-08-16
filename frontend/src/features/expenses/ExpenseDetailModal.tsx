import React from "react";
import { Receipt } from "lucide-react";
import type { Expense } from "../../types/expense";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

interface ExpenseDetailModalProps {
 expense: Expense | null;
 isOpen: boolean;
 onClose: () => void;
 onEdit: (expense: Expense) => void;
 onDelete: (id: string) => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
 expense,
 isOpen,
 onClose,
 onEdit,
 onDelete,
}) => {
 const machineTerm = getTerm("machine");

 if (!expense) return null;

 const categoryName = expense.category?.name || "Business Expense";
 const machineReg = expense.machine?.registrationNumber;
 const recordedBy = expense.incurredByUser?.fullName || "Company Staff";

 return (
 <Modal
 isOpen={isOpen}
 onClose={onClose}
 title={
 <div className="sa-modal-booking-title">
 <span>{categoryName}</span>
 <Badge variant="danger">
 ₹{Number(expense.amount).toLocaleString("en-IN")}
 </Badge>
 </div>
 }
 maxWidth="500px"
 >
 <div className="sa-expense-detail-body">
 {/* Header Summary Banner */}
 <div className="sa-field-header-card">
 <div className="sa-field-machine">
 <span className="sa-field-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
 <Receipt size={28} color="var(--color-primary)" />
 </span>
 <div>
 <h3>{categoryName}</h3>
 <span className="sa-field-sub">
 Date: {new Date(expense.expenseDate).toLocaleDateString("en-IN")} • Recorded by: {recordedBy}
 </span>
 </div>
 </div>
 </div>

 {/* Expense Key Details Grid */}
 <div className="sa-detail-grid" style={{ marginTop: "1rem" }}>
 <div className="sa-detail-item">
 <span className="sa-detail-label"> Expense Amount</span>
 <span className="sa-detail-val" style={{ fontSize: "1.2rem", fontWeight: 700, color: "#dc2626" }}>
 ₹{Number(expense.amount).toLocaleString("en-IN")}
 </span>
 </div>

 <div className="sa-detail-item">
 <span className="sa-detail-label">Category</span>
 <span className="sa-detail-val">{categoryName}</span>
 </div>

 <div className="sa-detail-item">
 <span className="sa-detail-label"> Linked {machineTerm}</span>
 <span className="sa-detail-val">
 {machineReg ? ` ${machineReg}` : "General Operational Expense"}
 </span>
 </div>

 <div className="sa-detail-item">
 <span className="sa-detail-label"> Recorded By</span>
 <span className="sa-detail-val">{recordedBy}</span>
 </div>
 </div>

 {/* Description Section */}
 {expense.description && (
 <div className="sa-notes-section">
 <h4>Description & Remarks</h4>
 <p className="sa-notes-text">{expense.description}</p>
 </div>
 )}

 {/* Action Controls */}
 <div className="sa-form-actions" style={{ marginTop: "1.5rem" }}>
 <Button
 variant="danger"
 size="md"
 onClick={() => onDelete(expense.id)}
 >
 Delete Record
 </Button>

 <Button
 variant="primary"
 size="md"
 onClick={() => onEdit(expense)}
 >
 Edit Expense
 </Button>
 </div>
 </div>
 </Modal>
 );
};
