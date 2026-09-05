import React from "react";
import { MarketingLayout } from "../../components/MarketingLayout";

export const LegalLayout: React.FC<{
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}> = ({ title, effectiveDate, children }) => {
  return (
    <MarketingLayout>
      {() => (
        <section style={{ padding: "56px var(--pf-pad-x) 80px", maxWidth: 780, margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 800, marginBottom: 8 }}>{title}</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginBottom: 40 }}>
            Effective date: {effectiveDate}
          </p>
          <div className="pf-legal-doc">{children}</div>
        </section>
      )}
    </MarketingLayout>
  );
};

export const Section: React.FC<{ number: string; title: string; children: React.ReactNode }> = ({
  number,
  title,
  children,
}) => (
  <div style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: 12 }}>
      {number}. {title}
    </h2>
    <div style={{ display: "flex", flexDirection: "column", gap: 10, color: "var(--color-text)", fontSize: "0.95rem", lineHeight: 1.7 }}>
      {children}
    </div>
  </div>
);
