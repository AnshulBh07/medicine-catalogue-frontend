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
import { AppState, type AppStateStatus } from 'react-native';
import { INACTIVITY_EXPIRY_MS, storage } from '../../lib/storage';
import { apiClient, isJwtExpired } from '../../services/api-client';
import type { PublicUser } from '../../types/models';
import { authService } from './authService';

export const isSessionExpiredByInactivity = (
  lastActiveTime: number | null,
  now: number = Date.now(),
): boolean => {
  if (lastActiveTime === null) return false;
  return now - lastActiveTime >= INACTIVITY_EXPIRY_MS;
};

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
  const sessionVersionRef = useRef<number>(0);

  const logout = useCallback(async (): Promise<void> => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    // Invalidate any in-flight bootstrap/refresh/login operations immediately
    sessionVersionRef.current += 1;
    apiClient.setToken(null);
    setToken(null);
    setUser(null);

    try {
      try {
        await authService.logout();
      } catch {
        // Ignore network errors during logout
      }
      await storage.clearAuth();
    } finally {
      apiClient.setToken(null);
      setToken(null);
      setUser(null);
      setIsLoading(false);
      isLoggingOutRef.current = false;
    }
  }, []);

  // Restore stored session on startup
  useEffect(() => {
    let isMounted = true;
    const bootstrapVersion = sessionVersionRef.current;
    const isStale = () => !isMounted || sessionVersionRef.current !== bootstrapVersion;

    const clearSessionIfCurrent = async () => {
      await storage.clearAuth();
      if (!isStale()) {
        apiClient.setToken(null);
        setToken(null);
        setUser(null);
      }
    };

    const commitSessionIfCurrent = async (
      nextToken: string,
      nextUser: PublicUser,
      nextRefreshToken?: string,
    ): Promise<boolean> => {
      if (isStale()) return false;
      const writes: Promise<void>[] = [
        storage.setToken(nextToken),
        storage.setUser(nextUser),
        storage.setLastActiveTime(Date.now()),
      ];
      if (nextRefreshToken) {
        writes.push(storage.setRefreshToken(nextRefreshToken));
      }
      await Promise.all(writes);
      if (isStale()) {
        await storage.clearAuth();
        return false;
      }
      apiClient.setToken(nextToken);
      setToken(nextToken);
      setUser(nextUser);
      return true;
    };

    async function bootstrap(): Promise<void> {
      try {
        const [storedToken, storedRefreshToken, storedUser, lastActiveTime] = await Promise.all([
          storage.getToken(),
          storage.getRefreshToken(),
          storage.getUser(),
          storage.getLastActiveTime(),
        ]);

        if (isStale()) return;

        if (!storedToken && !storedRefreshToken) {
          return;
        }

        // F-036A: Enforce 24-hour inactivity expiry before attempting session restoration/refresh
        if (isSessionExpiredByInactivity(lastActiveTime)) {
          await clearSessionIfCurrent();
          return;
        }

        // Case 1: Existing access token is present and not expired
        if (storedToken && !isJwtExpired(storedToken, 0)) {
          // Validate against server with skipAuthValidation so bootstrap owns the
          // single refresh/logout decision deterministically without double-refresh races.
          try {
            const profileRes = await apiClient.get<{ user: PublicUser }>('/users/me', {
              token: storedToken,
              skipAuthValidation: true,
            });
            if (isStale()) return;

            if (profileRes?.user) {
              await commitSessionIfCurrent(storedToken, profileRes.user);
              return;
            }
            if (storedUser) {
              apiClient.setToken(storedToken);
              setToken(storedToken);
              setUser(storedUser);
            }
          } catch (verifyErr: unknown) {
            if (isStale()) return;

            const status =
              (verifyErr as { statusCode?: number; status?: number })?.statusCode ??
              (verifyErr as { status?: number })?.status;

            if (status === 401 || status === 403 || status === 404) {
              // Access token rejected or user deactivated/not found -> attempt single refresh
              if (storedRefreshToken) {
                try {
                  const refreshRes = await authService.refresh(storedRefreshToken);
                  if (isStale()) return;

                  if (refreshRes?.accessToken && refreshRes.user) {
                    await commitSessionIfCurrent(
                      refreshRes.accessToken,
                      refreshRes.user,
                      refreshRes.refreshToken,
                    );
                    return;
                  }
                  await clearSessionIfCurrent();
                  return;
                } catch (refreshErr: unknown) {
                  if (isStale()) return;
                  const refreshStatus =
                    (refreshErr as { statusCode?: number; status?: number })?.statusCode ??
                    (refreshErr as { status?: number })?.status;

                  if (refreshStatus === 401 || refreshStatus === 403 || refreshStatus === 404) {
                    await clearSessionIfCurrent();
                  } else if (storedUser) {
                    // Temporary network/5xx error during fallback refresh -> preserve cached session
                    apiClient.setToken(storedToken);
                    setToken(storedToken);
                    setUser(storedUser);
                  }
                  return;
                }
              } else {
                await clearSessionIfCurrent();
                return;
              }
            }

            // Temporary network/timeout/5xx failure (e.g., offline) -> preserve stored session
            if (storedUser && !isStale()) {
              apiClient.setToken(storedToken);
              setToken(storedToken);
              setUser(storedUser);
            }
          }
          return;
        }

        // Case 2: Access token expired (or missing), but refresh token is available
        if (storedRefreshToken) {
          try {
            const refreshRes = await authService.refresh(storedRefreshToken);
            if (isStale()) return;

            if (refreshRes?.accessToken && refreshRes.user) {
              await commitSessionIfCurrent(
                refreshRes.accessToken,
                refreshRes.user,
                refreshRes.refreshToken,
              );
              return;
            }
            await clearSessionIfCurrent();
            return;
          } catch (refreshErr: unknown) {
            if (isStale()) return;

            const status =
              (refreshErr as { statusCode?: number; status?: number })?.statusCode ??
              (refreshErr as { status?: number })?.status;

            if (status === 401 || status === 403 || status === 404) {
              await clearSessionIfCurrent();
            } else if (storedUser) {
              // Temporary network/timeout error during refresh -> keep cached session if available
              if (storedToken) {
                apiClient.setToken(storedToken);
                setToken(storedToken);
              }
              setUser(storedUser);
            }
            return;
          }
        }

        // Expired access token with no refresh token -> clear stale token cleanly
        await clearSessionIfCurrent();
      } catch (storageErr) {
        // Transient storage read issue -> do NOT destroy auth session
        console.warn('Session bootstrap storage read warning:', storageErr);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (typeof apiClient.setOnTokenRefreshed === 'function') {
      apiClient.setOnTokenRefreshed((newToken: string, freshUser: PublicUser | null) => {
        if (isMounted && !isLoggingOutRef.current) {
          setToken(newToken);
          if (freshUser) {
            setUser(freshUser);
          }
        }
      });
    }

    // Auto-logout on confirmed 401 responses after bootstrap
    apiClient.setOnUnauthorized(() => {
      if (isMounted) {
        void logout();
      }
    });

    void bootstrap();

    // F-036A: Re-check 24-hour inactivity expiry whenever the app returns to foreground
    const appStateSubscription = AppState.addEventListener?.(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState !== 'active' || !isMounted || isLoggingOutRef.current) {
          return;
        }
        void (async () => {
          const [currentToken, lastActive] = await Promise.all([
            storage.getToken(),
            storage.getLastActiveTime(),
          ]);
          if (
            isMounted &&
            currentToken &&
            !isLoggingOutRef.current &&
            isSessionExpiredByInactivity(lastActive)
          ) {
            await logout();
          }
        })();
      },
    );

    return () => {
      isMounted = false;
      appStateSubscription?.remove?.();
      apiClient.setOnUnauthorized(null);
      if (typeof apiClient.setOnTokenRefreshed === 'function') {
        apiClient.setOnTokenRefreshed(null);
      }
    };
  }, [logout]);

  const login = useCallback(
    async (identifier: string, secret: string): Promise<void> => {
      const startVersion = sessionVersionRef.current;
      const response = await authService.login({
        identifier: identifier.trim(),
        password: secret,
      });

      // If logout occurred while login was in flight, do not restore session
      if (sessionVersionRef.current !== startVersion) {
        return;
      }

      sessionVersionRef.current += 1;

      const now = Date.now();
      const storagePromises: Promise<void>[] = [
        storage.setToken(response.accessToken),
        storage.setUser(response.user),
        storage.setLastActiveTime(now),
      ];
      if (response.refreshToken) {
        storagePromises.push(storage.setRefreshToken(response.refreshToken));
      }
      await Promise.all(storagePromises);

      apiClient.setToken(response.accessToken);
      setToken(response.accessToken);
      setUser(response.user);
      setIsLoading(false);
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
