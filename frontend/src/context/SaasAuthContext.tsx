import React, { createContext, useContext, useEffect, useState } from "react";
import type { LoginSaasInput, RegisterSaasInput, SaasUser } from "../types/saas";
import {
  clearStoredSaasTokens,
  getSaasMe,
  getStoredSaasToken,
  saasLogin as apiSaasLogin,
  saasRegister as apiSaasRegister,
} from "../lib/saasApi";

interface SaasAuthContextType {
  saasUser: SaasUser | null;
  isSaasAuthenticated: boolean;
  isSaasLoading: boolean;
  saasError: string | null;
  registerSaas: (input: RegisterSaasInput) => Promise<void>;
  loginSaas: (input: LoginSaasInput) => Promise<void>;
  logoutSaas: () => void;
  refreshSaasUser: () => Promise<void>;
}

const SaasAuthContext = createContext<SaasAuthContextType | undefined>(undefined);

export const SaasAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [saasUser, setSaasUser] = useState<SaasUser | null>(null);
  const [isSaasLoading, setIsSaasLoading] = useState<boolean>(true);
  const [saasError, setSaasError] = useState<string | null>(null);

  const refreshSaasUser = async () => {
    const token = getStoredSaasToken();
    if (!token) {
      setSaasUser(null);
      setIsSaasLoading(false);
      return;
    }
    try {
      const me = await getSaasMe();
      setSaasUser(me);
    } catch {
      clearStoredSaasTokens();
      setSaasUser(null);
    } finally {
      setIsSaasLoading(false);
    }
  };

  useEffect(() => {
    refreshSaasUser();
  }, []);

  const registerSaas = async (input: RegisterSaasInput) => {
    setSaasError(null);
    try {
      await apiSaasRegister(input);
      await refreshSaasUser();
    } catch (err: any) {
      const msg = err.message || "Registration failed. Please check details.";
      setSaasError(msg);
      throw err;
    }
  };

  const loginSaas = async (input: LoginSaasInput) => {
    setSaasError(null);
    try {
      await apiSaasLogin(input);
      await refreshSaasUser();
    } catch (err: any) {
      const msg = err.message || "Invalid credentials.";
      setSaasError(msg);
      throw err;
    }
  };

  const logoutSaas = () => {
    clearStoredSaasTokens();
    setSaasUser(null);
  };

  return (
    <SaasAuthContext.Provider
      value={{
        saasUser,
        isSaasAuthenticated: !!saasUser,
        isSaasLoading,
        saasError,
        registerSaas,
        loginSaas,
        logoutSaas,
        refreshSaasUser,
      }}
    >
      {children}
    </SaasAuthContext.Provider>
  );
};

export const useSaasAuth = () => {
  const context = useContext(SaasAuthContext);
  if (!context) {
    throw new Error("useSaasAuth must be used within a SaasAuthProvider");
  }
  return context;
};
