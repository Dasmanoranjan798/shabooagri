import React, { useState, useEffect } from "react";
import { PiggyBank, Receipt, Plus, FileSpreadsheet, Ban, Wallet, FileText, CheckCircle2, AlertCircle, AlertTriangle, CreditCard, Filter, ChevronDown, ChevronRight, BarChart } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getTerm } from "../../lib/terminology";
import { api } from "../../lib/api";
import type { Invoice, CustomerAdvance, FilterInvoicesInput, InvoiceAnalysisResponse } from "../../types/payment";
import { exportToExcel } from "../../lib/exportUtils";
import { Card } from "../../components/ui/Card";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { ActionMenu } from "../../components/ui/ActionMenu";
import { defaultReceivePaymentDraft } from "./ReceivePaymentModal";
import { ReceiptModal } from "./ReceiptModal";
import { defaultNewInvoiceDraft } from "./NewInvoiceModal";
import { defaultRecordAdvanceDraft } from "./RecordAdvanceModal";
import { useTaskTray } from "../../context/TaskTrayContext";
import { subscribeDataRefresh } from "../../lib/dataRefreshBus";
import { PaymentFiltersModal } from "./PaymentFiltersModal";

const PAYMENT_STATUS_FILTERS: Array<{ label: string; value: string }> = [
  { label: "All", value: "ALL" },
  { label: "Unpaid", value: "UNPAID" },
  { label: "Partially Paid", value: "PARTIALLY_PAID" },
  { label: "Paid", value: "PAID" },
  { label: "Overdue", value: "OVERDUE" },
  { label: "Due Today", value: "DUE_TODAY" },
  { label: "Due Soon", value: "DUE_SOON" },
];

