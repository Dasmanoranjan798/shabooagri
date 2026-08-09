import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Tractor, User, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface DriverLayoutProps {
  children: React.ReactNode;
}

const DRIVER_NAV = [
  { key: "home", label: "Home", icon: <Home size={20} />, path: "/driver" },
  { key: "jobs", label: "Jobs", icon: <Tractor size={20} />, path: "/driver/jobs" },
  { key: "profile", label: "Profile", icon: <User size={20} />, path: "/driver/profile" },
];

export const DriverLayout: React.FC<DriverLayoutProps> = ({ children }) => {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path: string) =>
    path === "/driver" ? location.pathname === "/driver" : location.pathname.startsWith(path);

  return (
    <div className="sa-driver-shell">
      {/* Top bar */}
      <header className="sa-driver-header">
        <div className="sa-driver-header-brand">
          <span className="sa-driver-header-icon" style={{ display: "inline-flex", alignItems: "center" }}>
            <Tractor size={22} />
          </span>
          <span className="sa-driver-header-title">ShabooAgri Driver</span>
        </div>
        <button className="sa-driver-logout" onClick={handleLogout} aria-label="Logout" title="Logout">
          <LogOut size={18} />
        </button>
      </header>

      {/* Main content */}
      <main className="sa-driver-main">{children}</main>

      {/* Bottom tab bar */}
      <nav className="sa-driver-bottom-nav" aria-label="Driver navigation">
        {DRIVER_NAV.map((item) => (
          <Link
            key={item.key}
            to={item.path}
            className={`sa-driver-tab-item ${isActive(item.path) ? "is-active" : ""}`}
            aria-current={isActive(item.path) ? "page" : undefined}
          >
            <span className="sa-driver-tab-icon" style={{ display: "inline-flex", alignItems: "center" }}>{item.icon}</span>
            <span className="sa-driver-tab-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

