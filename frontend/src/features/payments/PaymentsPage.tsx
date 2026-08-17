import React, { useEffect, useState } from "react";
import { AlertTriangle, CreditCard, FileText, Wallet, CheckCircle2, AlertCircle, FileSpreadsheet, Plus, PiggyBank } from "lucide-react";
import "./payments.css";
import type { CustomerAdvance, Invoice } from "../../types/payment";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { getTerm } from "../../lib/terminology";
import { exportToExcel } from "../../lib/exportUtils";
import { Card } from "../../components/ui/Card";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { ReceivePaymentModal } from "./ReceivePaymentModal";
import { ReceiptModal } from "./ReceiptModal";
import { NewInvoiceModal } from "./NewInvoiceModal";
import { RecordAdvanceModal } from "./RecordAdvanceModal";

const PAYMENT_STATUS_FILTERS: Array<{ label: string; value: string }> = [
 { label: "All", value: "ALL" },
 { label: "Unpaid", value: "UNPAID" },
 { label: "Partially Paid", value: "PARTIALLY_PAID" },
 { label: "Paid", value: "PAID" },
];

export const PaymentsPage: React.FC = () => {
 const { roleKey, hasPermission } = useAuth();
 const customerTerm = getTerm("customer");
 const villageTerm = getTerm("village");

 const [invoices, setInvoices] = useState<Invoice[]>([]);
 const [advances, setAdvances] = useState<CustomerAdvance[]>([]);
 const [activeFilter, setActiveFilter] = useState<string>("ALL");
 const [searchQuery, setSearchQuery] = useState<string>("");

 const [isLoading, setIsLoading] = useState<boolean>(true);
 const [error, setError] = useState<string | null>(null);

 const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
 const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

 const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<Invoice | null>(null);
 const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

 const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState<boolean>(false);
 const [isRecordAdvanceModalOpen, setIsRecordAdvanceModalOpen] = useState<boolean>(false);

 const canReceive = roleKey === "owner" || hasPermission("payment.receive");

 const loadInvoices = async () => {
 setIsLoading(true);
 setError(null);
 try {
 const [list, advanceList] = await Promise.all([
 api.listInvoices(),
 api.listCustomerAdvances().catch(() => []),
 ]);
 setInvoices(list);
 setAdvances(advanceList);

 // Refresh receipt modal if open
 if (selectedInvoiceForReceipt) {
 const updated = list.find((i) => i.id === selectedInvoiceForReceipt.id);
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
 }, []);

 const handleOpenReceivePayment = (invoice: Invoice, e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 setSelectedInvoiceForPayment(invoice);
 setIsPaymentModalOpen(true);
 };

 const handleOpenReceipt = (invoice: Invoice) => {
 setSelectedInvoiceForReceipt(invoice);
 setIsReceiptModalOpen(true);
 };

 // Authoritative financial totals
 const totalReceivables = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
 const totalCollected = invoices.reduce((sum, inv) => sum + Number(inv.paidAmount), 0);
 const totalBalanceDue = invoices.reduce((sum, inv) => sum + Number(inv.balanceAmount), 0);
 const totalAdvanceBalance = advances.reduce(
 (sum, a) => sum + (Number(a.amount) - Number(a.appliedAmount)),
 0
 );

 // Filter invoices by status tab & search query
 const filteredInvoices = invoices.filter((inv) => {
 if (activeFilter !== "ALL" && inv.status !== activeFilter) return false;
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

 return (
 <div className="sa-payments-page">
 {/* Page Header */}
 <div className="sa-page-header">
 <div className="sa-page-header-text">
 <h2>Payments & Invoicing</h2>
 <p>Track job billing, receive collections, enforce balances & issue receipts</p>
 </div>

 <div style={{ display: "flex", gap: "8px" }}>
 {canReceive && (
 <Button
 variant="secondary"
 size="md"
 onClick={() => setIsRecordAdvanceModalOpen(true)}
 style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
 >
 <PiggyBank size={16} /> Record Advance
 </Button>
 )}

 {canReceive && (
 <Button
 variant="primary"
 size="md"
 onClick={() => setIsNewInvoiceModalOpen(true)}
 style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
 >
 <Plus size={16} /> New Invoice
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
 { header: "Date", key: "date" },
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
 }));
 exportToExcel("Invoices_Ledger", "Invoices", cols, dataRows);
 }}
 style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
 >
 <FileSpreadsheet size={16} /> Export Excel
 </Button>
 </div>
 </div>

 {/* Financial KPI Summary Cards */}
 <div className="sa-kpi-grid" style={{ marginBottom: "1.5rem" }}>
 <Card className="sa-kpi-card">
 <div className="sa-kpi-icon"><FileText size={24} color="var(--color-primary)" /></div>
 <div className="sa-kpi-content">
 <span className="sa-kpi-label">Total Invoices</span>
 <span className="sa-kpi-value">{invoices.length}</span>
 </div>
 </Card>

 <Card className="sa-kpi-card">
 <div className="sa-kpi-icon"><Wallet size={24} color="var(--color-primary)" /></div>
 <div className="sa-kpi-content">
 <span className="sa-kpi-label">Total Receivables</span>
 <span className="sa-kpi-value">₹{totalReceivables.toLocaleString("en-IN")}</span>
 </div>
 </Card>

 <Card className="sa-kpi-card">
 <div className="sa-kpi-icon"><CheckCircle2 size={24} color="#16a34a" /></div>
 <div className="sa-kpi-content">
 <span className="sa-kpi-label">Total Collected</span>
 <span className="sa-kpi-value" style={{ color: "#16a34a" }}>
 ₹{totalCollected.toLocaleString("en-IN")}
 </span>
 </div>
 </Card>

 <Card className="sa-kpi-card">
 <div className="sa-kpi-icon">
 <AlertCircle size={24} color={totalBalanceDue > 0 ? "#dc2626" : "#16a34a"} />
 </div>
 <div className="sa-kpi-content">
 <span className="sa-kpi-label">Outstanding Balance</span>
 <span className="sa-kpi-value" style={{ color: totalBalanceDue > 0 ? "#dc2626" : "#16a34a" }}>
 ₹{totalBalanceDue.toLocaleString("en-IN")}
 </span>
 </div>
 </Card>

 <Card className="sa-kpi-card">
 <div className="sa-kpi-icon"><PiggyBank size={24} color="var(--color-primary)" /></div>
 <div className="sa-kpi-content">
 <span className="sa-kpi-label">Advance Balance</span>
 <span className="sa-kpi-value">₹{totalAdvanceBalance.toLocaleString("en-IN")}</span>
 </div>
 </Card>
 </div>

 {/* Filter Tabs & Search Bar */}
 <div className="sa-toolbar">
 <div className="sa-filter-tabs">
 {PAYMENT_STATUS_FILTERS.map((tab) => (
 <button
 key={tab.value}
 className={`sa-tab-btn ${activeFilter === tab.value ? "is-active" : ""}`}
 onClick={() => setActiveFilter(tab.value)}
 >
 {tab.label}
 {tab.value === "ALL" ? (
 <span className="sa-tab-count">({invoices.length})</span>
 ) : (
 <span className="sa-tab-count">
 ({invoices.filter((i) => i.status === tab.value).length})
 </span>
 )}
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
 {searchQuery || activeFilter !== "ALL"
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
 <th>Total Amount</th>
 <th>Paid Amount</th>
 <th>Balance Due</th>
 <th>Status</th>
 <th>Actions</th>
 </tr>
 </thead>
 <tbody>
 {filteredInvoices.map((inv) => (
 <tr
 key={inv.id}
 onClick={() => handleOpenReceipt(inv)}
 className="sa-clickable-row"
 >
 <td className="sa-td-bold"> {inv.invoiceNumber}</td>
 <td>
 <div className="sa-cell-title">{inv.customer?.name || customerTerm}</div>
 <div className="sa-cell-sub">{inv.customer?.village?.name || villageTerm}</div>
 </td>
 <td>₹{Number(inv.totalAmount).toLocaleString("en-IN")}</td>
 <td className="sa-text-success">₹{Number(inv.paidAmount).toLocaleString("en-IN")}</td>
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
 {canReceive && inv.balanceAmount > 0 && (
 <Button
 variant="primary"
 size="sm"
 onClick={(e) => handleOpenReceivePayment(inv, e)}
 >
 Receive Payment
 </Button>
 )}

 <Button
 variant="secondary"
 size="sm"
 onClick={() => handleOpenReceipt(inv)}
 >
 Receipt
 </Button>
 </div>
 </td>
 </tr>
 ))}
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

 {canReceive && inv.balanceAmount > 0 && (
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

 {/* Customer Advances — money received with no invoice to apply it to yet */}
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

 {/* Receive Payment Modal */}
 <ReceivePaymentModal
 isOpen={isPaymentModalOpen}
 onClose={() => setIsPaymentModalOpen(false)}
 onSuccess={loadInvoices}
 invoice={selectedInvoiceForPayment}
 />

 {/* Receipt / Invoice Details Modal */}
 <ReceiptModal
 isOpen={isReceiptModalOpen}
 onClose={() => setIsReceiptModalOpen(false)}
 invoice={selectedInvoiceForReceipt}
 onReceivePayment={(inv) => handleOpenReceivePayment(inv)}
 onInvoiceUpdated={loadInvoices}
 />

 {/* New Invoice Modal */}
 <NewInvoiceModal
 isOpen={isNewInvoiceModalOpen}
 onClose={() => setIsNewInvoiceModalOpen(false)}
 onSuccess={loadInvoices}
 />

 {/* Record Advance Payment Modal */}
 <RecordAdvanceModal
 isOpen={isRecordAdvanceModalOpen}
 onClose={() => setIsRecordAdvanceModalOpen(false)}
 onSuccess={loadInvoices}
 />
 </div>
 );
};
