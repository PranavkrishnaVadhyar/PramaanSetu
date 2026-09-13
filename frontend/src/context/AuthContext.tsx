import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthResponse } from '../api/types';
import * as api from '../api/client';

interface User {
  id: string;
  email: string;
  organization_name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, organization_name?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage on mount
    const storedToken = localStorage.getItem('pramaansetu_token');
    const storedUser = localStorage.getItem('pramaansetu_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        // Invalid stored user
        localStorage.removeItem('pramaansetu_token');
        localStorage.removeItem('pramaansetu_user');
      }
    }
    setIsLoading(false);
  }, []);

  const handleAuthSuccess = (res: AuthResponse) => {
    if (!res.token || !res.user?.id || !res.user.email) {
      throw new Error('Authentication service returned an invalid response.');
    }
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('pramaansetu_token', res.token);
    localStorage.setItem('pramaansetu_user', JSON.stringify(res.user));
  };

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    handleAuthSuccess(res);
  };

  const signup = async (email: string, password: string, organization_name?: string) => {
    const res = await api.signup(email, password, organization_name);
    handleAuthSuccess(res);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('pramaansetu_token');
    localStorage.removeItem('pramaansetu_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
