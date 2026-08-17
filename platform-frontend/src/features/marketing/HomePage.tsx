import React from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Wrench, Receipt } from "lucide-react";
import { MarketingLayout } from "../../components/MarketingLayout";

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Bookings, start to finish",
    description: "Schedule a customer's job, assign a machine and driver, and track it through to completion.",
  },
  {
    icon: Wrench,
    title: "Your fleet, always up to date",
    description: "Machines, maintenance schedules, and fuel logs in one place — no more paper logbooks.",
  },
  {
    icon: Receipt,
    title: "Get paid, accurately",
    description: "Invoices generate automatically from actual hours or acres worked, with a full payment history.",
  },
];

export const HomePage: React.FC = () => {
  return (
    <MarketingLayout>
      {() => (
        <>
          <section style={{ padding: "80px 24px 60px", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
            <h1 style={{ fontSize: "2.4rem", fontWeight: 800, lineHeight: 1.15, marginBottom: 16 }}>
              Run your equipment hire business without the spreadsheets.
            </h1>
            <p style={{ fontSize: "1.1rem", color: "var(--color-text-muted)", marginBottom: 32 }}>
              ShabooAgri handles bookings, machines, drivers, and payments for tractor, harvester, and equipment
              hire businesses — built for custom hiring centers.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Link to="/register" className="pf-btn pf-btn-primary" style={{ textDecoration: "none", fontSize: "1rem", padding: "12px 28px" }}>
                Get Started
              </Link>
              <Link to="/pricing" className="pf-btn pf-btn-secondary" style={{ textDecoration: "none", fontSize: "1rem", padding: "12px 28px" }}>
                See Pricing
              </Link>
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 24,
              maxWidth: 960,
              margin: "0 auto",
              padding: "0 24px 80px",
            }}
          >
            {FEATURES.map((f) => (
              <div key={f.title} className="pf-card" style={{ padding: 24 }}>
                <f.icon size={28} color="var(--color-primary)" style={{ marginBottom: 12 }} />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}>{f.description}</p>
              </div>
            ))}
          </section>
        </>
      )}
    </MarketingLayout>
  );
};
