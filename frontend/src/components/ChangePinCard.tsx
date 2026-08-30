import React, { useState } from "react";
import { CheckCircle2, Info } from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";

/**
 * Authenticated "Quick-Login PIN" card — the counterpart to
 * ChangePasswordCard. The caller already has a live session, so setting or
 * changing the PIN needs no OTP and no old PIN: `AuthContext.setPin` posts
 * `POST /auth/set-pin` directly. The card shows the *authoritative* PIN state
 * (`user.hasPin` from the backend), never a guess from local storage, and it
 * updates live after a successful save. Available to every role, matching the
 * Flutter Settings "My Account & Security" tab.
 */
export const ChangePinCard: React.FC = () => {
  const { user, setPin } = useAuth();
  const hasPin = Boolean(user?.hasPin);

  const [pin, setPinValue] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!/^\d{4,6}$/.test(pin)) {
      setError("PIN must be 4-6 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("The two PINs do not match.");
      return;
    }

    setSaving(true);
    try {
      await setPin(pin);
      setSaved(true);
      setPinValue("");
      setConfirmPin("");
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save PIN");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="Quick-Login PIN"
      subtitle="A 4-6 digit PIN for fast sign-in on this device. It never replaces your password or OTP — it is an additional quick-login option."
    >
      <form onSubmit={handleSubmit} className="sa-form">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: "0.9rem" }}>
          {hasPin ? (
            <>
              <CheckCircle2 size={16} style={{ color: "#1B7A3E" }} />
              <span>A PIN is currently set on your account.</span>
            </>
          ) : (
            <>
              <Info size={16} style={{ color: "#607d8b" }} />
              <span>No PIN is set yet.</span>
            </>
          )}
        </div>

        {error && <div className="sa-form-error">{error}</div>}
        {saved && <div className="sa-form-success">PIN saved successfully.</div>}

        <div className="sa-form-row">
          <div className="sa-form-group" style={{ flex: 1 }}>
            <label className="sa-form-label">{hasPin ? "New PIN (4-6 digits) *" : "PIN (4-6 digits) *"}</label>
            <input
              type="password"
              className="sa-input"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              autoComplete="off"
              required
            />
          </div>
          <div className="sa-form-group" style={{ flex: 1 }}>
            <label className="sa-form-label">Confirm PIN *</label>
            <input
              type="password"
              className="sa-input"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              autoComplete="off"
              required
            />
          </div>
        </div>

        <div className="sa-form-actions">
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : hasPin ? "Change PIN" : "Set PIN"}
          </Button>
        </div>
      </form>
    </Card>
  );
};
