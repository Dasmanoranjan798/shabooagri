import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { usePlatformAuth } from "../../context/PlatformAuthContext";
import { api, ApiError } from "../../lib/api";
import { AuthLayout } from "./AuthLayout";

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

  if (isAuthenticated && user) {
    return (
      <AuthLayout title="Welcome back" subtitle={<>Signed in as <strong>{user.email}</strong>{user.businessName ? ` · ${user.businessName}` : ""}.</>}>
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
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Sign in to your account" subtitle="Welcome back — enter your details to continue.">
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
          <div style={{ textAlign: "right", marginTop: 8 }}>
            <Link to="/reset-password" style={{ fontSize: "var(--text-sm)", color: "var(--color-primary)", fontWeight: 600 }}>
              Forgot password?
            </Link>
          </div>
        </div>
        <button type="submit" className="pf-btn pf-btn-primary pf-btn-lg" style={{ width: "100%" }} disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign In"}
        </button>
      </form>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginTop: 20, textAlign: "center" }}>
        New here? <Link to="/register" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Register your business</Link>
      </p>
    </AuthLayout>
  );
};
