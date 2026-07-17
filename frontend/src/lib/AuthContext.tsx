'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, getCurrentUser, isAuthenticated } from './api';

interface User {
  id: string;
  email: string;
  phone?: string;
  referralCode?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, phone: string, password: string, referralCode?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (!isAuthenticated()) {
      setUser(null);
      setLoading(false);
      return;
    }

    const result = await authApi.getMe();
    if (result.success && result.data) {
      setUser({
        id: result.data.userId,
        email: result.data.email,
        phone: result.data.phone,
        referralCode: result.data.referralCode,
      });
    } else {
      authApi.logout();
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    if (result.success) {
      await refreshUser();
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const signup = async (email: string, phone: string, password: string, referralCode?: string) => {
    const result = await authApi.signup(email, phone, password, referralCode);
    if (result.success) {
      // Auto login after signup
      return await login(email, password);
    }
    return { success: false, error: result.error };
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
