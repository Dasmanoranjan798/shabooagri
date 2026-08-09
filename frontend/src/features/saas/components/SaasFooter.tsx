import React from "react";
import { Link } from "react-router-dom";
import { Tractor, Phone, Mail, MapPin, ShieldCheck, CheckCircle2, Circle } from "lucide-react";

export const SaasFooter: React.FC = () => {
  return (
    <footer className="bg-[#0F172A] text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Column 1: Brand & About */}
          <div className="lg:col-span-2 space-y-3.5">
            <Link to="/saas" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#047857] flex items-center justify-center text-white shadow-xs">
                <Tractor className="w-4.5 h-4.5" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">ShabooAgri</span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              ShabooAgri is the dedicated Business Operating System engineered for tractor fleet owners, Custom Hiring Centres (CHCs), equipment operators, and agricultural contractors across India.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-xs font-medium text-emerald-400">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> GST Compliant Billing
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Multi-Tenant Security
              </span>
            </div>
          </div>

          {/* Column 2: Navigation Links */}
          <div>
            <h3 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Platform</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/saas" className="hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/saas/features" className="hover:text-white transition-colors">All Features</Link>
              </li>
              <li>
                <Link to="/saas/solutions" className="hover:text-white transition-colors">Agricultural Solutions</Link>
              </li>
              <li>
                <Link to="/saas/pricing" className="hover:text-white transition-colors">Pricing & Plans</Link>
              </li>
              <li>
                <Link to="/saas/about" className="hover:text-white transition-colors">About Shaboo</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Customer Care & Portal */}
          <div>
            <h3 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Customer Support</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/saas/faq" className="hover:text-white transition-colors">Frequently Asked Questions</Link>
              </li>
              <li>
                <Link to="/saas/contact" className="hover:text-white transition-colors">Contact Support</Link>
              </li>
              <li>
                <Link to="/saas/login" className="hover:text-white transition-colors">Commercial Sign In</Link>
              </li>
              <li>
                <Link to="/saas/register" className="hover:text-white transition-colors">Register Business</Link>
              </li>
              <li>
                <Link to="/saas/portal" className="hover:text-white transition-colors">Customer Portal</Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact Details */}
          <div>
            <h3 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Commercial Contact</h3>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Bhubaneswar / Cuttack Agri-Tech Hub, Odisha, India</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>+91 94370 00000</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>support@shabooagri.com</span>
              </li>
              <li className="pt-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-[11px] text-slate-300">
                  <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400 animate-pulse" />
                  <span>Systems Operational</span>
                </div>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 mt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ShabooAgri Commercial OS. All rights reserved.</p>
          <div className="flex items-center gap-5 text-slate-400">
            <span className="hover:text-slate-200 cursor-pointer transition-colors">Terms of License</span>
            <span className="hover:text-slate-200 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-200 cursor-pointer transition-colors">GST Tax Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
