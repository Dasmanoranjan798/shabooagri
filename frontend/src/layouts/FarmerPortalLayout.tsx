import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./farmer-portal-layout.css";
import { Home, Calendar, CreditCard, User, Sprout, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getTerm } from "../lib/terminology";

interface FarmerPortalLayoutProps {
  children: React.ReactNode;
}

export const FarmerPortalLayout: React.FC<FarmerPortalLayoutProps> = ({ children }) => {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const PORTAL_NAV = [
    { key: "home", label: "Home", icon: <Home size={20} />, path: "/farmer" },
    { key: "bookings", label: getTerm("booking", true), icon: <Calendar size={20} />, path: "/farmer/bookings" },
    { key: "invoices", label: getTerm("invoice", true), icon: <CreditCard size={20} />, path: "/farmer/invoices" },
    { key: "profile", label: "Profile", icon: <User size={20} />, path: "/farmer/profile" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path: string) =>
    path === "/farmer" ? location.pathname === "/farmer" : location.pathname.startsWith(path);

  return (
    <div className="sa-portal-shell">
      {/* Top bar */}
      <header className="sa-portal-header">
        <div className="sa-portal-header-brand">
          <span className="sa-portal-header-icon" style={{ display: "inline-flex", alignItems: "center" }}>
            <Sprout size={22} />
          </span>
          <span className="sa-portal-header-title">My Farming Portal</span>
        </div>
        <button className="sa-portal-logout" onClick={handleLogout} aria-label="Logout" title="Logout">
          <LogOut size={18} />
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
            <span className="sa-portal-tab-icon" style={{ display: "inline-flex", alignItems: "center" }}>{item.icon}</span>
            <span className="sa-portal-tab-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

