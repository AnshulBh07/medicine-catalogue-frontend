import { ENV } from '../config/env';
import { storage } from '../lib/storage';
import type { ApiErrorDetail, ApiErrorResponse } from '../types/api';
import type { PublicUser } from '../types/models';

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ApiErrorDetail[];

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export interface JwtPayload {
  sub?: string;
  role?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

function base64Decode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'base64').toString('utf8');
  }
  if (typeof atob === 'function') {
    try {
      return decodeURIComponent(
        Array.prototype.map
          .call(atob(str), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
    } catch {
      return atob(str);
    }
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  const sanitized = String(str).replace(/=+$/, '');
  for (let bc = 0, bs = 0, buffer: number, idx = 0; (buffer = sanitized.charCodeAt(idx++)); ) {
    const charIndex = chars.indexOf(String.fromCharCode(buffer));
    if (~charIndex) {
      bs = bc % 4 ? bs * 64 + charIndex : charIndex;
      if (bc++ % 4) {
        output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
      }
    }
  }
  return output;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const jsonStr = base64Decode(base64);
    if (!jsonStr) return null;
    return JSON.parse(jsonStr) as JwtPayload;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, clockSkewSeconds: number = 0): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    return false;
  }
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return nowInSeconds >= payload.exp - clockSkewSeconds;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  token?: string | null;
  signal?: AbortSignal;
  skipAuthValidation?: boolean;
  isRetry?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private currentToken: string | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;
  private onTokenRefreshedCallback: ((token: string, user: PublicUser | null) => void) | null = null;
  private authVerificationPromise: Promise<boolean> | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  public setToken(token: string | null): void {
    this.currentToken = token;
  }

  public setOnUnauthorized(callback: () => void): void {
    this.onUnauthorizedCallback = callback;
  }

  public setOnTokenRefreshed(callback: (token: string, user: PublicUser | null) => void): void {
    this.onTokenRefreshedCallback = callback;
  }

  public async refreshTokens(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const storedRefreshToken = await storage.getRefreshToken();
        if (!storedRefreshToken) {
          return null;
        }

        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            await storage.clearAuth();
            this.setToken(null);
            if (this.onUnauthorizedCallback) {
              this.onUnauthorizedCallback();
            }
          }
          return null;
        }

        const data = (await response.json()) as {
          accessToken?: string;
          refreshToken?: string;
          user?: PublicUser;
        };

        if (data?.accessToken) {
          await storage.setToken(data.accessToken);
          if (data.refreshToken) {
            await storage.setRefreshToken(data.refreshToken);
          }
          if (data.user) {
            await storage.setUser(data.user);
          }
          this.setToken(data.accessToken);
          if (this.onTokenRefreshedCallback) {
            this.onTokenRefreshedCallback(data.accessToken, data.user ?? null);
          }
          return data.accessToken;
        }
        return null;
      } catch {
        // Network failure during refresh -> do NOT clear auth credentials
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async verifySession(token: string): Promise<boolean> {
    if (this.authVerificationPromise) {
      return this.authVerificationPromise;
    }

    this.authVerificationPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/users/me`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          return false;
        }

        // Return true if status is OK or non-401 (e.g. temporary server issue)
        return response.ok || response.status !== 401;
      } catch {
        // Network failure reaching server -> do NOT assume session is dead
        return true;
      } finally {
        this.authVerificationPromise = null;
      }
    })();

    return this.authVerificationPromise;
  }

  private async request<T>(
    path: string,
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${cleanPath}`;
    const isAuthEndpoint = cleanPath === '/auth/login' || cleanPath === '/auth/refresh';

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options?.headers ?? {}),
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let token = options?.token ?? this.currentToken;
    if (!token && !isAuthEndpoint) {
      token = await storage.getToken();
      if (token) {
        this.currentToken = token;
      }
    }

    // Proactively refresh expired token before making the request if not already retrying
    if (token && !isAuthEndpoint && !options?.isRetry && !options?.skipAuthValidation && isJwtExpired(token, 30)) {
      const refreshedToken = await this.refreshTokens();
      if (refreshedToken) {
        token = refreshedToken;
      }
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: options?.signal,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Network request failed';
      throw new ApiError(0, 'NETWORK_ERROR', `Unable to connect to server: ${message}`);
    }

    // On successful authenticated response, touch last active time to prevent inactivity logout during active use
    if (response.ok && token) {
      void storage.setLastActiveTime();
    }

    let responseData: unknown = null;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }
    }

    if (!response.ok) {
      if (response.status === 401 && !isAuthEndpoint && token && !options?.skipAuthValidation) {
        // Attempt refresh if not already retrying
        if (!options?.isRetry) {
          const refreshedToken = await this.refreshTokens();
          if (refreshedToken) {
            return this.request<T>(path, method, body, {
              ...options,
              token: refreshedToken,
              isRetry: true,
            });
          }
        }

        if (isJwtExpired(token)) {
          // Token is definitively expired by its timestamp and refresh failed
          if (this.onUnauthorizedCallback) {
            this.onUnauthorizedCallback();
          }
        } else if (cleanPath === '/users/me') {
          // Profile verification endpoint returned 401 and refresh was not available/failed
          if (this.onUnauthorizedCallback) {
            this.onUnauthorizedCallback();
          }
        } else {
          // Token is not expired by timestamp; verify authoritatively before logging out
          const isSessionValid = await this.verifySession(token);
          if (isSessionValid) {
            // Transient 401 on endpoint or server glitch; retry once if not already retrying
            if (!options?.isRetry) {
              return this.request<T>(path, method, body, {
                ...options,
                isRetry: true,
              });
            }
          } else {
            // Server confirmed session is invalid
            if (this.onUnauthorizedCallback) {
              this.onUnauthorizedCallback();
            }
          }
        }
      }

      if (this.isApiErrorResponse(responseData)) {
        throw new ApiError(
          response.status,
          responseData.error.code,
          responseData.error.message,
          responseData.error.details,
        );
      }

      throw new ApiError(
        response.status,
        `HTTP_${response.status}`,
        response.statusText || `Request failed with status ${response.status}`,
      );
    }

    return responseData as T;
  }

  private isApiErrorResponse(data: unknown): data is ApiErrorResponse {
    if (typeof data !== 'object' || data === null) return false;
    const errorObj = (data as { error?: unknown }).error;
    if (typeof errorObj !== 'object' || errorObj === null) return false;
    return (
      typeof (errorObj as { code?: unknown }).code === 'string' &&
      typeof (errorObj as { message?: unknown }).message === 'string'
    );
  }

  public async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, 'GET', undefined, options);
  }

  public async post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(path, 'POST', body, options);
  }

  public async patch<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(path, 'PATCH', body, options);
  }

  public async put<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(path, 'PUT', body, options);
  }

  public async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, 'DELETE', undefined, options);
  }
}

export const apiClient = new ApiClient(ENV.API_BASE_URL);
