import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AdminGuard } from "../../components/AdminGuard";
import { api, ApiError, type AdminPlatformUserListItem, type LicenseStatus } from "../../lib/api";

function licenseStatusStyle(status: LicenseStatus | null): { bg: string; color: string; label: string } {
  if (status === "ACTIVE") return { bg: "var(--color-primary-light)", color: "var(--color-primary-dark)", label: "Active" };
  if (status === "EXPIRING_SOON") return { bg: "#fef3c7", color: "#b45309", label: "Expiring Soon" };
  if (status === "EXPIRED") return { bg: "#fef2f2", color: "var(--color-danger)", label: "Expired" };
  return { bg: "var(--color-bg)", color: "var(--color-text-muted)", label: "No License" };
}

const CustomerListPageContent: React.FC = () => {
  const [customers, setCustomers] = useState<AdminPlatformUserListItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .getAdminPlatformUsers()
      .then(setCustomers)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Could not load customers"));
  }, []);

  const filtered = (customers ?? []).filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.businessName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.contactPerson.toLowerCase().includes(q);
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px var(--pf-pad-x)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <Link to="/admin" style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Customers</h1>
        </div>
      </div>

      {loadError && <div className="pf-alert pf-alert-danger">{loadError}</div>}

      <div className="pf-field" style={{ maxWidth: 320 }}>
        <input
          className="pf-input"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="pf-card" style={{ overflow: "hidden" }}>
        {!customers ? (
          <p style={{ padding: 20, color: "var(--color-text-muted)", fontSize: "0.9rem" }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p style={{ padding: 20, color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
            {search ? "No customers match your search." : "No signups yet."}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {["Business Name", "Contact", "Email", "Signed Up", "Plan", "License Status"].map((h) => (
                  <th
                    key={h}
                    style={{ textAlign: "left", padding: "10px 16px", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, color: "var(--color-text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const badge = licenseStatusStyle(c.licenseStatus);
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <Link to={`/admin/customers/${c.id}`} style={{ color: "var(--color-primary)", fontWeight: 700, textDecoration: "none" }}>
                        {c.businessName}
                      </Link>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.9rem" }}>{c.contactPerson}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.9rem" }}>{c.email}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                      {new Date(c.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.9rem" }}>{c.currentPlan?.name ?? "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: 999,
                          whiteSpace: "nowrap",
                          backgroundColor: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
};

export const CustomerListPage: React.FC = () => (
  <AdminGuard>
    <CustomerListPageContent />
  </AdminGuard>
);
