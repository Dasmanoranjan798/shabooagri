import React from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  Wrench,
  Receipt,
  Smartphone,
  Users,
  BarChart3,
  WifiOff,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { MarketingLayout } from "../../components/MarketingLayout";

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Bookings, start to finish",
    description:
      "Schedule a customer's job, assign a machine and driver, and track it through to completion — no double-bookings.",
  },
  {
    icon: Wrench,
    title: "Your fleet, always current",
    description:
      "Machines, service schedules, working hours, and fuel logs in one place. Maintenance is flagged by operating hours automatically.",
  },
  {
    icon: Receipt,
    title: "Get paid, accurately",
    description:
      "Invoices generate from actual hours or acres worked. Overpayments become customer credit automatically, with full history.",
  },
  {
    icon: Users,
    title: "Drivers & their pay",
    description:
      "Track what each driver earns from their work — hourly, per-minute, or monthly — and record payments with a built-in overpay guard.",
  },
  {
    icon: BarChart3,
    title: "Reports that reconcile",
    description:
      "Driver-wise, machine-wise, and maintenance reports that always tie back to the underlying jobs and payments. Export to CSV.",
  },
  {
    icon: WifiOff,
    title: "Works offline",
    description:
      "Record payments, bookings, and jobs in the field with no signal — everything syncs automatically when you reconnect.",
  },
];

export const HomePage: React.FC = () => {
  return (
    <MarketingLayout>
      {() => (
        <>
          {/* ---- Hero -------------------------------------------------- */}
          <section
            style={{
              position: "relative",
              overflow: "hidden",
              background:
                "radial-gradient(1100px 480px at 50% -8%, #eaf5ee 0%, rgba(234,245,238,0) 62%), var(--color-bg)",
              borderBottom: "1px solid var(--color-border-light)",
            }}
          >
            <div className="pf-container" style={{ padding: "84px 24px 72px", textAlign: "center" }}>
              <span className="pf-badge" style={{ marginBottom: 22 }}>
                <ShieldCheck size={14} />
                Built for custom hiring centers
              </span>
              <h1
                style={{
                  fontSize: "clamp(2.1rem, 5vw, 3.35rem)",
                  fontWeight: 800,
                  lineHeight: 1.08,
                  letterSpacing: "-0.035em",
                  margin: "0 auto 20px",
                  maxWidth: 820,
                }}
              >
                Run your equipment-hire business
                <br />
                <span style={{ color: "var(--color-primary)" }}>without the spreadsheets.</span>
              </h1>
              <p
                style={{
                  fontSize: "clamp(1.02rem, 2.2vw, 1.22rem)",
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.6,
                  margin: "0 auto 34px",
                  maxWidth: 620,
                }}
              >
                ShabooAgri handles bookings, machines, drivers, and payments for tractor, harvester, and
                equipment-hire businesses — from one clear, dependable system.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <Link to="/register" className="pf-btn pf-btn-primary pf-btn-lg" style={{ textDecoration: "none" }}>
                  Get Started
                  <ArrowRight size={18} />
                </Link>
                <Link to="/pricing" className="pf-btn pf-btn-secondary pf-btn-lg" style={{ textDecoration: "none" }}>
                  See Pricing
                </Link>
              </div>
              <p style={{ marginTop: 18, fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                Android, Windows &amp; macOS · Works offline · No credit card to start
              </p>
            </div>
          </section>

          {/* ---- Features --------------------------------------------- */}
          <section className="pf-container" style={{ padding: "72px 24px 8px", textAlign: "center" }}>
            <span className="pf-eyebrow">Everything in one place</span>
            <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", fontWeight: 800, margin: "12px auto 0", maxWidth: 640 }}>
              One system for the whole operation
            </h2>
            <p style={{ color: "var(--color-text-muted)", margin: "12px auto 0", maxWidth: 560, fontSize: "var(--text-lg)" }}>
              From the first booking to the final payment — and everything the field throws at you in between.
            </p>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
              maxWidth: "var(--container)",
              margin: "0 auto",
              padding: "40px 24px 24px",
            }}
          >
            {FEATURES.map((f) => (
              <div key={f.title} className="pf-card pf-card-hover" style={{ padding: 26 }}>
                <span className="pf-icon-chip" style={{ marginBottom: 16 }}>
                  <f.icon size={22} />
                </span>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
                  {f.description}
                </p>
              </div>
            ))}
          </section>

          {/* ---- Get the app ------------------------------------------ */}
          <section className="pf-container" style={{ padding: "40px 24px 8px" }}>
            <div
              className="pf-card"
              style={{
                padding: "34px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 24,
                background:
                  "linear-gradient(120deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
                border: "none",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 20, minWidth: 260 }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    background: "rgba(255,255,255,0.16)",
                    color: "#fff",
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Smartphone size={28} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                    Take ShabooAgri to the field
                  </h3>
                  <p style={{ fontSize: "var(--text-base)", color: "rgba(255,255,255,0.88)", margin: 0 }}>
                    Download the app for Android, Windows, or macOS.
                  </p>
                </div>
              </div>
              <Link
                to="/app"
                className="pf-btn pf-btn-lg"
                style={{
                  textDecoration: "none",
                  background: "#fff",
                  color: "var(--color-primary-dark)",
                }}
              >
                <Smartphone size={19} />
                Get the App
              </Link>
            </div>
          </section>

          {/* ---- Final CTA -------------------------------------------- */}
          <section className="pf-container" style={{ padding: "64px 24px 88px", textAlign: "center" }}>
            <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", fontWeight: 800, marginBottom: 14 }}>
              Ready to leave the paperwork behind?
            </h2>
            <p style={{ color: "var(--color-text-muted)", marginBottom: 28, fontSize: "var(--text-lg)" }}>
              Set up your hiring center in minutes.
            </p>
            <Link to="/register" className="pf-btn pf-btn-primary pf-btn-lg" style={{ textDecoration: "none" }}>
              Get Started
              <ArrowRight size={18} />
            </Link>
          </section>
        </>
      )}
    </MarketingLayout>
  );
};
