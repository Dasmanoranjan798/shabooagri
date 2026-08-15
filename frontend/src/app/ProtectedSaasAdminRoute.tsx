import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSaasAuth } from "../context/SaasAuthContext";

/**
 * Guards the platform-admin control plane (/admin, /saas/admin/*). Distinct
 * from ProtectedSaasRoute, which only checks "is any SaaS customer logged
 * in" — that alone would let a regular tenant load the admin page shell.
 */
export const ProtectedSaasAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { saasUser, isSaasAuthenticated, isSaasLoading } = useSaasAuth();
  const location = useLocation();

  if (isSaasLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Verifying admin session...</p>
        </div>
      </div>
    );
  }

  if (!isSaasAuthenticated) {
    return <Navigate to="/saas/login" state={{ from: location }} replace />;
  }

  if (!saasUser?.isPlatformAdmin) {
    return <Navigate to="/portal" replace />;
  }

  return <>{children}</>;
};