export const PaymentsPage: React.FC = () => {
  const { roleKey, hasPermission } = useAuth();
  const customerTerm = getTerm("customer");
  const villageTerm = getTerm("village");

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [advances, setAdvances] = useState<CustomerAdvance[]>([]);
  const [analysis, setAnalysis] = useState<InvoiceAnalysisResponse | null>(null);
  
  const [filters, setFilters] = useState<FilterInvoicesInput>({
    status: ["ALL"],
    
    
  });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<Invoice | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  const taskTray = useTaskTray();

  const canReceive = roleKey === "owner" || hasPermission("payment.receive");
  const canVoid = roleKey === "owner" || hasPermission("payment.void");

  const loadInvoices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [res, advanceList] = await Promise.all([
        api.filterInvoices(filters),
        api.listCustomerAdvances().catch(() => []),
      ]);
      setInvoices(res.invoices);
      setAnalysis(res);
      setAdvances(advanceList);

      if (selectedInvoiceForReceipt) {
        const updated = res.invoices.find((i) => i.id === selectedInvoiceForReceipt.id);
        if (updated) setSelectedInvoiceForReceipt(updated);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load invoices");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
    const unsubscribe = subscribeDataRefresh("invoices", loadInvoices);
    return () => unsubscribe();
  }, [filters]);

  const handleOpenReceivePayment = (invoice: Invoice, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    taskTray.open({
      type: "receive-payment",
      title: `Receive Payment — ${invoice.invoiceNumber}`,
      initProps: { invoice },
      defaultDraft: defaultReceivePaymentDraft(invoice),
    });
  };

  const handleOpenNewInvoice = () => {
    taskTray.open({
      type: "new-invoice",
      title: "Create New Invoice",
      initProps: {},
      defaultDraft: defaultNewInvoiceDraft(),
    });
  };

  const handleOpenRecordAdvance = () => {
    taskTray.open({
      type: "record-advance",
      title: "Record Advance Payment",
      initProps: {},
      defaultDraft: defaultRecordAdvanceDraft(),
    });
  };

  const handleOpenReceipt = (invoice: Invoice) => {
    setSelectedInvoiceForReceipt(invoice);
    setIsReceiptModalOpen(true);
  };

  const handleOpenVoidInvoice = (invoice: Invoice) => {
    taskTray.open({
      type: "void-reason",
      title: `Void Invoice ${invoice.invoiceNumber}`,
      initProps: {
        kind: "invoice" as const,
        targetId: invoice.id,
        description:
          "This voids the invoice and every non-voided payment under it. The record stays permanently visible in history/reports as Voided.",
      },
      defaultDraft: { reason: "" },
    });
  };


  const activeStatus = filters.status?.[0] || "ALL";

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const invNum = inv.invoiceNumber.toLowerCase();
    const custName = (inv.customer?.name || "").toLowerCase();
    const villageName = (inv.customer?.village?.name || "").toLowerCase();
    const bkgNum = (inv.booking?.bookingNumber || "").toLowerCase();

    return (
      invNum.includes(q) ||
      custName.includes(q) ||
      villageName.includes(q) ||
      bkgNum.includes(q)
    );
  });
  
  const getDaysOverdue = (dueDateStr?: string | null) => {
      if (!dueDateStr) return null;
      const dueDate = new Date(dueDateStr);
      const now = new Date();
      dueDate.setHours(0,0,0,0);
      now.setHours(0,0,0,0);
      const diffTime = now.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
  };

  return (
    <div className="sa-payments-page">
      <PaymentFiltersModal 
        isOpen={isFilterModalOpen} 
        onClose={() => setIsFilterModalOpen(false)} 
        initialFilters={filters}
        onApply={setFilters}
      />
      
      {/* Page Header */}
      <div className="sa-page-header">
        <div className="sa-page-header-text">
          <h2>Payments & Invoicing</h2>
          <p>Track job billing, receive collections, enforce balances & issue receipts</p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsFilterModalOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Filter size={16} /> Filters
          </Button>
          {canReceive && (
            <Button
              variant="secondary"
              size="md"
              onClick={handleOpenRecordAdvance}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <PiggyBank size={16} /> Advance
            </Button>
          )}
          {canReceive && (
            <Button
              variant="primary"
              size="md"
              onClick={handleOpenNewInvoice}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Plus size={16} /> New
            </Button>
          )}

          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              const cols = [
                { header: "Invoice Number", key: "invoiceNumber" },
                { header: `${customerTerm} Name`, key: "customerName" },
                { header: `${villageTerm} Location`, key: "villageName" },
                { header: "Booking Number", key: "bookingNumber" },
                { header: "Total Amount", key: "totalAmount" },
                { header: "Paid Amount", key: "paidAmount" },
                { header: "Balance Due", key: "balanceAmount" },
                { header: "Status", key: "status" },
                { header: "Invoice Date", key: "date" },
                { header: "Due Date", key: "dueDate" },
                { header: "Days Overdue", key: "daysOverdue" }
              ];
              const dataRows = filteredInvoices.map((inv) => ({
                invoiceNumber: inv.invoiceNumber,
                customerName: inv.customer?.name || "N/A",
                villageName: typeof inv.customer?.village === "string" ? inv.customer.village : inv.customer?.village?.name || "N/A",
                bookingNumber: inv.booking?.bookingNumber || "N/A",
                totalAmount: inv.totalAmount,
                paidAmount: inv.paidAmount,
                balanceAmount: inv.balanceAmount,
                status: inv.status,
                date: new Date(inv.createdAt).toLocaleDateString("en-IN"),
                dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN") : "N/A",
                daysOverdue: getDaysOverdue(inv.dueDate) || 0
              }));
              exportToExcel("Invoices_Ledger", "Invoices", cols, dataRows);
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <FileSpreadsheet size={16} /> Export
          </Button>
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="sa-kpi-grid" style={{ marginBottom: "1.5rem" }}>
        <Card className="sa-kpi-card">
          <div className="sa-kpi-icon"><FileText size={24} color="var(--color-primary)" /></div>
          <div className="sa-kpi-content">
            <span className="sa-kpi-label">Filtered Invoices</span>
            <span className="sa-kpi-value">{analysis?.summary.totalInvoiced || 0}</span>
          </div>
        </Card>

        <Card className="sa-kpi-card">
          <div className="sa-kpi-icon"><Wallet size={24} color="var(--color-primary)" /></div>
          <div className="sa-kpi-content">
            <span className="sa-kpi-label">Total Outstanding</span>
            <span className="sa-kpi-value">₹{(analysis?.summary.totalOutstanding || 0).toLocaleString("en-IN")}</span>
          </div>
        </Card>

        <Card className="sa-kpi-card">
          <div className="sa-kpi-icon"><CheckCircle2 size={24} color="#16a34a" /></div>
          <div className="sa-kpi-content">
            <span className="sa-kpi-label">Total Collected</span>
            <span className="sa-kpi-value" style={{ color: "#16a34a" }}>
              ₹{(analysis?.summary.totalPaid || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </Card>

        <Card className="sa-kpi-card">
          <div className="sa-kpi-icon">
            <AlertCircle size={24} color={(analysis?.summary.overdueAmount || 0) > 0 ? "#dc2626" : "#16a34a"} />
          </div>
          <div className="sa-kpi-content">
            <span className="sa-kpi-label">Total Overdue</span>
            <span className="sa-kpi-value" style={{ color: (analysis?.summary.overdueAmount || 0) > 0 ? "#dc2626" : "#16a34a" }}>
              ₹{(analysis?.summary.overdueAmount || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </Card>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="sa-toolbar">
        <div className="sa-filter-tabs">
          {PAYMENT_STATUS_FILTERS.map((tab) => (
            <button
              key={tab.value}
              className={`sa-tab-btn ${activeStatus === tab.value ? "is-active" : ""}`}
              onClick={() => setFilters({ ...filters, status: [tab.value] })}
            >
              {tab.label}
              {analysis && tab.value === "ALL" && <span className="sa-tab-count">({analysis.summary.invoicesCount})</span>}
              {analysis && tab.value === "UNPAID" && <span className="sa-tab-count">({analysis.summary.unpaidCount})</span>}
              {analysis && tab.value === "PARTIALLY_PAID" && <span className="sa-tab-count">({analysis.summary.partialCount})</span>}
              {analysis && tab.value === "PAID" && <span className="sa-tab-count">({analysis.summary.paidCount})</span>}
              {analysis && tab.value === "OVERDUE" && <span className="sa-tab-count">({analysis.summary.overdueCount})</span>}
              {analysis && tab.value === "DUE_TODAY" && <span className="sa-tab-count">({analysis.summary.dueTodayCount})</span>}
              {analysis && tab.value === "DUE_SOON" && <span className="sa-tab-count">({analysis.summary.dueSoonCount})</span>}
            </button>
          ))}
        </div>

        <div className="sa-toolbar-search">
          <input
            type="text"
            className="sa-input sa-search-input"
            placeholder={`Search Invoice #, ${customerTerm}, ${villageTerm}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* Analytics Toggle */}
      {analysis && (
          <div style={{ marginBottom: "1rem" }}>
              <Button variant="ghost" size="sm" onClick={() => setShowAnalytics(!showAnalytics)} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <BarChart size={16} /> {showAnalytics ? "Hide Analytics" : "Show Analytics"}
                  {showAnalytics ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </Button>
              
              {showAnalytics && (
                  <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: "300px" }}><Card>
                          <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem" }}>Customer Outstanding</h4>
                          <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
                              {analysis.customerWise.slice(0, 5).map(c => (
                                  <li key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--color-border)" }}>
                                      <span>{c.name}</span>
                                      <span style={{ fontWeight: "bold", color: "#dc2626" }}>₹{c.outstanding.toLocaleString("en-IN")}</span>
                                  </li>
                              ))}
                          </ul>
                      </Card></div>
                      <div style={{ flex: 1, minWidth: "300px" }}><Card>
                          <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem" }}>Payment Methods</h4>
                          <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
                              {analysis.methodWiseCollection.map(m => (
                                  <li key={m.method} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--color-border)" }}>
                                      <span>{m.method.replace(/_/g, " ")}</span>
                                      <span style={{ fontWeight: "bold", color: "#16a34a" }}>₹{m.amount.toLocaleString("en-IN")}</span>
                                  </li>
                              ))}
                          </ul>
                      </Card></div>
                  </div>
              )}
          </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="sa-center-viewport">
          <Spinner size="lg" label="Loading payments ledger..." />
        </div>
      ) : error ? (
        <div className="sa-error-container">
          <div className="sa-error-card">
            <span className="sa-error-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={32} color="var(--color-error, #D32F2F)" />
            </span>
            <h3>Error Loading Payments</h3>
            <p>{error}</p>
            <Button variant="primary" onClick={loadInvoices}>
              Retry
            </Button>
          </div>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <div className="sa-empty-state">
            <span className="sa-empty-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <CreditCard size={32} color="var(--color-text-muted)" />
            </span>
            <h3>No Invoices Found</h3>
            <p>
              {searchQuery || activeStatus !== "ALL"
                ? "No billing records match the selected filter criteria."
                : "No invoices yet. Invoices are created automatically when jobs are completed, or you can create one manually."}
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="sa-desktop-only">
            <Card>
              <div className="sa-table-responsive">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>{customerTerm} & {villageTerm}</th>
                      <th>Dates & Due</th>
                      <th>Total Amount</th>
                      <th>Balance Due</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => {
                        const daysOverdue = getDaysOverdue(inv.dueDate);
                        return (
                      <tr
                        key={inv.id}
                        onClick={() => handleOpenReceipt(inv)}
                        className="sa-clickable-row"
                      >
                        <td className="sa-td-bold">
                            {inv.invoiceNumber}
                            {inv.booking?.bookingNumber && <div className="sa-text-muted" style={{ fontSize: "0.8rem", fontWeight: "normal" }}>{inv.booking.bookingNumber}</div>}
                        </td>
                        <td>
                          <div className="sa-cell-title">{inv.customer?.name || customerTerm}</div>
                          <div className="sa-cell-sub">{inv.customer?.village?.name || villageTerm}</div>
                        </td>
                        <td>
                            <div className="sa-cell-title">{new Date(inv.invoiceDate).toLocaleDateString("en-IN")}</div>
                            <div className="sa-cell-sub" style={{ color: (daysOverdue !== null && daysOverdue > 0 && inv.balanceAmount > 0) ? "#dc2626" : undefined }}>
                                {inv.dueDate ? `Due: ${new Date(inv.dueDate).toLocaleDateString("en-IN")}` : ""}
                                {(daysOverdue !== null && daysOverdue > 0 && inv.balanceAmount > 0) ? ` (${daysOverdue}d overdue)` : ""}
                            </div>
                        </td>
                        <td>
                            <div>₹{Number(inv.totalAmount).toLocaleString("en-IN")}</div>
                            <div className="sa-text-success" style={{ fontSize: "0.8rem" }}>Paid: ₹{Number(inv.paidAmount).toLocaleString("en-IN")}</div>
                        </td>
                        <td className={inv.balanceAmount > 0 ? "sa-amount-bold sa-text-danger" : "sa-text-muted"}>
                          ₹{Number(inv.balanceAmount).toLocaleString("en-IN")}
                        </td>
                        <td>
                          <Badge variant={getStatusBadgeVariant(inv.status)} size="sm">
                            {inv.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td>
                          <div className="sa-table-actions" onClick={(e) => e.stopPropagation()}>
                            {canReceive && inv.balanceAmount > 0 && inv.status !== "VOIDED" && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={(e) => handleOpenReceivePayment(inv, e)}
                              >
                                Receive Payment
                              </Button>
                            )}
                            <ActionMenu
                              items={[
                                { key: "receipt", label: "View Receipt / History", icon: <Receipt size={15} />, onClick: () => handleOpenReceipt(inv) },
                                {
                                  key: "void",
                                  label: "Void Invoice",
                                  icon: <Ban size={15} />,
                                  danger: true,
                                  onClick: () => handleOpenVoidInvoice(inv),
                                  hidden: !canVoid || inv.status === "VOIDED",
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Card List View */}
          <div className="sa-mobile-only">
            <div className="sa-mobile-booking-list">
              {filteredInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="sa-mobile-booking-card"
                  onClick={() => handleOpenReceipt(inv)}
                >
                  <div className="sa-booking-card-top">
                    <div className="sa-booking-num"> {inv.invoiceNumber}</div>
                    <Badge variant={getStatusBadgeVariant(inv.status)} size="sm">
                      {inv.status.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  <div className="sa-booking-card-main">
                    <div className="sa-bcard-row">
                      <span className="sa-bcard-label"> {customerTerm}:</span>
                      <span className="sa-bcard-val">
                        {inv.customer?.name} ({inv.customer?.village?.name})
                      </span>
                    </div>

                    <div className="sa-bcard-row">
                      <span className="sa-bcard-label"> Total:</span>
                      <span className="sa-bcard-val">₹{Number(inv.totalAmount).toLocaleString("en-IN")}</span>
                    </div>

                    <div className="sa-bcard-row">
                      <span className="sa-bcard-label"> Balance Due:</span>
                      <span
                        className="sa-bcard-val sa-amount-bold"
                        style={{ color: inv.balanceAmount > 0 ? "#dc2626" : "#16a34a" }}
                      >
                        ₹{Number(inv.balanceAmount).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {canReceive && inv.balanceAmount > 0 && inv.status !== "VOIDED" && (
                    <div style={{ marginTop: "0.75rem" }} onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="primary"
                        size="md"
                        style={{ width: "100%" }}
                        onClick={(e) => handleOpenReceivePayment(inv, e)}
                      >
                        Receive Payment (₹{Number(inv.balanceAmount).toLocaleString("en-IN")})
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Customer Advances */}
      {advances.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <Card>
            <div style={{ padding: "1rem 1.25rem 0.5rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", display: "flex", alignItems: "center", gap: "6px" }}>
                <PiggyBank size={18} /> Customer Advances
              </h3>
              <p className="sa-text-muted" style={{ fontSize: "0.82rem", margin: "4px 0 0" }}>
                Money on file that isn't tied to an invoice yet.
              </p>
            </div>
            <div className="sa-table-responsive">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>{customerTerm}</th>
                    <th>Amount</th>
                    <th>Balance</th>
                    <th>Method</th>
                    <th>Date</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {advances.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="sa-cell-title">{a.customer?.name || customerTerm}</div>
                        <div className="sa-cell-sub">{a.customer?.village?.name || ""}</div>
                      </td>
                      <td>₹{Number(a.amount).toLocaleString("en-IN")}</td>
                      <td className={Number(a.amount) - Number(a.appliedAmount) > 0 ? "sa-text-success" : "sa-text-muted"}>
                        ₹{(Number(a.amount) - Number(a.appliedAmount)).toLocaleString("en-IN")}
                      </td>
                      <td>{a.paymentMethod.replace(/_/g, " ")}</td>
                      <td>{new Date(a.receivedAt).toLocaleDateString("en-IN")}</td>
                      <td className="sa-text-muted">{a.notes || a.referenceNumber || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Receipt / Invoice Details Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        invoice={selectedInvoiceForReceipt}
        onReceivePayment={(inv) => handleOpenReceivePayment(inv)}
        onInvoiceUpdated={loadInvoices}
        canVoid={canVoid}
        onVoidInvoice={(inv) => handleOpenVoidInvoice(inv)}
      />
    </div>
  );
};
