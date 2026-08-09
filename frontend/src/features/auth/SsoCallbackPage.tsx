import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle2, Tractor } from "lucide-react";
import { exchangeSsoToken } from "../../lib/saasApi";
import { setStoredTokens } from "../../lib/api";

export const SsoCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    const ssoToken = searchParams.get("ssoToken") || searchParams.get("token");

    if (!ssoToken) {
      setErrorMsg("Missing SSO launch token in request.");
      return;
    }

    const token: string = ssoToken;

    async function performExchange() {
      try {
        const res = await exchangeSsoToken(token);

        if (res.tokens?.accessToken) {
          // Set operational application token
          setStoredTokens(res.tokens.accessToken, res.tokens.refreshToken);
          setCompanyName(res.company?.name || "Operational Environment");
          setSuccess(true);

          // Short delay then navigate into Operational App Root
          setTimeout(() => {
            window.location.href = "/";
          }, 1200);
        } else {
          setErrorMsg("Failed to obtain operational authorization tokens.");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Single Sign-On token exchange failed.");
      }
    }

    performExchange();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-2xl">
        
        <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
          <Tractor className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-xl font-black text-white">ShabooAgri Software Launcher</h1>
          <p className="text-xs text-slate-400 mt-1">Connecting to your dedicated operational business tenant</p>
        </div>

        {success ? (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-sm space-y-2">
            <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-400" />
            <p className="font-bold text-white">SSO Exchange Verified!</p>
            <p className="text-xs text-slate-300">Launching operational dashboard for <strong>{companyName}</strong>...</p>
          </div>
        ) : errorMsg ? (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-sm space-y-3">
            <AlertCircle className="w-6 h-6 mx-auto text-rose-400" />
            <p className="font-bold text-white">Single Sign-On Failed</p>
            <p className="text-xs text-rose-200">{errorMsg}</p>
            <button
              onClick={() => (window.location.href = "/saas/portal")}
              className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
            >
              Return to Customer Portal
            </button>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Authenticating Tenant Session...</p>
            <p className="text-[11px] text-slate-500">Validating single-use cryptographic SSO launch token</p>
          </div>
        )}

      </div>
    </div>
  );
};
