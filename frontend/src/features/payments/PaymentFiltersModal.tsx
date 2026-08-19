import React, { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import type { FilterInvoicesInput } from "../../types/payment";

interface PaymentFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilters: FilterInvoicesInput;
  onApply: (filters: FilterInvoicesInput) => void;
}

export const PaymentFiltersModal: React.FC<PaymentFiltersModalProps> = ({
  isOpen,
  onClose,
  initialFilters,
  onApply,
}) => {
  const [filters, setFilters] = useState<FilterInvoicesInput>(initialFilters);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleClear = () => {
    const defaultFilters: FilterInvoicesInput = {
      status: ["ALL"],
      page: 1,
      limit: 1000,
    };
    setFilters(defaultFilters);
    onApply(defaultFilters);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Advanced Payment Filters">
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        
        {/* Status */}
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Status</label>
          <select 
            className="sa-input" 
            value={filters.status?.[0] || "ALL"}
            onChange={(e) => setFilters({ ...filters, status: [e.target.value] })}
          >
            <option value="ALL">All</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="DUE_TODAY">Due Today</option>
            <option value="DUE_SOON">Due Soon</option>
          </select>
        </div>

        {/* Date Field & Range */}
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Date Field</label>
          <select 
            className="sa-input" 
            value={filters.dateRange?.field || "invoiceDate"}
            onChange={(e) => setFilters({
              ...filters, 
              dateRange: { ...filters.dateRange, field: e.target.value as any }
            })}
          >
            <option value="invoiceDate">Invoice Date</option>
            <option value="dueDate">Due Date</option>
            <option value="paymentDate">Payment Date</option>
            <option value="workCompletionDate">Work Completion Date</option>
          </select>
        </div>
        
        <div style={{ display: "flex", gap: "1rem" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem" }}>From Date</label>
            <input 
              type="date" 
              className="sa-input" 
              value={filters.dateRange?.from?.split("T")[0] || ""}
              onChange={(e) => setFilters({
                ...filters, 
                dateRange: { 
                  ...filters.dateRange, 
                  from: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                }
              })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem" }}>To Date</label>
            <input 
              type="date" 
              className="sa-input" 
              value={filters.dateRange?.to?.split("T")[0] || ""}
              onChange={(e) => setFilters({
                ...filters, 
                dateRange: { 
                  ...filters.dateRange, 
                  to: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                }
              })}
            />
          </div>
        </div>

        {/* Outstanding Age */}
        <div style={{ display: "flex", gap: "1rem" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Min Outstanding Age (Days)</label>
            <input 
              type="number" 
              className="sa-input" 
              placeholder="e.g. 30"
              value={filters.outstandingAge?.minDays || ""}
              onChange={(e) => setFilters({
                ...filters, 
                outstandingAge: { 
                  ...filters.outstandingAge, 
                  minDays: e.target.value ? parseInt(e.target.value) : undefined 
                }
              })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Max Outstanding Age (Days)</label>
            <input 
              type="number" 
              className="sa-input" 
              placeholder="e.g. 90"
              value={filters.outstandingAge?.maxDays || ""}
              onChange={(e) => setFilters({
                ...filters, 
                outstandingAge: { 
                  ...filters.outstandingAge, 
                  maxDays: e.target.value ? parseInt(e.target.value) : undefined 
                }
              })}
            />
          </div>
        </div>
        
        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
          <Button variant="ghost" onClick={handleClear}>Clear All</Button>
          <Button variant="primary" onClick={handleApply}>Apply Filters</Button>
        </div>
      </div>
    </Modal>
  );
};
