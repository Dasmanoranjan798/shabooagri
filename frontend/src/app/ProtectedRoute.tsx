import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldAlert } from "lucide-react";
import { Spinner } from "../components/ui/Spinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, permission }) => {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="sa-center-viewport">
        <Spinner size="lg" label="Verifying session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div className="sa-center-viewport">
        <div className="sa-error-card">
          <span className="sa-error-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldAlert size={36} color="var(--color-error, #D32F2F)" />
          </span>
          <h3>Access Restricted</h3>
          <p>Your user role does not have permission to view this section.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
