import React, { useEffect, useState, useCallback } from "react";
import type { Invoice, InvoiceStatus } from "../../types/payment";
import { api } from "../../lib/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge } from "../../components/ui/Badge";

function fmtCurrency(val: number) {
  return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function statusVariant(s: InvoiceStatus): "success" | "warning" | "info" | "danger" {
  switch (s) {
    case "PAID":           return "success";
    case "PARTIALLY_PAID": return "warning";
    case "UNPAID":         return "danger";
    default:               return "info";
  }
}

function statusLabel(s: InvoiceStatus) {
  switch (s) {
    case "PAID":           return "Paid";
    case "PARTIALLY_PAID": return "Partial";
    case "UNPAID":         return "Unpaid";
    default:               return s;
  }
}

const STATUS_FILTERS: { label: string; value: InvoiceStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Unpaid", value: "UNPAID" },
  { label: "Partial", value: "PARTIALLY_PAID" },
  { label: "Paid", value: "PAID" },
];

export const FarmerInvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<InvoiceStatus | "ALL">("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setInvoices(await api.listInvoices());
    } catch (e: any) {
      setError(e.message || "Failed to load invoices");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = invoices.filter((inv) => filter === "ALL" || inv.status === filter);
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const totalBalance = invoices.reduce((acc, inv) => acc + (inv.balanceAmount ?? 0), 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + (inv.paidAmount ?? 0), 0);

  return (
    <div className="sa-portal-page">
      <div className="sa-portal-section-title">💳 My Invoices</div>

      {/* Summary */}
      {!isLoading && !error && (
        <div className="sa-portal-kpi-row">
          <div className="sa-portal-kpi-card">
            <div className="sa-portal-kpi-label">Total Invoices</div>
            <div className="sa-portal-kpi-value">{invoices.length}</div>
          </div>
          <div className="sa-portal-kpi-card">
            <div className="sa-portal-kpi-label">Total Paid</div>
            <div className="sa-portal-kpi-value" style={{ fontSize: "1rem" }}>{fmtCurrency(totalPaid)}</div>
          </div>
          <div className="sa-portal-kpi-card sa-portal-kpi-card--alert">
            <div className="sa-portal-kpi-label">Balance Due</div>
            <div className="sa-portal-kpi-value sa-portal-kpi-value--alert" style={{ fontSize: "1rem" }}>
              {fmtCurrency(totalBalance)}
            </div>
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div className="sa-portal-filter-row">
        {STATUS_FILTERS.map((opt) => (
          <button
            key={opt.value}
            className={`sa-portal-filter-btn ${filter === opt.value ? "is-active" : ""}`}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
            {opt.value !== "ALL" && (
              <span className="sa-driver-filter-count">
                {invoices.filter((inv) => inv.status === opt.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="sa-loading-state"><Spinner /><span>Loading…</span></div>
      ) : error ? (
        <div className="sa-error-state"><p>⚠ {error}</p><button className="sa-btn sa-btn-secondary" onClick={load}>Retry</button></div>
      ) : sorted.length === 0 ? (
        <div className="sa-driver-empty-card">
          <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>📭</div>
          <div style={{ fontWeight: 600 }}>No invoices found</div>
        </div>
      ) : (
        <div className="sa-portal-booking-list">
          {sorted.map((inv) => (
            <div key={inv.id} className="sa-portal-booking-card sa-portal-booking-card--expandable">
              <button
                className="sa-portal-booking-toggle"
                onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}
                aria-expanded={expanded === inv.id}
              >
                <div className="sa-portal-booking-header">
                  <div>
                    <div className="sa-portal-booking-number">{inv.invoiceNumber}</div>
                    <div className="sa-portal-booking-date">📅 {fmtDate(inv.createdAt)}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                    <Badge variant={statusVariant(inv.status)} size="sm">
                      {statusLabel(inv.status)}
                    </Badge>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: inv.balanceAmount > 0 ? "var(--color-danger)" : "var(--color-success)" }}>
                      {fmtCurrency(inv.totalAmount)}
                    </span>
                  </div>
                </div>
              </button>

              {expanded === inv.id && (
                <div className="sa-portal-booking-detail">
                  <div className="sa-portal-detail-grid">
                    {[
                      { label: "Total Amount", value: fmtCurrency(inv.totalAmount) },
                      { label: "Paid", value: fmtCurrency(inv.paidAmount) },
                      { label: "Balance", value: fmtCurrency(inv.balanceAmount) },
                      { label: "Booking", value: inv.booking?.bookingNumber ?? "—" },
                      ...(inv.dueDate ? [{ label: "Due Date", value: fmtDate(inv.dueDate) }] : []),
                    ].map((item) => (
                      <div key={item.label} className="sa-portal-detail-item">
                        <div className="sa-portal-detail-label">{item.label}</div>
                        <div
                          className="sa-portal-detail-value"
                          style={item.label === "Balance" && inv.balanceAmount > 0 ? { color: "var(--color-danger)", fontWeight: 700 } : {}}
                        >
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  {inv.notes && (
                    <div className="sa-portal-notes">
                      <span style={{ fontWeight: 600 }}>Notes: </span>{inv.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
