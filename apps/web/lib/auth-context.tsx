'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UserProfile, ApiResponse, Login, Register } from '@kariro/shared';
import { apiClient, setAccessToken, getAccessToken } from './api';

interface AuthState {
  readonly user: UserProfile | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login(data: Login): Promise<{ success: boolean; error?: string }>;
  register(data: Register): Promise<{ success: boolean; error?: string }>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface BffAuthResponse {
  user: UserProfile;
  tokens: { accessToken: string; expiresIn: number };
}

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' });
        if (!res.ok) return;

        const body = (await res.json()) as ApiResponse<{ accessToken: string }>;
        if (!body.success || !body.data) return;

        setAccessToken(body.data.accessToken);

        const profile = await apiClient<UserProfile>('/auth/me');
        if (!cancelled && profile.success && profile.data) {
          setUser(profile.data);
        }
      } catch {
        // No session to restore
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (data: Login) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const body = (await res.json()) as ApiResponse<BffAuthResponse>;

      if (!body.success || !body.data) {
        return { success: false, error: body.error ?? 'Login failed' };
      }

      setAccessToken(body.data.tokens.accessToken);
      setUser(body.data.user);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      return { success: false, error: message };
    }
  }, []);

  const register = useCallback(async (data: Register) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const body = (await res.json()) as ApiResponse<BffAuthResponse>;

      if (!body.success || !body.data) {
        return { success: false, error: body.error ?? 'Registration failed' };
      }

      setAccessToken(body.data.tokens.accessToken);
      setUser(body.data.user);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    const token = getAccessToken();
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});

    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
