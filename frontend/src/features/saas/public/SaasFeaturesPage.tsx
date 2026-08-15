import React from "react";
import "../saas.css";
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
    <div className="min-h-screen bg-[var(--saas-bg)] text-slate-900 flex flex-col font-sans">
      <SaasHeader />

      {/* Hero Section */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[var(--saas-primary)] text-xs font-bold uppercase tracking-wider">
            <Tractor className="w-3.5 h-3.5" />
            <span>Comprehensive Feature Suite</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Designed Exclusively for Agricultural Machinery Operations
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Explore every module engineered into ShabooAgri to streamline bookings, dispatch drivers, control fuel costs, issue GST invoices, and track profitability.
          </p>
        </div>
      </section>

      {/* Module Grid */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {moduleList.map((mod, idx) => {
              const IconComponent = mod.icon;
              return (
                <div
                  key={idx}
                  className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[var(--saas-primary)] flex items-center justify-center">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {mod.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{mod.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{mod.desc}</p>
                  </div>

                  <div className="pt-5 mt-5 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-[var(--saas-primary)]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Included in ₹4,999/yr License</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white border-t border-b border-slate-200 text-center">
        <div className="max-w-3xl mx-auto px-4 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Ready to digitize your agricultural equipment fleet?</h2>
          <p className="text-slate-600 text-xs sm:text-sm max-w-xl mx-auto">Start using ShabooAgri today and experience complete operational clarity across your entire machinery catalog.</p>
          <div className="pt-2">
            <Link
              to="/saas/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--saas-primary)] hover:bg-[var(--saas-primary-hover)] text-white font-semibold text-sm shadow-xs transition-colors"
            >
              <span>Register Now — ₹4,999/yr incl GST</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <SaasFooter />
    </div>
  );
};
