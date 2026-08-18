import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./app-layout.css";
import {
  LayoutDashboard,
  Calendar,
  Tractor,
  Users,
  UserCheck,
  Briefcase,
  CreditCard,
  TrendingDown,
  Fuel,
  Wrench,
  BarChart3,
  Settings,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  Home,
  Truck,
  UserPlus,
  ShieldAlert,
  BadgeAlert,
  Receipt,
  CalendarClock,
  MapPin,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getTerm } from "../lib/terminology";
import { defaultTheme, getCompanyLogoUrl, getCompanyName } from "../lib/theme";
import { Badge } from "../components/ui/Badge";
import { useNotifications, type NotificationItem } from "../lib/useNotifications";

const NOTIFICATION_ICONS: Record<NotificationItem["category"], React.ReactNode> = {
  service: <Wrench size={15} />,
  insurance: <ShieldAlert size={15} />,
  license: <BadgeAlert size={15} />,
  invoice: <Receipt size={15} />,
  booking: <CalendarClock size={15} />,
};

interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  permission?: string;
}

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, roleKey, logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { items: notifications } = useNotifications();

  useEffect(() => {
    if (!isNotifOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotifOpen]);

  const customerTerm = getTerm("customer", true);
  const driverTerm = getTerm("driver", true);
  const machineTerm = getTerm("machine", true);
  const bookingTerm = getTerm("booking", true);

  const companyLogoUrl = getCompanyLogoUrl();
  const companyDisplayName = getCompanyName();

  const navItems: NavItem[] = [
    { key: "dashboard", label: "Dashboard", path: "/", icon: <LayoutDashboard size={18} />, permission: "dashboard.view" },
    { key: "bookings", label: bookingTerm, path: "/bookings", icon: <Calendar size={18} />, permission: "operations.view" },
    { key: "jobs", label: "Job Cards", path: "/jobs", icon: <Tractor size={18} />, permission: "operations.view" },
    { key: "customers", label: customerTerm, path: "/customers", icon: <Users size={18} />, permission: "operations.view" },
    { key: "villages", label: "Villages", path: "/villages", icon: <MapPin size={18} />, permission: "operations.view" },
    { key: "machines", label: machineTerm, path: "/machines", icon: <Truck size={18} />, permission: "operations.view" },
    { key: "drivers", label: driverTerm, path: "/drivers", icon: <UserCheck size={18} />, permission: "operations.view" },
    { key: "employees", label: "Employees", path: "/employees", icon: <Briefcase size={18} />, permission: "operations.view" },
    { key: "team", label: "Team", path: "/team", icon: <UserPlus size={18} />, permission: "user.manage" },
    { key: "payments", label: "Payments", path: "/payments", icon: <CreditCard size={18} />, permission: "payment.receive" },
    { key: "expenses", label: "Expenses", path: "/expenses", icon: <TrendingDown size={18} />, permission: "operations.view" },
    { key: "fuel", label: "Fuel", path: "/fuel", icon: <Fuel size={18} />, permission: "operations.view" },
    { key: "maintenance", label: "Maintenance", path: "/maintenance", icon: <Wrench size={18} />, permission: "operations.view" },
    { key: "reports", label: "Reports", path: "/reports", icon: <BarChart3 size={18} />, permission: "report.generate" },
    { key: "settings", label: "Settings", path: "/settings", icon: <Settings size={18} />, permission: "settings.manage" },
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
            {companyLogoUrl ? (
              <img
                src={companyLogoUrl}
                alt="Company Logo"
                style={{ height: "32px", width: "32px", objectFit: "contain", borderRadius: "6px" }}
              />
            ) : (
              <span className="sa-brand-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                <Tractor size={22} />
              </span>
            )}
            <span className="sa-brand-title">{companyDisplayName || defaultTheme.companyName}</span>
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
            <LogOut size={16} style={{ marginRight: "6px" }} /> Logout
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
              <Menu size={20} />
            </button>
            <div className="sa-search-box">
              <span className="sa-search-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Global search (Booking #, Customer, Machine)..."
                className="sa-search-input"
              />
            </div>
          </div>

          <div className="sa-topbar-right">
            <div className="sa-date-badge">
              <span className="sa-date-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                <Calendar size={14} />
              </span>
              <span>{currentDateStr}</span>
            </div>

            <div className="sa-notif-wrapper" ref={notifRef}>
              <button
                className="sa-icon-btn"
                title="Notifications"
                onClick={() => setIsNotifOpen((open) => !open)}
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="sa-badge-count">{notifications.length > 9 ? "9+" : notifications.length}</span>
                )}
              </button>

              {isNotifOpen && (
                <div className="sa-notif-dropdown">
                  <div className="sa-notif-dropdown-header">
                    Notifications {notifications.length > 0 && `(${notifications.length})`}
                  </div>
                  <div className="sa-notif-dropdown-list">
                    {notifications.length === 0 ? (
                      <div className="sa-notif-empty">You're all caught up — no alerts right now.</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`sa-notif-item ${n.isOverdue ? "is-overdue" : ""}`}
                          onClick={() => {
                            setIsNotifOpen(false);
                            navigate(n.path);
                          }}
                        >
                          <span className="sa-notif-item-icon">{NOTIFICATION_ICONS[n.category]}</span>
                          <div className="sa-notif-item-text">
                            <div className="sa-notif-item-title">{n.title}</div>
                            <div className="sa-notif-item-subtitle">{n.subtitle}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
                  <span className="sa-brand-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                    <Tractor size={22} />
                  </span>
                  <span className="sa-brand-title">{defaultTheme.companyName}</span>
                </div>
                <button className="sa-drawer-close" onClick={() => setMobileMenuOpen(false)}>
                  <X size={20} />
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
                  <LogOut size={16} style={{ marginRight: "6px" }} /> Logout
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
            <span className="sa-bottom-icon" style={{ display: "inline-flex", alignItems: "center" }}><Home size={20} /></span>
            <span className="sa-bottom-label">Home</span>
          </Link>
          <Link to="/jobs" className={`sa-bottom-item ${location.pathname === "/jobs" ? "is-active" : ""}`}>
            <span className="sa-bottom-icon" style={{ display: "inline-flex", alignItems: "center" }}><Tractor size={20} /></span>
            <span className="sa-bottom-label">Job Cards</span>
          </Link>
          <Link to="/machines" className={`sa-bottom-item ${location.pathname === "/machines" ? "is-active" : ""}`}>
            <span className="sa-bottom-icon" style={{ display: "inline-flex", alignItems: "center" }}><Truck size={20} /></span>
            <span className="sa-bottom-label">{machineTerm}</span>
          </Link>
          <Link to="/customers" className={`sa-bottom-item ${location.pathname === "/customers" ? "is-active" : ""}`}>
            <span className="sa-bottom-icon" style={{ display: "inline-flex", alignItems: "center" }}><Users size={20} /></span>
            <span className="sa-bottom-label">{getTerm("customer", true)}</span>
          </Link>
          <button
            className="sa-bottom-item"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sa-bottom-icon" style={{ display: "inline-flex", alignItems: "center" }}><Menu size={20} /></span>
            <span className="sa-bottom-label">More</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

