import React from "react";
import "../saas.css";
import { Tractor, Target, Eye } from "lucide-react";
import { SaasHeader } from "../components/SaasHeader";
import { SaasFooter } from "../components/SaasFooter";

export const SaasAboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--saas-bg)] text-slate-900 flex flex-col font-sans">
      <SaasHeader />

      {/* Hero Section */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[var(--saas-primary)] text-xs font-bold uppercase tracking-wider">
            <Tractor className="w-3.5 h-3.5" />
            <span>About ShabooAgri</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Modernizing Agricultural Machinery Operations Across India
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            ShabooAgri was created to solve a fundamental structural gap in rural machinery enterprise management: transforming paper-based, unorganized custom hiring into a professional, profitable software-driven operation.
          </p>
        </div>
      </section>

      {/* Core Vision & Mission Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[var(--saas-primary)] flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Why ShabooAgri Exists</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Agricultural machinery owners in India invest lakhs—often crores—in tractors, rotavators, combine harvesters, JCBs, and sprayers. However, daily operations have historically relied on paper slips, informal verbal promises, and unverified fuel refills.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                ShabooAgri provides a dedicated commercial operating system that gives machinery owners full control over their equipment, driver assignments, fuel consumption, farmer payment ledgers, and net profitability.
              </p>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[var(--saas-primary)] flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Our Product Vision</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                We envision a future where every Custom Hiring Centre (CHC) and independent equipment owner operates with enterprise-grade business software.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                By eliminating paper clutter, preventing diesel theft, streamlining GST tax invoicing, and clarifying driver responsibility, ShabooAgri helps rural machinery businesses build sustainable, generational enterprise value.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-16 sm:py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              The Four Pillars of ShabooAgri Technology
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">Designed for reliability, ground truth, and ease of use in agricultural field environments.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "1. Operational Visibility",
                desc: "Real-time awareness of active field jobs, machine worked hours, driver status, and pending farmer collection balances.",
              },
              {
                title: "2. Financial Integrity",
                desc: "Monotonic GST tax invoicing, strict partial payment logs, and structured receipts that eliminate accounting disputes.",
              },
              {
                title: "3. Fleet Reliability",
                desc: "Engine hour tracking and preventative maintenance scheduling to prevent breakdowns during seasonal harvest windows.",
              },
              {
                title: "4. Data Privacy",
                desc: "Strict multi-tenant business isolation ensuring your customer lists, rates, and revenues remain 100% private to your company.",
              },
            ].map((pillar, idx) => (
              <div key={idx} className="bg-[var(--saas-bg)] p-6 rounded-xl border border-slate-200 space-y-2">
                <h3 className="text-base font-bold text-slate-900">{pillar.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      <SaasFooter />
    </div>
  );
};
