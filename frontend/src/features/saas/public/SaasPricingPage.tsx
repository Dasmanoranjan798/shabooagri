import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ShieldCheck, FileText, Calculator, ArrowRight } from "lucide-react";
import { SaasHeader } from "../components/SaasHeader";
import { SaasFooter } from "../components/SaasFooter";

export const SaasPricingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      <SaasHeader />

      {/* Hero Section */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#047857] text-xs font-bold uppercase tracking-wider">
            <Calculator className="w-3.5 h-3.5" />
            <span>Commercial Pricing</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Transparent Commercial SaaS Plan
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            One simple annual plan. No per-machine surcharges, no hidden fees, and full GST tax compliance included.
          </p>
        </div>
      </section>

      {/* Main Pricing & Tax Breakdown Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Main Plan Card (7 cols) */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8 relative">
              <div className="inline-block bg-emerald-50 text-[#047857] border border-emerald-200 text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full">
                RECOMMENDED ANNUAL LICENSE
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">ShabooAgri Business OS</h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">Full Commercial Control Plane & Software License</p>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-4xl sm:text-5xl font-extrabold text-slate-900">₹4,999</div>
                  <span className="text-xs font-bold text-[#047857] uppercase tracking-wider block mt-1">
                    / year (INCLUDING 18% GST)
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Included Capabilities:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <div key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/saas/register"
                  className="w-full h-12 rounded-xl bg-[#047857] hover:bg-[#035436] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <span>Proceed to Registration — ₹4,999.00</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Tax Breakdown Reference (5 cols) */}
            <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[#047857] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">GST Tax Breakdown Reference</h3>
                  <p className="text-xs text-slate-500">Full Commercial Tax Auditability</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                The customer-facing payment amount is strictly <strong className="text-slate-900">₹4,999.00</strong>. You do NOT pay ₹4,999 + GST on top. All statutory taxes are included in the price.
              </p>

              {/* Tax Table */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-600">Taxable Value:</span>
                  <span className="font-semibold text-slate-900">₹4,236.44</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-600">GST (18% Total):</span>
                  <span className="font-semibold text-[#047857]">₹762.56</span>
                </div>

                <div className="pt-1 space-y-1 text-xs text-slate-500">
                  <p className="font-bold text-slate-700">Statutory Tax Distribution:</p>
                  <div className="flex justify-between pl-2">
                    <span>Intra-State (CGST 9%):</span>
                    <span className="font-mono text-slate-800">₹381.28</span>
                  </div>
                  <div className="flex justify-between pl-2">
                    <span>Intra-State (SGST 9%):</span>
                    <span className="font-mono text-slate-800">₹381.28</span>
                  </div>
                  <div className="flex justify-between pl-2">
                    <span>Inter-State (IGST 18%):</span>
                    <span className="font-mono text-slate-800">₹762.56</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-between font-bold text-sm sm:text-base text-slate-900">
                  <span>Total Amount Paid:</span>
                  <span className="text-[#047857]">₹4,999.00</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-slate-700 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#047857] shrink-0 mt-0.5" />
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
