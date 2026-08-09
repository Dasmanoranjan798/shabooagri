import React, { useEffect, useState } from "react";
import { ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { SaasPortalLayout } from "../components/SaasPortalLayout";
import { getSaasMyLicenses } from "../../../lib/saasApi";
import type { SaasLicense } from "../../../types/saas";

export const SaasPortalLicense: React.FC = () => {
  const [licenses, setLicenses] = useState<SaasLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadLicense() {
      try {
        const data = await getSaasMyLicenses();
        setLicenses(data);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load license details.");
      } finally {
        setLoading(false);
      }
    }
    loadLicense();
  }, []);

  const activeLic = licenses.find((l) => l.status === "LICENSE_ACTIVE") || licenses[0];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "LICENSE_ACTIVE":
        return <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-bold uppercase">Active License</span>;
      case "REGISTERED":
        return <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold uppercase">Registered</span>;
      case "PAYMENT_PENDING":
        return <span className="px-3 py-1 rounded-full bg-amber-950 text-amber-400 border border-amber-800 text-xs font-bold uppercase">Payment Pending</span>;
      case "EXPIRING_SOON":
        return <span className="px-3 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-xs font-bold uppercase">Expiring Soon</span>;
      case "EXPIRED":
        return <span className="px-3 py-1 rounded-full bg-rose-950 text-rose-400 border border-rose-800 text-xs font-bold uppercase">Expired</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold uppercase">{status}</span>;
    }
  };

  return (
    <SaasPortalLayout>
      <div className="space-y-6">
        
        <div>
          <h1 className="text-2xl font-black text-white">Commercial Software License</h1>
          <p className="text-xs text-slate-400">View your ShabooAgri annual subscription status and license key details</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Fetching license records...</span>
          </div>
        ) : errorMsg ? (
          <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        ) : activeLic ? (
          <div className="bg-slate-900/90 p-8 rounded-3xl border border-slate-800 space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <p className="text-xs uppercase font-bold text-slate-400">License Number</p>
                <div className="text-3xl font-black text-white font-mono mt-1 tracking-wider">
                  {activeLic.licenseNumber}
                </div>
              </div>
              <div>{getStatusBadge(activeLic.status)}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="text-xs text-slate-400 font-bold uppercase">Start Date</p>
                <p className="text-base font-bold text-white">
                  {activeLic.startDate ? new Date(activeLic.startDate).toLocaleDateString() : "Pending Activation"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="text-xs text-slate-400 font-bold uppercase">Expiry Date</p>
                <p className="text-base font-bold text-emerald-400">
                  {activeLic.expiryDate ? new Date(activeLic.expiryDate).toLocaleDateString() : "Pending Activation"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="text-xs text-slate-400 font-bold uppercase">Renewal Count</p>
                <p className="text-base font-bold text-white">{activeLic.renewalCount} Renewal(s)</p>
              </div>
            </div>

            {activeLic.notes && (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                <span className="font-bold text-slate-200">License Notes: </span>
                {activeLic.notes}
              </div>
            )}

            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Standard annual subscription license includes full multi-tenant business software access, updates, and customer support.</span>
            </div>

          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400">
            No active license found for this account.
          </div>
        )}

      </div>
    </SaasPortalLayout>
  );
};
