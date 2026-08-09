import React, { createContext, useContext, useEffect, useState } from "react";
import type { SystemRoleKey, User } from "../types/auth";
import { api, clearStoredTokens, getStoredToken } from "../lib/api";
import { setCustomTerms } from "../lib/terminology";
import { setGlobalCompanyBranding, setGlobalCurrency } from "../lib/theme";

function applyBranding(themeColor?: string | null, accentColor?: string | null) {
  if (themeColor) {
    document.documentElement.style.setProperty("--color-primary", themeColor);
  } else {
    document.documentElement.style.removeProperty("--color-primary");
  }
  if (accentColor) {
    document.documentElement.style.setProperty("--color-accent", accentColor);
  } else {
    document.documentElement.style.removeProperty("--color-accent");
  }
}

interface AuthContextType {
  user: User | null;
  roleKey: SystemRoleKey | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (identifier: string, password?: string, pin?: string) => Promise<void>;
  requestOtp: (identifier: string) => Promise<{ message: string; devOtp?: string }>;
  verifyOtp: (identifier: string, code: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permissionKey: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const syncCompanyBranding = async () => {
    try {
      const profile = await api.getCompanyProfile();
      applyBranding(profile.themeColor, profile.accentColor);
      setGlobalCurrency(profile.currency);
      setGlobalCompanyBranding(profile.name, profile.logoUrl);
      if (profile.terminologySettings && profile.terminologySettings.length > 0) {
        const termMap: Record<string, { singular: string; plural: string }> = {};
        for (const ts of profile.terminologySettings) {
          termMap[ts.termKey] = {
            singular: ts.displayLabelSingular,
            plural: ts.displayLabelPlural,
          };
        }
        setCustomTerms(termMap);
      }
    } catch {
      // Ignore fallback to defaults
    }
  };

  useEffect(() => {
    async function initAuth() {
      const token = getStoredToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const currentUser = await api.me();
        setUser(currentUser);
        await syncCompanyBranding();
      } catch {
        clearStoredTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (identifier: string, password?: string, pin?: string) => {
    setError(null);
    try {
      const res = await api.login(identifier, password, pin);
      setUser(res.user);
      await syncCompanyBranding();
    } catch (err: any) {
      const message = err.message || "Failed to log in";
      setError(message);
      throw err;
    }
  };

  const requestOtp = async (identifier: string) => {
    setError(null);
    try {
      return await api.requestOtp(identifier);
    } catch (err: any) {
      const message = err.message || "Failed to request OTP";
      setError(message);
      throw err;
    }
  };

  const verifyOtp = async (identifier: string, code: string) => {
    setError(null);
    try {
      const res = await api.verifyOtp(identifier, code);
      setUser(res.user);
      await syncCompanyBranding();
    } catch (err: any) {
      const message = err.message || "Invalid OTP code";
      setError(message);
      throw err;
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
    applyBranding(null, null);
    setCustomTerms({});
  };

  const roleKey = user?.role?.systemKey || null;

  const hasPermission = (permissionKey: string): boolean => {
    if (!user) return false;
    // Owner role has all permissions
    if (user.role.systemKey === "owner") return true;
    if (!user.role.rolePermissions) return false;
    return user.role.rolePermissions.some((rp) => rp.permission.key === permissionKey);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roleKey,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        requestOtp,
        verifyOtp,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
