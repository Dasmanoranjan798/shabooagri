import React from "react";
import { Link } from "react-router-dom";
import "../saas.css";
import {
  Tractor,
  CalendarCheck,
  CreditCard,
  Settings,
  Building2,
  CheckCircle2,
  ArrowRight,
  FileText,
  Activity,
  Check,
} from "lucide-react";
import { SaasHeader } from "../components/SaasHeader";
import { SaasFooter } from "../components/SaasFooter";

export const SaasHomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      <SaasHeader />

      {/* HERO SECTION */}
      <section className="bg-white border-b border-slate-200 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#15803d] text-xs font-semibold uppercase tracking-wider">
            <span>COMMERCIAL BUSINESS OS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Business OS for Agricultural Machinery
          </h1>

          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-normal">
            Manage your machinery, bookings, jobs, customers and payments from one professional platform.
          </p>

          <p className="text-slate-500 text-sm font-medium">
            Built for tractor owners, Custom Hiring Centres and agricultural equipment businesses.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/register"
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#15803d] hover:bg-[#166534] text-white font-semibold text-sm shadow-xs transition-colors inline-flex items-center justify-center gap-2"
            >
              <span>GET STARTED</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/features"
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2"
            >
              <span>VIEW FEATURES</span>
            </Link>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#15803d]" />
              <span>GST-ready</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#15803d]" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#15803d]" />
              <span>Multi-tenant</span>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION: WHAT SHABOOAGRI DOES */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Everything You Need to Run Your Machinery Business
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* CARD 1 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#15803d] flex items-center justify-center">
                <Tractor className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Machinery & Fleet</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Manage tractors, equipment and attachments.
              </p>
            </div>

            {/* CARD 2 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#15803d] flex items-center justify-center">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Bookings & Jobs</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Create bookings, assign operators and track work.
              </p>
            </div>

            {/* CARD 3 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#15803d] flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Customers & Payments</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Manage customers, pricing, invoices and collections.
              </p>
            </div>

            {/* CARD 4 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#15803d] flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Operations</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Track fuel, maintenance and equipment activity.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION: BUILT FOR */}
      <section className="py-16 sm:py-24 bg-white border-t border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Built for Agricultural Equipment Businesses
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-[#f8fafc] p-6 rounded-xl border border-slate-200 space-y-2">
              <h3 className="text-base font-bold text-slate-900">Tractor Owners</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Manage your fleet and hiring operations.
              </p>
            </div>

            <div className="bg-[#f8fafc] p-6 rounded-xl border border-slate-200 space-y-2">
              <h3 className="text-base font-bold text-slate-900">Custom Hiring Centres</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Organize bookings, machines and customers.
              </p>
            </div>

            <div className="bg-[#f8fafc] p-6 rounded-xl border border-slate-200 space-y-2">
              <h3 className="text-base font-bold text-slate-900">Agricultural Contractors</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Track jobs, operators and payments.
              </p>
            </div>

            <div className="bg-[#f8fafc] p-6 rounded-xl border border-slate-200 space-y-2">
              <h3 className="text-base font-bold text-slate-900">Equipment Businesses</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Manage day-to-day commercial operations.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION: KEY CAPABILITIES */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Core Business Capabilities
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#15803d] flex items-center justify-center shrink-0 mt-0.5">
                <Tractor className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Fleet & Machinery Management</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#15803d] flex items-center justify-center shrink-0 mt-0.5">
                <CalendarCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Booking & Job Management</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#15803d] flex items-center justify-center shrink-0 mt-0.5">
                <Building2 className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Customer & Farmer Management</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#15803d] flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">GST Invoicing</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#15803d] flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Payments & Collections</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#15803d] flex items-center justify-center shrink-0 mt-0.5">
                <Activity className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Fuel & Maintenance Tracking</h3>
              </div>
            </div>

          </div>

          <div className="text-center">
            <Link
              to="/features"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-sm transition-colors"
            >
              <span>VIEW ALL FEATURES</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* PRICING */}
      <section className="py-16 sm:py-24 bg-white border-t border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-2xl mx-auto text-center mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-sm text-slate-600">
              One complete business platform. One simple annual plan.
            </p>
          </div>

          <div className="max-w-md mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
            
            <div className="space-y-3 border-b border-slate-100 pb-6 text-center">
              <h3 className="text-xl font-bold text-slate-900">ShabooAgri Business OS</h3>
              
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-extrabold text-slate-900">₹4,999</span>
                <span className="text-slate-500 font-medium text-sm">/ year</span>
              </div>
              <p className="text-xs font-medium text-slate-500">Including 18% GST</p>

              <p className="text-sm text-slate-600 pt-2">
                Everything you need to manage your agricultural machinery business.
              </p>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              {[
                "Fleet & Machinery",
                "Bookings & Jobs",
                "Customers & Ledgers",
                "GST Invoicing",
                "Payments & Collections",
                "Fuel & Maintenance",
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-[#15803d] shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Link
                to="/register"
                className="w-full py-3 px-4 rounded-lg bg-[#15803d] hover:bg-[#166534] text-white font-semibold text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>GET STARTED</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION: WHY SHABOOAGRI */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              One Platform. Better Control.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
              <h3 className="text-lg font-bold text-slate-900">ORGANIZE</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Keep machinery, customers and jobs in one place.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
              <h3 className="text-lg font-bold text-slate-900">OPERATE</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Manage daily bookings, work and payments efficiently.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
              <h3 className="text-lg font-bold text-slate-900">CONTROL</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Know what is happening across your business.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 sm:py-20 bg-white border-t border-slate-200 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Ready to Run Your Business Better?
          </h2>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            Start managing your agricultural machinery business with ShabooAgri.
          </p>
          <div className="pt-2">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#15803d] hover:bg-[#166534] text-white font-semibold text-sm shadow-xs transition-colors"
            >
              <span>GET STARTED</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <SaasFooter />
    </div>
  );
};
