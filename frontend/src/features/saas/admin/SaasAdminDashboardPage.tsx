import React, { useEffect, useState } from "react";
import {
  Users,
  Target,
  Inbox,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { SaasAdminLayout } from "./SaasAdminLayout";
import { getAdminDashboardMetrics } from "../../../lib/saasApi";

export const SaasAdminDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const data = await getAdminDashboardMetrics();
        setMetrics(data);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  return (
    <SaasAdminLayout>
      <div className="space-y-8">
        
        <div>
          <h1 className="text-3xl font-black text-white">Platform Owner Command Centre</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time commercial metrics, revenue ledgers, and license telemetry</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Calculating platform metrics...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Metric 1: Total Revenue */}
            <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-900 p-6 rounded-3xl border border-emerald-800/60 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
                <span>Total SaaS Revenue</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-white font-mono">
                ₹{metrics?.totalRevenue ? Number(metrics.totalRevenue).toLocaleString() : "0"}
              </div>
              <p className="text-[11px] text-emerald-400 font-semibold">Verified Annual Subscriptions</p>
            </div>

            {/* Metric 2: Registered Customers */}
            <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
                <span>Total Registered</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-white">{metrics?.totalUsers || 0}</div>
              <p className="text-[11px] text-slate-400">{metrics?.totalProfiles || 0} Business Profiles</p>
            </div>

            {/* Metric 3: Active Paid Licenses */}
            <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
                <span>Active Licenses</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-emerald-400">{metrics?.activeLicenses || 0}</div>
              <p className="text-[11px] text-slate-400">{metrics?.expiringLicenses || 0} Expiring Soon</p>
            </div>

            {/* Metric 4: Pending Payments */}
            <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
                <span>Pending Orders</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-black text-amber-400">{metrics?.pendingPayments || 0}</div>
              <p className="text-[11px] text-slate-400">Awaiting Gateway Callback</p>
            </div>

            {/* Metric 5: Sales Leads */}
            <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
                <span>Sales Leads</span>
                <Target className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-white">{metrics?.totalLeads || 0}</div>
              <p className="text-[11px] text-slate-400">Website & Trial Registrations</p>
            </div>

            {/* Metric 6: Unread Enquiries */}
            <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
                <span>Unread Enquiries</span>
                <Inbox className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-white">{metrics?.unreadEnquiries || 0}</div>
              <p className="text-[11px] text-slate-400">Inbox Action Required</p>
            </div>

            {/* Metric 7: Pending Feedback */}
            <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
                <span>Pending Feedback</span>
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-white">{metrics?.pendingFeedback || 0}</div>
              <p className="text-[11px] text-slate-400">Customer Feature Suggestions</p>
            </div>

            {/* Metric 8: Expired Licenses */}
            <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
                <span>Expired Licenses</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-3xl font-black text-rose-400">{metrics?.expiredLicenses || 0}</div>
              <p className="text-[11px] text-slate-400">Awaiting Renewal</p>
            </div>

          </div>
        )}

      </div>
    </SaasAdminLayout>
  );
};
