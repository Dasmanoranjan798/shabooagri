import React from "react";
import { Link } from "react-router-dom";
import { Tractor, CheckCircle2 } from "lucide-react";

const BrandMark: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <Link to="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: 9,
        background: dark ? "rgba(255,255,255,0.16)" : "var(--color-primary)",
        boxShadow: dark ? "none" : "var(--shadow-xs)",
      }}
    >
      <Tractor size={19} color="#fff" />
    </span>
    <span
      style={{
        fontWeight: 700,
        fontSize: "1.12rem",
        letterSpacing: "-0.02em",
        color: dark ? "#fff" : "var(--color-text)",
      }}
    >
      ShabooAgri
    </span>
  </Link>
);

const POINTS = [
  "Bookings, fleet, drivers & payments in one system",
  "Invoices from real hours or acres — get paid accurately",
  "Works offline in the field, syncs when you reconnect",
];

/**
 * Shared enterprise auth shell: a branded gradient panel (desktop) beside the
 * form column. On narrow screens the panel collapses and a compact brand mark
 * sits above the form. Every auth screen renders its form inside this.
 */
export const AuthLayout: React.FC<{
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => (
  <div className="pf-auth">
    <aside className="pf-auth-brand">
      <BrandMark dark />
      <div style={{ maxWidth: 380 }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1.15, color: "#fff", marginBottom: 16 }}>
          The business operating system for equipment hire.
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {POINTS.map((p) => (
            <li key={p} style={{ display: "flex", alignItems: "flex-start", gap: 11, color: "rgba(255,255,255,0.92)" }}>
              <CheckCircle2 size={20} color="#fff" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: "0.98rem", lineHeight: 1.5 }}>{p}</span>
            </li>
          ))}
        </ul>
      </div>
      <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)" }}>© {new Date().getFullYear()} ShabooAgri · A Shaboo Product</p>
    </aside>

    <div className="pf-auth-form-col">
      <div className="pf-auth-form">
        <div className="pf-auth-topbrand">
          <BrandMark />
        </div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: subtitle ? 6 : 22 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginBottom: 24 }}>{subtitle}</p>
        )}
        {children}
      </div>
    </div>
  </div>
);
