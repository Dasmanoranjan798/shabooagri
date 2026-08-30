import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./login.css";
import { Tractor, Key, Hash, Smartphone } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { defaultTheme } from "../../lib/theme";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { api, getStoredPinIdentifier } from "../../lib/api";

type LoginMode = "password" | "pin" | "otp";

export const LoginPage: React.FC = () => {
  const { login, requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<LoginMode>("password");
  const [identifier, setIdentifier] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  // Identifier of the last user to sign in on this device, so PIN mode is
  // PIN-only. Null when nobody has set up a PIN here yet, in which case PIN mode
  // shows a Create-PIN prompt instead of a login form. This is a form
  // convenience only — the authoritative PIN state lives on the backend, which
  // rejects a wrong/absent PIN regardless of what the client shows.
  const pinIdentifier = getStoredPinIdentifier();

  // OTP step
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Forgot Password state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>("");
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);
  const [isResetLoading, setIsResetLoading] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async () => {
    if (!identifier.trim()) {
      setError("Please enter your email or mobile number");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await requestOtp(identifier);
      setOtpSent(true);
      if (res.devOtp) setDevOtp(res.devOtp);
    } catch (err: any) {
      setError(err.message || "Failed to request OTP code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetErrorMessage("Please enter your registered email address");
      return;
    }

    setIsResetLoading(true);
    setResetErrorMessage(null);
    setResetSuccessMessage(null);

    try {
      const res = await api.requestPasswordReset(resetEmail.trim());
      setResetSuccessMessage(res.message);
    } catch (err: any) {
      setResetErrorMessage(err.message || "Failed to send reset link. Please try again.");
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // PIN mode is PIN-only, keyed off the remembered identifier. When none is
    // stored, PIN mode renders the Create-PIN prompt instead of this form, so
    // this branch only runs with a valid remembered identifier.
    if (mode === "pin") {
      if (!pinIdentifier) return;
      if (pin.trim().length < 4) {
        setError("Enter your 4-6 digit PIN.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        await login(pinIdentifier, undefined, pin);
        navigate("/");
      } catch (err: any) {
        setError(err.message || "Incorrect PIN. Please try again.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!identifier.trim()) {
      setError("Please enter your email or mobile number");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (mode === "otp") {
        if (!otpSent) {
          await handleRequestOtp();
          return;
        }
        await verifyOtp(identifier, otpCode);
      } else {
        await login(identifier, password);
      }
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
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
          <p className="sa-login-subtext">Business OS for Equipment Services</p>
        </div>

        {/* Login mode selector */}
        <div className="sa-login-mode-selector" style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
          <button
            type="button"
            className={`sa-btn ${mode === "password" ? "sa-btn-primary" : "sa-btn-secondary"}`}
            style={{ flex: 1, fontSize: "0.8rem", padding: "6px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
            onClick={() => { setMode("password"); setError(null); setOtpSent(false); }}
          >
            <Key size={14} /> Password
          </button>
          <button
            type="button"
            className={`sa-btn ${mode === "pin" ? "sa-btn-primary" : "sa-btn-secondary"}`}
            style={{ flex: 1, fontSize: "0.8rem", padding: "6px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
            onClick={() => { setMode("pin"); setError(null); setOtpSent(false); }}
          >
            <Hash size={14} /> Quick PIN
          </button>
          <button
            type="button"
            className={`sa-btn ${mode === "otp" ? "sa-btn-primary" : "sa-btn-secondary"}`}
            style={{ flex: 1, fontSize: "0.8rem", padding: "6px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
            onClick={() => { setMode("otp"); setError(null); setOtpSent(false); }}
          >
            <Smartphone size={14} /> Mobile OTP
          </button>
        </div>

        <form onSubmit={handleSubmit} className="sa-login-form">
          {error && <div className="sa-alert sa-alert-danger">{error}</div>}

          {/* The identifier field is hidden in PIN mode: PIN login is
              PIN-only, keyed off the remembered identifier shown below. */}
          {mode !== "pin" && (
            <Input
              label="Email or Mobile Number"
              type="text"
              placeholder="e.g. owner@example.com or 9876543210"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              disabled={otpSent}
              autoFocus
            />
          )}

          {mode === "password" && (
            <div>
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div style={{ textAlign: "right", marginTop: "4px", marginBottom: "12px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(identifier.includes("@") ? identifier : "");
                    setResetSuccessMessage(null);
                    setResetErrorMessage(null);
                    setIsForgotModalOpen(true);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-primary, #1B7A3E)",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                >
                  Forgot password?
                </button>
              </div>
            </div>
          )}

          {mode === "pin" && pinIdentifier && (
            <>
              <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: "0 0 10px" }}>
                Signing in as <strong>{pinIdentifier}</strong>
              </div>
              <Input
                label="PIN (4-6 digits)"
                type="password"
                placeholder="••••"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", marginBottom: "12px" }}>
                <Link
                  to="/pin-setup?reset=1"
                  style={{ color: "var(--color-primary, #1B7A3E)", fontSize: "0.82rem", textDecoration: "underline" }}
                >
                  Forgot PIN?
                </Link>
                <Link
                  to="/pin-setup"
                  style={{ color: "var(--color-primary, #1B7A3E)", fontSize: "0.82rem", textDecoration: "underline" }}
                >
                  Use a different account
                </Link>
              </div>
            </>
          )}

          {mode === "pin" && !pinIdentifier && (
            <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
              <Hash size={32} style={{ color: "var(--color-primary, #1B7A3E)" }} />
              <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: "8px 0 16px" }}>
                Set up a PIN for quick sign-in on this device. We'll verify your identity
                with a one-time code first.
              </p>
              <Link to="/pin-setup" style={{ textDecoration: "none" }}>
                <Button type="button" variant="primary" size="lg" style={{ width: "100%" }}>
                  Create PIN
                </Button>
              </Link>
            </div>
          )}

          {mode === "otp" && (
            <>
              {otpSent ? (
                <>
                  <div className="sa-alert sa-alert-success" style={{ fontSize: "0.82rem", marginBottom: "10px" }}>
                    {identifier.includes("@") ? `OTP code emailed to ${identifier}` : `SMS OTP code sent to +91 ${identifier}`}
                  </div>
                  {devOtp && (
                    <div className="sa-alert sa-alert-info" style={{ fontSize: "0.8rem" }}>
                      Dev Mode OTP: <strong>{devOtp}</strong>
                    </div>
                  )}
                  <Input
                    label="6-Digit OTP Code"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required
                    autoFocus
                  />
                </>
              ) : (
                <div style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", margin: "4px 0 12px" }}>
                  An OTP verification code will be sent to your mobile or email.
                </div>
              )}
            </>
          )}

          {!(mode === "pin" && !pinIdentifier) && (
            <Button type="submit" variant="primary" size="lg" isLoading={isLoading} style={{ width: "100%" }}>
              {mode === "otp" && !otpSent ? "Request OTP" : "Log In"}
            </Button>
          )}
        </form>

        <div className="sa-login-footer">
          <span>{defaultTheme.brandSubtext}</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "8px",
              maxWidth: "420px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
            }}
          >
            <h2 style={{ fontSize: "1.2rem", marginBottom: "8px", color: "var(--color-text, #111)" }}>
              Reset Password
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted, #666)", marginBottom: "16px" }}>
              Enter your registered email address below. We will send a secure link to reset your password.
            </p>

            {resetSuccessMessage ? (
              <div>
                <div className="sa-alert sa-alert-success" style={{ fontSize: "0.88rem", marginBottom: "16px" }}>
                  {resetSuccessMessage}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  style={{ width: "100%" }}
                  onClick={() => setIsForgotModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePasswordResetRequest}>
                {resetErrorMessage && (
                  <div className="sa-alert sa-alert-danger" style={{ fontSize: "0.85rem", marginBottom: "12px" }}>
                    {resetErrorMessage}
                  </div>
                )}

                <Input
                  label="Registered Email Address"
                  type="email"
                  placeholder="e.g. owner@shabooagri.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  autoFocus
                />

                <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsForgotModalOpen(false)}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" isLoading={isResetLoading} style={{ flex: 1 }}>
                    Send Reset Link
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

