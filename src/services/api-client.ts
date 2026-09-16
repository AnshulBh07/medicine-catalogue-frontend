import { ENV } from '../config/env';
import { storage } from '../lib/storage';
import type { ApiErrorDetail, ApiErrorResponse } from '../types/api';

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

export function decodeJwtPayload(token: string): JwtPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const jsonStr =
      typeof atob === 'function'
        ? atob(base64)
        : typeof Buffer !== 'undefined'
          ? Buffer.from(base64, 'base64').toString('utf8')
          : null;
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
  private authVerificationPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  public setToken(token: string | null): void {
    this.currentToken = token;
  }

  public setOnUnauthorized(callback: () => void): void {
    this.onUnauthorizedCallback = callback;
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

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options?.headers ?? {}),
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let token = options?.token ?? this.currentToken;
    if (!token) {
      token = await storage.getToken();
      if (token) {
        this.currentToken = token;
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
      const isAuthEndpoint = cleanPath === '/auth/login';

      if (response.status === 401 && !isAuthEndpoint && token && !options?.skipAuthValidation) {
        if (isJwtExpired(token)) {
          // Token is definitively expired by its timestamp
          if (this.onUnauthorizedCallback) {
            this.onUnauthorizedCallback();
          }
        } else if (cleanPath === '/users/me') {
          // If the profile verification endpoint itself returned 401, the server confirmed unauthenticated
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
