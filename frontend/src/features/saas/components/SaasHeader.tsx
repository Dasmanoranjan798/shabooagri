import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Tractor, Menu, X, ArrowRight, User } from "lucide-react";
import { useSaasAuth } from "../../../context/SaasAuthContext";

export const SaasHeader: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isSaasAuthenticated } = useSaasAuth();

  const mainLinks = [
    { name: "Home", path: "/saas" },
    { name: "Features", path: "/saas/features" },
    { name: "Solutions", path: "/saas/solutions" },
    { name: "Pricing", path: "/saas/pricing" },
  ];

  const companyLinks = [
    { name: "About Shaboo", path: "/saas/about" },
    { name: "FAQ", path: "/saas/faq" },
    { name: "Contact Us", path: "/saas/contact" },
  ];

  const allLinks = [...mainLinks, ...companyLinks];

  const isActive = (path: string) => {
    const current = location.pathname;
    if (path === "/saas" || path === "/") {
      return current === "/saas" || current === "/saas/" || current === "/";
    }
    const cleanPath = path.replace("/saas", "");
    return current.startsWith(path) || (cleanPath !== "" && current.startsWith(cleanPath));
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 text-slate-900 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Brand Logo */}
          <Link to="/saas" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#047857] flex items-center justify-center text-white shadow-xs">
              <Tractor className="w-4.5 h-4.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900 tracking-tight">
                Shaboo<span className="text-[#047857]">Agri</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-[#047857] border border-emerald-200">
                Commercial OS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {allLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    active
                      ? "bg-emerald-50 text-[#047857]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
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
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#047857] hover:bg-[#0369a1] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <User className="w-4 h-4" />
                <span>CUSTOMER PORTAL</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/saas/login"
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/saas/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#047857] hover:bg-[#0369a1] text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <span>Start Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>
      </div>

      {/* Mobile Commercial Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-4 shadow-lg animate-fadeIn">
          
          {/* Section 1: Main Platform Solutions */}
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-2">
              Platform Solutions
            </span>
            <div className="flex flex-col space-y-0.5">
              {mainLinks.map((link) => {
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? "bg-emerald-50 text-[#047857] font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Section 2: Company & Support */}
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-2">
              Company & Support
            </span>
            <div className="flex flex-col space-y-0.5">
              {companyLinks.map((link) => {
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? "bg-emerald-50 text-[#047857] font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* CTAs */}
          <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
            {isSaasAuthenticated ? (
              <Link
                to="/saas/portal"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-lg bg-[#047857] text-white font-semibold text-center text-sm shadow-xs"
              >
                CUSTOMER PORTAL
              </Link>
            ) : (
              <>
                <Link
                  to="/saas/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-lg border border-slate-300 text-slate-800 font-semibold text-center text-sm hover:bg-slate-50"
                >
                  Sign In
                </Link>
                <Link
                  to="/saas/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-lg bg-[#047857] text-white font-semibold text-center text-sm shadow-xs"
                >
                  Register Business Account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
