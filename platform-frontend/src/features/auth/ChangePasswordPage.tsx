import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { usePlatformAuth } from "../../context/PlatformAuthContext";
import { api, ApiError } from "../../lib/api";

export const ChangePasswordPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, user } = usePlatformAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (authLoading) {
    return <div className="pf-center-viewport">Loading...</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login?next=/change-password" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      setSuccessMsg(res.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pf-center-viewport">
      <div className="pf-card" style={{ width: "100%", maxWidth: 400, padding: 32 }}>
        <h1 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: 4 }}>Change Password</h1>
        <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: 0, marginBottom: 16 }}>
          Signed in as <strong>{user?.email}</strong>
        </p>

        {errorMsg && <div className="pf-alert pf-alert-danger">{errorMsg}</div>}
        {successMsg && (
          <div className="pf-alert pf-alert-success" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={16} />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="pf-field">
            <label className="pf-label" htmlFor="currentPassword">Current Password</label>
            <input
              id="currentPassword"
              type="password"
              className="pf-input"
              required
              autoFocus
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="pf-field">
            <label className="pf-label" htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              className="pf-input"
              required
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

        <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: 16, textAlign: "center" }}>
          {user?.isPlatformAdmin ? (
            <Link to="/admin" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Back to Admin Dashboard</Link>
          ) : (
            <Link to="/login" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Back to Sign In</Link>
          )}
        </p>
      </div>
    </div>
  );
};
