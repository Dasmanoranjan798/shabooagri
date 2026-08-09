import React from "react";
import { Link } from "react-router-dom";
import { Building2, CheckCircle2, ArrowRight } from "lucide-react";
import { SaasHeader } from "../components/SaasHeader";
import { SaasFooter } from "../components/SaasFooter";

export const SaasSolutionsPage: React.FC = () => {
  const solutions = [
    {
      title: "1. Custom Hiring Centres (CHCs)",
      subtitle: "Government-assisted or private multi-equipment hiring hubs.",
      benefits: [
        "Track 10-50+ machines with centralized booking and dispatch queues.",
        "Generate GST compliant invoices for subsidy documentation and audit trails.",
        "Separate manager dispatch access from owner financial oversight.",
        "Prevent equipment overlap across neighboring villages during peak windows.",
      ],
    },
    {
      title: "2. Tractor Fleet Owners",
      subtitle: "Entrepreneurs operating multiple tractors with rotavators & levellers.",
      benefits: [
        "Assign individual drivers to specific tractor-rotavator units.",
        "Calculate driver compensation automatically (Hourly wages vs Salaried).",
        "Track diesel refill logs and flag unexplained fuel consumption spikes.",
        "Keep clear farmer payment ledgers for cash and UPI collection.",
      ],
    },
    {
      title: "3. Combine Harvester Operators",
      subtitle: "Inter-state harvesting contractors following paddy & wheat seasons.",
      benefits: [
        "Rapid job completion logging directly in the field.",
        "Flexible pricing calculations: Per Hour, Per Acre, or Per Job / Fixed Rate.",
        "Generate instant digital receipts with remaining balance tracking.",
        "Monitor harvester maintenance schedules and engine hour meters.",
      ],
    },
    {
      title: "4. Agricultural Implement Rental Businesses",
      subtitle: "Specialized businesses renting sprayers, balers, and paddy transplanters.",
      benefits: [
        "Catalog high-value implements with operational status and availability.",
        "Prevent equipment idling with clear scheduled dispatch views.",
        "Record repair and maintenance expenses against specific implements.",
        "Maintain customer history and recurring seasonal rental agreements.",
      ],
    },
    {
      title: "5. Multi-Machine Contractors & Earthmovers",
      subtitle: "Contractors managing tractors, JCBs, backhoes, and land levellers.",
      benefits: [
        "Support diverse billing methods (Per Minute, Per Hour, Per Job).",
        "Track heavy machinery maintenance logs and hydraulic fluid changes.",
        "Monitor multi-village job execution progress across project sites.",
        "Export clean business reports for seasonal profit analysis.",
      ],
    },
    {
      title: "6. Cooperative Machinery Operations & FPOs",
      subtitle: "Farmer Producer Organizations (FPOs) sharing shared farm equipment.",
      benefits: [
        "Transparent member booking allocation without political favoritism.",
        "Multi-user RBAC security preventing unauthorized record changes.",
        "Complete financial auditability with automated invoice logs.",
        "Fair usage pricing and transparent operational expense tracking.",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <SaasHeader />

      {/* HEADER SECTION */}
      <section className="py-16 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950 border border-teal-500/30 text-teal-300 text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>Agricultural Use Cases</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white">
            Tailored Business Solutions for Agri Equipment Enterprises
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-3xl mx-auto">
            Discover how ShabooAgri solves real operational bottlenecks for Custom Hiring Centres, tractor fleets, combine contractors, and machinery cooperatives across India.
          </p>
        </div>
      </section>

      {/* SOLUTIONS LIST */}
      <section className="py-16 lg:py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {solutions.map((sol, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 p-8 rounded-3xl border border-slate-800 hover:border-teal-500/40 transition-colors flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-2xl font-black text-white mb-2">{sol.title}</h3>
                  <p className="text-emerald-400 text-sm font-semibold mb-6">{sol.subtitle}</p>

                  <ul className="space-y-3 mb-6">
                    {sol.benefits.map((b, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-3 text-sm text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <Link
                    to="/saas/register"
                    className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-bold"
                  >
                    <span>Deploy ShabooAgri for this solution</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SaasFooter />
    </div>
  );
};
