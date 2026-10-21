import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../src/features/auth';
import { authService } from '../src/features/auth/authService';
import { storage } from '../src/lib/storage';
import type { PublicUser } from '../src/types/models';

const mockAdminUser: PublicUser = {
  id: 'user-1',
  name: 'Admin Test',
  email: 'admin@example.com',
  phone: '+919876543210',
  role: 'ADMIN',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockEmployeeUser: PublicUser = {
  id: 'user-2',
  name: 'Employee Test',
  email: 'employee@example.com',
  phone: '+919876543211',
  role: 'EMPLOYEE',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('Authentication & Role Foundation', () => {
  beforeEach(async () => {
    await storage.clearAuth();
    jest.restoreAllMocks();
  });

  it('initializes in unauthenticated state when no session stored', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = await renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isEmployee).toBe(false);
  });

  it('authenticates admin and updates role helpers upon login', async () => {
    jest.spyOn(authService, 'login').mockResolvedValue({
      accessToken: 'mock-admin-token',
      tokenType: 'Bearer',
      user: mockAdminUser,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('admin@example.com', 'password123');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.name).toBe('Admin Test');
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isEmployee).toBe(false);
    expect(result.current.token).toBe('mock-admin-token');
  });

  it('authenticates employee and correctly reflects non-admin role', async () => {
    jest.spyOn(authService, 'login').mockResolvedValue({
      accessToken: 'mock-employee-token',
      tokenType: 'Bearer',
      user: mockEmployeeUser,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('employee@example.com', 'password123');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.name).toBe('Employee Test');
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isEmployee).toBe(true);
  });

  it('clears session upon logout', async () => {
    jest.spyOn(authService, 'login').mockResolvedValue({
      accessToken: 'mock-admin-token',
      tokenType: 'Bearer',
      user: mockAdminUser,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('admin@example.com', 'password123');
    });
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  describe('Persistent Session Restoration', () => {
    function createMockJwt(expDeltaSeconds: number): string {
      const exp = Math.floor(Date.now() / 1000) + expDeltaSeconds;
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ sub: 'user-1', role: 'ADMIN', exp })).toString('base64');
      return `${header}.${payload}.mockSig`;
    }

    it('1. restores authenticated session from SecureStore when valid token exists (reopen/restart)', async () => {
      const validToken = createMockJwt(3600);
      await storage.setToken(validToken);
      await storage.setUser(mockAdminUser);

      // Mock server profile check
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ user: mockAdminUser }),
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = await renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        // wait for bootstrap to complete
        await Promise.resolve();
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.id).toBe('user-1');
      expect(result.current.token).toBe(validToken);
      expect(result.current.isAdmin).toBe(true);
    });

    it('2. refreshes session and updates stored tokens on startup when access token is expired', async () => {
      const expiredToken = createMockJwt(-3600);
      const newValidToken = createMockJwt(3600);
      const newRefreshToken = 'rotated-refresh-token-456';

      await storage.setToken(expiredToken);
      await storage.setRefreshToken('valid-refresh-token-123');
      await storage.setUser(mockAdminUser);

      jest.spyOn(authService, 'refresh').mockResolvedValue({
        accessToken: newValidToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
        user: mockAdminUser,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = await renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe(newValidToken);

      // Verify token rotation in storage
      const storedToken = await storage.getToken();
      const storedRefresh = await storage.getRefreshToken();
      expect(storedToken).toBe(newValidToken);
      expect(storedRefresh).toBe(newRefreshToken);
    });

    it('3. clears invalid session and returns to login screen when refresh token is revoked/invalid', async () => {
      const expiredToken = createMockJwt(-3600);
      await storage.setToken(expiredToken);
      await storage.setRefreshToken('revoked-refresh-token');

      const { ApiError } = jest.requireActual('../src/services/api-client');
      jest.spyOn(authService, 'refresh').mockRejectedValue(
        new ApiError(401, 'UNAUTHENTICATED', 'Invalid or expired refresh token'),
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = await renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();

      // Ensure storage was cleared
      expect(await storage.getToken()).toBeNull();
      expect(await storage.getRefreshToken()).toBeNull();
    });

    it('4. preserves saved session when offline during startup verification', async () => {
      const validToken = createMockJwt(3600);
      await storage.setToken(validToken);
      await storage.setUser(mockAdminUser);

      // Network error reaching server
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network request failed'));
      global.fetch = mockFetch as unknown as typeof fetch;

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = await renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await Promise.resolve();
      });

      // User remains logged in offline!
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.id).toBe('user-1');
      expect(result.current.token).toBe(validToken);
      expect(await storage.getToken()).toBe(validToken);
    });

    it('5. explicit logout prevents automatic restoration on subsequent app restarts', async () => {
      jest.spyOn(authService, 'login').mockResolvedValue({
        accessToken: createMockJwt(3600),
        refreshToken: 'refresh-token-xyz',
        tokenType: 'Bearer',
        user: mockAdminUser,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result, unmount } = await renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('admin@example.com', 'password123');
      });
      expect(result.current.isAuthenticated).toBe(true);

      // Explicit logout
      await act(async () => {
        await result.current.logout();
      });
      expect(result.current.isAuthenticated).toBe(false);

      // Simulate app closure by unmounting and mounting a fresh AuthProvider
      unmount();

      const { result: restartedResult } = await renderHook(() => useAuth(), { wrapper });
      await act(async () => {
        await Promise.resolve();
      });

      expect(restartedResult.current.isAuthenticated).toBe(false);
      expect(restartedResult.current.user).toBeNull();
      expect(restartedResult.current.token).toBeNull();
    });
  });
});
