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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      <SaasHeader />

      {/* Hero Section */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#047857] text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5" />
            <span>Agricultural Use Cases</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Tailored Business Solutions for Agri Equipment Enterprises
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Discover how ShabooAgri solves real operational bottlenecks for Custom Hiring Centres, tractor fleets, combine contractors, and machinery cooperatives across India.
          </p>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {solutions.map((sol, idx) => (
              <div
                key={idx}
                className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{sol.title}</h3>
                  <p className="text-[#047857] text-xs font-semibold mb-5">{sol.subtitle}</p>

                  <ul className="space-y-3 mb-6">
                    {sol.benefits.map((b, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Link
                    to="/saas/register"
                    className="inline-flex items-center gap-2 text-[#047857] hover:text-[#035436] text-xs sm:text-sm font-semibold"
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
