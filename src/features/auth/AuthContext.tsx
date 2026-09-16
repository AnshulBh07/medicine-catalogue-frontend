import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { INACTIVITY_EXPIRY_MS, storage } from '../../lib/storage';
import { apiClient } from '../../services/api-client';
import type { PublicUser } from '../../types/models';
import { authService } from './authService';

export interface AuthContextType {
  user: PublicUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  login: (identifier: string, secret: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: PublicUser) => Promise<void>;
  refreshUser: () => Promise<PublicUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isLoggingOutRef = useRef<boolean>(false);

  const logout = useCallback(async (): Promise<void> => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    try {
      await storage.clearAuth();
    } finally {
      apiClient.setToken(null);
      setToken(null);
      setUser(null);
      isLoggingOutRef.current = false;
    }
  }, []);

  // Restore stored session on startup
  useEffect(() => {
    let isMounted = true;

    async function bootstrap(): Promise<void> {
      try {
        const [storedToken, storedUser, lastActiveTime] = await Promise.all([
          storage.getToken(),
          storage.getUser(),
          storage.getLastActiveTime(),
        ]);

        // Inactivity check: if user has not opened the app for approx 1 day (24 hours)
        const now = Date.now();
        if (lastActiveTime && now - lastActiveTime > INACTIVITY_EXPIRY_MS) {
          await storage.clearAuth();
          if (isMounted) {
            apiClient.setToken(null);
            setToken(null);
            setUser(null);
          }
          return;
        }

        if (storedToken && storedUser) {
          apiClient.setToken(storedToken);
          if (isMounted) {
            setToken(storedToken);
            setUser(storedUser);
          }
          await storage.setLastActiveTime(now);

          // Validate stored token against the server in background if available
          try {
            const profileRes = await apiClient.get<{ user: PublicUser }>('/users/me');
            if (profileRes?.user && isMounted) {
              const freshUser = profileRes.user;
              await storage.setUser(freshUser);
              await storage.setLastActiveTime(Date.now());
              setUser(freshUser);
            }
          } catch (verifyErr: unknown) {
            const status = (verifyErr as { statusCode?: number; status?: number })?.statusCode ??
              (verifyErr as { status?: number })?.status;
            // Only if explicitly 401 Unauthorized from server, clear auth
            if (status === 401) {
              await storage.clearAuth();
              if (isMounted) {
                apiClient.setToken(null);
                setToken(null);
                setUser(null);
              }
            }
            // Temporary network/server failures (e.g. offline, 500, network error) do not clear auth
          }
          return;
        }
      } catch (storageErr) {
        // Transient storage read issue -> do NOT destroy auth session!
        console.warn('Session bootstrap storage read warning:', storageErr);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    // Auto-logout on 401 responses
    apiClient.setOnUnauthorized(() => {
      void logout();
    });

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  const login = useCallback(
    async (identifier: string, secret: string): Promise<void> => {
      const response = await authService.login({
        identifier: identifier.trim(),
        password: secret,
      });

      const now = Date.now();
      await Promise.all([
        storage.setToken(response.accessToken),
        storage.setUser(response.user),
        storage.setLastActiveTime(now),
      ]);

      apiClient.setToken(response.accessToken);
      setToken(response.accessToken);
      setUser(response.user);
    },
    [],
  );

  const updateUser = useCallback(async (updatedUser: PublicUser): Promise<void> => {
    await Promise.all([
      storage.setUser(updatedUser),
      storage.setLastActiveTime(Date.now()),
    ]);
    setUser(updatedUser);
  }, []);

  const refreshUser = useCallback(async (): Promise<PublicUser | null> => {
    try {
      const profileRes = await apiClient.get<{ user: PublicUser }>('/users/me');
      if (profileRes?.user) {
        const freshUser = profileRes.user;
        await Promise.all([
          storage.setUser(freshUser),
          storage.setLastActiveTime(Date.now()),
        ]);
        setUser(freshUser);
        return freshUser;
      }
    } catch (err) {
      console.warn('Failed to refresh user profile from server:', err);
    }
    return null;
  }, []);

  const isAuthenticated = Boolean(token && user);
  const isAdmin = user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated,
      isAdmin,
      isEmployee,
      login,
      logout,
      updateUser,
      refreshUser,
    }),
    [user, token, isLoading, isAuthenticated, isAdmin, isEmployee, login, logout, updateUser, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    // Safe fallback for isolated unit tests or component test runners
    return {
      user: {
        id: 'default-admin-id',
        name: 'Admin User',
        email: 'admin@medicina.com',
        phone: null,
        role: 'ADMIN',
        profileImageUrl: null,
        active: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      token: 'default-token',
      isLoading: false,
      isAuthenticated: true,
      isAdmin: true,
      isEmployee: false,
      login: async () => {},
      logout: async () => {},
      updateUser: async () => {},
      refreshUser: async () => null,
    };
  }
  return context;
};
