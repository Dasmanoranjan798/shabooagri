import React from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { MarketingLayout } from "../../components/MarketingLayout";

export const PricingPage: React.FC = () => {
  return (
    <MarketingLayout>
      {(config) => (
        <section style={{ padding: "60px 24px", maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 12 }}>Simple, machine-based pricing</h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "1rem" }}>
              One plan, priced by how many machines you run. Drivers, managers, and staff accounts are always
              unlimited — on every plan.
            </p>
          </div>

          {!config ? (
            <p style={{ textAlign: "center", color: "var(--color-text-muted)" }}>Loading pricing...</p>
          ) : (
            <>
              {config.purchasingBlocked && (
                <div className="pf-alert pf-alert-danger" style={{ textAlign: "center", maxWidth: 480, margin: "0 auto 24px" }}>
                  New signups are temporarily paused. Please check back shortly.
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
                {config.plans.map((plan) => (
                  <div key={plan.key} className="pf-card" style={{ padding: 28, display: "flex", flexDirection: "column" }}>
                    <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: 4 }}>{plan.name}</h2>
                    <div style={{ marginBottom: 16 }}>
                      <span style={{ fontSize: "1.8rem", fontWeight: 800 }}>₹{plan.priceAnnual.toLocaleString("en-IN")}</span>
                      <span style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}> / year</span>
                    </div>
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 }}>
                      <li style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: "0.9rem" }}>
                        <Check size={16} color="var(--color-success)" /> Up to {plan.machineLimit} machines
                      </li>
                      <li style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: "0.9rem" }}>
                        <Check size={16} color="var(--color-success)" /> Unlimited drivers &amp; staff
                      </li>
                      <li style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem" }}>
                        <Check size={16} color="var(--color-success)" /> Bookings, jobs, payments &amp; invoicing
                      </li>
                    </ul>
                    {config.purchasingBlocked ? (
                      <button className="pf-btn pf-btn-secondary" disabled style={{ width: "100%" }}>
                        Unavailable
                      </button>
                    ) : (
                      <Link
                        to={`/register?plan=${plan.key}`}
                        className="pf-btn pf-btn-primary"
                        style={{ textDecoration: "none", width: "100%", textAlign: "center" }}
                      >
                        Get Started
                      </Link>
                    )}
                  </div>
                ))}
              </div>

              <p style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: 32 }}>
                Need more machines than your plan allows? Add extras any time for ₹
                {config.extraMachinePrice.toLocaleString("en-IN")}/year each.
              </p>
            </>
          )}
        </section>
      )}
    </MarketingLayout>
  );
};
