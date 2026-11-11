import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthResponse } from '../types/auth';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('biochem_auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('biochem_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const currentUser = await api.get<User>('/auth/me');
      setUser(currentUser);
      localStorage.setItem('biochem_auth_user', JSON.stringify(currentUser));
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    localStorage.setItem('biochem_auth_token', res.access_token);
    localStorage.setItem('biochem_auth_user', JSON.stringify(res.user));
    setToken(res.access_token);
    setUser(res.user);
  };

  const register = async (email: string, password: string, fullName: string, role: string) => {
    await api.post<User>('/auth/register', {
      email,
      password,
      full_name: fullName,
      role,
    });
  };

  const logout = () => {
    localStorage.removeItem('biochem_auth_token');
    localStorage.removeItem('biochem_auth_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
