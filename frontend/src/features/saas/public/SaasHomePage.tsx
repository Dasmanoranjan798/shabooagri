import React from "react";
import { Link } from "react-router-dom";
import {
  Tractor,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Users,
  Wrench,
  Fuel,
  Building2,
  Gauge,
  Clock,
  DollarSign,
  Check,
} from "lucide-react";
import { SaasHeader } from "../components/SaasHeader";
import { SaasFooter } from "../components/SaasFooter";

export const SaasHomePage: React.FC = () => {
  const problems = [
    {
      title: "Paper-Based Job Tracking",
      desc: "Work slips lost in fields, illegible handwriting, and zero real-time visibility into active field jobs.",
    },
    {
      title: "Delayed Farmer Payment Follow-ups",
      desc: "Uncollected seasonal balances from farmers without clear digital ledger proof or organized receipts.",
    },
    {
      title: "Unexplained Fuel Leakage & Theft",
      desc: "High diesel bills without verified engine hours, acre coverage, or job-level fuel consumption logs.",
    },
    {
      title: "Unclear Driver Responsibility",
      desc: "Confusion over who operated which combine harvester or tractor on specific land parcels and dates.",
    },
    {
      title: "Costly Machine Downtime",
      desc: "Breakdowns occurring during peak harvest seasons due to unmonitored maintenance schedules.",
    },
    {
      title: "Manual Billing & Rate Discrepancies",
      desc: "Inconsistent pricing (Per Hour, Per Acre, Per Minute, Fixed) causing disputes with growers.",
    },
  ];

  const features = [
    {
      icon: Clock,
      title: "Booking & Job Dispatch",
      tag: "FIELD OPERATIONS",
      desc: "Schedule land preparation, sowing, spraying, and harvesting jobs. Dispatch assigned drivers and machinery effortlessly.",
    },
    {
      icon: Users,
      title: "Farmer & Customer Ledgers",
      tag: "FINANCIAL ACCOUNTS",
      desc: "Maintain complete profile records, village details, past work history, and pending payment balances for every grower.",
    },
    {
      icon: Receipt,
      title: "GST Invoicing & Receipts",
      tag: "TAX & COMPLIANCE",
      desc: "Generate professional GST compliant tax invoices with monotonic numbering, partial payment logs, and cash/UPI receipts.",
    },
    {
      icon: Tractor,
      title: "Fleet & Machine Tracking",
      tag: "ASSET MANAGEMENT",
      desc: "Catalog tractors, rotavators, harvesters, JCBs, sprayers, and transplanters with hour meter tracking and availability.",
    },
    {
      icon: DollarSign,
      title: "Flexible Pricing Engine",
      tag: "REVENUE ENGINE",
      desc: "Support Per Hour, Per Minute, Per Acre, and Per Job / Fixed Rate pricing calculations automatically during job completion.",
    },
    {
      icon: Fuel,
      title: "Fuel & Expense Monitoring",
      tag: "COST CONTROL",
      desc: "Track diesel refill logs, fuel economy per worked hour, parts replacement, driver wages, and daily operational overheads.",
    },
    {
      icon: Wrench,
      title: "Maintenance Management",
      tag: "FLEET CARE",
      desc: "Schedule preventative oil changes, filter replacements, and track full maintenance service history to avoid breakdown losses.",
    },
    {
      icon: Gauge,
      title: "Owner & Manager Dashboards",
      tag: "ANALYTICS",
      desc: "Real-time income charts, machine utilization metrics, pending collections, and driver performance at a single glance.",
    },
    {
      icon: ShieldCheck,
      title: "Role-Based Access (RBAC)",
      tag: "SECURITY",
      desc: "Strict permission scoping for Owners, Managers, Dispatchers, Drivers, and Farmers with enterprise-grade data isolation.",
    },
  ];

  const useCases = [
    { title: "Custom Hiring Centres (CHCs)", desc: "Government-assisted or private CHCs managing multi-machinery fleets for regional farmers." },
    { title: "Tractor Fleet Owners", desc: "Entrepreneurs operating multiple tractors with rotavators, laser levellers, and cultivators." },
    { title: "Combine Harvester Operators", desc: "Seasonal harvesting contractors needing fast job logging and field payment collection." },
    { title: "Equipment Rental Businesses", desc: "Specialized agricultural implement hiring businesses requiring clear equipment tracking." },
    { title: "Multi-Machine Contractors", desc: "Large contractors managing fleets of JCBs, sprayers, paddy transplanters, and balers." },
    { title: "Cooperative Machinery Hubs", desc: "Farmer Producer Organizations (FPOs) and machinery cooperatives sharing equipment." },
  ];

  const equipmentList = [
    "Tractors (30HP - 90HP+)",
    "Rotavators & Cultivators",
    "Combine Harvesters (Paddy/Wheat)",
    "JCBs & Earthmovers",
    "Boom Sprayers & Drones",
    "Paddy Transplanters",
    "Laser Land Levellers",
    "Straw Balers & Reapers",
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      <SaasHeader />

      {/* HERO SECTION */}
      <section className="bg-white border-b border-slate-200 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto space-y-5">
            
            {/* Eyebrow Label */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#047857] text-xs font-semibold uppercase tracking-wider">
              <Tractor className="w-3.5 h-3.5" />
              <span>Commercial Agricultural Business OS</span>
            </div>

            {/* Controlled Heading */}
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              Business Operating System for{" "}
              <span className="text-[#047857]">
                Agricultural Machinery & Custom Hiring
              </span>
            </h1>

            {/* Supporting Paragraph */}
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Empowering tractor owners, Custom Hiring Centres (CHCs), equipment operators, and agricultural contractors to digitize bookings, dispatch drivers, track fuel, issue GST invoices, and collect farmer payments.
            </p>

            {/* Controlled Button Pair */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/saas/register"
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#047857] hover:bg-[#035436] text-white font-semibold text-sm shadow-xs transition-colors inline-flex items-center justify-center gap-2"
              >
                <span>Start Using ShabooAgri</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/saas/features"
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2"
              >
                <span>Explore Features</span>
              </Link>
              <Link
                to="/saas/pricing"
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[#047857] hover:bg-emerald-100/60 font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2"
              >
                <span>View Pricing (₹4,999/yr)</span>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#047857]" />
                <span>Annual Plan ₹4,999 / year (Incl 18% GST)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#047857]" />
                <span>Multi-Tenant Business Isolation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#047857]" />
                <span>GST Tax Compliant Invoicing</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* AGRICULTURAL PROBLEM SECTION */}
      <section className="py-12 lg:py-16 bg-[#F8FAFC] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Real Field Challenges</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              The High Cost of Unmanaged Field Operations
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Without dedicated software built for agricultural machinery, service providers face severe financial and operational leaks every season.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {problems.map((prob, idx) => (
              <div
                key={idx}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mb-3">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1.5">{prob.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{prob.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* WHAT SHABOOAGRI PROVIDES */}
      <section className="py-12 lg:py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[#047857] text-xs font-semibold uppercase tracking-wider">
              <Tractor className="w-3.5 h-3.5" />
              <span>Complete Business Suite</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Designed Exclusively for Agricultural Machinery Operations
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Explore every module engineered into ShabooAgri to streamline bookings, dispatch drivers, control fuel costs, issue GST invoices, and track profitability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat, idx) => {
              const IconComp = feat.icon;
              return (
                <div
                  key={idx}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 text-[#047857] flex items-center justify-center">
                        <IconComp className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        {feat.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1.5">{feat.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{feat.desc}</p>
                  </div>
                  <div className="pt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-xs font-medium text-[#047857]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#047857] shrink-0" />
                    <span>Included in ₹4,999/yr License</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* AGRICULTURAL USE CASES */}
      <section className="py-12 lg:py-16 bg-[#F8FAFC] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 text-sky-600" />
              <span>Industry Solutions</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Built for Every Agri Machinery Enterprise
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Whether you manage a single tractor with implements or a fleet of 20+ harvesters across districts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {useCases.map((uc, idx) => (
              <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-7 h-7 rounded-md bg-sky-50 text-sky-700 font-bold text-xs flex items-center justify-center border border-sky-200">
                    0{idx + 1}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{uc.title}</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* EQUIPMENT COVERAGE */}
      <section className="py-10 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-[#F8FAFC] p-6 sm:p-8 rounded-xl border border-slate-200 space-y-4">
            <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
              Comprehensive Support for All Farm Equipment & Workflows
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
              Seamlessly record jobs, track hours, and invoice work across all types of agricultural machinery and specialized attachments.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {equipmentList.map((eq, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-md bg-white border border-slate-200 text-[#047857] font-medium text-xs shadow-2xs"
                >
                  🌾 {eq}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section className="py-12 lg:py-16 bg-[#F8FAFC] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-2xl mx-auto text-center mb-10 space-y-2">
            <h2 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Transparent Commercial SaaS Plan
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">One simple annual plan. No per-machine surcharges, no hidden fees, and full GST compliance included.</p>
          </div>

          {/* Pricing Card (Clean & Non-Overlapping) */}
          <div className="max-w-lg mx-auto bg-white p-6 sm:p-8 rounded-xl border-2 border-[#047857] shadow-sm relative space-y-6">
            
            {/* Plan Header */}
            <div className="text-center space-y-2 border-b border-slate-100 pb-6">
              <span className="inline-block px-3 py-1 rounded-md bg-emerald-50 text-[#047857] border border-emerald-200 text-xs font-bold uppercase tracking-wider mb-2">
                FULL COMMERCIAL BUSINESS LICENSE
              </span>
              <h3 className="text-xl font-bold text-slate-900">ShabooAgri Business OS</h3>
              <p className="text-xs text-slate-500">Full Commercial Control Plane & Software License</p>
              
              <div className="flex items-baseline justify-center gap-1.5 pt-2">
                <span className="text-3xl sm:text-4xl font-bold text-slate-900">₹4,999</span>
                <span className="text-slate-500 font-medium text-sm">/ year</span>
              </div>
              <p className="text-[11px] font-semibold text-[#047857] uppercase tracking-wider">
                INCLUDING 18% GST (Taxable ₹4,236.44 + ₹762.56 GST)
              </p>
            </div>

            {/* Features list */}
            <div className="space-y-2.5 text-xs sm:text-sm text-slate-700">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">INCLUDED CAPABILITIES:</p>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#047857] shrink-0" />
                <span>Unlimited Fleet & Machinery Catalog</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#047857] shrink-0" />
                <span>Unlimited Booking & Job Logging</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#047857] shrink-0" />
                <span>Farmer & Customer Ledgers</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#047857] shrink-0" />
                <span>4 Flexible Pricing Engines</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#047857] shrink-0" />
                <span>GST Tax Invoicing & Receipts</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#047857] shrink-0" />
                <span>Driver Compensation Calculations</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#047857] shrink-0" />
                <span>Fuel Consumption Loggers</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#047857] shrink-0" />
                <span>Preventative Maintenance Trackers</span>
              </div>
            </div>

            <Link
              to="/saas/register"
              className="w-full py-3 rounded-lg bg-[#047857] hover:bg-[#035436] text-white font-semibold text-center text-sm block shadow-xs transition-colors"
            >
              Register Your Business Now
            </Link>
          </div>

        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="py-12 bg-white text-center border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 space-y-4">
          <h2 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Modernize Your Agricultural Machinery Business Today
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm max-w-xl mx-auto">
            Join forward-thinking tractor owners, CHCs, and contractors running professional operations across India.
          </p>
          <div className="pt-1">
            <Link
              to="/saas/register"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#047857] hover:bg-[#035436] text-white font-semibold text-sm shadow-xs transition-colors"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <SaasFooter />
    </div>
  );
};
