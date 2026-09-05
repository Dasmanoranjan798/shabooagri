import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tractor, Menu, X } from "lucide-react";
import { api, type PublicConfig } from "../lib/api";
import { AnnouncementBar } from "./AnnouncementBar";

const NAV_LINKS = [
  { to: "/pricing", label: "Pricing" },
  { to: "/app", label: "Download" },
  { to: "/login", label: "Sign In" },
];

export const MarketingLayout: React.FC<{ children: (config: PublicConfig | null) => React.ReactNode }> = ({
  children,
}) => {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api.getPublicConfig().then(setConfig).catch(() => setConfig(null));
  }, []);

  // Close the mobile menu on Escape for keyboard users.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

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
          {/* Desktop navigation */}
          <nav className="pf-nav-desktop" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="pf-navlink" style={{ padding: "8px 12px" }}>
                {l.label}
              </Link>
            ))}
            <Link to="/register" className="pf-btn pf-btn-primary" style={{ textDecoration: "none", marginLeft: 4 }}>
              Get Started
            </Link>
          </nav>

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="pf-nav-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="pf-mobile-nav"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile navigation dropdown */}
        {menuOpen && (
          <nav id="pf-mobile-nav" className="pf-mobile-nav" aria-label="Primary">
            <div className="pf-mobile-nav-inner">
              {NAV_LINKS.map((l) => (
                <Link key={l.to} to={l.to} className="pf-navlink" onClick={() => setMenuOpen(false)}>
                  {l.label}
                </Link>
              ))}
              <Link
                to="/register"
                className="pf-btn pf-btn-primary"
                style={{ textDecoration: "none" }}
                onClick={() => setMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </nav>
        )}
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
