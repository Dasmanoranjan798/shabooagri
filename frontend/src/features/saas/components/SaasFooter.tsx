import React from "react";
import { Link } from "react-router-dom";
import { Tractor } from "lucide-react";

export const SaasFooter: React.FC = () => {
  return (
    <footer className="bg-[#0f172a] text-slate-400 border-t border-slate-800 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <Link to="/saas" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#15803d] flex items-center justify-center text-white shadow-xs">
                <Tractor className="w-4.5 h-4.5" />
              </div>
              <span className="text-lg font-extrabold text-white tracking-tight">ShabooAgri</span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Business OS for Agricultural Machinery & Custom Hiring
            </p>
          </div>

          {/* PLATFORM */}
          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3">PLATFORM</h3>
            <ul className="space-y-2 text-xs">
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
            <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3">COMPANY</h3>
            <ul className="space-y-2 text-xs">
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
            <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3">ACCOUNT</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/saas/login" className="hover:text-white transition-colors">Sign In</Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">Register Business</Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 mt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© 2026 ShabooAgri. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="hover:text-slate-200 cursor-pointer transition-colors">Terms</span>
            <span className="text-slate-600">•</span>
            <span className="hover:text-slate-200 cursor-pointer transition-colors">Privacy</span>
            <span className="text-slate-600">•</span>
            <span className="hover:text-slate-200 cursor-pointer transition-colors">GST Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
