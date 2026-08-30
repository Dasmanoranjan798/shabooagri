import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Tractor, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { defaultTheme } from "../../lib/theme";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import "./login.css";

type Step = "identify" | "verify" | "choosePin";

/**
 * Create / Forgot PIN wizard — the web counterpart of the Flutter
 * PinSetupScreen, one coherent flow against the same backend endpoints:
 *
 *   identify (email/phone) -> OTP is sent -> verify OTP (authenticates) ->
 *   enter + confirm the new PIN -> POST /auth/set-pin -> back to PIN login.
 *
 * Both "Create PIN" (first time) and "Forgot PIN" (?reset=1) use this exact
 * path — only the wording differs. It never asks for an old PIN and never
 * bypasses OTP: identity is proven by the OTP login before the PIN is set. The
 * raw PIN is only held transiently in the field; the server hashes and stores
 * it. On success we sign the transient OTP session back out and return to PIN
 * login, where the remembered identifier makes it PIN-only.
 */
export const PinSetupPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { requestOtp, verifyOtp, setPin, logout } = useAuth();

  const isReset = searchParams.get("reset") === "1";
  const [identifier, setIdentifier] = useState(searchParams.get("identifier") || "");
  const [otpCode, setOtpCode] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [pin, setPinValue] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [step, setStep] = useState<Step>("identify");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const title = isReset ? "Reset your PIN" : "Create a PIN";

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    if (!identifier.trim()) {
      setErrorMsg("Please enter your email or mobile number.");
      return;
    }
    setLoading(true);
    try {
      const res = await requestOtp(identifier.trim());
      if (res.devOtp) setDevOtp(res.devOtp);
      setStep("verify");
      setInfoMsg("If an account exists for that identifier, a verification code has been sent.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (otpCode.trim().length !== 6) {
      setErrorMsg("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      // Verifying the OTP logs the user in — that authenticated session is what
      // authorises the set-pin call on the next step. No old PIN is ever asked.
      await verifyOtp(identifier.trim(), otpCode.trim());
      setStep("choosePin");
      setInfoMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Incorrect or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!/^\d{4,6}$/.test(pin)) {
      setErrorMsg("PIN must be 4-6 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setErrorMsg("The two PINs do not match.");
      return;
    }
    setLoading(true);
    try {
      await setPin(pin);
      // Return to a clean PIN login: sign the transient OTP session out so the
      // user completes a real PIN login with the PIN they just set. The
      // remembered identifier survives logout, so login is PIN-only.
      logout();
      setDone(true);
      setInfoMsg("PIN saved. You can now sign in with your PIN.");
    } catch (err: any) {
      setErrorMsg(err.message || "Could not save your PIN. Please try again.");
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
          <p className="sa-login-subtext">{title}</p>
        </div>

        {done ? (
          <div style={{ textAlign: "center" }}>
            <div className="sa-alert sa-alert-success" style={{ marginBottom: 16 }}>
              <CheckCircle2 size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />
              {infoMsg}
            </div>
            <Button type="button" variant="primary" style={{ width: "100%" }} onClick={() => navigate("/login")}>
              Go to PIN Login
            </Button>
          </div>
        ) : (
          <>
            {errorMsg && <div className="sa-alert sa-alert-danger">{errorMsg}</div>}
            {infoMsg && <div className="sa-alert sa-alert-success" style={{ fontSize: "0.82rem" }}>{infoMsg}</div>}

            {step === "identify" && (
              <form onSubmit={handleSendCode} className="sa-login-form">
                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: 0, marginBottom: 4 }}>
                  We'll verify your identity with a one-time code before you {isReset ? "reset" : "set"} your PIN.
                </p>
                <Input
                  label="Email or Mobile Number"
                  type="text"
                  placeholder="e.g. owner@example.com or 9876543210"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoFocus
                />
                <Button type="submit" variant="primary" size="lg" isLoading={loading} style={{ width: "100%" }}>
                  Send Code
                </Button>
              </form>
            )}

            {step === "verify" && (
              <form onSubmit={handleVerify} className="sa-login-form">
                {devOtp && (
                  <div className="sa-alert sa-alert-info" style={{ fontSize: "0.8rem" }}>
                    Dev Mode OTP: <strong>{devOtp}</strong>
                  </div>
                )}
                <Input
                  label="6-Digit Verification Code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  autoFocus
                />
                <Button type="submit" variant="primary" size="lg" isLoading={loading} style={{ width: "100%" }}>
                  Verify
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep("identify"); setOtpCode(""); setInfoMsg(null); setDevOtp(null); }}
                  style={{ background: "none", border: "none", color: "var(--color-primary, #1B7A3E)", fontSize: "0.82rem", cursor: "pointer", textDecoration: "underline", padding: 0, marginTop: 8 }}
                >
                  Use a different email/phone
                </button>
              </form>
            )}

            {step === "choosePin" && (
              <form onSubmit={handleSavePin} className="sa-login-form">
                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: 0, marginBottom: 4 }}>
                  Choose a 4-6 digit PIN for quick sign-in on this device.
                </p>
                <Input
                  label={isReset ? "New PIN (4-6 digits)" : "PIN (4-6 digits)"}
                  type="password"
                  placeholder="••••"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
                  required
                  autoFocus
                />
                <Input
                  label="Confirm PIN"
                  type="password"
                  placeholder="••••"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  required
                />
                <Button type="submit" variant="primary" size="lg" isLoading={loading} style={{ width: "100%" }}>
                  Save PIN
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
