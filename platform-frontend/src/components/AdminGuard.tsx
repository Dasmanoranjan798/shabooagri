import React from "react";
import { Navigate } from "react-router-dom";
import { usePlatformAuth } from "../context/PlatformAuthContext";

// Same auth-gate shape AdminDashboardPage.tsx checks inline — pulled out
// here so the new customer drill-down pages don't each repeat it.
export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = usePlatformAuth();

  if (isLoading) {
    return <div className="pf-center-viewport">Loading...</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login?next=/admin" replace />;
  }
  if (!user?.isPlatformAdmin) {
    return (
      <div className="pf-center-viewport">
        <div className="pf-alert pf-alert-danger">You don't have admin access to this account.</div>
      </div>
    );
  }
  return <>{children}</>;
};
