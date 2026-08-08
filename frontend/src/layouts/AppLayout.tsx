import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getTerm } from "../lib/terminology";
import { defaultTheme } from "../lib/theme";
import { Badge } from "../components/ui/Badge";

interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: string;
  permission?: string;
}

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, roleKey, logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const customerTerm = getTerm("customer", true);
  const driverTerm = getTerm("driver", true);
  const machineTerm = getTerm("machine", true);
  const bookingTerm = getTerm("booking", true);

  const navItems: NavItem[] = [
    { key: "dashboard", label: "Dashboard", path: "/", icon: "📊", permission: "dashboard.view" },
    { key: "bookings", label: bookingTerm, path: "/bookings", icon: "📅", permission: "operations.view" },
    { key: "jobs", label: "Jobs", path: "/jobs", icon: "🚜", permission: "operations.view" },
    { key: "customers", label: customerTerm, path: "/customers", icon: "👥", permission: "operations.view" },
    { key: "machines", label: machineTerm, path: "/machines", icon: "🚜", permission: "operations.view" },
    { key: "drivers", label: driverTerm, path: "/drivers", icon: "👨‍🌾", permission: "operations.view" },
    { key: "employees", label: "Employees", path: "/employees", icon: "👔", permission: "operations.view" },
    { key: "payments", label: "Payments", path: "/payments", icon: "💳", permission: "payment.receive" },
    { key: "expenses", label: "Expenses", path: "/expenses", icon: "💸", permission: "operations.view" },
    { key: "fuel", label: "Fuel", path: "/fuel", icon: "⛽", permission: "operations.view" },
    { key: "maintenance", label: "Maintenance", path: "/maintenance", icon: "🔧", permission: "operations.view" },
    { key: "reports", label: "Reports", path: "/reports", icon: "📈", permission: "report.generate" },
    { key: "settings", label: "Settings", path: "/settings", icon: "⚙️", permission: "settings.manage" },
  ];

  // Filter items by caller permission / role
  const visibleNavItems = navItems.filter((item) => {
    if (!item.permission) return true;
    if (roleKey === "owner") return true;
    if (roleKey === "driver") {
      return ["dashboard", "jobs", "machines"].includes(item.key);
    }
    if (roleKey === "farmer") {
      return ["dashboard", "bookings", "payments"].includes(item.key);
    }
    return hasPermission(item.permission);
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const currentDateStr = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="sa-app-shell">
      {/* Desktop Sidebar */}
      <aside className="sa-sidebar">
        <div className="sa-sidebar-brand">
          <div className="sa-brand-logo">
            <span className="sa-brand-icon">🚜</span>
            <span className="sa-brand-title">{defaultTheme.companyName}</span>
          </div>
          <span className="sa-brand-subtext">{defaultTheme.brandSubtext}</span>
        </div>

        <nav className="sa-sidebar-nav">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`sa-nav-item ${isActive ? "is-active" : ""}`}
              >
                <span className="sa-nav-icon">{item.icon}</span>
                <span className="sa-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sa-sidebar-footer">
          <div className="sa-user-info">
            <div className="sa-avatar">{user?.fullName.slice(0, 1).toUpperCase()}</div>
            <div className="sa-user-details">
              <span className="sa-user-name">{user?.fullName}</span>
              <Badge variant="info" size="sm">
                {user?.role?.name || roleKey}
              </Badge>
            </div>
          </div>
          <button className="sa-btn-logout" onClick={handleLogout} title="Logout">
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="sa-main-wrapper">
        {/* Top Header Bar */}
        <header className="sa-topbar">
          <div className="sa-topbar-left">
            <button
              className="sa-hamburger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              ☰
            </button>
            <div className="sa-search-box">
              <span className="sa-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Global search (Booking #, Customer, Machine)..."
                className="sa-search-input"
              />
            </div>
          </div>

          <div className="sa-topbar-right">
            <div className="sa-date-badge">
              <span className="sa-date-icon">📅</span>
              <span>{currentDateStr}</span>
            </div>

            <button className="sa-icon-btn" title="Notifications">
              🔔
              <span className="sa-badge-count">3</span>
            </button>

            <div className="sa-profile-chip" onClick={handleLogout} title="Click to logout">
              <span className="sa-chip-avatar">{user?.fullName.slice(0, 1).toUpperCase()}</span>
              <span className="sa-chip-name">{user?.fullName}</span>
              <span className="sa-chip-role">({user?.role?.name || roleKey})</span>
            </div>
          </div>
        </header>

        {/* Mobile Slide-out Menu Overlay */}
        {mobileMenuOpen && (
          <div className="sa-mobile-overlay" onClick={() => setMobileMenuOpen(false)}>
            <div className="sa-mobile-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="sa-drawer-header">
                <div className="sa-brand-logo">
                  <span className="sa-brand-icon">🚜</span>
                  <span className="sa-brand-title">{defaultTheme.companyName}</span>
                </div>
                <button className="sa-drawer-close" onClick={() => setMobileMenuOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="sa-drawer-user">
                <div className="sa-avatar">{user?.fullName.slice(0, 1).toUpperCase()}</div>
                <div>
                  <div className="sa-user-name">{user?.fullName}</div>
                  <Badge variant="info" size="sm">
                    {user?.role?.name || roleKey}
                  </Badge>
                </div>
              </div>

              <nav className="sa-drawer-nav">
                {visibleNavItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.key}
                      to={item.path}
                      className={`sa-nav-item ${isActive ? "is-active" : ""}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="sa-nav-icon">{item.icon}</span>
                      <span className="sa-nav-label">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="sa-drawer-footer">
                <button className="sa-btn-logout-full" onClick={handleLogout}>
                  🚪 Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Body */}
        <main className="sa-page-content">{children}</main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="sa-bottom-nav">
          <Link to="/" className={`sa-bottom-item ${location.pathname === "/" ? "is-active" : ""}`}>
            <span className="sa-bottom-icon">🏠</span>
            <span className="sa-bottom-label">Home</span>
          </Link>
          <Link to="/jobs" className={`sa-bottom-item ${location.pathname === "/jobs" ? "is-active" : ""}`}>
            <span className="sa-bottom-icon">🚜</span>
            <span className="sa-bottom-label">Jobs</span>
          </Link>
          <Link to="/machines" className={`sa-bottom-item ${location.pathname === "/machines" ? "is-active" : ""}`}>
            <span className="sa-bottom-icon">🚚</span>
            <span className="sa-bottom-label">Fleet</span>
          </Link>
          <Link to="/customers" className={`sa-bottom-item ${location.pathname === "/customers" ? "is-active" : ""}`}>
            <span className="sa-bottom-icon">👥</span>
            <span className="sa-bottom-label">{getTerm("customer", true)}</span>
          </Link>
          <button
            className="sa-bottom-item"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sa-bottom-icon">☰</span>
            <span className="sa-bottom-label">More</span>
          </button>
        </nav>
      </div>
    </div>
  );
};
