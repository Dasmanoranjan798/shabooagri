import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Tractor, Lock, Mail, ArrowRight, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { useSaasAuth } from "../../../context/SaasAuthContext";
import { SaasHeader } from "../components/SaasHeader";
import { SaasFooter } from "../components/SaasFooter";

export const SaasLoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { loginSaas } = useSaasAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      await loginSaas({ email: email.trim(), password });
      navigate("/saas/portal");
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      <SaasHeader />

      <main className="flex-1 flex items-center justify-center py-12 sm:py-20 px-4 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 relative z-10">
          
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 mx-auto flex items-center justify-center text-white shadow-lg shadow-emerald-950/50">
              <Tractor className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-extrabold uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3" />
                COMMERCIAL PORTAL ACCESS
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Commercial Sign In</h1>
              <p className="text-xs text-slate-400 mt-1">Access your ShabooAgri enterprise subscription portal</p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Commercial Email Address
              </label>
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                  <Mail className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-3 h-11 rounded-xl bg-slate-800/60 border border-slate-700/80 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 h-11 rounded-xl bg-slate-800/60 border border-slate-700/80 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    <span>AUTHENTICATING...</span>
                  </>
                ) : (
                  <>
                    <span>SIGN IN TO PORTAL</span>
                    <ArrowRight className="w-4.5 h-4.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400 space-y-2">
            <p>
              Don't have a commercial subscription yet?{" "}
              <Link to="/saas/register" className="font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
                Register Business (₹4,999/yr)
              </Link>
            </p>
          </div>

        </div>
      </main>

      <SaasFooter />
    </div>
  );
};
