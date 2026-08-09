import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tractor, CheckCircle2, AlertTriangle } from "lucide-react";
import { defaultTheme } from "../../lib/theme";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";
import { getTenantSlugFromHost } from "../../lib/saasApi";

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [isValidatingToken, setIsValidatingToken] = useState<boolean>(true);
  const [isTokenValid, setIsTokenValid] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [returnedTenantSlug, setReturnedTenantSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !email) {
      setErrorMessage("Invalid or missing password reset link. Please request a new link.");
      setIsValidatingToken(false);
      setIsTokenValid(false);
      return;
    }

    const verifyToken = async () => {
      try {
        await api.verifyPasswordResetToken(email, token);
        setIsTokenValid(true);
      } catch (err: any) {
        setIsTokenValid(false);
        setErrorMessage(err.message || "This password reset link is invalid or has expired.");
      } finally {
        setIsValidatingToken(false);
      }
    };

    verifyToken();
  }, [token, email]);

  const handleGoToLogin = () => {
    const tenantParam = searchParams.get("tenant");
    const tenantSlug = returnedTenantSlug || tenantParam || getTenantSlugFromHost();

    if (tenantSlug) {
      const host = window.location.hostname;
      if (host === "shabooagri.com" || host === "www.shabooagri.com") {
        window.location.href = `https://${tenantSlug}.shabooagri.com/login`;
        return;
      }
      if (host === "localhost" || host === "127.0.0.1") {
        navigate(`/login?tenant=${encodeURIComponent(tenantSlug)}`);
        return;
      }
    }
    navigate("/login");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify your entry.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.confirmPasswordReset(email, token, newPassword);
      if (res.tenantSlug) {
        setReturnedTenantSlug(res.tenantSlug);
      }
      setSuccessMessage(res.message || "Password successfully reset!");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reset password. The link may have expired.");
    } finally {
      setIsSubmitting(false);
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
          <p className="sa-login-subtext">Reset Your Account Password</p>
        </div>

        {isValidatingToken ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--color-text-muted)" }}>
            Validating security token...
          </div>
        ) : successMessage ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div className="sa-alert sa-alert-success" style={{ marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <CheckCircle2 size={18} /> {successMessage}
            </div>
            <Button
              variant="primary"
              size="lg"
              style={{ width: "100%" }}
              onClick={handleGoToLogin}
            >
              Proceed to Login
            </Button>
          </div>
        ) : !isTokenValid ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div className="sa-alert sa-alert-danger" style={{ marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <AlertTriangle size={18} /> {errorMessage}
            </div>
            <Button
              variant="secondary"
              size="lg"
              style={{ width: "100%" }}
              onClick={handleGoToLogin}
            >
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="sa-login-form">
            {errorMessage && <div className="sa-alert sa-alert-danger">{errorMessage}</div>}

            <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "12px" }}>
              Setting new password for: <strong>{email}</strong>
            </div>

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
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              style={{ width: "100%", marginTop: "12px" }}
            >
              Update Password
            </Button>
          </form>
        )}

        <div className="sa-login-footer">
          <span>{defaultTheme.brandSubtext}</span>
        </div>
      </div>
    </div>
  );
};
