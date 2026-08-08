import React, { useEffect, useState } from "react";
import type { CompanyProfile } from "../../types/settings";
import { api } from "../../lib/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../context/AuthContext";

const TERM_KEYS = ["customer", "driver", "machine", "booking", "invoice", "village"] as const;
type TermKey = (typeof TERM_KEYS)[number];

const TERM_LABELS: Record<TermKey, string> = {
  customer: "Customer",
  driver: "Driver",
  machine: "Machine",
  booking: "Booking",
  invoice: "Invoice",
  village: "Village",
};

export const SettingsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("settings.manage");

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: "",
    currency: "INR",
    timezone: "Asia/Kolkata",
    language: "en",
    invoicePrefix: "INV",
    themeColor: "#1B7A3E",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Terminology form — map of termKey → { singular, plural }
  const [termForm, setTermForm] = useState<Record<TermKey, { singular: string; plural: string }>>({
    customer: { singular: "Customer", plural: "Customers" },
    driver: { singular: "Driver", plural: "Drivers" },
    machine: { singular: "Machine", plural: "Machines" },
    booking: { singular: "Booking", plural: "Bookings" },
    invoice: { singular: "Invoice", plural: "Invoices" },
    village: { singular: "Village", plural: "Villages" },
  });
  const [termSaving, setTermSaving] = useState(false);
  const [termSaved, setTermSaved] = useState(false);
  const [termError, setTermError] = useState<string | null>(null);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const p = await api.getCompanyProfile();
      setProfile(p);
      setProfileForm({
        name: p.name,
        currency: p.currency,
        timezone: p.timezone,
        language: p.language,
        invoicePrefix: p.invoicePrefix ?? "INV",
        themeColor: p.themeColor ?? "#1B7A3E",
      });
      // Populate terminology from saved settings
      const termMap = { ...termForm };
      for (const ts of p.terminologySettings) {
        if (TERM_KEYS.includes(ts.termKey as TermKey)) {
          termMap[ts.termKey as TermKey] = {
            singular: ts.displayLabelSingular,
            plural: ts.displayLabelPlural,
          };
        }
      }
      setTermForm(termMap);
    } catch (err: any) {
      setError(err.message || "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      await api.updateCompanyProfile({
        name: profileForm.name,
        currency: profileForm.currency,
        timezone: profileForm.timezone,
        language: profileForm.language,
        invoicePrefix: profileForm.invoicePrefix || null,
        themeColor: profileForm.themeColor || null,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
      await loadProfile();
    } catch (err: any) {
      setProfileError(err.message || "Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleTermSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTermSaving(true);
    setTermError(null);
    setTermSaved(false);
    try {
      await api.updateTerminology({
        terms: TERM_KEYS.map((key) => ({
          termKey: key,
          displayLabelSingular: termForm[key].singular,
          displayLabelPlural: termForm[key].plural,
        })),
      });
      setTermSaved(true);
      setTimeout(() => setTermSaved(false), 3000);
    } catch (err: any) {
      setTermError(err.message || "Failed to save terminology");
    } finally {
      setTermSaving(false);
    }
  };

  if (isLoading) return <div className="sa-loading-state"><Spinner /><span>Loading settings…</span></div>;
  if (error) return (
    <div className="sa-page">
      <div className="sa-error-state">
        <p>⚠ {error}</p>
        <button className="sa-btn sa-btn-secondary" onClick={loadProfile}>Retry</button>
      </div>
    </div>
  );

  return (
    <div className="sa-page">
      <div className="sa-page-header">
        <div>
          <h1 className="sa-page-title">⚙️ Settings</h1>
          <p className="sa-page-subtitle">Company profile and configuration</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Company Profile */}
        <Card title="Company Profile">
          {!canManage && (
            <div className="sa-info-banner" style={{ marginBottom: "16px" }}>
              🔒 Read-only — only the Owner can edit company settings.
            </div>
          )}
          <form onSubmit={handleProfileSave} className="sa-form">
            {profileError && <div className="sa-form-error">{profileError}</div>}
            {profileSaved && <div className="sa-form-success">✓ Profile saved successfully.</div>}

            <div className="sa-form-row">
              <div className="sa-form-group" style={{ flex: 2 }}>
                <label className="sa-form-label">Company Name</label>
                <input
                  type="text"
                  className="sa-input"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={!canManage}
                  required
                />
              </div>
              <div className="sa-form-group" style={{ flex: 1 }}>
                <label className="sa-form-label">Currency</label>
                <select
                  className="sa-select"
                  value={profileForm.currency}
                  onChange={(e) => setProfileForm((f) => ({ ...f, currency: e.target.value }))}
                  disabled={!canManage}
                >
                  <option value="INR">INR — Indian Rupee (₹)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="GBP">GBP — British Pound (£)</option>
                </select>
              </div>
            </div>

            <div className="sa-form-row">
              <div className="sa-form-group" style={{ flex: 1 }}>
                <label className="sa-form-label">Timezone</label>
                <select
                  className="sa-select"
                  value={profileForm.timezone}
                  onChange={(e) => setProfileForm((f) => ({ ...f, timezone: e.target.value }))}
                  disabled={!canManage}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="UTC">UTC</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST +4)</option>
                  <option value="America/New_York">America/New_York (ET)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                </select>
              </div>
              <div className="sa-form-group" style={{ flex: 1 }}>
                <label className="sa-form-label">Language</label>
                <select
                  className="sa-select"
                  value={profileForm.language}
                  onChange={(e) => setProfileForm((f) => ({ ...f, language: e.target.value }))}
                  disabled={!canManage}
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                </select>
              </div>
            </div>

            <div className="sa-form-row">
              <div className="sa-form-group" style={{ flex: 1 }}>
                <label className="sa-form-label">Invoice Prefix</label>
                <input
                  type="text"
                  className="sa-input"
                  value={profileForm.invoicePrefix}
                  onChange={(e) => setProfileForm((f) => ({ ...f, invoicePrefix: e.target.value }))}
                  disabled={!canManage}
                  placeholder="e.g. INV"
                  maxLength={10}
                />
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                  Invoice numbers will appear as {profileForm.invoicePrefix || "INV"}-000001
                </p>
              </div>
              <div className="sa-form-group" style={{ flex: 1 }}>
                <label className="sa-form-label">Theme Color</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="color"
                    value={profileForm.themeColor}
                    onChange={(e) => setProfileForm((f) => ({ ...f, themeColor: e.target.value }))}
                    disabled={!canManage}
                    style={{ width: "48px", height: "40px", border: "1px solid var(--color-border)", borderRadius: "6px", cursor: canManage ? "pointer" : "not-allowed" }}
                  />
                  <input
                    type="text"
                    className="sa-input"
                    value={profileForm.themeColor}
                    onChange={(e) => setProfileForm((f) => ({ ...f, themeColor: e.target.value }))}
                    disabled={!canManage}
                    placeholder="#1B7A3E"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>

            {canManage && (
              <div className="sa-form-actions">
                <Button variant="primary" type="submit" disabled={profileSaving}>
                  {profileSaving ? "Saving…" : "Save Profile"}
                </Button>
              </div>
            )}
          </form>
        </Card>

        {/* Terminology */}
        <Card title="Business Terminology" subtitle="Customise how the app labels your business entities (§9)">
          {!canManage && (
            <div className="sa-info-banner" style={{ marginBottom: "16px" }}>
              🔒 Read-only — only the Owner can edit terminology.
            </div>
          )}
          <form onSubmit={handleTermSave} className="sa-form">
            {termError && <div className="sa-form-error">{termError}</div>}
            {termSaved && <div className="sa-form-success">✓ Terminology saved successfully.</div>}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: "16px" }}>
              {TERM_KEYS.map((key) => (
                <div key={key} style={{ border: "1px solid var(--color-border)", borderRadius: "8px", padding: "12px" }}>
                  <div style={{ fontWeight: 600, marginBottom: "10px", color: "var(--color-primary)" }}>
                    {TERM_LABELS[key]}
                  </div>
                  <div className="sa-form-row" style={{ gap: "8px" }}>
                    <div className="sa-form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="sa-form-label" style={{ fontSize: "11px" }}>Singular</label>
                      <input
                        type="text"
                        className="sa-input"
                        value={termForm[key].singular}
                        onChange={(e) =>
                          setTermForm((f) => ({ ...f, [key]: { ...f[key], singular: e.target.value } }))
                        }
                        disabled={!canManage}
                        placeholder={TERM_LABELS[key]}
                      />
                    </div>
                    <div className="sa-form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="sa-form-label" style={{ fontSize: "11px" }}>Plural</label>
                      <input
                        type="text"
                        className="sa-input"
                        value={termForm[key].plural}
                        onChange={(e) =>
                          setTermForm((f) => ({ ...f, [key]: { ...f[key], plural: e.target.value } }))
                        }
                        disabled={!canManage}
                        placeholder={`${TERM_LABELS[key]}s`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {canManage && (
              <div className="sa-form-actions">
                <Button variant="primary" type="submit" disabled={termSaving}>
                  {termSaving ? "Saving…" : "Save Terminology"}
                </Button>
              </div>
            )}
          </form>
        </Card>

        {/* Read-only info */}
        <Card title="Company Info">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "12px" }}>
            {[
              { label: "Company ID", value: profile?.id ?? "—" },
              { label: "Slug", value: profile?.slug ?? "—" },
              { label: "Status", value: profile?.isActive ? "✅ Active" : "❌ Inactive" },
              { label: "Created", value: profile ? new Date(profile.createdAt).toLocaleDateString("en-IN") : "—" },
            ].map((item) => (
              <div key={item.label} style={{ background: "var(--color-surface-secondary)", borderRadius: "8px", padding: "10px 14px" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "4px" }}>{item.label}</div>
                <div style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
