import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tractor } from "lucide-react";
import { api, type PublicConfig } from "../lib/api";
import { AnnouncementBar } from "./AnnouncementBar";

export const MarketingLayout: React.FC<{ children: (config: PublicConfig | null) => React.ReactNode }> = ({
  children,
}) => {
  const [config, setConfig] = useState<PublicConfig | null>(null);

  useEffect(() => {
    api.getPublicConfig().then(setConfig).catch(() => setConfig(null));
  }, []);

  const year = new Date().getFullYear();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {config?.announcement.enabled && <AnnouncementBar message={config.announcement.message} />}

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid var(--color-border)",
          backgroundColor: "rgba(255,255,255,0.82)",
          backdropFilter: "saturate(180%) blur(12px)",
          WebkitBackdropFilter: "saturate(180%) blur(12px)",
        }}
      >
        <div
          className="pf-container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 64,
          }}
        >
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 34,
                height: 34,
                borderRadius: 9,
                background: "var(--color-primary)",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <Tractor size={19} color="#fff" />
            </span>
            <span style={{ fontWeight: 700, fontSize: "1.12rem", letterSpacing: "-0.02em", color: "var(--color-text)" }}>
              ShabooAgri
            </span>
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link to="/pricing" className="pf-navlink" style={{ padding: "8px 12px" }}>
              Pricing
            </Link>
            <Link to="/app" className="pf-navlink" style={{ padding: "8px 12px" }}>
              Download
            </Link>
            <Link to="/login" className="pf-navlink" style={{ padding: "8px 12px" }}>
              Sign In
            </Link>
            <Link to="/register" className="pf-btn pf-btn-primary" style={{ textDecoration: "none", marginLeft: 4 }}>
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main style={{ flex: 1 }}>{children(config)}</main>

      <footer style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-surface)", marginTop: 40 }}>
        <div
          className="pf-container"
          style={{ paddingTop: 40, paddingBottom: 28, display: "flex", flexWrap: "wrap", gap: 32, justifyContent: "space-between" }}
        >
          <div style={{ maxWidth: 300 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "var(--color-primary)",
                }}
              >
                <Tractor size={17} color="#fff" />
              </span>
              <span style={{ fontWeight: 700, letterSpacing: "-0.02em", color: "var(--color-text)" }}>ShabooAgri</span>
            </div>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
              The business operating system for tractor, harvester, and equipment-hire centers.
            </p>
          </div>

          <FooterCol
            title="Product"
            links={[
              { to: "/pricing", label: "Pricing" },
              { to: "/app", label: "Download App" },
              { to: "/register", label: "Get Started" },
              { to: "/login", label: "Sign In" },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { to: "/contact", label: "Contact Us" },
              { to: "/feedback", label: "Feedback" },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { to: "/terms", label: "Terms of Service" },
              { to: "/privacy", label: "Privacy Policy" },
              { to: "/refund-policy", label: "Refund Policy" },
            ]}
          />
        </div>
        <div style={{ borderTop: "1px solid var(--color-border-light)" }}>
          <div
            className="pf-container"
            style={{
              paddingTop: 16,
              paddingBottom: 16,
              fontSize: "var(--text-sm)",
              color: "var(--color-text-muted)",
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span>© {year} ShabooAgri. All rights reserved.</span>
            <span>A Shaboo Product</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FooterCol: React.FC<{ title: string; links: { to: string; label: string }[] }> = ({ title, links }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <span
      style={{
        fontSize: "var(--text-xs)",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--color-text-faint)",
      }}
    >
      {title}
    </span>
    {links.map((l) => (
      <Link key={l.to} to={l.to} className="pf-navlink" style={{ padding: 0 }}>
        {l.label}
      </Link>
    ))}
  </div>
);
