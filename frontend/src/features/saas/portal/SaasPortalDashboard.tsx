import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Tractor,
  KeyRound,
  Clock,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { SaasPortalLayout } from "../components/SaasPortalLayout";
import { useSaasAuth } from "../../../context/SaasAuthContext";
import { getSaasMyLicenses, getSaasMyPayments, getSsoLaunchToken, createSaasPaymentOrder, verifySaasPayment } from "../../../lib/saasApi";
import type { SaasLicense, SaasPayment } from "../../../types/saas";

export const SaasPortalDashboard: React.FC = () => {
  const { saasUser } = useSaasAuth();
  const [licenses, setLicenses] = useState<SaasLicense[]>([]);
  const [payments, setPayments] = useState<SaasPayment[]>([]);

  const [launching, setLaunching] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState<string | null>(null);

  const loadPortalData = async () => {
    try {
      const [licData, payData] = await Promise.all([
        getSaasMyLicenses().catch(() => []),
        getSaasMyPayments().catch(() => []),
      ]);
      setLicenses(licData);
      setPayments(payData);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    loadPortalData();
  }, []);

  const activeLicense = licenses.find((l) => l.status === "LICENSE_ACTIVE") || licenses[0];
  const profile = saasUser?.customerProfile;
  const isLicenseActive = activeLicense?.status === "LICENSE_ACTIVE";

  let daysRemaining: number | null = null;
  if (activeLicense?.expiryDate) {
    const expiry = new Date(activeLicense.expiryDate).getTime();
    const now = Date.now();
    const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    daysRemaining = diff > 0 ? diff : 0;
  }

  const handleLaunchSoftware = async () => {
    setLaunching(true);
    try {
      const res = await getSsoLaunchToken();
      // On local/dev single origin host, launch via SSO callback route or target software URL
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        window.location.href = `/sso-callback?token=${res.ssoToken}`;
      } else {
        window.location.href = res.softwareUrl;
      }
    } catch (err: any) {
      alert(`Launch error: ${err.message || "Could not generate SSO token"}`);
    } finally {
      setLaunching(false);
    }
  };

  const handlePaySubscription = async () => {
    setPaying(true);
    setPaymentMsg(null);
    try {
      // Step 1: Create Order
      const order = await createSaasPaymentOrder();
      
      // Step 2: Server-side Verify Payment & Provision Tenant
      const verifyRes = await verifySaasPayment({
        paymentId: order.paymentId,
        gatewayPaymentId: `pay_sandbox_${Date.now()}`,
      });

      if (verifyRes.success) {
        setPaymentMsg(`Payment verified! Subscription Active. Software URL: ${verifyRes.softwareUrl}`);
        await loadPortalData();
      }
    } catch (err: any) {
      alert(`Payment error: ${err.message || "Payment verification failed"}`);
    } finally {
      setPaying(false);
    }
  };

  return (
    <SaasPortalLayout>
      <div className="space-y-8">
        
        {/* WELCOME BANNER */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/60 p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-400 mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Commercial Account Overview</span>
            </div>
            <h1 className="text-3xl font-black text-white">
              Welcome, {profile?.contactPerson || profile?.businessName || saasUser?.email}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Business: <strong className="text-slate-200">{profile?.businessName || "Commercial Fleet Enterprise"}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Account Status: {saasUser?.status || "ACTIVE"}</span>
            </span>
          </div>
        </div>

        {paymentMsg && (
          <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{paymentMsg}</span>
            </div>
            <button onClick={() => setPaymentMsg(null)} className="font-bold underline text-emerald-400">Dismiss</button>
          </div>
        )}

        {/* PRIMARY ACTION: START USING YOUR SOFTWARE */}
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 p-8 rounded-3xl border-2 border-emerald-500/50 shadow-2xl relative overflow-hidden">
          <div className="max-w-3xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
                <Tractor className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white">ShabooAgri Operational Software Environment</h2>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed">
              Access your dedicated multi-tenant business software for bookings, job dispatch, tractor tracking, driver compensation, and GST invoicing.
            </p>

            {/* PROMINENT START BUTTON OR PAY BUTTON */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {isLicenseActive ? (
                <button
                  onClick={handleLaunchSoftware}
                  disabled={launching}
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base shadow-xl flex items-center gap-3 transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  {launching ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>GENERATING SSO LAUNCH SESSION...</span>
                    </>
                  ) : (
                    <>
                      <span>START USING YOUR SOFTWARE</span>
                      <ExternalLink className="w-5 h-5" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handlePaySubscription}
                  disabled={paying}
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base shadow-xl flex items-center gap-3 transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>VERIFYING PAYMENT & PROVISIONING...</span>
                    </>
                  ) : (
                    <>
                      <span>PAY ₹4,999 TO ACTIVATE & START SOFTWARE</span>
                      <CreditCard className="w-5 h-5" />
                    </>
                  )}
                </button>
              )}

              <div className="text-xs text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Single Sign-On (SSO) Protected Access</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 italic pt-1">
              Note: Software access is available immediately upon verified commercial subscription activation.
            </p>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: License Status */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
              <span>Subscription License</span>
              <KeyRound className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {activeLicense?.licenseNumber || "REGISTERED"}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Status:</span>
              <span className="font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                {activeLicense?.status || "REGISTERED"}
              </span>
            </div>
          </div>

          {/* Card 2: Validity / Days Remaining */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
              <span>License Validity</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {daysRemaining !== null ? `${daysRemaining} Days` : "Annual Subscription"}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Expiry Date:</span>
              <span className="font-semibold text-slate-200">
                {activeLicense?.expiryDate ? new Date(activeLicense.expiryDate).toLocaleDateString() : "Pending Activation"}
              </span>
            </div>
          </div>

          {/* Card 3: Payments & Billing */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
              <span>Commercial Payments</span>
              <CreditCard className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {payments.length > 0 ? `${payments.length} Transaction(s)` : "Annual Plan"}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Standard Subscription:</span>
              <span className="font-bold text-emerald-400">₹4,999 / year</span>
            </div>
          </div>

        </div>

        {/* QUICK NAVIGATION TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/saas/portal/license"
            className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 transition-all space-y-2 group"
          >
            <KeyRound className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-white text-sm">View License Details</h3>
            <p className="text-xs text-slate-400">Manage subscription validity and license number</p>
          </Link>

          <Link
            to="/saas/portal/payments"
            className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 transition-all space-y-2 group"
          >
            <CreditCard className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-white text-sm">Payment History</h3>
            <p className="text-xs text-slate-400">View commercial payment logs and GST invoices</p>
          </Link>

          <Link
            to="/saas/portal/profile"
            className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 transition-all space-y-2 group"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-white text-sm">Business Profile</h3>
            <p className="text-xs text-slate-400">Update company contact, address & GSTIN</p>
          </Link>

          <Link
            to="/saas/portal/feedback"
            className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 transition-all space-y-2 group"
          >
            <Sparkles className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-white text-sm">Submit Feedback</h3>
            <p className="text-xs text-slate-400">Request features directly to product engineering</p>
          </Link>
        </div>

      </div>
    </SaasPortalLayout>
  );
};
