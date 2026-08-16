import React, { useEffect, useState } from "react";
import { FileSpreadsheet, Printer, Share2 } from "lucide-react";
import type { Invoice, ReceiptData } from "../../types/payment";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { exportToExcel, exportToPdf, shareOnWhatsApp } from "../../lib/exportUtils";
import { useAuth } from "../../context/AuthContext";
import { Modal } from "../../components/ui/Modal";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";

interface ReceiptModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onReceivePayment: (invoice: Invoice) => void;
  onInvoiceUpdated?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onReceivePayment,
  onInvoiceUpdated,
}) => {
  const { hasPermission } = useAuth();
  const customerTerm = getTerm("customer");
  const machineTerm = getTerm("machine");
  const driverTerm = getTerm("driver");

  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingTax, setIsEditingTax] = useState<boolean>(false);
  const [taxFormGst, setTaxFormGst] = useState<boolean>(false);
  const [taxFormRate, setTaxFormRate] = useState<number>(18);
  const [isSavingTax, setIsSavingTax] = useState<boolean>(false);

  useEffect(() => {
    if (invoice && isOpen) {
      const invId = invoice.id;
      async function loadReceipt() {
        setIsLoading(true);
        setError(null);
        setIsEditingTax(false);
        try {
          const data = await api.getReceipt(invId);
          setReceiptData(data);
          setTaxFormGst(data.invoice.isGstApplicable ?? false);
          setTaxFormRate(data.invoice.taxRate ?? 18);
        } catch (err: any) {
          setError(err.message || "Failed to load receipt details");
        } finally {
          setIsLoading(false);
        }
      }
      loadReceipt();
    }
  }, [invoice, isOpen]);

  if (!invoice) return null;

  const handleSaveTax = async () => {
    if (!inv) return;
    setIsSavingTax(true);
    setError(null);
    try {
      const updatedInvoice = await api.updateInvoiceTax(inv.id, {
        isGstApplicable: taxFormGst,
        taxRate: taxFormGst ? taxFormRate : 0,
      });
      setReceiptData((prev) => (prev ? { ...prev, invoice: updatedInvoice } : null));
      setIsEditingTax(false);
      if (onInvoiceUpdated) {
        onInvoiceUpdated();
      }
    } catch (err: any) {
      setError(err.message || "Failed to update tax configuration");
    } finally {
      setIsSavingTax(false);
    }
  };

  const inv = receiptData?.invoice || invoice;
  const company = receiptData?.company;
  const customer = receiptData?.customer || invoice.customer;
  const service = receiptData?.service;
  const invoiceDate = receiptData?.invoice.invoiceDate || invoice.createdAt;
  const payments = receiptData?.payments || [];

  // Build full company address line
  const addressParts = [
    company?.address,
    company?.city,
    company?.district,
    company?.state,
    company?.pincode ? `PIN: ${company.pincode}` : null,
    company?.country && company.country !== "India" ? company.country : null,
  ].filter(Boolean);
  const fullAddress = addressParts.join(", ");

  const hasBankDetails = Boolean(
    company?.bankName || company?.accountNumber || company?.ifscCode || company?.upiId
  );

  const canManageTax = hasPermission("payment.receive") || hasPermission("company.manage");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="sa-modal-booking-title">
          <span>Invoice #{inv.invoiceNumber}</span>
          <Badge variant={getStatusBadgeVariant(inv.status)}>
            {inv.status.replace(/_/g, " ")}
          </Badge>
        </div>
      }
      maxWidth="680px"
    >
      {isLoading ? (
        <div className="sa-center-viewport" style={{ padding: "2rem" }}>
          <Spinner size="md" label="Loading printable document..." />
        </div>
      ) : error ? (
        <div className="sa-alert sa-alert-danger">{error}</div>
      ) : (
        <div className="sa-receipt-container">
          {/* Company Branding & Header */}
          <div className="sa-receipt-header" style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
            <div>
              <h2 className="sa-receipt-brand" style={{ margin: "0 0 4px 0", fontSize: "1.25rem", color: "var(--color-primary)" }}>
                {company?.name || "ShabooAgri Operational Fleet"}
              </h2>
              {fullAddress && <p className="sa-receipt-sub" style={{ margin: "0 0 2px 0", fontSize: "0.82rem", color: "var(--color-text-muted)" }}>{fullAddress}</p>}
              <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "4px" }}>
                {company?.phone && <span>Phone: {company.phone}</span>}
                {company?.email && <span>Email: {company.email}</span>}
                {company?.gstin && <span><strong>GSTIN:</strong> {company.gstin}</span>}
                {company?.pan && <span><strong>PAN:</strong> {company.pan}</span>}
              </div>
            </div>

            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div className="sa-receipt-inv-num" style={{ fontSize: "1.1rem", fontWeight: 700 }}>INVOICE #{inv.invoiceNumber}</div>
              <div className="sa-receipt-date" style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                Date: {new Date(invoiceDate).toLocaleDateString("en-IN")}
              </div>
            </div>
          </div>

          <hr className="sa-divider" style={{ margin: "14px 0" }} />

          {/* Customer & Booking Details */}
          <div className="sa-detail-grid" style={{ marginBottom: "1rem" }}>
            <div className="sa-detail-item">
              <span className="sa-detail-label">{customerTerm} Name</span>
              <span className="sa-detail-val">{customer?.name || "Customer"}</span>
            </div>

            <div className="sa-detail-item">
              <span className="sa-detail-label">Village / Location</span>
              <span className="sa-detail-val">
                {typeof customer?.village === "string" ? customer.village : "N/A"}
              </span>
            </div>

            {customer?.gstin && (
              <div className="sa-detail-item">
                <span className="sa-detail-label">{customerTerm} GSTIN</span>
                <span className="sa-detail-val" style={{ fontFamily: "monospace" }}>{customer.gstin}</span>
              </div>
            )}

            {service?.bookingNumber ? (
              <>
                <div className="sa-detail-item">
                  <span className="sa-detail-label">{machineTerm}</span>
                  <span className="sa-detail-val">
                    {service?.machine?.registrationNumber || "N/A"} ({service?.machine?.brand || ""})
                  </span>
                </div>

                <div className="sa-detail-item">
                  <span className="sa-detail-label">Assigned {driverTerm}</span>
                  <span className="sa-detail-val">
                    {service?.driver?.name || "N/A"}
                  </span>
                </div>
              </>
            ) : (
              <div className="sa-detail-item">
                <span className="sa-detail-label">Description</span>
                <span className="sa-detail-val">{receiptData?.description || "Manual invoice entry"}</span>
              </div>
            )}
          </div>

          {/* Optional Invoice GST Controls & Financial Breakdown Table */}
          <div className="sa-notes-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h4 style={{ margin: 0, fontSize: "0.95rem" }}>Billing Summary</h4>
              {canManageTax && !isEditingTax && (
                <button
                  type="button"
                  onClick={() => setIsEditingTax(true)}
                  style={{ background: "none", border: "none", color: "var(--color-primary)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
                >
                  {inv.isGstApplicable ? "Edit GST Settings" : "+ Add GST/Tax to Invoice"}
                </button>
              )}
            </div>

            {isEditingTax && (
              <div style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "12px", marginBottom: "12px" }}>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "8px" }}>Invoice Tax Application</div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={taxFormGst}
                      onChange={(e) => setTaxFormGst(e.target.checked)}
                    />
                    Apply GST to this Invoice
                  </label>

                  {taxFormGst && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "0.82rem" }}>GST Tax Rate (%):</span>
                      <input
                        type="number"
                        className="sa-input"
                        style={{ width: "80px", padding: "4px 8px" }}
                        value={taxFormRate}
                        onChange={(e) => setTaxFormRate(Number(e.target.value))}
                        min={0}
                        max={100}
                        step={0.5}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <Button variant="primary" size="sm" onClick={handleSaveTax} disabled={isSavingTax}>
                    {isSavingTax ? "Updating…" : "Apply Tax Changes"}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setIsEditingTax(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            <table className="sa-table sa-receipt-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.isGstApplicable ? (
                  <>
                    <tr>
                      <td>Taxable Service Value ({service?.pricingMethod || "Equipment Rental"})</td>
                      <td style={{ textAlign: "right" }}>₹{(inv.subtotalAmount ?? inv.totalAmount).toLocaleString("en-IN")}</td>
                    </tr>
                    {Boolean(inv.cgstAmount) && (
                      <tr>
                        <td>CGST ({((inv.taxRate ?? 18) / 2)}%)</td>
                        <td style={{ textAlign: "right" }}>+₹{inv.cgstAmount?.toLocaleString("en-IN")}</td>
                      </tr>
                    )}
                    {Boolean(inv.sgstAmount) && (
                      <tr>
                        <td>SGST ({((inv.taxRate ?? 18) / 2)}%)</td>
                        <td style={{ textAlign: "right" }}>+₹{inv.sgstAmount?.toLocaleString("en-IN")}</td>
                      </tr>
                    )}
                    {Boolean(inv.igstAmount) && (
                      <tr>
                        <td>IGST ({inv.taxRate}%)</td>
                        <td style={{ textAlign: "right" }}>+₹{inv.igstAmount?.toLocaleString("en-IN")}</td>
                      </tr>
                    )}
                  </>
                ) : (
                  <tr>
                    <td>Service Charge ({service?.pricingMethod || "Standard Equipment Rental"})</td>
                    <td style={{ textAlign: "right" }}>₹{inv.totalAmount.toLocaleString("en-IN")}</td>
                  </tr>
                )}
                <tr className="sa-tr-total" style={{ fontWeight: 700, background: "var(--color-surface-secondary)" }}>
                  <td>Total Invoice Amount</td>
                  <td style={{ textAlign: "right", fontSize: "1.1rem" }}>
                    ₹{inv.totalAmount.toLocaleString("en-IN")}
                  </td>
                </tr>
                <tr>
                  <td>Total Amount Received</td>
                  <td style={{ textAlign: "right", color: "#16a34a", fontWeight: 600 }}>
                    ₹{inv.paidAmount.toLocaleString("en-IN")}
                  </td>
                </tr>
                <tr className="sa-tr-balance">
                  <td>Outstanding Balance Due</td>
                  <td style={{ textAlign: "right", color: inv.balanceAmount > 0 ? "#dc2626" : "#16a34a", fontSize: "1.15rem", fontWeight: 700 }}>
                    ₹{inv.balanceAmount.toLocaleString("en-IN")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Business Bank & Payment Transfer Details (if configured) */}
          {hasBankDetails && (
            <div style={{ marginTop: "1rem", background: "var(--color-surface-secondary)", borderRadius: "8px", padding: "12px 16px", border: "1px solid var(--color-border)" }}>
              <h4 style={{ margin: "0 0 6px 0", fontSize: "0.88rem", color: "var(--color-primary)" }}>Bank Transfer & Payment Details</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "8px", fontSize: "0.82rem" }}>
                {company?.bankName && <div><strong>Bank Name:</strong> {company.bankName}</div>}
                {company?.accountNumber && <div><strong>Account No:</strong> <span style={{ fontFamily: "monospace" }}>{company.accountNumber}</span></div>}
                {company?.ifscCode && <div><strong>IFSC Code:</strong> <span style={{ fontFamily: "monospace" }}>{company.ifscCode}</span></div>}
                {company?.upiId && <div><strong>UPI ID:</strong> <span style={{ fontFamily: "monospace" }}>{company.upiId}</span></div>}
              </div>
            </div>
          )}

          {/* Payment History Table */}
          {payments.length > 0 && (
            <div className="sa-notes-section" style={{ marginTop: "1rem" }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "0.95rem" }}>Payment Collections History</h4>
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Method</th>
                    <th>Ref #</th>
                    <th>Collected By</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.receivedAt).toLocaleDateString("en-IN")}</td>
                      <td>
                        <Badge variant="neutral" size="sm">
                          {p.paymentMethod}
                        </Badge>
                      </td>
                      <td>{p.referenceNumber || "—"}</td>
                      <td>{p.receivedBy || "Staff"}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        ₹{p.amount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Action Controls */}
          <div className="sa-form-actions" style={{ marginTop: "1.5rem", display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Button
                variant="secondary"
                size="md"
                onClick={() => exportToPdf(`Invoice_${inv.invoiceNumber}`)}
              >
                <Printer size={16} style={{ marginRight: "6px" }} />
                Print / Save PDF
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  const cols = [
                    { header: "Invoice Number", key: "invoiceNumber" },
                    { header: "Customer Name", key: "customerName" },
                    { header: "Date", key: "date" },
                    { header: "Machine", key: "machine" },
                    { header: "Total Amount", key: "totalAmount" },
                    { header: "Paid Amount", key: "paidAmount" },
                    { header: "Balance Due", key: "balanceAmount" },
                    { header: "Status", key: "status" },
                  ];
                  const dataRow = [{
                    invoiceNumber: inv.invoiceNumber,
                    customerName: customer?.name || "Customer",
                    date: new Date(invoiceDate).toLocaleDateString("en-IN"),
                    machine: service?.machine?.registrationNumber || "N/A",
                    totalAmount: inv.totalAmount,
                    paidAmount: inv.paidAmount,
                    balanceAmount: inv.balanceAmount,
                    status: inv.status,
                  }];
                  exportToExcel(`Invoice_${inv.invoiceNumber}`, "Invoice Summary", cols, dataRow);
                }}
              >
                <FileSpreadsheet size={16} style={{ marginRight: "6px" }} />
                Export Excel
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  const customerPhone = (customer as any)?.phone || (customer as any)?.mobileNumber;
                  const msg = `Hello ${customer?.name || "Valued Customer"},\n\nHere is your invoice summary from ${company?.name || "ShabooAgri"}:\n\nInvoice: #${inv.invoiceNumber}\nTotal Amount: ₹${inv.totalAmount.toLocaleString("en-IN")}\nAmount Paid: ₹${inv.paidAmount.toLocaleString("en-IN")}\nBalance Due: ₹${inv.balanceAmount.toLocaleString("en-IN")}\nStatus: ${inv.status.replace(/_/g, " ")}\n\nThank you for choosing ${company?.name || "ShabooAgri"}!`;
                  shareOnWhatsApp(customerPhone, msg);
                }}
              >
                <Share2 size={16} style={{ marginRight: "6px", color: "#25D366" }} />
                Share WhatsApp
              </Button>
            </div>

            {inv.balanceAmount > 0 && (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  onClose();
                  onReceivePayment({ ...invoice, ...inv, customer: invoice.customer });
                }}
              >
                Receive Payment (₹{inv.balanceAmount.toLocaleString("en-IN")} Due)
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
