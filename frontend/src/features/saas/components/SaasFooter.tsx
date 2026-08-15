import React from "react";
import "../saas.css";
import { Link } from "react-router-dom";
import { Tractor } from "lucide-react";

export const SaasFooter: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

          {/* Brand Info */}
          <div className="space-y-3 md:col-span-4">
            <Link to="/saas" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--saas-primary)] flex items-center justify-center text-white">
                <Tractor className="w-4.5 h-4.5" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">ShabooAgri</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              The business operating system for agricultural machinery owners and Custom Hiring Centres.
            </p>
          </div>

          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* PLATFORM */}
            <div>
              <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3.5">Platform</h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/features" className="hover:text-white transition-colors">Features</Link>
                </li>
                <li>
                  <Link to="/solutions" className="hover:text-white transition-colors">Solutions</Link>
                </li>
                <li>
                  <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                </li>
              </ul>
            </div>

            {/* COMPANY */}
            <div>
              <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3.5">Company</h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/about" className="hover:text-white transition-colors">About</Link>
                </li>
                <li>
                  <Link to="/faq" className="hover:text-white transition-colors">FAQ</Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
                </li>
              </ul>
            </div>

            {/* ACCOUNT */}
            <div>
              <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3.5">Account</h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/saas/login" className="hover:text-white transition-colors">Sign in</Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-white transition-colors">Register business</Link>
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 mt-10 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>&copy; 2026 ShabooAgri. All rights reserved.</p>
          <div className="flex items-center gap-5 text-slate-400">
            <span className="hover:text-slate-200 cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-slate-200 cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-slate-200 cursor-pointer transition-colors">GST policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
