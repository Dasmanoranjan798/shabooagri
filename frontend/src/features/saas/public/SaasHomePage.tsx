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
  Sparkles,
  Zap,
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
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      <SaasHeader />

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-800/80 bg-gradient-to-b from-[#0B1120] via-[#0F172A] to-[#0B1120]">
        
        {/* Glow ambient lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute top-1/2 right-10 w-96 h-96 bg-teal-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-6 sm:space-y-8">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold uppercase tracking-wider shadow-sm">
              <Tractor className="w-4 h-4 text-emerald-400" />
              <span>Commercial Agricultural Business OS</span>
            </div>

            {/* Main Hero Heading */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight sm:leading-tight">
              Business Operating System for{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                Agricultural Machinery & Custom Hiring
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-sm sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
              Empowering tractor owners, Custom Hiring Centres (CHCs), equipment operators, and agricultural contractors to digitize bookings, dispatch drivers, track fuel, issue GST invoices, and collect farmer payments.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                to="/saas/register"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-sm shadow-xl shadow-emerald-950/50 transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-95"
              >
                <span>START USING SHABOOAGRI</span>
                <ArrowRight className="w-4.5 h-4.5" />
              </Link>
              <Link
                to="/saas/features"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <span>EXPLORE FEATURES</span>
              </Link>
              <Link
                to="/saas/pricing"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <span>VIEW PRICING</span>
              </Link>
            </div>

            {/* Key Trust Badges */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-semibold">
              <div className="flex items-center gap-2 bg-slate-900/60 px-3.5 py-1.5 rounded-full border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Annual Plan ₹4,999 / year (Incl 18% GST)</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/60 px-3.5 py-1.5 rounded-full border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Multi-Tenant Business Isolation</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/60 px-3.5 py-1.5 rounded-full border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>GST Tax Compliant Invoicing</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* AGRICULTURAL PROBLEM SECTION */}
      <section className="py-16 lg:py-24 bg-[#0B1120] border-b border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-extrabold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Real Field Challenges</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              The High Cost of Unmanaged Field Operations
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Without dedicated software built for agricultural machinery, service providers face severe financial and operational leaks every season.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {problems.map((prob, idx) => (
              <div
                key={idx}
                className="bg-slate-900/60 backdrop-blur-xl p-6 sm:p-7 rounded-3xl border border-slate-800 hover:border-amber-500/40 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-5 font-bold text-sm group-hover:scale-105 transition-transform">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">{prob.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{prob.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* WHAT SHABOOAGRI PROVIDES */}
      <section className="py-16 lg:py-24 bg-[#0F172A] border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold uppercase tracking-wider">
              <Tractor className="w-4 h-4" />
              <span>Complete Business Suite</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Designed Exclusively for Agricultural Machinery Operations
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Explore every module engineered into ShabooAgri to streamline bookings, dispatch drivers, control fuel costs, issue GST invoices, and track profitability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => {
              const IconComp = feat.icon;
              return (
                <div
                  key={idx}
                  className="bg-slate-900/70 backdrop-blur-xl p-6 sm:p-7 rounded-3xl border border-slate-800 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-950/40 transition-all duration-300 group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                        <IconComp className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                        {feat.tag}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">{feat.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">{feat.desc}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Included in ₹4,999/yr License</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* AGRICULTURAL USE CASES */}
      <section className="py-16 lg:py-24 bg-[#0B1120] border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-extrabold uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-sky-400" />
              <span>Industry Solutions</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Built for Every Agri Machinery Enterprise
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Whether you manage a single tractor with implements or a fleet of 20+ harvesters across districts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((uc, idx) => (
              <div key={idx} className="bg-slate-900/60 backdrop-blur-xl p-6 sm:p-7 rounded-3xl border border-slate-800 hover:border-sky-500/40 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center font-extrabold text-xs">
                    0{idx + 1}
                  </div>
                  <h3 className="text-base font-bold text-white">{uc.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* EQUIPMENT COVERAGE */}
      <section className="py-14 bg-[#0F172A] border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900/80 backdrop-blur-xl p-8 sm:p-12 rounded-3xl border border-slate-800 text-center space-y-6 shadow-2xl">
            <h2 className="text-xl sm:text-3xl font-black text-white">
              Comprehensive Support for All Farm Equipment & Workflows
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-xs sm:text-sm">
              Seamlessly record jobs, track hours, and invoice work across all types of agricultural machinery and specialized attachments.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {equipmentList.map((eq, idx) => (
                <span
                  key={idx}
                  className="px-4 py-2 rounded-xl bg-slate-800/90 border border-slate-700/80 text-emerald-400 font-semibold text-xs shadow-sm hover:border-emerald-500/40 transition-colors"
                >
                  🌾 {eq}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING CARD PREVIEW */}
      <section className="py-16 lg:py-24 bg-[#0B1120] border-b border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="max-w-3xl mx-auto text-center mb-12 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold uppercase tracking-wider">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>COMMERCIAL PRICING</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Transparent Commercial SaaS Plan
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">One simple annual plan. No per-machine surcharges, no hidden fees, and full GST compliance included.</p>
          </div>

          <div className="max-w-lg mx-auto bg-slate-900/90 backdrop-blur-2xl p-8 sm:p-10 rounded-3xl border-2 border-emerald-500 shadow-2xl shadow-emerald-950/50 relative flex flex-col">
            
            {/* Non-overlapping Top Badge */}
            <div className="self-center mb-6 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-emerald-600/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>RECOMMENDED ANNUAL LICENSE</span>
            </div>

            <div className="text-center space-y-3 mb-8">
              <h3 className="text-2xl font-black text-white">ShabooAgri Business OS</h3>
              <p className="text-xs text-slate-400">Full Commercial Control Plane & Software License</p>
              
              <div className="flex items-baseline justify-center gap-2 pt-2">
                <span className="text-4xl sm:text-5xl font-black text-white">₹4,999</span>
                <span className="text-slate-400 font-semibold text-sm">/ year</span>
              </div>
              
              <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold tracking-wider">
                INCLUDING 18% GST (Base ₹4,236.44 + ₹762.56 GST)
              </div>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm text-slate-300 mb-8 border-t border-slate-800 pt-6">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">INCLUDED CAPABILITIES:</p>
              <div className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Unlimited Fleet & Machinery Catalog</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Unlimited Booking & Job Logging</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Farmer & Customer Ledgers</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>4 Flexible Pricing Engines</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>GST Tax Invoicing & Receipts</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Driver Compensation Calculations</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Fuel Consumption Loggers</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Preventative Maintenance Trackers</span>
              </div>
            </div>

            <Link
              to="/saas/register"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-center text-sm block shadow-xl shadow-emerald-950/50 transition-all active:scale-[0.98]"
            >
              REGISTER YOUR BUSINESS NOW
            </Link>
          </div>

        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="py-20 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Modernize Your Agricultural Machinery Business Today
          </h2>
          <p className="text-emerald-100 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Join forward-thinking tractor owners, CHCs, and contractors running professional operations across India.
          </p>
          <div className="pt-2">
            <Link
              to="/saas/register"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-white text-emerald-950 hover:bg-slate-100 font-extrabold text-sm shadow-2xl transition-all active:scale-95"
            >
              <span>GET STARTED NOW</span>
              <ArrowRight className="w-4.5 h-4.5 text-emerald-800" />
            </Link>
          </div>
        </div>
      </section>

      <SaasFooter />
    </div>
  );
};
