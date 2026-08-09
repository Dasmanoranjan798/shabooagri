import { Tractor, Target, Eye } from "lucide-react";
import { SaasHeader } from "../components/SaasHeader";
import { SaasFooter } from "../components/SaasFooter";

export const SaasAboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <SaasHeader />

      {/* HERO SECTION */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <Tractor className="w-4 h-4" />
            <span>About ShabooAgri</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
            Modernizing Agricultural Machinery Operations Across India
          </h1>
          <p className="text-slate-300 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
            ShabooAgri was created to solve a fundamental structural gap in rural machinery enterprise management: transforming paper-based, unorganized custom hiring into a professional, profitable software-driven operation.
          </p>
        </div>
      </section>

      {/* CORE VISION & MISSION */}
      <section className="py-16 lg:py-24 bg-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            <div className="bg-slate-900/80 p-8 sm:p-10 rounded-3xl border border-slate-800 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white">Why ShabooAgri Exists</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Agricultural machinery owners in India invest lakhs—often crores—in tractors, rotavators, combine harvesters, JCBs, and sprayers. However, daily operations have historically relied on paper slips, informal verbal promises, and unverified fuel refills.
              </p>
              <p className="text-slate-300 text-sm leading-relaxed">
                ShabooAgri provides a dedicated commercial operating system that gives machinery owners full control over their equipment, driver assignments, fuel consumption, farmer payment ledgers, and net profitability.
              </p>
            </div>

            <div className="bg-slate-900/80 p-8 sm:p-10 rounded-3xl border border-slate-800 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-950 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                <Eye className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white">Our Product Vision</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                We envision a future where every Custom Hiring Centre (CHC) and independent equipment owner operates with enterprise-grade business software.
              </p>
              <p className="text-slate-300 text-sm leading-relaxed">
                By eliminating paper clutter, preventing diesel theft, streamlining GST tax invoicing, and clarifying driver responsibility, ShabooAgri helps rural machinery businesses build sustainable, generational enterprise value.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* CORE VALUES & PILLARS */}
      <section className="py-16 lg:py-24 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              The Four Pillars of ShabooAgri Technology
            </h2>
            <p className="text-slate-400 text-base">Designed for reliability, ground truth, and ease of use in agricultural field environments.</p>
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
              <div key={idx} className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-lg font-bold text-white mb-2">{pillar.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      <SaasFooter />
    </div>
  );
};
