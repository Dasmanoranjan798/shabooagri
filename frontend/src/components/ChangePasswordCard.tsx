import React, { useState } from "react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { api, ApiError } from "../lib/api";

export const ChangePasswordCard: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      await api.changePassword(currentPassword.trim() || undefined, newPassword);
      setSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Change Password" subtitle="Update the password used to sign in to your account">
      <form onSubmit={handleSubmit} className="sa-form">
        {error && <div className="sa-form-error">{error}</div>}
        {saved && <div className="sa-form-success">Password changed successfully.</div>}

        <div className="sa-form-group">
          <label className="sa-form-label">Current Password</label>
          <input
            type="password"
            className="sa-input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Leave blank if you've never set a password"
            autoComplete="current-password"
          />
        </div>

        <div className="sa-form-row">
          <div className="sa-form-group" style={{ flex: 1 }}>
            <label className="sa-form-label">New Password *</label>
            <input
              type="password"
              className="sa-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
            />
          </div>
          <div className="sa-form-group" style={{ flex: 1 }}>
            <label className="sa-form-label">Confirm New Password *</label>
            <input
              type="password"
              className="sa-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        <div className="sa-form-actions">
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? "Updating…" : "Change Password"}
          </Button>
        </div>
      </form>
    </Card>
  );
};
