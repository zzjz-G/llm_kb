import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, getToken, setToken, clearAuth, getStoredUser, setStoredUser } from '@client/src/api';
import type { UserInfo } from '@shared/api.interface';

interface AuthContextValue {
  user: UserInfo | null;
  isLoading: boolean;
  login: (studentId: string, password: string) => Promise<UserInfo>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hasToken = !!getToken();
  const [user, setUser] = useState<UserInfo | null>(hasToken ? getStoredUser() : null);
  const [isLoading, setIsLoading] = useState(hasToken);

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const me = await authApi.getMe();
      setUser(me);
      setStoredUser(me);
    } catch {
      clearAuth();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasToken) {
      void refreshUser();
    }
  }, []);

  const login = async (studentId: string, password: string): Promise<UserInfo> => {
    setIsLoading(true);
    try {
      const result = await authApi.login({ studentId, password });
      setToken(result.token);
      setUser(result.user);
      setStoredUser(result.user);
      return result.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
