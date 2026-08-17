import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Tractor } from "lucide-react";
import { usePlatformAuth } from "../../context/PlatformAuthContext";
import { api, ApiError } from "../../lib/api";

export const LoginPage: React.FC = () => {
  const { login, user, isAuthenticated } = usePlatformAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const next = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    if (isAuthenticated && next) {
      navigate(next, { replace: true });
    }
  }, [isAuthenticated, next, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      if (next) {
        navigate(next, { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToDashboard = async () => {
    setError(null);
    setIsLaunching(true);
    try {
      const result = await api.relaunch();
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not open your dashboard.");
      setIsLaunching(false);
    }
  };

  return (
    <div className="pf-center-viewport">
      <div className="pf-card" style={{ width: "100%", maxWidth: 400, padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Tractor size={26} color="var(--color-primary)" />
          <h1 style={{ fontSize: "1.3rem", fontWeight: 700 }}>ShabooAgri</h1>
        </div>

        {isAuthenticated && user ? (
          <>
            <p style={{ fontSize: "0.9rem", marginBottom: 16 }}>
              Signed in as <strong>{user.email}</strong>
              {user.businessName ? ` (${user.businessName})` : ""}.
            </p>
            {error && <div className="pf-alert pf-alert-danger">{error}</div>}
            {user.isPlatformAdmin && (
              <Link
                to="/admin"
                className="pf-btn pf-btn-primary"
                style={{ width: "100%", textDecoration: "none", display: "block", textAlign: "center", marginBottom: 10 }}
              >
                Admin Dashboard
              </Link>
            )}
            <button className="pf-btn pf-btn-secondary" style={{ width: "100%" }} onClick={handleGoToDashboard} disabled={isLaunching}>
              {isLaunching ? "Opening..." : "Go to my dashboard"}
            </button>
          </>
        ) : (
          <>
            {error && <div className="pf-alert pf-alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="pf-field">
                <label className="pf-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="pf-input"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="pf-field">
                <label className="pf-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="pf-input"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div style={{ textAlign: "right", marginTop: 6 }}>
                  <Link to="/reset-password" style={{ fontSize: "0.82rem", color: "var(--color-primary)", fontWeight: 600 }}>
                    Forgot password?
                  </Link>
                </div>
              </div>
              <button type="submit" className="pf-btn pf-btn-primary" style={{ width: "100%" }} disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>
            </form>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: 16, textAlign: "center" }}>
              New here? <Link to="/register" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Register your business</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};
