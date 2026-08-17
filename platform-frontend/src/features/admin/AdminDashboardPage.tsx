import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Users,
  ExternalLink,
  IndianRupee,
  Clock,
  MessageSquare,
  LifeBuoy,
  Tractor,
} from "lucide-react";
import { usePlatformAuth } from "../../context/PlatformAuthContext";
import {
  api,
  ApiError,
  type AdminDashboardMetrics,
  type AdminFeedbackItem,
  type AdminPricingPlan,
  type AdminSiteSettings,
  type AdminSupportRequestItem,
} from "../../lib/api";

const StatTile: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; linkTo?: string }> = ({
  icon: Icon,
  label,
  value,
  linkTo,
}) => {
  const content = (
    <div className="pf-card" style={{ padding: 20, cursor: linkTo ? "pointer" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-text-muted)", marginBottom: 10 }}>
        <Icon size={16} />
        <span style={{ fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</span>
      </div>
      <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>{value}</div>
    </div>
  );
  if (!linkTo) return content;
  return (
    <Link to={linkTo} style={{ textDecoration: "none", color: "inherit" }}>
      {content}
    </Link>
  );
};

export const AdminDashboardPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, user, logout } = usePlatformAuth();

  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [plans, setPlans] = useState<AdminPricingPlan[] | null>(null);
  const [settings, setSettings] = useState<AdminSiteSettings | null>(null);
  const [feedback, setFeedback] = useState<AdminFeedbackItem[] | null>(null);
  const [supportRequests, setSupportRequests] = useState<AdminSupportRequestItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [planSaving, setPlanSaving] = useState<string | null>(null);
  const [planSaved, setPlanSaved] = useState<string | null>(null);
  const [requestUpdating, setRequestUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.isPlatformAdmin) return;
    Promise.all([
      api.getAdminDashboard(),
      api.getAdminPlans(),
      api.getAdminSiteSettings(),
      api.getAdminFeedback(),
      api.getAdminSupportRequests(),
    ])
      .then(([m, p, s, f, sr]) => {
        setMetrics(m);
        setPlans(p);
        setSettings(s);
        setFeedback(f);
        setSupportRequests(sr);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Could not load dashboard data"));
  }, [isAuthenticated, user]);

  if (authLoading) {
    return <div className="pf-center-viewport">Loading...</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login?next=/admin" replace />;
  }
  if (!user?.isPlatformAdmin) {
    return (
      <div className="pf-center-viewport">
        <div className="pf-alert pf-alert-danger">You don't have admin access to this account.</div>
      </div>
    );
  }

  const saveSettings = async (patch: Partial<AdminSiteSettings>) => {
    if (!settings) return;
    setSettingsSaving(true);
    setSettingsSaved(false);
    try {
      const updated = await api.updateAdminSiteSettings({ ...settings, ...patch });
      setSettings(updated);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not save site settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  const toggleSupportRequestStatus = async (item: AdminSupportRequestItem) => {
    const nextStatus = item.status === "OPEN" ? "RESOLVED" : "OPEN";
    setRequestUpdating(item.id);
    try {
      const updated = await api.updateAdminSupportRequest(item.id, nextStatus);
      setSupportRequests((prev) => (prev ? prev.map((r) => (r.id === item.id ? updated : r)) : prev));
      setMetrics((prev) =>
        prev
          ? {
              ...prev,
              supportRequestCount: prev.supportRequestCount + (nextStatus === "RESOLVED" ? -1 : 1),
            }
          : prev,
      );
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not update support request");
    } finally {
      setRequestUpdating(null);
    }
  };

  const savePlan = async (key: string, patch: Partial<AdminPricingPlan>) => {
    setPlanSaving(key);
    setPlanSaved(null);
    try {
      const updated = await api.updateAdminPlan(key, patch);
      setPlans((prev) => (prev ? prev.map((p) => (p.key === key ? updated : p)) : prev));
      setPlanSaved(key);
      setTimeout(() => setPlanSaved(null), 2000);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not save plan");
    } finally {
      setPlanSaving(null);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Owner Dashboard</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <Link to="/change-password" className="pf-btn pf-btn-secondary" style={{ textDecoration: "none" }}>
            Change Password
          </Link>
          <button className="pf-btn pf-btn-secondary" onClick={logout}>
            Sign Out
          </button>
        </div>
      </div>

      {loadError && <div className="pf-alert pf-alert-danger">{loadError}</div>}

      {/* ---- 6 metric tiles ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 36 }}>
        <StatTile icon={Users} label="Total Signups" value={metrics ? metrics.totalSignups : "—"} linkTo="/admin/customers" />
        <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="pf-card" style={{ padding: 20, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-text-muted)", marginBottom: 10 }}>
              <ExternalLink size={16} />
              <span style={{ fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>Site Visits</span>
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-primary)" }}>View in Cloudflare →</div>
          </div>
        </a>
        <StatTile
          icon={IndianRupee}
          label="Purchases"
          linkTo="/admin/customers"
          value={
            metrics ? (
              <>
                {metrics.purchases.count}
                <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--color-text-muted)" }}>
                  {" "}
                  (₹{metrics.purchases.totalRevenue.toLocaleString("en-IN")})
                </span>
              </>
            ) : (
              "—"
            )
          }
        />
        <StatTile icon={Clock} label="Licenses Expiring Soon" value={metrics ? metrics.licensesExpiringSoon : "—"} />
        <StatTile icon={MessageSquare} label="Feedback Received" value={metrics ? metrics.feedbackCount : "—"} />
        <StatTile icon={LifeBuoy} label="Support Requests" value={metrics ? metrics.supportRequestCount : "—"} />
      </div>

      {/* ---- Site Settings ---- */}
      <section className="pf-card" style={{ padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 16 }}>Site Settings</h2>

        {settings && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <label style={{ fontSize: "0.9rem", fontWeight: 600 }}>Announcement Bar</label>
              <input
                type="checkbox"
                checked={settings.announcementEnabled}
                onChange={(e) => setSettings({ ...settings, announcementEnabled: e.target.checked })}
              />
            </div>
            <div className="pf-field">
              <input
                className="pf-input"
                placeholder="Announcement message (e.g. trial notice, promotion, maintenance notice)"
                value={settings.announcementMessage ?? ""}
                onChange={(e) => setSettings({ ...settings, announcementMessage: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, marginTop: 20 }}>
              <label style={{ fontSize: "0.9rem", fontWeight: 600 }}>Block Purchasing</label>
              <input
                type="checkbox"
                checked={settings.purchasingBlocked}
                onChange={(e) => setSettings({ ...settings, purchasingBlocked: e.target.checked })}
              />
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: 16 }}>
              Independent of the announcement bar — hides/disables Register &amp; Upgrade payment buttons only.
            </p>

            <div className="pf-field">
              <label className="pf-label" htmlFor="extraMachinePrice">Extra machine price (₹/year)</label>
              <input
                id="extraMachinePrice"
                type="number"
                className="pf-input"
                value={settings.extraMachinePrice}
                onChange={(e) => setSettings({ ...settings, extraMachinePrice: Number(e.target.value) })}
              />
            </div>

            <button
              className="pf-btn pf-btn-primary"
              onClick={() =>
                saveSettings({
                  announcementEnabled: settings.announcementEnabled,
                  announcementMessage: settings.announcementMessage,
                  purchasingBlocked: settings.purchasingBlocked,
                  extraMachinePrice: settings.extraMachinePrice,
                })
              }
              disabled={settingsSaving}
            >
              {settingsSaving ? "Saving..." : settingsSaved ? "Saved ✓" : "Save Site Settings"}
            </button>
          </>
        )}
      </section>

      {/* ---- Pricing Plans ---- */}
      <section className="pf-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 16 }}>Pricing Plans</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {plans?.map((plan) => (
            <div key={plan.key} style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Tractor size={16} color="var(--color-primary)" />
                <strong>{plan.key}</strong>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label className="pf-label">Name</label>
                  <input
                    className="pf-input"
                    value={plan.name}
                    onChange={(e) =>
                      setPlans((prev) => prev!.map((p) => (p.key === plan.key ? { ...p, name: e.target.value } : p)))
                    }
                  />
                </div>
                <div>
                  <label className="pf-label">Machine Limit</label>
                  <input
                    type="number"
                    className="pf-input"
                    value={plan.machineLimit}
                    onChange={(e) =>
                      setPlans((prev) =>
                        prev!.map((p) => (p.key === plan.key ? { ...p, machineLimit: Number(e.target.value) } : p)),
                      )
                    }
                  />
                </div>
                <div>
                  <label className="pf-label">Price / year (₹)</label>
                  <input
                    type="number"
                    className="pf-input"
                    value={plan.priceAnnual}
                    onChange={(e) =>
                      setPlans((prev) =>
                        prev!.map((p) => (p.key === plan.key ? { ...p, priceAnnual: Number(e.target.value) } : p)),
                      )
                    }
                  />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}>
                  <input
                    type="checkbox"
                    checked={plan.isActive}
                    onChange={(e) =>
                      setPlans((prev) => prev!.map((p) => (p.key === plan.key ? { ...p, isActive: e.target.checked } : p)))
                    }
                  />
                  Active (visible on Pricing page)
                </label>
                <button
                  className="pf-btn pf-btn-primary"
                  onClick={() =>
                    savePlan(plan.key, {
                      name: plan.name,
                      machineLimit: plan.machineLimit,
                      priceAnnual: plan.priceAnnual,
                      isActive: plan.isActive,
                    })
                  }
                  disabled={planSaving === plan.key}
                >
                  {planSaving === plan.key ? "Saving..." : planSaved === plan.key ? "Saved ✓" : "Save"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Support Requests ---- */}
      <section className="pf-card" style={{ padding: 24, marginTop: 24 }}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 16 }}>Support Requests</h2>
        {!supportRequests ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>Loading...</p>
        ) : supportRequests.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>No support requests yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {supportRequests.map((item) => (
              <div key={item.id} style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
                  <div>
                    <strong style={{ fontSize: "0.95rem" }}>{item.subject}</strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                      {item.name} · {item.email} · {new Date(item.createdAt).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 999,
                      whiteSpace: "nowrap",
                      backgroundColor: item.status === "OPEN" ? "#fef2f2" : "var(--color-primary-light)",
                      color: item.status === "OPEN" ? "var(--color-danger)" : "var(--color-primary-dark)",
                    }}
                  >
                    {item.status}
                  </span>
                </div>
                <p style={{ fontSize: "0.88rem", whiteSpace: "pre-wrap", marginBottom: 10 }}>{item.message}</p>
                <button
                  className="pf-btn pf-btn-secondary"
                  style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                  onClick={() => toggleSupportRequestStatus(item)}
                  disabled={requestUpdating === item.id}
                >
                  {requestUpdating === item.id
                    ? "Updating..."
                    : item.status === "OPEN"
                      ? "Mark Resolved"
                      : "Reopen"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- Feedback ---- */}
      <section className="pf-card" style={{ padding: 24, marginTop: 24 }}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 16 }}>Feedback Received</h2>
        {!feedback ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>Loading...</p>
        ) : feedback.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>No feedback yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {feedback.map((item) => (
              <div key={item.id} style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: 6 }}>
                  {item.name} · {item.email} · {new Date(item.createdAt).toLocaleString("en-IN")}
                </div>
                <p style={{ fontSize: "0.88rem", whiteSpace: "pre-wrap" }}>{item.message}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
