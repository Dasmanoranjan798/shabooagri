import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Tractor, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import "../saas.css";
import {
  confirmSaasPasswordReset,
  requestSaasPasswordReset,
  verifySaasPasswordResetToken,
} from "../../../lib/saasApi";

export const SaasResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isConfirmMode = Boolean(token && emailParam);
  const [isValidatingToken, setIsValidatingToken] = useState(isConfirmMode);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isConfirmMode) {
      const verifyToken = async () => {
        try {
          await verifySaasPasswordResetToken(emailParam, token);
          setIsTokenValid(true);
        } catch (err: any) {
          setIsTokenValid(false);
          setErrorMsg(err.message || "This password reset link is invalid or has expired.");
        } finally {
          setIsValidatingToken(false);
        }
      };
      verifyToken();
    }
  }, [isConfirmMode, emailParam, token]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setErrorMsg("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await requestSaasPasswordReset(email.trim());
      setSuccessMsg(res.message || "If an account with that email exists, a password reset link has been sent.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please verify your entry.");
      return;
    }

    setLoading(true);
    try {
      const res = await confirmSaasPasswordReset(emailParam, token, newPassword);
      setSuccessMsg(res.message || "Your password has been successfully reset!");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--saas-bg)] flex flex-col justify-between font-sans">
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

      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-[400px] bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
          {!isConfirmMode && (
            <>
              <div className="text-center space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Reset your password
                </h1>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter your registered business account email and we'll send you a secure reset link.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg ? (
                <div className="space-y-4 text-center">
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-[var(--saas-primary)] text-xs font-medium space-y-2">
                    <CheckCircle2 className="w-6 h-6 mx-auto text-[var(--saas-primary)]" />
                    <p>{successMsg}</p>
                  </div>
                  <Link
                    to="/saas/login"
                    className="block w-full py-2.5 rounded-lg border border-slate-300 text-slate-800 font-semibold text-xs hover:bg-slate-50 transition-colors"
                  >
                    Back to Sign In
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleRequestSubmit} className="space-y-4">
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

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 px-4 rounded-lg bg-[var(--saas-primary)] hover:bg-[var(--saas-primary-hover)] text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>SENDING LINK...</span>
                        </>
                      ) : (
                        <span>SEND RESET LINK</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              <div className="pt-4 border-t border-slate-100 text-center text-xs">
                <Link to="/saas/login" className="font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                  Back to Sign In
                </Link>
              </div>
            </>
          )}

          {isConfirmMode && (
            <>
              <div className="text-center space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Set new password
                </h1>
                <p className="text-xs text-slate-500">
                  Enter your new password for {emailParam}
                </p>
              </div>

              {isValidatingToken ? (
                <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--saas-primary)]" />
                  <span>Validating security reset link...</span>
                </div>
              ) : successMsg ? (
                <div className="space-y-4 text-center">
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-[var(--saas-primary)] text-xs font-medium space-y-2">
                    <CheckCircle2 className="w-6 h-6 mx-auto text-[var(--saas-primary)]" />
                    <p>{successMsg}</p>
                  </div>
                  <Link
                    to="/saas/login"
                    className="block w-full py-2.5 rounded-lg bg-[var(--saas-primary)] hover:bg-[var(--saas-primary-hover)] text-white font-bold text-xs text-center shadow-xs transition-colors"
                  >
                    PROCEED TO SIGN IN
                  </Link>
                </div>
              ) : !isTokenValid ? (
                <div className="space-y-4 text-center">
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{errorMsg}</span>
                  </div>
                  <Link
                    to="/saas/reset-password"
                    className="block w-full py-2.5 rounded-lg border border-slate-300 text-slate-800 font-semibold text-xs hover:bg-slate-50 transition-colors"
                  >
                    Request New Reset Link
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleConfirmSubmit} className="space-y-4">
                  {errorMsg && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      NEW PASSWORD
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        className="w-full pl-3.5 pr-10 h-11 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[var(--saas-primary)] focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      CONFIRM NEW PASSWORD
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-3.5 h-11 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[var(--saas-primary)] focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      required
                    />
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
                          <span>UPDATING PASSWORD...</span>
                        </>
                      ) : (
                        <span>UPDATE PASSWORD</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              <div className="pt-4 border-t border-slate-100 text-center text-xs">
                <Link to="/saas/login" className="font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-400">
        © 2026 ShabooAgri. All rights reserved.
      </footer>
    </div>
  );
};
