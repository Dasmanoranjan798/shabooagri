import React, { createContext, useContext, useEffect, useState } from "react";
import type { SystemRoleKey, User } from "../types/auth";
import { api, clearStoredTokens, getStoredToken } from "../lib/api";

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
    } catch (err: any) {
      const message = err.message || "Invalid OTP code";
      setError(message);
      throw err;
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
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
