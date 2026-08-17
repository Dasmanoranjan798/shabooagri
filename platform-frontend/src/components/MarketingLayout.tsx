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

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {config?.announcement.enabled && <AnnouncementBar message={config.announcement.message} />}

      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
        }}
      >
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <Tractor size={24} color="var(--color-primary)" />
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--color-text)" }}>ShabooAgri</span>
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link to="/pricing" style={{ textDecoration: "none", color: "var(--color-text)", fontSize: "0.95rem" }}>
            Pricing
          </Link>
          <Link to="/login" style={{ textDecoration: "none", color: "var(--color-text)", fontSize: "0.95rem" }}>
            Sign In
          </Link>
          <Link to="/register" className="pf-btn pf-btn-primary" style={{ textDecoration: "none", padding: "8px 18px" }}>
            Get Started
          </Link>
        </nav>
      </header>

      <main style={{ flex: 1 }}>{children(config)}</main>

      <footer
        style={{
          padding: "24px 32px",
          textAlign: "center",
          color: "var(--color-text-muted)",
          fontSize: "0.85rem",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        A Shaboo Product · © {new Date().getFullYear()} ShabooAgri
      </footer>
    </div>
  );
};
