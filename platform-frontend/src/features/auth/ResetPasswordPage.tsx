import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Tractor, CheckCircle2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { AppHandoff } from "./AppHandoff";

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";
  // Operational (tenant) reset links carry &tenant=<slug>; platform-account
  // resets never do. For the operational case this page is only a handoff into
  // the Flutter app — it does NOT run the platform reset flow below.
  const tenant = searchParams.get("tenant") || "";

  const [email, setEmail] = useState(emailParam);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isConfirmMode = Boolean(token && emailParam);
  const [isValidatingToken, setIsValidatingToken] = useState(isConfirmMode);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // Skip the platform token-verify for operational (tenant) handoff links —
    // that token belongs to the operational backend, not the platform one.
    if (!isConfirmMode || tenant) return;
    (async () => {
      try {
        await api.verifyPasswordResetToken(emailParam, token);
        setIsTokenValid(true);
      } catch (err) {
        setIsTokenValid(false);
        setErrorMsg(err instanceof ApiError ? err.message : "This password reset link is invalid or has expired.");
      } finally {
        setIsValidatingToken(false);
      }
    })();
  }, [isConfirmMode, emailParam, token, tenant]);

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
      const res = await api.requestPasswordReset(email.trim());
      setSuccessMsg(res.message);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Failed to send reset link. Please try again.");
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
      const res = await api.confirmPasswordReset(emailParam, token, newPassword);
      setSuccessMsg(res.message);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  // Operational reset link → hand off to the Flutter app (token paste fallback).
  if (tenant) {
    return <AppHandoff kind="reset" token={token} email={emailParam} tenant={tenant} />;
  }

  return (
    <div className="pf-center-viewport">
      <div className="pf-card" style={{ width: "100%", maxWidth: 400, padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Tractor size={26} color="var(--color-primary)" />
          <h1 style={{ fontSize: "1.3rem", fontWeight: 700 }}>ShabooAgri</h1>
        </div>

        {!isConfirmMode && (
          <>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 6 }}>Reset your password</h2>
            {errorMsg && <div className="pf-alert pf-alert-danger">{errorMsg}</div>}
            {successMsg ? (
              <>
                <div className="pf-alert pf-alert-success" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={16} />
                  {successMsg}
                </div>
                <Link to="/login" className="pf-btn pf-btn-secondary" style={{ width: "100%", textDecoration: "none", display: "block", textAlign: "center", marginTop: 10 }}>
                  Back to Sign In
                </Link>
              </>
            ) : (
              <form onSubmit={handleRequestSubmit}>
                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: 0, marginBottom: 14 }}>
                  Enter your registered email address and we'll send you a secure reset link.
                </p>
                <div className="pf-field">
                  <label className="pf-label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    className="pf-input"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button type="submit" className="pf-btn pf-btn-primary" style={{ width: "100%" }} disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            )}
          </>
        )}

        {isConfirmMode && (
          <>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 6 }}>Set new password</h2>
            {isValidatingToken ? (
              <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Validating reset link...</p>
            ) : successMsg ? (
              <>
                <div className="pf-alert pf-alert-success" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={16} />
                  {successMsg}
                </div>
                <Link to="/login" className="pf-btn pf-btn-primary" style={{ width: "100%", textDecoration: "none", display: "block", textAlign: "center", marginTop: 10 }}>
                  Proceed to Sign In
                </Link>
              </>
            ) : !isTokenValid ? (
              <>
                <div className="pf-alert pf-alert-danger">{errorMsg}</div>
                <Link to="/reset-password" className="pf-btn pf-btn-secondary" style={{ width: "100%", textDecoration: "none", display: "block", textAlign: "center", marginTop: 10 }}>
                  Request New Reset Link
                </Link>
              </>
            ) : (
              <form onSubmit={handleConfirmSubmit}>
                {errorMsg && <div className="pf-alert pf-alert-danger">{errorMsg}</div>}
                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: 0, marginBottom: 14 }}>
                  Enter your new password for {emailParam}
                </p>
                <div className="pf-field">
                  <label className="pf-label" htmlFor="newPassword">New Password</label>
                  <input
                    id="newPassword"
                    type="password"
                    className="pf-input"
                    required
                    autoFocus
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="pf-field">
                  <label className="pf-label" htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="pf-input"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <button type="submit" className="pf-btn pf-btn-primary" style={{ width: "100%" }} disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </form>
            )}
          </>
        )}

        <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: 16, textAlign: "center" }}>
          <Link to="/login" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
};
