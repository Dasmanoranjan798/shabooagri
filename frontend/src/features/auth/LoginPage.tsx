import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { defaultTheme } from "../../lib/theme";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

type LoginMode = "password" | "pin" | "otp";

export const LoginPage: React.FC = () => {
  const { login, requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<LoginMode>("password");
  const [identifier, setIdentifier] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [pin, setPin] = useState<string>("");

  // OTP step
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Please enter your email or mobile number");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (mode === "pin") {
        await login(identifier, undefined, pin);
      } else if (mode === "otp") {
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
            <span className="sa-login-logo">🚜</span>
            <h1>{defaultTheme.companyName}</h1>
          </div>
          <p className="sa-login-subtext">Business OS for Equipment Services</p>
        </div>

        {/* Login mode selector */}
        <div className="sa-login-mode-selector" style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
          <button
            type="button"
            className={`sa-btn ${mode === "password" ? "sa-btn-primary" : "sa-btn-secondary"}`}
            style={{ flex: 1, fontSize: "0.8rem", padding: "6px" }}
            onClick={() => { setMode("password"); setError(null); setOtpSent(false); }}
          >
            🔑 Password
          </button>
          <button
            type="button"
            className={`sa-btn ${mode === "pin" ? "sa-btn-primary" : "sa-btn-secondary"}`}
            style={{ flex: 1, fontSize: "0.8rem", padding: "6px" }}
            onClick={() => { setMode("pin"); setError(null); setOtpSent(false); }}
          >
            🔢 Quick PIN
          </button>
          <button
            type="button"
            className={`sa-btn ${mode === "otp" ? "sa-btn-primary" : "sa-btn-secondary"}`}
            style={{ flex: 1, fontSize: "0.8rem", padding: "6px" }}
            onClick={() => { setMode("otp"); setError(null); setOtpSent(false); }}
          >
            📱 Mobile OTP
          </button>
        </div>

        <form onSubmit={handleSubmit} className="sa-login-form">
          {error && <div className="sa-alert sa-alert-danger">{error}</div>}

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

          {mode === "password" && (
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}

          {mode === "pin" && (
            <Input
              label="4-Digit PIN"
              type="password"
              placeholder="••••"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
          )}

          {mode === "otp" && (
            <>
              {otpSent ? (
                <>
                  {devOtp && (
                    <div className="sa-alert sa-alert-info" style={{ fontSize: "0.8rem" }}>
                      💡 Dev Mode OTP: <strong>{devOtp}</strong>
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

          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} style={{ width: "100%" }}>
            {mode === "otp" && !otpSent ? "Request OTP" : "Log In"}
          </Button>
        </form>

        <div className="sa-login-footer">
          <span>{defaultTheme.brandSubtext}</span>
        </div>
      </div>
    </div>
  );
};
