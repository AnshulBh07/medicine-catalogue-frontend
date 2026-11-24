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

export const DEFAULT_REQUEST_TIMEOUT_MS = 15000;
export const UPLOAD_REQUEST_TIMEOUT_MS = 60000;

export interface RequestOptions {
  headers?: Record<string, string>;
  token?: string | null;
  signal?: AbortSignal;
  timeoutMs?: number;
  skipAuthValidation?: boolean;
  isRetry?: boolean;
}

interface RefreshAttemptResult {
  token: string | null;
  unauthorizedCleared: boolean;
}

class ApiClient {
  private baseUrl: string;
  private currentToken: string | null = null;
  private authEpoch: number = 0;
  private onUnauthorizedCallback: (() => void) | null = null;
  private onTokenRefreshedCallback: ((token: string, user: PublicUser | null) => void) | null = null;
  private authVerificationPromise: Promise<boolean> | null = null;
  private refreshPromise: Promise<RefreshAttemptResult> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  public setToken(token: string | null): void {
    if (token === null) {
      this.authEpoch += 1;
    }
    this.currentToken = token;
  }

  public setOnUnauthorized(callback: (() => void) | null): void {
    this.onUnauthorizedCallback = callback;
  }

  public setOnTokenRefreshed(
    callback: ((token: string, user: PublicUser | null) => void) | null,
  ): void {
    this.onTokenRefreshedCallback = callback;
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<Response> {
    const externalSignal = init.signal;
    if (externalSignal?.aborted) {
      throw new ApiError(0, 'REQUEST_CANCELLED', 'Request was cancelled');
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    let timedOut = false;
    let callerAborted = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const onExternalAbort = () => {
      callerAborted = true;
      controller?.abort();
    };

    if (externalSignal && controller) {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    if (controller && timeoutMs > 0 && Number.isFinite(timeoutMs)) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
    }

    try {
      return await fetch(url, {
        ...init,
        signal: controller ? controller.signal : externalSignal,
      });
    } catch (err) {
      if (timedOut) {
        throw new ApiError(
          408,
          'REQUEST_TIMEOUT',
          'Request timed out. Please check your connection and try again.',
        );
      }
      if (
        callerAborted ||
        externalSignal?.aborted ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
        throw new ApiError(0, 'REQUEST_CANCELLED', 'Request was cancelled');
      }
      const message =
        err instanceof Error ? err.message : 'Network request failed';
      throw new ApiError(0, 'NETWORK_ERROR', `Unable to connect to server: ${message}`);
    } finally {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      if (externalSignal && controller) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    }
  }

  private async refreshTokensInternal(): Promise<RefreshAttemptResult> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const startEpoch = this.authEpoch;

    this.refreshPromise = (async (): Promise<RefreshAttemptResult> => {
      try {
        const storedRefreshToken = await storage.getRefreshToken();
        if (!storedRefreshToken || this.authEpoch !== startEpoch) {
          return { token: null, unauthorizedCleared: false };
        }

        const response = await this.fetchWithTimeout(
          `${this.baseUrl}/auth/refresh`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({ refreshToken: storedRefreshToken }),
          },
          DEFAULT_REQUEST_TIMEOUT_MS,
        );

        if (this.authEpoch !== startEpoch) {
          return { token: null, unauthorizedCleared: false };
        }

        if (!response.ok) {
          if (response.status === 401 || response.status === 403 || response.status === 404) {
            await storage.clearAuth();
            if (this.authEpoch === startEpoch) {
              this.currentToken = null;
              if (this.onUnauthorizedCallback) {
                this.onUnauthorizedCallback();
              }
              return { token: null, unauthorizedCleared: true };
            }
          }
          return { token: null, unauthorizedCleared: false };
        }

        const data = (await response.json()) as {
          accessToken?: string;
          refreshToken?: string;
          user?: PublicUser;
        };

        if (this.authEpoch !== startEpoch) {
          return { token: null, unauthorizedCleared: false };
        }

        if (data?.accessToken) {
          await storage.setToken(data.accessToken);
          if (data.refreshToken) {
            await storage.setRefreshToken(data.refreshToken);
          }
          if (data.user) {
            await storage.setUser(data.user);
          }
          if (this.authEpoch !== startEpoch) {
            await storage.clearAuth();
            return { token: null, unauthorizedCleared: false };
          }
          this.currentToken = data.accessToken;
          if (this.onTokenRefreshedCallback) {
            this.onTokenRefreshedCallback(data.accessToken, data.user ?? null);
          }
          return { token: data.accessToken, unauthorizedCleared: false };
        }
        return { token: null, unauthorizedCleared: false };
      } catch {
        // Network/timeout failure during refresh -> do NOT clear auth credentials
        return { token: null, unauthorizedCleared: false };
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  public async refreshTokens(): Promise<string | null> {
    const result = await this.refreshTokensInternal();
    return result.token;
  }

  private async verifySession(token: string): Promise<boolean> {
    if (this.authVerificationPromise) {
      return this.authVerificationPromise;
    }

    this.authVerificationPromise = (async () => {
      try {
        const response = await this.fetchWithTimeout(
          `${this.baseUrl}/users/me`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
          DEFAULT_REQUEST_TIMEOUT_MS,
        );

        if (response.status === 401 || response.status === 403 || response.status === 404) {
          return false;
        }

        // Return true if status is OK or temporary 5xx server issue
        return true;
      } catch {
        // Network/timeout failure reaching server -> do NOT assume session is dead
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
    const requestEpoch = this.authEpoch;

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
      if (token && this.authEpoch === requestEpoch) {
        this.currentToken = token;
      }
    }

    // Proactively refresh expired token before making the request if not already retrying
    if (token && !isAuthEndpoint && !options?.isRetry && !options?.skipAuthValidation && isJwtExpired(token, 30)) {
      const refreshResult = await this.refreshTokensInternal();
      if (refreshResult.token) {
        token = refreshResult.token;
      }
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await this.fetchWithTimeout(
      url,
      {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: options?.signal,
      },
      options?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    );

    // On successful authenticated response, touch last active time to prevent inactivity logout during active use
    if (response.ok && token && this.authEpoch === requestEpoch) {
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
      if (
        response.status === 401 &&
        !isAuthEndpoint &&
        token &&
        !options?.skipAuthValidation &&
        this.authEpoch === requestEpoch
      ) {
        let unauthorizedAlreadyHandled = false;
        // Attempt refresh if not already retrying
        if (!options?.isRetry) {
          const refreshResult = await this.refreshTokensInternal();
          if (refreshResult.token) {
            return this.request<T>(path, method, body, {
              ...options,
              token: refreshResult.token,
              isRetry: true,
            });
          }
          unauthorizedAlreadyHandled = refreshResult.unauthorizedCleared;
        }

        if (!unauthorizedAlreadyHandled && this.authEpoch === requestEpoch) {
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
            } else if (this.authEpoch === requestEpoch) {
              // Server confirmed session is invalid
              if (this.onUnauthorizedCallback) {
                this.onUnauthorizedCallback();
              }
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
