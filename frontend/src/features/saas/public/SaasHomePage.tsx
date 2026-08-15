import React from "react";
import { Link } from "react-router-dom";
import "../saas.css";
import {
  Tractor,
  CalendarCheck,
  Users,
  FileText,
  CreditCard,
  Fuel,
  CheckCircle2,
  ArrowRight,
  Check,
  LayoutGrid,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";
import { SaasHeader } from "../components/SaasHeader";
import { SaasFooter } from "../components/SaasFooter";

const capabilities = [
  {
    icon: Tractor,
    title: "Fleet & machinery",
    desc: "Catalog tractors, harvesters and implements with live operational status.",
  },
  {
    icon: CalendarCheck,
    title: "Bookings & jobs",
    desc: "Create bookings, assign operators, and track work from dispatch to completion.",
  },
  {
    icon: Users,
    title: "Customer ledgers",
    desc: "Farmer and customer profiles with job history and outstanding balances.",
  },
  {
    icon: FileText,
    title: "GST invoicing",
    desc: "Auto-generated, sequentially numbered tax invoices and receipts.",
  },
  {
    icon: CreditCard,
    title: "Payments & collections",
    desc: "Track partial payments, dues, and collections against every job.",
  },
  {
    icon: Fuel,
    title: "Fuel & maintenance",
    desc: "Log diesel refills and service schedules to catch leakage early.",
  },
];

const audiences = ["Tractor owners", "Custom Hiring Centres", "Agricultural contractors", "Equipment businesses"];

const process = [
  {
    step: "01",
    icon: LayoutGrid,
    title: "Organize",
    desc: "Bring machinery, customers and jobs into one system of record.",
  },
  {
    step: "02",
    icon: ClipboardList,
    title: "Operate",
    desc: "Run daily bookings, dispatch and payments without the paperwork.",
  },
  {
    step: "03",
    icon: ShieldCheck,
    title: "Control",
    desc: "See exactly what's happening — and what it's earning — across the business.",
  },
];

export const SaasHomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      <SaasHeader />

      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 h-[480px] bg-[radial-gradient(ellipse_at_top,_var(--saas-primary-tint)_0%,_transparent_65%)] opacity-70"
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* Copy */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--saas-primary-tint)] border border-[var(--saas-primary-tint-border)] text-[var(--saas-primary)] text-xs font-semibold uppercase tracking-wider">
              <span>Commercial business OS</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold text-slate-900 tracking-tight leading-[1.08]">
              Run your machinery business like an enterprise
            </h1>

            <p className="text-slate-600 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">
              ShabooAgri gives tractor owners and Custom Hiring Centres one professional platform for machinery,
              bookings, jobs, customers and payments — in place of paper slips and spreadsheets.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
              <Link
                to="/register"
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[var(--saas-primary)] hover:bg-[var(--saas-primary-hover)] text-white font-semibold text-sm shadow-sm transition-colors inline-flex items-center justify-center gap-2"
              >
                <span>Get started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/features"
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2"
              >
                <span>View features</span>
              </Link>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[var(--saas-primary)]" />
                <span>GST-ready</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[var(--saas-primary)]" />
                <span>Secure by design</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[var(--saas-primary)]" />
                <span>Multi-tenant isolated</span>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="lg:col-span-6">
            <div className="relative mx-auto max-w-md lg:max-w-none saas-animate-float">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40 overflow-hidden">
                {/* window chrome */}
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span className="ml-3 text-[11px] font-medium text-slate-400">ShabooAgri &middot; Dashboard</span>
                </div>

                <div className="p-5 space-y-4">
                  {/* stat tiles */}
                  <div className="grid grid-cols-3 gap-3">
                    {["Active jobs", "Fleet status", "Collections"].map((label) => (
                      <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                        <div className="w-6 h-6 rounded-md bg-[var(--saas-primary-tint)]" />
                        <div className="h-2 w-3/4 rounded-full bg-slate-200" />
                        <span className="block text-[10px] font-semibold text-slate-500">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* bar chart */}
                  <div className="rounded-xl border border-slate-100 p-4">
                    <div className="flex items-end gap-2 h-20">
                      {[40, 65, 50, 80, 60, 95, 70].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-md bg-[var(--saas-primary)]"
                          style={{ height: `${h}%`, opacity: 0.35 + (i / 7) * 0.65 }}
                        />
                      ))}
                    </div>
                    <div className="mt-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Weekly job activity
                    </div>
                  </div>

                  {/* list rows */}
                  <div className="space-y-2">
                    {[1, 2, 3].map((row) => (
                      <div key={row} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
                        <div className="w-7 h-7 rounded-md bg-[var(--saas-primary-tint)] flex items-center justify-center shrink-0">
                          <Tractor className="w-3.5 h-3.5 text-[var(--saas-primary)]" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2 w-2/3 rounded-full bg-slate-200" />
                          <div className="h-1.5 w-1/3 rounded-full bg-slate-100" />
                        </div>
                        <span className="text-[10px] font-semibold text-[var(--saas-primary)] bg-[var(--saas-primary-tint)] px-2 py-1 rounded-full">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* floating badge */}
              <div className="hidden sm:flex absolute -bottom-5 -left-5 items-center gap-2 bg-white border border-slate-200 shadow-lg rounded-xl px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-[var(--saas-primary)]" />
                <div className="leading-tight">
                  <div className="text-xs font-bold text-slate-900">GST invoice</div>
                  <div className="text-[10px] text-slate-500">Generated automatically</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* BUILT FOR STRIP */}
      <section className="py-8 border-b border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-x-8 gap-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">Built for</span>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
              {audiences.map((a) => (
                <span key={a} className="text-sm font-semibold text-slate-600">
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--saas-primary)]">Platform</span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Everything you need to run your machinery business
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white p-6 rounded-xl border border-slate-200 hover:border-[var(--saas-primary-tint-border)] hover:shadow-md transition-all space-y-3"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--saas-primary-tint)] text-[var(--saas-primary)] flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/features"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-sm transition-colors"
            >
              <span>View all features</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* PROCESS */}
      <section className="py-16 sm:py-24 bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">How it works</span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">One platform. Better control.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {process.map(({ step, icon: Icon, title, desc }, idx) => (
              <div key={step} className="relative pl-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 text-emerald-400 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-mono text-slate-500">{step}</span>
                </div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                {idx < process.length - 1 && (
                  <div className="hidden md:block absolute top-5 left-full w-8 h-px bg-slate-700 -translate-x-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="max-w-2xl mx-auto text-center mb-12 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--saas-primary)]">Pricing</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="text-sm text-slate-600">
              One complete business platform. One simple annual plan.
            </p>
          </div>

          <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">

            <div className="space-y-3 border-b border-slate-100 pb-6 text-center">
              <h3 className="text-xl font-bold text-slate-900">ShabooAgri Business OS</h3>

              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-extrabold text-slate-900">&#8377;4,999</span>
                <span className="text-slate-500 font-medium text-sm">/ year</span>
              </div>
              <p className="text-xs font-medium text-slate-500">Including 18% GST</p>

              <p className="text-sm text-slate-600 pt-2">
                Everything you need to manage your agricultural machinery business.
              </p>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              {[
                "Fleet & machinery",
                "Bookings & jobs",
                "Customers & ledgers",
                "GST invoicing",
                "Payments & collections",
                "Fuel & maintenance",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-[var(--saas-primary)] shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Link
                to="/register"
                className="w-full py-3 px-4 rounded-lg bg-[var(--saas-primary)] hover:bg-[var(--saas-primary-hover)] text-white font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <span>Get started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Ready to run your business better?
          </h2>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            Start managing your agricultural machinery business with ShabooAgri.
          </p>
          <div className="pt-2">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--saas-primary)] hover:bg-[var(--saas-primary-hover)] text-white font-semibold text-sm shadow-sm transition-colors"
            >
              <span>Get started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <SaasFooter />
    </div>
  );
};
