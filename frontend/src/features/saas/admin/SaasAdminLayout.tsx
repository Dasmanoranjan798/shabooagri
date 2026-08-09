import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  KeyRound,
  CreditCard,
  Target,
  Inbox,
  MessageSquare,
  Tractor,
  LogOut,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { useSaasAuth } from "../../../context/SaasAuthContext";

export const SaasAdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { saasUser, logoutSaas } = useSaasAuth();

  const navItems = [
    { name: "Overview", path: "/saas/admin", icon: LayoutDashboard },
    { name: "Customers", path: "/saas/admin/customers", icon: Users },
    { name: "Licenses", path: "/saas/admin/licenses", icon: KeyRound },
    { name: "Payments", path: "/saas/admin/payments", icon: CreditCard },
    { name: "Sales Leads", path: "/saas/admin/leads", icon: Target },
    { name: "Contact Enquiries", path: "/saas/admin/enquiries", icon: Inbox },
    { name: "Customer Feedback", path: "/saas/admin/feedback", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      
      {/* ADMIN SIDEBAR */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0">
        
        {/* LOGO HEADER */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-black shadow-lg">
            <Tractor className="w-6 h-6" />
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-white block">ShabooAgri</span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Platform Admin
            </span>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="p-4 space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs transition-all ${
                  isActive
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </Link>
            );
          })}
        </nav>

        {/* FOOTER USER / LOGOUT */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <p className="text-slate-400 font-bold uppercase text-[10px]">Logged Admin</p>
            <p className="text-white truncate font-semibold">{saasUser?.email}</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/saas/portal"
              className="flex-1 text-center py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              Customer Portal
            </Link>
            <button
              onClick={logoutSaas}
              className="p-2 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">{children}</div>
      </main>

    </div>
  );
};
