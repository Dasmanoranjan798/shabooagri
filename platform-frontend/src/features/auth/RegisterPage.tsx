import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { api, ApiError, type PricingPlan } from "../../lib/api";
import { AuthLayout } from "./AuthLayout";

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

type Step = "form" | "payment" | "redirecting";

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const requestedPlanKey = searchParams.get("plan") || "starter";

  const [step, setStep] = useState<Step>("form");
  const [plans, setPlans] = useState<PricingPlan[] | null>(null);
  const [purchasingBlocked, setPurchasingBlocked] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    contactPerson: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    api
      .getPublicConfig()
      .then((config) => {
        setPlans(config.plans);
        setPurchasingBlocked(config.purchasingBlocked);
      })
      .catch(() => setPlans([]));
  }, []);

  const selectedPlan = plans?.find((p) => p.key === requestedPlanKey) ?? plans?.[0] ?? null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.register(form);
      setBusinessName(form.businessName);
      setStep("payment");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
    if (!selectedPlan) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const order = await api.createOrder(selectedPlan.key);

      if (order.mode === "STUB") {
        // No real Razorpay keys configured yet — the backend accepts an
        // unsigned verification in this mode so the whole pipeline stays
        // testable. Real keys switch this branch off entirely (payment.
        // service.verifyPayment starts requiring a real signature).
        await completeStubPayment(order.paymentId);
        return;
      }

      await loadRazorpayScript();
      const razorpay = new window.Razorpay!({
        key: order.key,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: "ShabooAgri",
        description: `${order.plan.name} Plan — Annual Subscription`,
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
        theme: { color: "#15713a" },
      });
      razorpay.open();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment could not be started. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const titleForStep =
    step === "payment" ? "Activate your workspace" : step === "redirecting" ? "Setting things up" : "Create your account";
  const subtitleForStep =
    step === "form" ? "Start running your hiring center in minutes." : undefined;

  return (
    <AuthLayout title={titleForStep} subtitle={subtitleForStep}>
      {purchasingBlocked ? (
        <div className="pf-alert pf-alert-danger">
          New signups are temporarily paused. Please check back shortly.
        </div>
      ) : (
        <>
            {step === "form" && (
              <>
                {selectedPlan && (
                  <div
                    className="pf-card"
                    style={{
                      padding: "12px 14px",
                      marginBottom: 18,
                      fontSize: "var(--text-sm)",
                      color: "var(--color-text-secondary)",
                      background: "var(--color-primary-light)",
                      borderColor: "rgba(21,113,58,0.16)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span>
                      <strong>{selectedPlan.name}</strong> — ₹{selectedPlan.priceAnnual.toLocaleString("en-IN")}/year ·{" "}
                      {selectedPlan.machineLimit} machines
                    </span>
                    <Link to="/pricing" style={{ color: "var(--color-primary)", fontWeight: 600, whiteSpace: "nowrap" }}>
                      Change
                    </Link>
                  </div>
                )}
                {error && <div className="pf-alert pf-alert-danger">{error}</div>}
                <form onSubmit={handleFormSubmit}>
                  <div className="pf-field">
                    <label className="pf-label" htmlFor="businessName">Business Name</label>
                    <input
                      id="businessName"
                      className="pf-input"
                      required
                      value={form.businessName}
                      onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label" htmlFor="contactPerson">Your Name</label>
                    <input
                      id="contactPerson"
                      className="pf-input"
                      required
                      value={form.contactPerson}
                      onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label" htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      className="pf-input"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label" htmlFor="phone">Mobile Number</label>
                    <input
                      id="phone"
                      className="pf-input"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label" htmlFor="password">Password</label>
                    <input
                      id="password"
                      type="password"
                      className="pf-input"
                      required
                      minLength={8}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="pf-btn pf-btn-primary pf-btn-lg" style={{ width: "100%" }} disabled={isSubmitting}>
                    {isSubmitting ? "Creating account..." : "Continue to Payment"}
                  </button>
                </form>
                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: 16, textAlign: "center" }}>
                  Already have an account? <Link to="/login" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Sign in</Link>
                </p>
              </>
            )}

            {step === "payment" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <CheckCircle2 size={20} color="var(--color-success)" />
                  <span style={{ fontSize: "0.9rem" }}>Account created for <strong>{businessName}</strong></span>
                </div>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: 20 }}>
                  One last step — pay for the <strong>{selectedPlan?.name}</strong> plan (₹
                  {selectedPlan?.priceAnnual.toLocaleString("en-IN")}/year) to activate your account and set up
                  your workspace.
                </p>
                {error && <div className="pf-alert pf-alert-danger">{error}</div>}
                <button className="pf-btn pf-btn-primary pf-btn-lg" style={{ width: "100%" }} onClick={handlePay} disabled={isSubmitting}>
                  {isSubmitting ? "Processing..." : "Pay & Activate"}
                </button>
              </>
            )}

            {step === "redirecting" && (
              <p style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
                Payment successful — setting up your workspace...
              </p>
            )}
        </>
      )}
    </AuthLayout>
  );
};
