import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { defaultTheme } from "../../lib/theme";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [usePin, setUsePin] = useState<boolean>(false);
  const [pin, setPin] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Please enter your email or mobile number");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (usePin) {
        await login(identifier, undefined, pin);
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

        <form onSubmit={handleSubmit} className="sa-login-form">
          {error && <div className="sa-alert sa-alert-danger">{error}</div>}

          <Input
            label="Email or Mobile Number"
            type="text"
            placeholder="e.g. owner@example.com or 9876543210"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoFocus
          />

          {usePin ? (
            <Input
              label="4-Digit PIN"
              type="password"
              placeholder="••••"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
          ) : (
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}

          <div className="sa-login-toggle">
            <button
              type="button"
              className="sa-btn-text"
              onClick={() => {
                setUsePin(!usePin);
                setError(null);
              }}
            >
              {usePin ? "🔑 Switch to Password Login" : "🔢 Switch to Quick PIN Login"}
            </button>
          </div>

          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} style={{ width: "100%" }}>
            Log In
          </Button>
        </form>

        <div className="sa-login-footer">
          <span>{defaultTheme.brandSubtext}</span>
        </div>
      </div>
    </div>
  );
};
