import React, { useEffect, useState } from "react";
import "./settings.css";
import type { CompanyProfile } from "../../types/settings";
import { api } from "../../lib/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../context/AuthContext";
import { setCustomTerms } from "../../lib/terminology";
import { setGlobalCompanyBranding, setGlobalCurrency } from "../../lib/theme";
import { RoleManagementCard } from "./RoleManagementCard";
import {
  Settings,
  Building2,
  FileText,
  Tractor,
  Tag,
  ShieldCheck,
  Lock,
  CheckCircle2,
  XCircle,
  CreditCard
} from "lucide-react";

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

type SettingsTab = "business" | "invoicing" | "operations" | "terminology" | "roles";

export const SettingsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("settings.manage");

  const [activeTab, setActiveTab] = useState<SettingsTab>("business");
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
    accentColor: "#2ECC71",
    logoUrl: "",
    address: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    country: "India",
    phone: "",
    email: "",
    isGstRegistered: false,
    gstin: "",
    pan: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
    defaultTaxRate: 18,
    taxInclusive: false,
    serviceAlertHours: 50,
    insuranceAlertDays: 30,
    licenseAlertDays: 30,
    requireJobPhoto: false,
    requireJobFuelLog: false,
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Invoicing form
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [invoiceSaved, setInvoiceSaved] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  // Operational Rules form
  const [opsSaving, setOpsSaving] = useState(false);
  const [opsSaved, setOpsSaved] = useState(false);
  const [opsError, setOpsError] = useState<string | null>(null);

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
        accentColor: p.accentColor ?? "#2ECC71",
        logoUrl: p.logoUrl ?? "",
        address: p.address ?? "",
        city: p.city ?? "",
        district: p.district ?? "",
        state: p.state ?? "",
        pincode: p.pincode ?? "",
        country: p.country ?? "India",
        phone: p.phone ?? "",
        email: p.email ?? "",
        isGstRegistered: p.isGstRegistered ?? false,
        gstin: p.gstin ?? "",
        pan: p.pan ?? "",
        bankName: p.bankName ?? "",
        accountNumber: p.accountNumber ?? "",
        ifscCode: p.ifscCode ?? "",
        upiId: p.upiId ?? "",
        defaultTaxRate: p.defaultTaxRate ? Number(p.defaultTaxRate) : 18,
        taxInclusive: p.taxInclusive ?? false,
        serviceAlertHours: p.serviceAlertHours ?? 50,
        insuranceAlertDays: p.insuranceAlertDays ?? 30,
        licenseAlertDays: p.licenseAlertDays ?? 30,
        requireJobPhoto: p.requireJobPhoto ?? false,
        requireJobFuelLog: p.requireJobFuelLog ?? false,
      });
      setGlobalCurrency(p.currency);
      setGlobalCompanyBranding(p.name, p.logoUrl);

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
      setCustomTerms(termMap);
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
        themeColor: profileForm.themeColor || null,
        accentColor: profileForm.accentColor || null,
        logoUrl: profileForm.logoUrl.trim() || null,
        address: profileForm.address.trim() || null,
        city: profileForm.city.trim() || null,
        district: profileForm.district.trim() || null,
        state: profileForm.state.trim() || null,
        pincode: profileForm.pincode.trim() || null,
        country: profileForm.country.trim() || null,
        phone: profileForm.phone.trim() || null,
        email: profileForm.email.trim() || null,
        isGstRegistered: profileForm.isGstRegistered,
        gstin: profileForm.gstin.trim() || null,
        pan: profileForm.pan.trim() || null,
      });
      if (profileForm.themeColor) {
        document.documentElement.style.setProperty("--color-primary", profileForm.themeColor);
      }
      if (profileForm.accentColor) {
        document.documentElement.style.setProperty("--color-accent", profileForm.accentColor);
      }
      setGlobalCurrency(profileForm.currency);
      setGlobalCompanyBranding(profileForm.name, profileForm.logoUrl.trim() || null);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
      await loadProfile();
    } catch (err: any) {
      setProfileError(err.message || "Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleInvoiceSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvoiceSaving(true);
    setInvoiceError(null);
    setInvoiceSaved(false);
    try {
      await api.updateCompanyProfile({
        invoicePrefix: profileForm.invoicePrefix || null,
        bankName: profileForm.bankName.trim() || null,
        accountNumber: profileForm.accountNumber.trim() || null,
        ifscCode: profileForm.ifscCode.trim() || null,
        upiId: profileForm.upiId.trim() || null,
        defaultTaxRate: profileForm.defaultTaxRate ? Number(profileForm.defaultTaxRate) : 0,
        taxInclusive: profileForm.taxInclusive,
      });
      setInvoiceSaved(true);
      setTimeout(() => setInvoiceSaved(false), 3000);
      await loadProfile();
    } catch (err: any) {
      setInvoiceError(err.message || "Failed to save invoice settings");
    } finally {
      setInvoiceSaving(false);
    }
  };

  const handleOpsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpsSaving(true);
    setOpsError(null);
    setOpsSaved(false);
    try {
      await api.updateCompanyProfile({
        serviceAlertHours: Number(profileForm.serviceAlertHours),
        insuranceAlertDays: Number(profileForm.insuranceAlertDays),
        licenseAlertDays: Number(profileForm.licenseAlertDays),
        requireJobPhoto: profileForm.requireJobPhoto,
        requireJobFuelLog: profileForm.requireJobFuelLog,
      });
      setOpsSaved(true);
      setTimeout(() => setOpsSaved(false), 3000);
      await loadProfile();
    } catch (err: any) {
      setOpsError(err.message || "Failed to save operational rules");
    } finally {
      setOpsSaving(false);
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
      setCustomTerms(termForm);
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
        <p>{error}</p>
        <button className="sa-btn sa-btn-secondary" onClick={loadProfile}>Retry</button>
      </div>
    </div>
  );

  const tabList = [
    { id: "business", label: "Business Profile & Branding", icon: <Building2 size={16} /> },
    { id: "invoicing", label: "Invoicing & Payments", icon: <FileText size={16} /> },
    { id: "operations", label: "Equipment & Operational Rules", icon: <Tractor size={16} /> },
    { id: "terminology", label: "Business Terminology", icon: <Tag size={16} /> },
    { id: "roles", label: "Users, Roles & Permissions", icon: <ShieldCheck size={16} /> },
  ];

  return (
    <div className="sa-page">
      <div className="sa-page-header">
        <div>
          <h1 className="sa-page-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Settings size={24} /> Settings Control Center
          </h1>
          <p className="sa-page-subtitle">Central configuration for business profile, branding, invoicing, bank details, tax settings and permissions</p>
        </div>
      </div>

      {/* 5-Tab Navigation Control Bar */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "2px solid var(--color-border)",
          marginBottom: "20px",
          overflowX: "auto",
          paddingBottom: "4px",
        }}
      >
        {tabList.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                fontSize: "0.88rem",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
                borderBottom: isActive ? "3px solid var(--color-primary)" : "3px solid transparent",
                background: "none",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* TAB 1: BUSINESS PROFILE & BRANDING */}
        {activeTab === "business" && (
          <>
            <Card title="Business Profile & Identity" subtitle="Configure business identity, location, tax numbers and visual branding">
              {!canManage && (
                <div className="sa-info-banner" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Lock size={14} /> Read-only — only the Owner can edit company profile settings.
                </div>
              )}
              <form onSubmit={handleProfileSave} className="sa-form">
                {profileError && <div className="sa-form-error">{profileError}</div>}
                {profileSaved && <div className="sa-form-success">Business profile saved successfully.</div>}

                {/* Company Name & Contact Info */}
                <div className="sa-form-row">
                  <div className="sa-form-group" style={{ flex: 2 }}>
                    <label className="sa-form-label">Business Name *</label>
                    <input
                      type="text"
                      className="sa-input"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                      disabled={!canManage}
                      placeholder="e.g. Shaboo Custom Hiring Center"
                      required
                    />
                  </div>
                  <div className="sa-form-group" style={{ flex: 1 }}>
                    <label className="sa-form-label">Primary Phone</label>
                    <input
                      type="tel"
                      className="sa-input"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                      disabled={!canManage}
                      placeholder="e.g. +91 9876543210"
                    />
                  </div>
                  <div className="sa-form-group" style={{ flex: 1 }}>
                    <label className="sa-form-label">Official Email</label>
                    <input
                      type="email"
                      className="sa-input"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                      disabled={!canManage}
                      placeholder="e.g. info@shabooagri.com"
                    />
                  </div>
                </div>

                {/* Address Details */}
                <div className="sa-form-group">
                  <label className="sa-form-label">Business Address</label>
                  <input
                    type="text"
                    className="sa-input"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))}
                    disabled={!canManage}
                    placeholder="Plot / Premises / Shop Address..."
                  />
                </div>

                <div className="sa-form-row">
                  <div className="sa-form-group" style={{ flex: 1 }}>
                    <label className="sa-form-label">City / Town</label>
                    <input
                      type="text"
                      className="sa-input"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm((f) => ({ ...f, city: e.target.value }))}
                      disabled={!canManage}
                      placeholder="e.g. Sambalpur"
                    />
                  </div>
                  <div className="sa-form-group" style={{ flex: 1 }}>
                    <label className="sa-form-label">District</label>
                    <input
                      type="text"
                      className="sa-input"
                      value={profileForm.district}
                      onChange={(e) => setProfileForm((f) => ({ ...f, district: e.target.value }))}
                      disabled={!canManage}
                      placeholder="e.g. Sambalpur"
                    />
                  </div>
                  <div className="sa-form-group" style={{ flex: 1 }}>
                    <label className="sa-form-label">State</label>
                    <input
                      type="text"
                      className="sa-input"
                      value={profileForm.state}
                      onChange={(e) => setProfileForm((f) => ({ ...f, state: e.target.value }))}
                      disabled={!canManage}
                      placeholder="e.g. Odisha"
                    />
                  </div>
                  <div className="sa-form-group" style={{ flex: 1 }}>
                    <label className="sa-form-label">PIN / Postal Code</label>
                    <input
                      type="text"
                      className="sa-input"
                      value={profileForm.pincode}
                      onChange={(e) => setProfileForm((f) => ({ ...f, pincode: e.target.value }))}
                      disabled={!canManage}
                      placeholder="e.g. 768001"
                      maxLength={6}
                    />
                  </div>
                  <div className="sa-form-group" style={{ flex: 1 }}>
                    <label className="sa-form-label">Country</label>
                    <input
                      type="text"
                      className="sa-input"
                      value={profileForm.country}
                      onChange={(e) => setProfileForm((f) => ({ ...f, country: e.target.value }))}
                      disabled={!canManage}
                      placeholder="India"
                    />
                  </div>
                </div>

                {/* Tax & Business Identification */}
                <div style={{ background: "var(--color-surface-secondary)", padding: "16px", borderRadius: "8px", border: "1px solid var(--color-border)", marginBottom: "16px" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "12px", color: "var(--color-primary)" }}>
                    Tax & Business Identifiers (Optional)
                  </div>
                  <div className="sa-form-row" style={{ alignItems: "center" }}>
                    <div className="sa-form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: canManage ? "pointer" : "default", fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={profileForm.isGstRegistered}
                          onChange={(e) => setProfileForm((f) => ({ ...f, isGstRegistered: e.target.checked }))}
                          disabled={!canManage}
                        />
                        GST Registered Business
                      </label>
                      <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                        Note: GST is an optional layer and is NOT forced on every farmer booking.
                      </p>
                    </div>
                    <div className="sa-form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="sa-form-label">GSTIN (15 Alphanumeric)</label>
                      <input
                        type="text"
                        className="sa-input"
                        value={profileForm.gstin}
                        onChange={(e) => setProfileForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                        disabled={!canManage}
                        placeholder="e.g. 21AAAAA0000A1Z5"
                        maxLength={15}
                      />
                    </div>
                    <div className="sa-form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="sa-form-label">PAN Number (10 Alphanumeric)</label>
                      <input
                        type="text"
                        className="sa-input"
                        value={profileForm.pan}
                        onChange={(e) => setProfileForm((f) => ({ ...f, pan: e.target.value.toUpperCase() }))}
                        disabled={!canManage}
                        placeholder="e.g. ABCDE1234F"
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>

                {/* Logo & Visual Branding */}
                <div className="sa-form-group">
                  <label className="sa-form-label">Company Logo Image URL</label>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    {profileForm.logoUrl ? (
                      <img
                        src={profileForm.logoUrl}
                        alt="Logo Preview"
                        style={{
                          width: "44px",
                          height: "44px",
                          objectFit: "contain",
                          borderRadius: "6px",
                          border: "1px solid var(--color-border)",
                          background: "#fff",
                          padding: "2px",
                        }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "6px",
                          border: "1px dashed var(--color-border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        <Tractor size={20} />
                      </div>
                    )}
                    <input
                      type="text"
                      className="sa-input"
                      placeholder="https://example.com/logo.png"
                      value={profileForm.logoUrl}
                      onChange={(e) => setProfileForm((f) => ({ ...f, logoUrl: e.target.value }))}
                      disabled={!canManage}
                      style={{ flex: 1 }}
                    />
                    {profileForm.logoUrl && canManage && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setProfileForm((f) => ({ ...f, logoUrl: "" }))}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                {/* Timezone, Language & Currency */}
                <div className="sa-form-row">
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

                {/* Colors Configuration */}
                <div className="sa-form-row">
                  <div className="sa-form-group" style={{ flex: 1 }}>
                    <label className="sa-form-label">Primary Theme Color</label>
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

                  <div className="sa-form-group" style={{ flex: 1 }}>
                    <label className="sa-form-label">Accent Color</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="color"
                        value={profileForm.accentColor}
                        onChange={(e) => setProfileForm((f) => ({ ...f, accentColor: e.target.value }))}
                        disabled={!canManage}
                        style={{ width: "48px", height: "40px", border: "1px solid var(--color-border)", borderRadius: "6px", cursor: canManage ? "pointer" : "not-allowed" }}
                      />
                      <input
                        type="text"
                        className="sa-input"
                        value={profileForm.accentColor}
                        onChange={(e) => setProfileForm((f) => ({ ...f, accentColor: e.target.value }))}
                        disabled={!canManage}
                        placeholder="#2ECC71"
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="sa-form-actions">
                    <Button variant="primary" type="submit" disabled={profileSaving}>
                      {profileSaving ? "Saving…" : "Save Profile & Identity"}
                    </Button>
                  </div>
                )}
              </form>
            </Card>

            <Card title="Company Metadata">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "12px" }}>
                {[
                  { label: "Company ID", value: profile?.id ?? "—" },
                  { label: "Slug", value: profile?.slug ?? "—" },
                  { label: "Status", value: profile?.isActive ? "Active" : "Inactive", icon: profile?.isActive ? <CheckCircle2 size={14} color="#2e7d32" /> : <XCircle size={14} color="#d32f2f" /> },
                  { label: "Created", value: profile ? new Date(profile.createdAt).toLocaleDateString("en-IN") : "—" },
                ].map((item) => (
                  <div key={item.label} style={{ background: "var(--color-surface-secondary)", borderRadius: "8px", padding: "10px 14px" }}>
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "4px" }}>{item.label}</div>
                    <div style={{ fontFamily: "monospace", wordBreak: "break-all", display: "flex", alignItems: "center", gap: "6px" }}>
                      {item.icon} {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* TAB 2: INVOICING & PAYMENTS */}
        {activeTab === "invoicing" && (
          <Card title="Invoicing, Bank & Payment Details" subtitle="Configure invoice numbering, bank details for receipts, and tax defaults">
            {!canManage && (
              <div className="sa-info-banner" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Lock size={14} /> Read-only — only the Owner can edit invoice & payment settings.
              </div>
            )}
            <form onSubmit={handleInvoiceSave} className="sa-form">
              {invoiceError && <div className="sa-form-error">{invoiceError}</div>}
              {invoiceSaved && <div className="sa-form-success">Invoicing and payment settings saved successfully.</div>}

              {/* Invoice Numbering */}
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
                    Invoice numbers are auto-generated as <strong>{profileForm.invoicePrefix || "INV"}-000001</strong>, <strong>{profileForm.invoicePrefix || "INV"}-000002</strong>, etc.
                  </p>
                </div>
              </div>

              {/* Bank & Payment Details */}
              <div style={{ background: "var(--color-surface-secondary)", borderRadius: "8px", padding: "16px", border: "1px solid var(--color-border)", margin: "8px 0" }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px", color: "var(--color-primary)" }}>
                  <CreditCard size={16} /> Business Bank & UPI Payment Details
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "12px" }}>
                  These payment details are rendered on customer invoices and payment receipts for direct payment collection.
                </p>

                <div className="sa-form-row">
                  <div className="sa-form-group" style={{ flex: 1 }}>
                    <label className="sa-form-label">Bank Name</label>
                    <input
                      type="text"
                      className="sa-input"
                      value={profileForm.bankName}
                      onChange={(e) => setProfileForm((f) => ({ ...f, bankName: e.target.value }))}
                      disabled={!canManage}
                      placeholder="e.g. State Bank of India"
                    />
                  </div>
                  <div className="sa-form-group" style={{ flex: 1 }}>
                    <label className="sa-form-label">Account Number</label>
                    <input
                      type="text"
                      className="sa-input"
                      value={profileForm.accountNumber}
                      onChange={(e) => setProfileForm((f) => ({ ...f, accountNumber: e.target.value }))}
                      disabled={!canManage}
                      placeholder="e.g. 38492019482"
                    />
                  </div>
                </div>

                <div className="sa-form-row">
                  <div className="sa-form-group" style={{ flex: 1 }}>
                    <label className="sa-form-label">IFSC Code</label>
                    <input
                      type="text"
                      className="sa-input"
                      value={profileForm.ifscCode}
                      onChange={(e) => setProfileForm((f) => ({ ...f, ifscCode: e.target.value.toUpperCase() }))}
                      disabled={!canManage}
                      placeholder="e.g. SBIN0001234"
                      maxLength={11}
                    />
                  </div>
                  <div className="sa-form-group" style={{ flex: 1 }}>
                    <label className="sa-form-label">UPI ID / VPA</label>
                    <input
                      type="text"
                      className="sa-input"
                      value={profileForm.upiId}
                      onChange={(e) => setProfileForm((f) => ({ ...f, upiId: e.target.value }))}
                      disabled={!canManage}
                      placeholder="e.g. 9876543210@upi or shabooagri@sbi"
                    />
                  </div>
                </div>
              </div>

              {/* Tax Defaults Configuration */}
              <div style={{ background: "var(--color-surface-secondary)", borderRadius: "8px", padding: "16px", border: "1px solid var(--color-border)", margin: "8px 0" }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "4px", color: "var(--color-primary)" }}>
                  Tax Defaults & Pricing Preference
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "12px" }}>
                  Configure default tax treatment when GST is explicitly enabled on an invoice. Normal farmer bookings default to GST OFF.
                </p>

                <div className="sa-form-row" style={{ alignItems: "center" }}>
                  <div className="sa-form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="sa-form-label">Default Tax Rate (%)</label>
                    <input
                      type="number"
                      className="sa-input"
                      value={profileForm.defaultTaxRate}
                      onChange={(e) => setProfileForm((f) => ({ ...f, defaultTaxRate: Number(e.target.value) }))}
                      disabled={!canManage}
                      min={0}
                      max={100}
                      step={0.5}
                      placeholder="18"
                    />
                  </div>

                  <div className="sa-form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: canManage ? "pointer" : "default", fontWeight: 600, marginTop: "24px" }}>
                      <input
                        type="checkbox"
                        checked={profileForm.taxInclusive}
                        onChange={(e) => setProfileForm((f) => ({ ...f, taxInclusive: e.target.checked }))}
                        disabled={!canManage}
                      />
                      Tax-Inclusive Pricing Preference
                    </label>
                  </div>
                </div>
              </div>

              {canManage && (
                <div className="sa-form-actions" style={{ marginTop: "16px" }}>
                  <Button variant="primary" type="submit" disabled={invoiceSaving}>
                    {invoiceSaving ? "Saving…" : "Save Invoicing & Payment Settings"}
                  </Button>
                </div>
              )}
            </form>
          </Card>
        )}

        {/* TAB 3: EQUIPMENT & OPERATIONAL RULES */}
        {activeTab === "operations" && (
          <Card title="Equipment & Operational Rules" subtitle="Configure machine service thresholds, document expiry lead-times, and job completion mandates">
            {!canManage && (
              <div className="sa-info-banner" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Lock size={14} /> Read-only — only the Owner or Manager can edit operational rules.
              </div>
            )}
            <form onSubmit={handleOpsSave} className="sa-form">
              {opsError && <div className="sa-form-error">{opsError}</div>}
              {opsSaved && <div className="sa-form-success">Operational rules saved successfully.</div>}

              {/* Section A: Equipment & Fleet Alert Thresholds */}
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Tractor size={18} /> Fleet Alert & Expiry Warning Thresholds
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "16px" }}>
                  <div className="sa-form-group">
                    <label className="sa-form-label">Machine Service Alert Threshold (Hours)</label>
                    <input
                      type="number"
                      className="sa-input"
                      value={profileForm.serviceAlertHours}
                      onChange={(e) => setProfileForm((f) => ({ ...f, serviceAlertHours: Number(e.target.value) }))}
                      disabled={!canManage}
                      min={0}
                      max={10000}
                      placeholder="50"
                    />
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "4px", display: "block" }}>
                      Trigger warning when remaining service hours countdown is within this threshold (default 50h).
                    </span>
                  </div>

                  <div className="sa-form-group">
                    <label className="sa-form-label">Machine Insurance & Document Expiry (Days)</label>
                    <input
                      type="number"
                      className="sa-input"
                      value={profileForm.insuranceAlertDays}
                      onChange={(e) => setProfileForm((f) => ({ ...f, insuranceAlertDays: Number(e.target.value) }))}
                      disabled={!canManage}
                      min={0}
                      max={365}
                      placeholder="30"
                    />
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "4px", display: "block" }}>
                      Trigger warning when machine insurance/registration expires within this many days (default 30 days).
                    </span>
                  </div>

                  <div className="sa-form-group">
                    <label className="sa-form-label">Driver License Expiry Warning (Days)</label>
                    <input
                      type="number"
                      className="sa-input"
                      value={profileForm.licenseAlertDays}
                      onChange={(e) => setProfileForm((f) => ({ ...f, licenseAlertDays: Number(e.target.value) }))}
                      disabled={!canManage}
                      min={0}
                      max={365}
                      placeholder="30"
                    />
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "4px", display: "block" }}>
                      Trigger warning when operator license expires within this many days (default 30 days).
                    </span>
                  </div>
                </div>
              </div>

              {/* Section B: Job Completion Rules */}
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "16px", marginBottom: "16px" }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", color: "var(--color-primary)" }}>
                  Mandatory Job Completion Rules
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: canManage ? "pointer" : "default", fontWeight: 500, fontSize: "0.9rem" }}>
                    <input
                      type="checkbox"
                      checked={profileForm.requireJobPhoto}
                      onChange={(e) => setProfileForm((f) => ({ ...f, requireJobPhoto: e.target.checked }))}
                      disabled={!canManage}
                    />
                    Require Mandatory Completion Photo before job can be completed
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: canManage ? "pointer" : "default", fontWeight: 500, fontSize: "0.9rem" }}>
                    <input
                      type="checkbox"
                      checked={profileForm.requireJobFuelLog}
                      onChange={(e) => setProfileForm((f) => ({ ...f, requireJobFuelLog: e.target.checked }))}
                      disabled={!canManage}
                    />
                    Require Mandatory Fuel-Log Entry before job can be completed
                  </label>
                </div>
              </div>

              {canManage && (
                <div className="sa-form-actions" style={{ marginTop: "16px" }}>
                  <Button variant="primary" type="submit" disabled={opsSaving}>
                    {opsSaving ? "Saving…" : "Save Operational Rules"}
                  </Button>
                </div>
              )}
            </form>
          </Card>
        )}

        {/* TAB 4: BUSINESS TERMINOLOGY */}
        {activeTab === "terminology" && (
          <Card title="Business Terminology" subtitle="Customise how the app labels your business entities (§9)">
            {!canManage && (
              <div className="sa-info-banner" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Lock size={14} /> Read-only — only the Owner can edit terminology.
              </div>
            )}
            <form onSubmit={handleTermSave} className="sa-form">
              {termError && <div className="sa-form-error">{termError}</div>}
              {termSaved && <div className="sa-form-success">Terminology saved successfully.</div>}

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
        )}

        {/* TAB 5: USERS, ROLES & PERMISSIONS */}
        {activeTab === "roles" && (
          <RoleManagementCard canManage={canManage} />
        )}
      </div>
    </div>
  );
};


