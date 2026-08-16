import React, { useState } from "react";
import "../saas.css";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Tractor, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useSaasAuth } from "../../../context/SaasAuthContext";

export const SaasLoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { loginSaas } = useSaasAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get("sessionExpired") === "1";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter both email address and password.");
      return;
    }

    setLoading(true);
    try {
      await loginSaas({ email: email.trim(), password });
      navigate("/portal");
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--saas-bg)] flex flex-col justify-between font-sans">
      
      {/* Top minimal brand header */}
      <header className="py-6 px-4 sm:px-8 max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link to="/saas" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--saas-primary)] flex items-center justify-center text-white shadow-xs">
            <Tractor className="w-4.5 h-4.5" />
          </div>
          <span className="text-xl font-extrabold text-slate-900 tracking-tight">
            Shaboo<span className="text-[var(--saas-primary)]">Agri</span>
          </span>
        </Link>
      </header>

      {/* Centered Auth Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-[400px] bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
          
          {/* Heading */}
          <div className="text-center space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Sign in to your business
            </h1>
            <p className="text-xs text-slate-500">
              Access your ShabooAgri Business OS.
            </p>
          </div>

          {sessionExpired && !errorMsg && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>Your session expired. Please sign in again.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3.5 h-11 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[var(--saas-primary)] focus:ring-2 focus:ring-emerald-500/20 transition-all"
                required
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  PASSWORD
                </label>
                <Link
                  to="/saas/reset-password"
                  className="text-xs font-semibold text-[var(--saas-primary)] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full pl-3.5 pr-10 h-11 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[var(--saas-primary)] focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 px-4 rounded-lg bg-[var(--saas-primary)] hover:bg-[var(--saas-primary-hover)] text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in&hellip;</span>
                  </>
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </div>
          </form>

          {/* Registration Link */}
          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600 space-y-1">
            <p>Don't have a business account?</p>
            <Link to="/register" className="font-bold text-[var(--saas-primary)] hover:underline block">
              Create Business Account
            </Link>
          </div>

        </div>
      </main>

      {/* Bottom subtle copyright */}
      <footer className="py-6 text-center text-xs text-slate-400">
        © 2026 ShabooAgri. All rights reserved.
      </footer>
    </div>
  );
};
