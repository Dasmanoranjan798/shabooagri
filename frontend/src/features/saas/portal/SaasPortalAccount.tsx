import React from "react";
import { User, LogOut } from "lucide-react";
import { SaasPortalLayout } from "../components/SaasPortalLayout";
import { useSaasAuth } from "../../../context/SaasAuthContext";

export const SaasPortalAccount: React.FC = () => {
  const { saasUser, logoutSaas } = useSaasAuth();

  return (
    <SaasPortalLayout>
      <div className="space-y-6 max-w-3xl">
        
        <div>
          <h1 className="text-2xl font-black text-white">Commercial Account Settings</h1>
          <p className="text-xs text-slate-400">View user credentials and security status</p>
        </div>

        <div className="bg-slate-900/90 p-8 rounded-3xl border border-slate-800 space-y-6">
          
          <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{saasUser?.email}</h2>
              <p className="text-xs text-slate-400">
                User ID: <span className="font-mono text-slate-300">{saasUser?.id}</span>
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center text-sm">
              <span className="text-slate-400">Email Verification Status:</span>
              <span className="font-bold text-emerald-400">VERIFIED</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center text-sm">
              <span className="text-slate-400">Account Role:</span>
              <span className="font-bold text-white">
                {saasUser?.isPlatformAdmin ? "PLATFORM SUPER ADMIN" : "COMMERCIAL CUSTOMER OWNER"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center text-sm">
              <span className="text-slate-400">Account Created:</span>
              <span className="font-semibold text-slate-300">
                {saasUser?.createdAt ? new Date(saasUser.createdAt).toLocaleDateString() : "Active"}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={logoutSaas}
              className="px-6 py-3 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-800/60 text-rose-300 font-bold text-sm flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>LOGOUT COMMERCIAL SESSION</span>
            </button>
          </div>

        </div>

      </div>
    </SaasPortalLayout>
  );
};
