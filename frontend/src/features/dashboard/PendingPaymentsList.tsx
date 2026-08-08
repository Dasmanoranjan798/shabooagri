import React from "react";
import type { PendingPaymentItem } from "../../types/dashboard";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { formatCurrency } from "../../lib/theme";

interface PendingPaymentsListProps {
  payments: PendingPaymentItem[] | null;
}

export const PendingPaymentsList: React.FC<PendingPaymentsListProps> = ({ payments }) => {
  if (!payments || payments.length === 0) {
    return (
      <div className="sa-empty-state">
        <span className="sa-empty-icon">✅</span>
        <p>No pending payments outstanding.</p>
      </div>
    );
  }

  return (
    <div className="sa-pending-list">
      {payments.map((item) => (
        <div key={item.invoiceId} className="sa-pending-item">
          <div className="sa-pending-info">
            <div className="sa-pending-inv">{item.invoiceNumber}</div>
            <div className="sa-pending-customer">{item.customerName}</div>
            <div className="sa-pending-village">{item.villageName}</div>
          </div>

          <div className="sa-pending-right">
            <div className="sa-pending-amount">{formatCurrency(item.balanceAmount)}</div>
            <div className="sa-pending-badges">
              <Badge variant={getStatusBadgeVariant(item.status)} size="sm">
                {item.status.replace("_", " ")}
              </Badge>
              {item.daysOutstanding > 0 && (
                <Badge variant={item.daysOutstanding > 30 ? "danger" : "warning"} size="sm">
                  {item.daysOutstanding}d overdue
                </Badge>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
