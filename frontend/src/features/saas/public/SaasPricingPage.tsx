import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ShieldCheck, FileText, Calculator } from "lucide-react";
import { SaasHeader } from "../components/SaasHeader";
import { SaasFooter } from "../components/SaasFooter";

export const SaasPricingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <SaasHeader />

      {/* HEADER SECTION */}
      <section className="py-16 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <Calculator className="w-4 h-4" />
            <span>Commercial Pricing</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white">
            Transparent Commercial SaaS Plan
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
            One simple annual plan. No per-machine surcharges, no hidden fees, and full GST compliance included.
          </p>
        </div>
      </section>

      {/* MAIN PRICING CARD & TAX BREAKDOWN */}
      <section className="py-16 lg:py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* PRICING CARD (7 cols) */}
            <div className="lg:col-span-7 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-8 sm:p-10 rounded-3xl border-2 border-emerald-500/60 shadow-2xl relative">
              <div className="absolute -top-3.5 left-8 bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider px-4 py-1 rounded-full shadow">
                RECOMMENDED ANNUAL LICENSE
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
                <div>
                  <h2 className="text-2xl font-black text-white">ShabooAgri Business OS</h2>
                  <p className="text-sm text-slate-400">Full Commercial Control Plane & Software License</p>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-5xl font-black text-white">₹4,999</div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    / year (INCLUDING 18% GST)
                  </span>
                </div>
              </div>

              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Included Capabilities:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-8">
                {[
                  "Unlimited Fleet & Machinery Catalog",
                  "Unlimited Booking & Job Logging",
                  "Farmer & Customer Ledgers",
                  "4 Flexible Pricing Engines",
                  "GST Tax Invoicing & Receipts",
                  "Driver Compensation Calculations",
                  "Fuel Consumption Loggers",
                  "Preventative Maintenance Trackers",
                  "Owner & Manager Analytics",
                  "Multi-Tenant Business Isolation",
                  "Data Security & Backups",
                  "Dedicated Support Portal",
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/saas/register"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-center text-base block shadow-xl transition-all hover:scale-[1.01]"
              >
                PROCEED TO REGISTRATION — ₹4,999.00
              </Link>
            </div>

            {/* TAX BREAKDOWN & COMPLIANCE (5 cols) */}
            <div className="lg:col-span-5 bg-slate-900/80 p-8 rounded-3xl border border-slate-800 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">GST Tax Breakdown Reference</h3>
                  <p className="text-xs text-slate-400">Full Commercial Tax Auditability</p>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                The customer-facing payment amount is strictly <strong className="text-white">₹4,999.00</strong>. You do NOT pay ₹4,999 + GST on top. All statutory taxes are included in the price.
              </p>

              {/* Tax Table */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 text-sm">
                <div className="flex justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Taxable Value:</span>
                  <span className="font-semibold text-white">₹4,236.44</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">GST (18% Total):</span>
                  <span className="font-semibold text-emerald-400">₹762.56</span>
                </div>

                <div className="pt-2 space-y-1.5 text-xs text-slate-400">
                  <p className="font-bold text-slate-300">Statutory Tax Distribution:</p>
                  <div className="flex justify-between pl-2">
                    <span>Intra-State (CGST 9%):</span>
                    <span className="font-mono text-slate-200">₹381.28</span>
                  </div>
                  <div className="flex justify-between pl-2">
                    <span>Intra-State (SGST 9%):</span>
                    <span className="font-mono text-slate-200">₹381.28</span>
                  </div>
                  <div className="flex justify-between pl-2">
                    <span>Inter-State (IGST 18%):</span>
                    <span className="font-mono text-slate-200">₹762.56</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between font-black text-base text-white">
                  <span>Total Amount Paid:</span>
                  <span className="text-emerald-400">₹4,999.00</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>GST Tax Invoices with B2B GSTIN input credit reference issued upon payment confirmation.</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      <SaasFooter />
    </div>
  );
};
