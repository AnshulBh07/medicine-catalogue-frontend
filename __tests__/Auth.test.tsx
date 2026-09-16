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
});
