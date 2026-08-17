import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AdminGuard } from "../../components/AdminGuard";
import { api, ApiError, type AdminPlatformUserDetail, type LicenseStatus } from "../../lib/api";

function licenseStatusStyle(status: LicenseStatus | null): { bg: string; color: string; label: string } {
  if (status === "ACTIVE") return { bg: "var(--color-primary-light)", color: "var(--color-primary-dark)", label: "Active" };
  if (status === "EXPIRING_SOON") return { bg: "#fef3c7", color: "#b45309", label: "Expiring Soon" };
  if (status === "EXPIRED") return { bg: "#fef2f2", color: "var(--color-danger)", label: "Expired" };
  return { bg: "var(--color-bg)", color: "var(--color-text-muted)", label: "No License" };
}

function paymentStatusStyle(status: string): { bg: string; color: string } {
  if (status === "SUCCESS") return { bg: "var(--color-primary-light)", color: "var(--color-primary-dark)" };
  if (status === "FAILED") return { bg: "#fef2f2", color: "var(--color-danger)" };
  return { bg: "#fef3c7", color: "#b45309" }; // PENDING
}

const StatusBadge: React.FC<{ bg: string; color: string; label: string }> = ({ bg, color, label }) => (
  <span
    style={{
      fontSize: "0.75rem",
      fontWeight: 700,
      padding: "3px 10px",
      borderRadius: 999,
      whiteSpace: "nowrap",
      backgroundColor: bg,
      color,
    }}
  >
    {label}
  </span>
);

const DetailField: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 }}>
      {label}
    </div>
    <div style={{ fontSize: "0.92rem" }}>{value}</div>
  </div>
);

const CustomerDetailPageContent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<AdminPlatformUserDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getAdminPlatformUserDetail(id)
      .then(setCustomer)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Could not load customer"));
  }, [id]);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
      <Link to="/admin/customers" style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
        <ArrowLeft size={14} /> Back to Customers
      </Link>

      {loadError && <div className="pf-alert pf-alert-danger">{loadError}</div>}

      {!customer ? (
        !loadError && <p style={{ color: "var(--color-text-muted)" }}>Loading...</p>
      ) : (
        <>
          {/* ---- Header ---- */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 4 }}>{customer.businessName}</h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: 12 }}>
              {customer.contactPerson} · {customer.email} · {customer.phone}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <DetailField
                label="Company"
                value={
                  customer.companySlug ? (
                    <a
                      href={`https://${customer.companySlug}.shabooagri.com`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--color-primary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      {customer.companySlug}.shabooagri.com <ExternalLink size={12} />
                    </a>
                  ) : (
                    "Not provisioned"
                  )
                }
              />
              <DetailField label="Signed Up" value={new Date(customer.createdAt).toLocaleDateString("en-IN")} />
              <DetailField label="Address" value={[customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(", ") || "—"} />
              <DetailField label="GSTIN / PAN" value={[customer.gstin, customer.pan].filter(Boolean).join(" / ") || "—"} />
            </div>
          </div>

          {/* ---- Current Status ---- */}
          <section className="pf-card" style={{ padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 16 }}>Current Status</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
              <DetailField label="Plan" value={customer.currentPlan?.name ?? "No plan"} />
              <DetailField label="Machine Limit" value={customer.currentPlan?.machineLimit ?? "—"} />
              <DetailField
                label="License Status"
                value={<StatusBadge {...licenseStatusStyle(customer.currentLicense?.status ?? null)} />}
              />
              <DetailField
                label="Expiry Date"
                value={customer.currentLicense?.expiryDate ? new Date(customer.currentLicense.expiryDate).toLocaleDateString("en-IN") : "—"}
              />
              <DetailField label="Renewals" value={customer.currentLicense?.renewalCount ?? 0} />
            </div>
          </section>

          {/* ---- Purchase & License History ---- */}
          <section className="pf-card" style={{ padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 16 }}>Purchase &amp; License History</h2>
            {customer.history.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>No purchases yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {customer.history.map((h) => {
                  const badge = paymentStatusStyle(h.status);
                  return (
                    <div key={h.paymentId} style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                        <div>
                          <strong style={{ fontSize: "0.95rem" }}>
                            {h.planName} — {h.intent === "upgrade" ? "Upgrade" : "Signup"}
                          </strong>
                          <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                            {new Date(h.createdAt).toLocaleString("en-IN")}
                            {h.gatewayPaymentId ? ` · ${h.gatewayPaymentId}` : ""}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700 }}>₹{h.amount.toLocaleString("en-IN")}</div>
                          <StatusBadge bg={badge.bg} color={badge.color} label={h.status} />
                        </div>
                      </div>
                      {h.license && (
                        <div style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", borderTop: "1px solid var(--color-border)", paddingTop: 8 }}>
                          License: {h.license.startDate ? new Date(h.license.startDate).toLocaleDateString("en-IN") : "—"} →{" "}
                          {h.license.expiryDate ? new Date(h.license.expiryDate).toLocaleDateString("en-IN") : "—"}
                          {" · "}
                          <StatusBadge {...licenseStatusStyle(h.license.status)} />
                          {h.license.renewalCount > 0 ? ` · Renewal #${h.license.renewalCount}` : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ---- Feedback & Support ---- */}
          <section className="pf-card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 16 }}>Feedback &amp; Support Submissions</h2>
            {customer.feedback.length === 0 && customer.supportRequests.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>No submissions from this account.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {customer.supportRequests.map((item) => (
                  <div key={item.id} style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
                      <strong style={{ fontSize: "0.9rem" }}>{item.subject}</strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{item.status}</span>
                    </div>
                    <p style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap", marginBottom: 4 }}>{item.message}</p>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                      {new Date(item.createdAt).toLocaleString("en-IN")}
                    </div>
                  </div>
                ))}
                {customer.feedback.map((item) => (
                  <div key={item.id} style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 14 }}>
                    <p style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap", marginBottom: 4 }}>{item.message}</p>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                      Feedback · {new Date(item.createdAt).toLocaleString("en-IN")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export const CustomerDetailPage: React.FC = () => (
  <AdminGuard>
    <CustomerDetailPageContent />
  </AdminGuard>
);
