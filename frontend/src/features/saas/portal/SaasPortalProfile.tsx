import React, { useEffect, useState } from "react";
import { Building, Phone, Mail, MapPin, FileText, Loader2, AlertCircle } from "lucide-react";
import { SaasPortalLayout } from "../components/SaasPortalLayout";
import { getSaasCustomerProfile } from "../../../lib/saasApi";
import type { SaasCustomerProfile } from "../../../types/saas";

export const SaasPortalProfile: React.FC = () => {
  const [profile, setProfile] = useState<SaasCustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getSaasCustomerProfile();
        setProfile(data);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load business profile.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  return (
    <SaasPortalLayout>
      <div className="space-y-6">
        
        <div>
          <h1 className="text-2xl font-black text-white">Commercial Business Profile</h1>
          <p className="text-xs text-slate-400">View and verify your commercial entity details and GST tax information</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Loading business profile...</span>
          </div>
        ) : errorMsg ? (
          <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        ) : profile ? (
          <div className="bg-slate-900/90 p-8 rounded-3xl border border-slate-800 space-y-6">
            
            <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">{profile.businessName}</h2>
                <p className="text-xs text-slate-400">Contact Person: <strong className="text-slate-200">{profile.contactPerson}</strong></p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>Phone Number</span>
                </div>
                <p className="text-base font-bold text-white">{profile.phone}</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>Email Address</span>
                </div>
                <p className="text-base font-bold text-white">{profile.email}</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>State & Region</span>
                </div>
                <p className="text-base font-bold text-white">{profile.state || "Not Specified"}, {profile.city || ""}</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>GSTIN / Tax Identification</span>
                </div>
                <p className="text-base font-bold text-white font-mono">{profile.gstin || "N/A (Not Provided)"}</p>
              </div>

            </div>

          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400">
            No business profile details available.
          </div>
        )}

      </div>
    </SaasPortalLayout>
  );
};
