import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Tractor } from "lucide-react";
import "./login.css";
import { api } from "../../lib/api";
import { Spinner } from "../../components/ui/Spinner";
import { defaultTheme } from "../../lib/theme";

// Landing point for the platform-backend's provisioning redirect
// (https://<slug>.shabooagri.com/sso?token=<raw>). Exchanges the raw
// single-use token for a real session, then hands off to the normal
// app root — a full page reload so AuthContext re-initializes cleanly
// from the freshly-stored tokens rather than needing its own bespoke
// post-login state handling.
export const SsoExchangePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get("token") || "";

  useEffect(() => {
    if (!token) {
      setError("This link is missing its launch token.");
      return;
    }
    api
      .ssoExchange(token)
      .then(() => {
        window.location.href = "/";
      })
      .catch((err: any) => {
        setError(err.message || "This launch link is invalid or has expired.");
      });
  }, [token]);

  if (error) {
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
          </div>
          <div className="sa-alert sa-alert-danger">{error}</div>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary, #64748b)", marginTop: "12px" }}>
            Ask whoever set up your account to send a new link, or sign in directly below.
          </p>
          <Link to="/login" className="sa-btn sa-btn-secondary" style={{ textAlign: "center", display: "block", marginTop: "12px" }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="sa-center-viewport">
      <Spinner size="lg" label="Setting up your account..." />
    </div>
  );
};
