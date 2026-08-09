import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Tractor, Menu, X, ArrowRight, User, Sparkles } from "lucide-react";
import { useSaasAuth } from "../../../context/SaasAuthContext";

export const SaasHeader: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isSaasAuthenticated } = useSaasAuth();

  const navLinks = [
    { name: "Home", path: "/saas" },
    { name: "Features", path: "/saas/features" },
    { name: "Solutions", path: "/saas/solutions" },
    { name: "Pricing", path: "/saas/pricing" },
    { name: "About Shaboo", path: "/saas/about" },
    { name: "FAQ", path: "/saas/faq" },
    { name: "Contact Us", path: "/saas/contact" },
  ];

  const isActive = (path: string) => {
    const current = location.pathname;
    if (path === "/saas" || path === "/") {
      return current === "/saas" || current === "/saas/" || current === "/";
    }
    const cleanPath = path.replace("/saas", "");
    return current.startsWith(path) || (cleanPath !== "" && current.startsWith(cleanPath));
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0B1120]/90 backdrop-blur-xl border-b border-slate-800/80 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo */}
          <Link to="/saas" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-600/20 group-hover:scale-105 transition-transform duration-200">
              <Tractor className="w-5.5 h-5.5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  Shaboo<span className="text-emerald-400">Agri</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  ENTERPRISE OS
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Agricultural Machinery Business OS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-full border border-slate-800">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                    active
                      ? "bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Action Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {isSaasAuthenticated ? (
              <Link
                to="/saas/portal"
                className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all duration-200 shadow-md shadow-emerald-600/20 active:scale-95"
              >
                <User className="w-4 h-4" />
                <span>CUSTOMER PORTAL</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/saas/login"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/saas/register"
                  className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all duration-200 shadow-md shadow-emerald-600/20 active:scale-95"
                >
                  <span>START FREE</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 focus:outline-none transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0B1120]/95 border-b border-slate-800 px-4 pt-3 pb-6 space-y-3 shadow-2xl animate-fadeIn backdrop-blur-2xl">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold"
                      : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-2.5">
            {isSaasAuthenticated ? (
              <Link
                to="/saas/portal"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-center text-sm shadow-lg shadow-emerald-600/20"
              >
                CUSTOMER PORTAL
              </Link>
            ) : (
              <>
                <Link
                  to="/saas/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 rounded-xl border border-slate-700/80 text-white font-semibold text-center text-sm hover:bg-slate-800/50"
                >
                  Sign In
                </Link>
                <Link
                  to="/saas/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-center text-sm shadow-lg shadow-emerald-600/20"
                >
                  START USING SHABOOAGRI
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
