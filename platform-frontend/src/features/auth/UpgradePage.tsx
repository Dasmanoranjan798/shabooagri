import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Tractor, CheckCircle2 } from "lucide-react";
import { usePlatformAuth } from "../../context/PlatformAuthContext";
import { api, ApiError, type PricingPlan, type PublicConfig } from "../../lib/api";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load payment gateway"));
    document.body.appendChild(script);
  });
}

// Landing point for the operational app's "Upgrade Plan" dialog
// (https://shabooagri.com/upgrade?company=<slug>) — a plain browser link,
// no backend-to-backend call. The actual upgrade purchase only ever acts
// on whichever platform account is signed in here; the ?company= param
// is purely a display/confirmation aid, never trusted for the mutation
// itself (see payment.service.createOrder, which derives intent from the
// authenticated user's own companySlug).
export const UpgradePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const requestedCompanySlug = searchParams.get("company");
  const { isAuthenticated, isLoading: authLoading, user } = usePlatformAuth();

  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [status, setStatus] = useState<{ companySlug: string | null; currentPlanKey: string | null } | null>(null);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);
  const [extraMachines, setExtraMachines] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"pick" | "redirecting">("pick");

  useEffect(() => {
    api.getPublicConfig().then(setConfig).catch(() => setConfig(null));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    api
      .getStatus()
      .then((s) => {
        setStatus(s);
        setSelectedPlanKey(s.currentPlanKey);
      })
      .catch(() => setStatus(null));
  }, [isAuthenticated]);

  const currentPlan: PricingPlan | undefined = config?.plans.find((p) => p.key === status?.currentPlanKey);
  const selectedPlan: PricingPlan | undefined = config?.plans.find((p) => p.key === selectedPlanKey);
  const totalPrice = selectedPlan ? selectedPlan.priceAnnual + extraMachines * (config?.extraMachinePrice ?? 0) : 0;

  const completeStubPayment = async (paymentId: string) => {
    const result = await api.verifyPayment({
      paymentId,
      gatewayPaymentId: `pay_stub_${Date.now()}`,
      gatewaySignature: "stub_signature",
    });
    setStep("redirecting");
    if (result.provisioning.redirectUrl) {
      window.location.href = result.provisioning.redirectUrl;
    }
  };

  const handlePay = async () => {
    if (!selectedPlanKey) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const order = await api.createOrder(selectedPlanKey, extraMachines);

      if (order.mode === "STUB") {
        await completeStubPayment(order.paymentId);
        return;
      }

      await loadRazorpayScript();
      const razorpay = new window.Razorpay!({
        key: order.key,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: "ShabooAgri",
        description: `${order.plan.name} Plan — Upgrade`,
        order_id: order.gatewayOrderId,
        handler: async (response: { razorpay_payment_id: string; razorpay_signature: string }) => {
          const result = await api.verifyPayment({
            paymentId: order.paymentId,
            gatewayPaymentId: response.razorpay_payment_id,
            gatewaySignature: response.razorpay_signature,
          });
          setStep("redirecting");
          if (result.provisioning.redirectUrl) {
            window.location.href = result.provisioning.redirectUrl;
          }
        },
        theme: { color: "#1b7a3e" },
      });
      razorpay.open();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment could not be started. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return <div className="pf-center-viewport">Loading...</div>;
  }

  if (!isAuthenticated) {
    const next = `/upgrade${requestedCompanySlug ? `?company=${encodeURIComponent(requestedCompanySlug)}` : ""}`;
    return (
      <div className="pf-center-viewport">
        <div className="pf-card" style={{ width: "100%", maxWidth: 400, padding: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Tractor size={26} color="var(--color-primary)" />
            <h1 style={{ fontSize: "1.3rem", fontWeight: 700 }}>ShabooAgri</h1>
          </div>
          <p style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", marginBottom: 16 }}>
            Sign in to upgrade your plan{requestedCompanySlug ? ` for ${requestedCompanySlug}` : ""}.
          </p>
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="pf-btn pf-btn-primary" style={{ width: "100%", textDecoration: "none", display: "block", textAlign: "center" }}>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const companyMismatch =
    !!requestedCompanySlug && !!status?.companySlug && status.companySlug !== requestedCompanySlug;

  return (
    <div className="pf-center-viewport">
      <div className="pf-card" style={{ width: "100%", maxWidth: 480, padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Tractor size={26} color="var(--color-primary)" />
          <h1 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Upgrade Plan</h1>
        </div>

        {companyMismatch && (
          <div className="pf-alert pf-alert-danger">
            You're signed in as <strong>{user?.email}</strong>, but this upgrade link is for a different
            company. Sign in with the account that owns "{requestedCompanySlug}" instead.
          </div>
        )}

        {step === "redirecting" ? (
          <p style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
            Payment successful — updating your plan...
          </p>
        ) : (
          !companyMismatch && (
            <>
              {currentPlan && (
                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: 16 }}>
                  Current plan: <strong>{currentPlan.name}</strong> ({currentPlan.machineLimit} machines)
                </p>
              )}
              {error && <div className="pf-alert pf-alert-danger">{error}</div>}

              <div className="pf-field">
                <label className="pf-label">Choose a plan</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {config?.plans.map((plan) => (
                    <label
                      key={plan.key}
                      className="pf-card"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        cursor: "pointer",
                        borderColor: selectedPlanKey === plan.key ? "var(--color-primary)" : "var(--color-border)",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input
                          type="radio"
                          name="plan"
                          checked={selectedPlanKey === plan.key}
                          onChange={() => setSelectedPlanKey(plan.key)}
                        />
                        <span>
                          {plan.name} — {plan.machineLimit} machines
                          {plan.key === status?.currentPlanKey && (
                            <span style={{ color: "var(--color-text-muted)" }}> (current)</span>
                          )}
                        </span>
                      </span>
                      <span style={{ fontWeight: 600 }}>₹{plan.priceAnnual.toLocaleString("en-IN")}/yr</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pf-field">
                <label className="pf-label" htmlFor="extraMachines">
                  Extra machines beyond the plan limit (₹{config?.extraMachinePrice.toLocaleString("en-IN")}/year each)
                </label>
                <input
                  id="extraMachines"
                  type="number"
                  min={0}
                  className="pf-input"
                  value={extraMachines}
                  onChange={(e) => setExtraMachines(Math.max(0, Number(e.target.value)))}
                />
              </div>

              {selectedPlan && (
                <div className="pf-alert pf-alert-success" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={16} />
                  Total: ₹{totalPrice.toLocaleString("en-IN")}/year for {selectedPlan.machineLimit + extraMachines}{" "}
                  machines
                </div>
              )}

              <button
                className="pf-btn pf-btn-primary"
                style={{ width: "100%" }}
                onClick={handlePay}
                disabled={isSubmitting || !selectedPlanKey}
              >
                {isSubmitting ? "Processing..." : "Pay & Update Plan"}
              </button>
            </>
          )
        )}
      </div>
    </div>
  );
};
