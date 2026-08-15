import React, { useState } from "react";
import "../saas.css";
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
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/80 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[68px]">

          {/* Logo */}
          <Link to="/saas" className="flex items-center gap-2.5 focus:outline-none group">
            <div className="w-8 h-8 rounded-lg bg-[var(--saas-primary)] flex items-center justify-center text-white transition-transform group-hover:scale-105">
              <Tractor className="w-4.5 h-4.5" />
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">
              Shaboo<span className="text-[var(--saas-primary)]">Agri</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-0.5 lg:gap-1">
            {allNavLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "text-[var(--saas-primary)] font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            {isSaasAuthenticated ? (
              <Link
                to="/portal"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--saas-primary)] hover:bg-[var(--saas-primary-hover)] text-white text-sm font-semibold shadow-sm transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Customer portal</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/saas/login"
                  className="px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--saas-primary)] hover:bg-[var(--saas-primary-hover)] text-white text-sm font-semibold shadow-sm transition-colors"
                >
                  <span>Get started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
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
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
                        ? "bg-[var(--saas-primary-tint)] text-[var(--saas-primary)] font-semibold"
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
                        ? "bg-[var(--saas-primary-tint)] text-[var(--saas-primary)] font-semibold"
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
                className="w-full py-2.5 rounded-lg bg-[var(--saas-primary)] text-white font-semibold text-center text-sm shadow-sm"
              >
                Customer portal
              </Link>
            ) : (
              <>
                <Link
                  to="/saas/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-lg border border-slate-300 text-slate-800 font-semibold text-center text-sm hover:bg-slate-50 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-lg bg-[var(--saas-primary)] text-white font-semibold text-center text-sm shadow-sm transition-colors"
                >
                  Register business
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
