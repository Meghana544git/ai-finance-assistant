import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getApiError } from "@/services/api";
import { authService } from "@/services/auth.service";
import { tokenStorage } from "@/services/tokenStorage";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  isInitializing: boolean;
  isAuthenticated: boolean;
  currency: string;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const loadUser = useCallback(async () => {
    if (!tokenStorage.getAccessToken() && !tokenStorage.getRefreshToken()) {
      setUser(null);
      return;
    }
    try {
      const current = await authService.me();
      setUser(current);
    } catch {
      tokenStorage.clear();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadUser();
      if (mounted) setIsInitializing(false);
    })();
    return () => {
      mounted = false;
    };
  }, [loadUser]);

  useEffect(() => {
    const handleLogout = () => {
      tokenStorage.clear();
      setUser(null);
    };
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login(email, password);
    tokenStorage.setTokens(response.access_token, response.refresh_token);
    setUser(response.user);
  }, []);

  const register = useCallback(async (fullName: string, email: string, password: string) => {
    const response = await authService.register(fullName, email, password);
    tokenStorage.setTokens(response.access_token, response.refresh_token);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Stateless JWT logout: local cleanup is what matters.
    } finally {
      tokenStorage.clear();
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const current = await authService.me();
      setUser(current);
    } catch (error) {
      throw new Error(getApiError(error));
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitializing,
      isAuthenticated: Boolean(user),
      currency: user?.preferred_currency ?? "INR",
      login,
      register,
      logout,
      updateUser: setUser,
      refreshUser,
    }),
    [user, isInitializing, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }
  return context;
}
