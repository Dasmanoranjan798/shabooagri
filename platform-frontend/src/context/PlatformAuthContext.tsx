import React, { createContext, useContext, useEffect, useState } from "react";
import { api, clearStoredTokens, getStoredToken, type PlatformUser } from "../lib/api";

interface PlatformAuthContextType {
  user: PlatformUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const PlatformAuthContext = createContext<PlatformAuthContextType | undefined>(undefined);

export const PlatformAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const current = await api.me();
      setUser(current);
    } catch {
      clearStoredTokens();
      setUser(null);
    }
  };

  useEffect(() => {
    async function init() {
      if (!getStoredToken()) {
        setIsLoading(false);
        return;
      }
      await refreshUser();
      setIsLoading(false);
    }
    init();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await api.login(email, password);
    setUser(result.user);
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <PlatformAuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout, refreshUser }}
    >
      {children}
    </PlatformAuthContext.Provider>
  );
};

export function usePlatformAuth(): PlatformAuthContextType {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) throw new Error("usePlatformAuth must be used within PlatformAuthProvider");
  return ctx;
}
