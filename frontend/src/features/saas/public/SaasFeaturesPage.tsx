import React from "react";
import { Link } from "react-router-dom";
import {
  Tractor,
  Clock,
  Users,
  Receipt,
  DollarSign,
  Fuel,
  Wrench,
  Gauge,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  FileSpreadsheet,
  Building,
} from "lucide-react";
import { SaasHeader } from "../components/SaasHeader";
import { SaasFooter } from "../components/SaasFooter";

export const SaasFeaturesPage: React.FC = () => {
  const moduleList = [
    {
      title: "Booking Management",
      icon: Clock,
      category: "Field Operations",
      desc: "Record work requests from farmers with village location, crop type, machine type, estimated hours/acres, and start date. Prevents double-booking and schedule conflicts during peak harvest seasons.",
    },
    {
      title: "Job Dispatch & Live Tracking",
      icon: Tractor,
      category: "Field Operations",
      desc: "Assign specific tractors or harvesters and drivers to jobs. Track live work status (NOT_STARTED, IN_PROGRESS, PAUSED, COMPLETED) with duration calculations and field photos.",
    },
    {
      title: "Farmer Customer Ledgers",
      icon: Users,
      category: "Customer & Sales",
      desc: "Digital customer database holding full contact profiles, land holdings, village grouping, past job logs, lifetime revenue, and outstanding balance ledgers for every grower.",
    },
    {
      title: "Flexible Pricing Engine",
      icon: DollarSign,
      category: "Billing & Revenue",
      desc: "Supports 4 distinct pricing methods: Per Hour, Per Minute, Per Acre, and Per Job / Fixed Rate. Automatically calculates totals upon job completion without manual math errors.",
    },
    {
      title: "GST Tax Invoicing & Receipts",
      icon: Receipt,
      category: "Billing & Revenue",
      desc: "Auto-generate monotonic GST tax invoices upon job completion. Supports partial payments, remaining balance tracking, overpayment rejection, and structured PDF receipts.",
    },
    {
      title: "Driver & Operator Management",
      icon: Building,
      category: "Fleet & Staff",
      desc: "Driver profiles, license records, phone numbers, and compensation models (Hourly rate vs Fixed Monthly Salary vs Fixed Annual Salary). Automatically calculates hourly driver wages.",
    },
    {
      title: "Machine & Fleet Inventory",
      icon: Tractor,
      category: "Fleet & Staff",
      desc: "Catalog tractors, rotavators, harvesters, JCBs, sprayers, and paddy transplanters with registration numbers, model details, total worked hours, and current operational status.",
    },
    {
      title: "Fuel Consumption Logging",
      icon: Fuel,
      category: "Cost & Overheads",
      desc: "Record diesel refill entries with liter volume, total cost, fuel vendor, and associate fuel consumption with specific machines and worked job hours to detect leakage.",
    },
    {
      title: "Preventative Maintenance",
      icon: Wrench,
      category: "Fleet Maintenance",
      desc: "Schedule regular oil changes, filter servicing, tire replacements, and record maintenance expenses. Avoid catastrophic engine failures during critical farming windows.",
    },
    {
      title: "Expense Management",
      icon: FileSpreadsheet,
      category: "Cost & Overheads",
      desc: "Categorize operational expenses including spare parts, grease/lubricants, food allowances, field transport, and toll charges to calculate net business profitability.",
    },
    {
      title: "Owner & Manager Analytics",
      icon: Gauge,
      category: "Business Intelligence",
      desc: "Visual KPI dashboards featuring 7-day, 30-day, 90-day, and 12-month income series, machine utilization rates, fuel cost trends, and pending collection summaries.",
    },
    {
      title: "Multi-Tenant Business Security",
      icon: ShieldCheck,
      category: "Security & RBAC",
      desc: "Strict logical data isolation ensuring each Custom Hiring Centre or machinery owner's records remain 100% private. Custom role creation with granular permission scoping.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <SaasHeader />

      {/* HEADER SECTION */}
      <section className="py-16 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <Tractor className="w-4 h-4" />
            <span>Comprehensive Feature Suite</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white">
            Designed Exclusively for Agricultural Machinery Operations
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-3xl mx-auto">
            Explore every module engineered into ShabooAgri to streamline bookings, dispatch drivers, control fuel costs, issue GST invoices, and track profitability.
          </p>
        </div>
      </section>

      {/* MODULE GRID */}
      <section className="py-16 lg:py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {moduleList.map((mod, idx) => {
              const IconComponent = mod.icon;
              return (
                <div
                  key={idx}
                  className="bg-slate-900/90 p-7 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-800 text-slate-300">
                        {mod.category}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{mod.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{mod.desc}</p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Included in ₹4,999/yr License</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-slate-900 border-t border-slate-800 text-center">
        <div className="max-w-3xl mx-auto px-4 space-y-6">
          <h2 className="text-3xl font-extrabold text-white">Ready to digitize your agricultural equipment fleet?</h2>
          <p className="text-slate-400 text-sm sm:text-base">Start using ShabooAgri today and experience complete operational clarity.</p>
          <div className="pt-2">
            <Link
              to="/saas/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base shadow-xl transition-all"
            >
              <span>REGISTER NOW — ₹4,999/YR INCL GST</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <SaasFooter />
    </div>
  );
};
