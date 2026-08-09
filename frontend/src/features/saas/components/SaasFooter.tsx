import React from "react";
import { Link } from "react-router-dom";
import { Tractor, Phone, Mail, MapPin, ShieldCheck, CheckCircle2, Circle } from "lucide-react";

export const SaasFooter: React.FC = () => {
  return (
    <footer className="bg-[#0B1120] text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Column 1: Brand & About */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/saas" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40">
                <Tractor className="w-5.5 h-5.5 text-white" />
              </div>
              <span className="text-xl font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors">
                Shaboo<span className="text-emerald-400">Agri</span>
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              ShabooAgri is the dedicated Business Operating System engineered for agricultural machinery owners, tractor fleets, Custom Hiring Centres (CHCs), equipment operators, and rural service contractors across India.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1 text-xs font-semibold text-emerald-400">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> GST Compliant Billing
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" /> Multi-Tenant Isolation
              </span>
            </div>
          </div>

          {/* Column 2: Navigation Links */}
          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Platform</h3>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link to="/saas" className="hover:text-emerald-400 transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/saas/features" className="hover:text-emerald-400 transition-colors">All Features</Link>
              </li>
              <li>
                <Link to="/saas/solutions" className="hover:text-emerald-400 transition-colors">Agricultural Solutions</Link>
              </li>
              <li>
                <Link to="/saas/pricing" className="hover:text-emerald-400 transition-colors">Pricing & Plans</Link>
              </li>
              <li>
                <Link to="/saas/about" className="hover:text-emerald-400 transition-colors">About Shaboo</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Customer Care & Portal */}
          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Customer Care</h3>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link to="/saas/faq" className="hover:text-emerald-400 transition-colors">Frequently Asked Questions</Link>
              </li>
              <li>
                <Link to="/saas/contact" className="hover:text-emerald-400 transition-colors">Contact Support</Link>
              </li>
              <li>
                <Link to="/saas/login" className="hover:text-emerald-400 transition-colors">Commercial Sign In</Link>
              </li>
              <li>
                <Link to="/saas/register" className="hover:text-emerald-400 transition-colors">Register Account</Link>
              </li>
              <li>
                <Link to="/saas/portal" className="hover:text-emerald-400 transition-colors">Customer Portal</Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact Details */}
          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Commercial Office</h3>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Bhubaneswar / Cuttack Agri-Tech Hub, Odisha, India</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>+91 94370 00000 / Support</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>support@shabooagri.com</span>
              </li>
              <li className="pt-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                  <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400 animate-pulse" />
                  <span>Systems Operational</span>
                </div>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 mt-10 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ShabooAgri Commercial SaaS Operating System. All rights reserved.</p>
          <div className="flex items-center gap-6 text-slate-400">
            <span className="hover:text-slate-200 cursor-pointer transition-colors">Terms of License</span>
            <span className="hover:text-slate-200 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-200 cursor-pointer transition-colors">GST Tax Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
