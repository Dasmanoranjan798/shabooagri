import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface FarmerPortalLayoutProps {
  children: React.ReactNode;
}

const PORTAL_NAV = [
  { key: "home", label: "Home", icon: "🏠", path: "/portal" },
  { key: "bookings", label: "Bookings", icon: "📅", path: "/portal/bookings" },
  { key: "invoices", label: "Invoices", icon: "💳", path: "/portal/invoices" },
  { key: "profile", label: "Profile", icon: "👤", path: "/portal/profile" },
];

export const FarmerPortalLayout: React.FC<FarmerPortalLayoutProps> = ({ children }) => {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path: string) =>
    path === "/portal" ? location.pathname === "/portal" : location.pathname.startsWith(path);

  return (
    <div className="sa-portal-shell">
      {/* Top bar */}
      <header className="sa-portal-header">
        <div className="sa-portal-header-brand">
          <span className="sa-portal-header-icon">🌾</span>
          <span className="sa-portal-header-title">My Farming Portal</span>
        </div>
        <button className="sa-portal-logout" onClick={handleLogout} aria-label="Logout">
          <span style={{ fontSize: "1.1rem" }}>⎋</span>
        </button>
      </header>

      {/* Main content */}
      <main className="sa-portal-main">{children}</main>

      {/* Bottom tab bar */}
      <nav className="sa-portal-bottom-nav" aria-label="Portal navigation">
        {PORTAL_NAV.map((item) => (
          <Link
            key={item.key}
            to={item.path}
            className={`sa-portal-tab-item ${isActive(item.path) ? "is-active" : ""}`}
            aria-current={isActive(item.path) ? "page" : undefined}
          >
            <span className="sa-portal-tab-icon">{item.icon}</span>
            <span className="sa-portal-tab-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};
