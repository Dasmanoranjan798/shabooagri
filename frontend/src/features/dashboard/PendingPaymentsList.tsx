import React, { useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import type { PendingPaymentItem } from "../../types/dashboard";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { formatCurrency } from "../../lib/theme";

interface PendingPaymentsListProps {
  payments: PendingPaymentItem[] | null;
}

export const PendingPaymentsList: React.FC<PendingPaymentsListProps> = ({ payments }) => {
  const [selectedCustomer, setSelectedCustomer] = useState<PendingPaymentItem | null>(null);

  if (!payments || payments.length === 0) {
    return (
      <div className="sa-empty-state">
        <span className="sa-empty-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <CheckCircle2 size={28} color="var(--color-success, #2E7D32)" />
        </span>
        <p>No pending payments outstanding.</p>
      </div>
    );
  }

  if (selectedCustomer) {
    return (
      <div className="sa-pending-list-detail">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '8px', cursor: 'pointer' }} onClick={() => setSelectedCustomer(null)}>
          <ChevronLeft size={20} />
          <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{selectedCustomer.customerName}</h4>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Total Outstanding</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-danger)' }}>
            {formatCurrency(selectedCustomer.totalOutstanding)}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {selectedCustomer.invoices.length} pending bill{selectedCustomer.invoices.length > 1 ? 's' : ''}
          </div>
        </div>
        <div className="sa-pending-list">
          {selectedCustomer.invoices.map((inv) => (
            <div key={inv.invoiceId} className="sa-pending-item">
              <div className="sa-pending-info">
                <div className="sa-pending-inv">{inv.invoiceNumber}</div>
                <div className="sa-pending-village" style={{ fontSize: '0.8rem' }}>{inv.invoiceDate}</div>
              </div>
              <div className="sa-pending-right">
                <div className="sa-pending-amount">{formatCurrency(inv.balanceAmount)}</div>
                <div className="sa-pending-badges">
                  <Badge variant={getStatusBadgeVariant(inv.status)} size="sm">
                    {inv.status.replace("_", " ")}
                  </Badge>
                  {inv.daysOutstanding > 0 && (
                    <Badge variant={inv.daysOutstanding > 30 ? "danger" : "warning"} size="sm">
                      {inv.daysOutstanding}d
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="sa-pending-list">
      {payments.map((customer) => (
        <div 
          key={customer.customerId} 
          className="sa-pending-item" 
          onClick={() => setSelectedCustomer(customer)}
          style={{ cursor: 'pointer' }}
        >
          <div className="sa-pending-info">
            <div className="sa-pending-customer">{customer.customerName}</div>
            <div className="sa-pending-village">{customer.villageName}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {customer.invoices.length} invoice{customer.invoices.length > 1 ? 's' : ''}
            </div>
          </div>

          <div className="sa-pending-right">
            <div className="sa-pending-amount" style={{ color: 'var(--color-danger)' }}>
              {formatCurrency(customer.totalOutstanding)}
            </div>
            <ChevronRight size={18} color="var(--color-text-muted)" />
          </div>
        </div>
      ))}
    </div>
  );
};
