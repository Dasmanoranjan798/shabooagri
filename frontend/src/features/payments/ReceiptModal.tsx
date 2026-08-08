import React, { useEffect, useState } from "react";
import type { Invoice, ReceiptData } from "../../types/payment";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";

interface ReceiptModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onReceivePayment: (invoice: Invoice) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onReceivePayment,
}) => {
  const customerTerm = getTerm("customer");
  const machineTerm = getTerm("machine");
  const driverTerm = getTerm("driver");

  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invoice && isOpen) {
      const invId = invoice.id;
      async function loadReceipt() {
        setIsLoading(true);
        setError(null);
        try {
          const data = await api.getReceipt(invId);
          setReceiptData(data);
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

  const handlePrint = () => {
    window.print();
  };

  const inv = receiptData?.invoice || invoice;
  const company = receiptData?.company;

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
      maxWidth="650px"
    >
      {isLoading ? (
        <div className="sa-center-viewport" style={{ padding: "2rem" }}>
          <Spinner size="md" label="Loading printable receipt..." />
        </div>
      ) : error ? (
        <div className="sa-alert sa-alert-danger">{error}</div>
      ) : (
        <div className="sa-receipt-container">
          {/* Company Branding & Receipt Header */}
          <div className="sa-receipt-header">
            <div>
              <h2 className="sa-receipt-brand">{company?.name || "ShabooAgri Operational Fleet"}</h2>
              {company?.address && <p className="sa-receipt-sub">{company.address}</p>}
              {company?.phone && <p className="sa-receipt-sub">📞 Contact: {company.phone}</p>}
            </div>

            <div style={{ textAlign: "right" }}>
              <div className="sa-receipt-inv-num">INVOICE #{inv.invoiceNumber}</div>
              <div className="sa-receipt-date">
                Date: {new Date(inv.createdAt).toLocaleDateString("en-IN")}
              </div>
            </div>
          </div>

          <hr className="sa-divider" />

          {/* Customer & Booking Details */}
          <div className="sa-detail-grid" style={{ marginBottom: "1rem" }}>
            <div className="sa-detail-item">
              <span className="sa-detail-label">👤 {customerTerm} Name</span>
              <span className="sa-detail-val">{inv.customer?.name || "Customer"}</span>
            </div>

            <div className="sa-detail-item">
              <span className="sa-detail-label">🏘️ Village</span>
              <span className="sa-detail-val">{inv.customer?.village?.name || "N/A"}</span>
            </div>

            <div className="sa-detail-item">
              <span className="sa-detail-label">🚜 {machineTerm}</span>
              <span className="sa-detail-val">
                {inv.booking?.machine?.registrationNumber || "N/A"} ({inv.booking?.machine?.brand || ""})
              </span>
            </div>

            <div className="sa-detail-item">
              <span className="sa-detail-label">👨‍🌾 Assigned {driverTerm}</span>
              <span className="sa-detail-val">
                {inv.booking?.driver?.employee?.name || "N/A"}
              </span>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="sa-notes-section">
            <h4>Billing Summary</h4>
            <table className="sa-table sa-receipt-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Service Charge ({inv.booking?.pricingMethod?.name || "Standard Rate"})</td>
                  <td style={{ textAlign: "right" }}>₹{inv.subtotalAmount.toLocaleString("en-IN")}</td>
                </tr>
                {inv.discountAmount > 0 && (
                  <tr>
                    <td>Discount</td>
                    <td style={{ textAlign: "right", color: "#16a34a" }}>
                      -₹{inv.discountAmount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                )}
                {inv.taxAmount > 0 && (
                  <tr>
                    <td>Taxes</td>
                    <td style={{ textAlign: "right" }}>+₹{inv.taxAmount.toLocaleString("en-IN")}</td>
                  </tr>
                )}
                <tr className="sa-tr-total">
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

          {/* Payment History Table */}
          {inv.payments && inv.payments.length > 0 && (
            <div className="sa-notes-section" style={{ marginTop: "1rem" }}>
              <h4>Payment Collections History</h4>
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
                  {inv.payments.map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.createdAt).toLocaleDateString("en-IN")}</td>
                      <td>
                        <Badge variant="neutral" size="sm">
                          {p.paymentMethod}
                        </Badge>
                      </td>
                      <td>{p.referenceNumber || "—"}</td>
                      <td>{p.receiver?.fullName || "Staff"}</td>
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
          <div className="sa-form-actions" style={{ marginTop: "1.5rem" }}>
            <Button variant="secondary" size="md" onClick={handlePrint}>
              🖨️ Print Receipt
            </Button>

            {inv.balanceAmount > 0 && (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  onClose();
                  onReceivePayment(inv);
                }}
              >
                💵 Receive Payment (₹{inv.balanceAmount.toLocaleString("en-IN")} Due)
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
