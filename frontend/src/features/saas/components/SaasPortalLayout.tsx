import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Tractor,
  LayoutDashboard,
  KeyRound,
  CreditCard,
  Building,
  User,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { useSaasAuth } from "../../../context/SaasAuthContext";

export const SaasPortalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { saasUser, logoutSaas } = useSaasAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutSaas();
    navigate("/saas/login");
  };

  const portalNav = [
    { name: "Dashboard", path: "/saas/portal", icon: LayoutDashboard },
    { name: "License & Subscription", path: "/saas/portal/license", icon: KeyRound },
    { name: "Payment History", path: "/saas/portal/payments", icon: CreditCard },
    { name: "Business Profile", path: "/saas/portal/profile", icon: Building },
    { name: "Software Access", path: "/saas/portal/software", icon: ExternalLink },
    { name: "Feedback & Requests", path: "/saas/portal/feedback", icon: MessageSquare },
    { name: "Support & Contact", path: "/saas/portal/support", icon: HelpCircle },
    { name: "My Account", path: "/saas/portal/account", icon: User },
  ];

  const isActive = (path: string) => {
    if (path === "/saas/portal") {
      return location.pathname === "/saas/portal" || location.pathname === "/saas/portal/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#F7F8F6] text-[#0F172A] flex flex-col font-sans">
      
      {/* TOP PORTAL HEADER */}
      <header className="bg-white border-b border-[#DDE4DF] sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link to="/saas" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#0B4F26] flex items-center justify-center text-white shadow-xs">
                <Tractor className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-[#0F172A] tracking-tight">ShabooAgri</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#E6F4EA] text-[#0B4F26] border border-[#0B4F26]/20">
                Customer Portal
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden sm:block text-right">
              <p className="font-bold text-[#0F172A]">
                {saasUser?.customerProfile?.businessName || saasUser?.email || "Commercial Account"}
              </p>
              <p className="text-[#64748B] text-[11px]">{saasUser?.email}</p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-[#475569] transition-colors font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

        </div>
      </header>

      {/* PORTAL BODY WITH SIDEBAR */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-8">
        
        {/* SIDEBAR NAVIGATION */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#DDE4DF] p-4 transform transition-transform duration-200 lg:static lg:translate-x-0 lg:z-auto lg:border-r-0 lg:p-0 lg:w-64 shrink-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
              Commercial Portal Menu
            </div>
            {portalNav.map((item) => {
              const IconComp = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? "text-[#0B4F26] bg-[#E6F4EA] font-bold"
                      : "text-[#475569] hover:text-[#0B4F26] hover:bg-[#E6F4EA]/50"
                  }`}
                >
                  <IconComp className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 p-4 rounded-xl bg-[#F7F8F6] border border-[#DDE4DF] text-xs text-[#64748B] space-y-1.5">
            <div className="flex items-center gap-2 text-[#0B4F26] font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Isolated Control Plane</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Your commercial subscription and billing records are isolated on shabooagri.com.
            </p>
          </div>
        </aside>

        {/* MAIN PORTAL CONTENT AREA */}
        <main className="flex-1 min-w-0">{children}</main>

      </div>

    </div>
  );
};
