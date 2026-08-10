import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Tractor, Menu, X, ArrowRight, User } from "lucide-react";
import { useSaasAuth } from "../../../context/SaasAuthContext";

export const SaasHeader: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isSaasAuthenticated } = useSaasAuth();

  const platformLinks = [
    { name: "Home", path: "/saas" },
    { name: "Features", path: "/features" },
    { name: "Solutions", path: "/solutions" },
    { name: "Pricing", path: "/pricing" },
  ];

  const companyLinks = [
    { name: "About", path: "/about" },
    { name: "FAQ", path: "/faq" },
    { name: "Contact", path: "/contact" },
  ];

  const allNavLinks = [...platformLinks, ...companyLinks];

  const isActive = (path: string) => {
    const current = location.pathname;
    if (path === "/saas" || path === "/") {
      return current === "/saas" || current === "/saas/" || current === "/";
    }
    return current === path || current === `/saas${path}`;
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 text-slate-900 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          
          {/* Logo */}
          <Link to="/saas" className="flex items-center gap-2.5 focus:outline-none">
            <div className="w-9 h-9 rounded-lg bg-[#15803d] flex items-center justify-center text-white shadow-xs">
              <Tractor className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              Shaboo<span className="text-[#15803d]">Agri</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {allNavLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-emerald-50 text-[#15803d] font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isSaasAuthenticated ? (
              <Link
                to="/portal"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#15803d] hover:bg-[#166534] text-white text-sm font-semibold shadow-xs transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Customer Portal</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/saas/login"
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#15803d] hover:bg-[#166534] text-white text-sm font-semibold shadow-xs transition-colors"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-4 shadow-lg">
          
          {/* Platform Group */}
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-2">
              Platform
            </span>
            <div className="flex flex-col space-y-1">
              {platformLinks.map((link) => {
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? "bg-emerald-50 text-[#15803d] font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Company Group */}
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-2">
              Company
            </span>
            <div className="flex flex-col space-y-1">
              {companyLinks.map((link) => {
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? "bg-emerald-50 text-[#15803d] font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex flex-col gap-2.5">
            {isSaasAuthenticated ? (
              <Link
                to="/portal"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-lg bg-[#15803d] text-white font-semibold text-center text-sm shadow-xs"
              >
                Customer Portal
              </Link>
            ) : (
              <>
                <Link
                  to="/saas/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-lg border border-slate-300 text-slate-800 font-semibold text-center text-sm hover:bg-slate-50 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-lg bg-[#15803d] text-white font-semibold text-center text-sm shadow-xs transition-colors"
                >
                  Register Business
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
