import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "./login.css";
import { Tractor } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { defaultTheme } from "../../lib/theme";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";
import type { InviteVerifyResult } from "../../types/team";

export const AcceptInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { acceptInvite } = useAuth();

  const token = searchParams.get("token") || "";

  const [isValidating, setIsValidating] = useState(true);
  const [invite, setInvite] = useState<InviteVerifyResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMsg("This invite link is missing its token.");
      setIsValidating(false);
      return;
    }
    api
      .verifyInviteToken(token)
      .then((result) => setInvite(result))
      .catch((err: any) => setErrorMsg(err.message || "This invite link is invalid or has expired."))
      .finally(() => setIsValidating(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please verify your entry.");
      return;
    }

    setIsSubmitting(true);
    try {
      await acceptInvite(token, password);
      navigate("/");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to accept invite. The link may have expired.");
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
          <p className="sa-login-subtext">You've been invited to join a team</p>
        </div>

        {isValidating ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--color-text-secondary, #64748b)", fontSize: "0.85rem" }}>
            Validating invite link...
          </div>
        ) : !invite ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="sa-alert sa-alert-danger">{errorMsg}</div>
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary, #64748b)" }}>
              Ask whoever invited you to send a new invite link.
            </p>
            <Link to="/login" className="sa-btn sa-btn-secondary" style={{ textAlign: "center" }}>
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <p style={{ fontSize: "0.85rem", marginBottom: "16px", color: "var(--color-text-secondary, #64748b)" }}>
              <strong>{invite.inviterName}</strong> invited you to join <strong>{invite.companyName}</strong> as a{" "}
              <strong>{invite.roleName}</strong>. Set a password to activate your account.
            </p>

            <form onSubmit={handleSubmit} className="sa-login-form">
              {errorMsg && <div className="sa-alert sa-alert-danger">{errorMsg}</div>}

              <Input label="Your Name" type="text" value={invite.fullName} disabled />

              <Input
                label="Password"
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <Button type="submit" isLoading={isSubmitting} style={{ width: "100%", marginTop: "8px" }}>
                Activate Account
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
