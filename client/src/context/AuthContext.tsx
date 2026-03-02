import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

interface AuthState {
  token: string | null;
  playerId: string | null;
  username: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: localStorage.getItem('token'),
    playerId: localStorage.getItem('playerId'),
    username: localStorage.getItem('username'),
    isLoading: true,
  });

  // Validate stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }
    authService.getMe()
      .then((me) => {
        setState({ token, playerId: me.playerId, username: me.username, isLoading: false });
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('playerId');
        localStorage.removeItem('username');
        setState({ token: null, playerId: null, username: null, isLoading: false });
      });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await authService.login({ username, password });
    localStorage.setItem('token', res.token);
    localStorage.setItem('playerId', res.playerId);
    localStorage.setItem('username', res.username);
    setState({ token: res.token, playerId: res.playerId, username: res.username, isLoading: false });
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const res = await authService.register({ username, password });
    localStorage.setItem('token', res.token);
    localStorage.setItem('playerId', res.playerId);
    localStorage.setItem('username', res.username);
    setState({ token: res.token, playerId: res.playerId, username: res.username, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('playerId');
    localStorage.removeItem('username');
    setState({ token: null, playerId: null, username: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      register,
      logout,
      isAuthenticated: !!state.token && !!state.playerId,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
