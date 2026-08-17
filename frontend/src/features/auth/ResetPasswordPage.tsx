import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Tractor, CheckCircle2 } from "lucide-react";
import { api } from "../../lib/api";
import { defaultTheme } from "../../lib/theme";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import "./login.css";

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

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
    if (!isConfirmMode) return;
    (async () => {
      try {
        await api.verifyPasswordResetToken(emailParam, token);
        setIsTokenValid(true);
      } catch (err: any) {
        setIsTokenValid(false);
        setErrorMsg(err.message || "This password reset link is invalid or has expired.");
      } finally {
        setIsValidatingToken(false);
      }
    })();
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
      const res = await api.requestPasswordReset(email.trim());
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
      const res = await api.confirmPasswordReset(emailParam, token, newPassword);
      setSuccessMsg(res.message || "Your password has been successfully reset!");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sa-login-container">
      <div className="sa-login-card">
        <div className="sa-login-header">
          <div className="sa-login-brand">
            <span className="sa-login-logo" style={{ display: "inline-flex", alignItems: "center" }}>
              <Tractor size={28} />
            </span>
            <h1>{defaultTheme.companyName}</h1>
          </div>
          <p className="sa-login-subtext">
            {isConfirmMode ? "Set a new password" : "Reset your password"}
          </p>
        </div>

        {/* REQUEST LINK MODE */}
        {!isConfirmMode && (
          <>
            {errorMsg && <div className="sa-alert sa-alert-danger">{errorMsg}</div>}

            {successMsg ? (
              <div style={{ textAlign: "center" }}>
                <div className="sa-alert sa-alert-success" style={{ marginBottom: 16 }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />
                  {successMsg}
                </div>
                <Link to="/login" style={{ textDecoration: "none" }}>
                  <Button type="button" variant="secondary" style={{ width: "100%" }}>
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="sa-login-form">
                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: 0, marginBottom: 4 }}>
                  Enter your registered email address and we'll send you a secure reset link.
                </p>
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                <Button type="submit" variant="primary" size="lg" isLoading={loading} style={{ width: "100%" }}>
                  Send Reset Link
                </Button>
              </form>
            )}
          </>
        )}

        {/* CONFIRM RESET MODE */}
        {isConfirmMode && (
          <>
            {isValidatingToken ? (
              <div style={{ padding: "32px 0" }}>
                <Spinner size="md" label="Validating reset link..." />
              </div>
            ) : successMsg ? (
              <div style={{ textAlign: "center" }}>
                <div className="sa-alert sa-alert-success" style={{ marginBottom: 16 }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />
                  {successMsg}
                </div>
                <Link to="/login" style={{ textDecoration: "none" }}>
                  <Button type="button" variant="primary" style={{ width: "100%" }}>
                    Proceed to Sign In
                  </Button>
                </Link>
              </div>
            ) : !isTokenValid ? (
              <div style={{ textAlign: "center" }}>
                <div className="sa-alert sa-alert-danger" style={{ marginBottom: 16 }}>
                  {errorMsg}
                </div>
                <Link to="/reset-password" style={{ textDecoration: "none" }}>
                  <Button type="button" variant="secondary" style={{ width: "100%" }}>
                    Request New Reset Link
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleConfirmSubmit} className="sa-login-form">
                {errorMsg && <div className="sa-alert sa-alert-danger">{errorMsg}</div>}
                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: 0, marginBottom: 4 }}>
                  Enter your new password for {emailParam}
                </p>
                <Input
                  label="New Password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <Button type="submit" variant="primary" size="lg" isLoading={loading} style={{ width: "100%" }}>
                  Update Password
                </Button>
              </form>
            )}
          </>
        )}

        <div className="sa-login-footer">
          <Link to="/login" style={{ color: "inherit", textDecoration: "none" }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
