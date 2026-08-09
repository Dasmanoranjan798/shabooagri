import React, { useEffect, useState } from "react";
import { ExternalLink, Tractor, AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { SaasPortalLayout } from "../components/SaasPortalLayout";
import { getSsoLaunchToken, getSaasMyLicenses } from "../../../lib/saasApi";
import type { SaasLicense } from "../../../types/saas";

export const SaasPortalSoftwareAccess: React.FC = () => {
  const [licenses, setLicenses] = useState<SaasLicense[]>([]);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getSaasMyLicenses();
        setLicenses(data);
      } catch {
        // Ignore
      }
    }
    loadData();
  }, []);

  const activeLicense = licenses.find((l) => l.status === "LICENSE_ACTIVE") || licenses[0];
  const isLicenseActive = activeLicense?.status === "LICENSE_ACTIVE";

  const handleLaunchSoftware = async () => {
    setLaunching(true);
    try {
      const res = await getSsoLaunchToken();
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        window.location.href = `/sso-callback?token=${res.ssoToken}`;
      } else {
        window.location.href = res.softwareUrl;
      }
    } catch (err: any) {
      alert(`Launch error: ${err.message || "Could not generate SSO launch session"}`);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <SaasPortalLayout>
      <div className="space-y-6 max-w-4xl">
        
        <div>
          <h1 className="text-2xl font-black text-white">Software Access & Environment Provisioning</h1>
          <p className="text-xs text-slate-400">Launch your dedicated ShabooAgri agricultural operational application</p>
        </div>

        <div className="bg-slate-900/90 p-8 rounded-3xl border border-slate-800 space-y-6">
          
          <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black">
              <Tractor className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Dedicated Operational Application URL</h2>
              <p className="text-xs text-emerald-400 font-mono">
                {activeLicense?.companyId ? "Target: [tenant-slug].shabooagri.com" : "Pending Subscription Activation"}
              </p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
            <p>
              ShabooAgri provisions an isolated operational business application for every licensed Custom Hiring Centre or equipment fleet owner. Your operational software environment contains your private bookings, job dispatch logs, driver compensation settings, and GST invoice ledgers.
            </p>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h3 className="font-bold text-white text-base">Provisioning Pipeline Status</h3>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Commercial Account & License Verification</span>
                  </span>
                  <span className="font-bold text-emerald-400">PASSED</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Commercial Payment Record</span>
                  </span>
                  <span className="font-bold text-emerald-400">
                    {isLicenseActive ? "VERIFIED" : "PENDING SUBSCRIPTION"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900">
                  <span className="flex items-center gap-2">
                    {isLicenseActive ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-400" />
                    )}
                    <span>Subdomain Provisioning & Database Mapping</span>
                  </span>
                  <span className={`font-bold ${isLicenseActive ? "text-emerald-400" : "text-amber-400"}`}>
                    {isLicenseActive ? "PROVISIONED & ONLINE" : "READY FOR ACTIVATION"}
                  </span>
                </div>
              </div>
            </div>

            {!isLicenseActive && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/40 text-xs text-amber-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Note: Software access will become available immediately upon verified commercial payment activation.
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center gap-4">
            <button
              onClick={handleLaunchSoftware}
              disabled={launching || !isLicenseActive}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base shadow-xl flex items-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              {launching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>LAUNCHING SSO SESSION...</span>
                </>
              ) : (
                <>
                  <span>LAUNCH OPERATIONAL SOFTWARE</span>
                  <ExternalLink className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </SaasPortalLayout>
  );
};
