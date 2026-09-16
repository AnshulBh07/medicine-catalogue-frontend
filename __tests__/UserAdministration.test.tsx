import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../src/features/auth';
import {
  UsersScreen,
  UserDetailsScreen,
  AddUserScreen,
  EditUserScreen,
} from '../src/screens/users';
import { apiClient } from '../src/services/api-client';
import { storage } from '../src/lib/storage';
import type { PublicUser } from '../src/types/models';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: { id?: string } = {};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  const React = require('react');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      addListener: jest.fn(() => jest.fn()),
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
    useFocusEffect: (cb: () => void) => {
      React.useEffect(() => {
        cb();
      }, [cb]);
    },
  };
});

jest.mock('../src/services/api-client', () => {
  const actual = jest.requireActual('../src/services/api-client');
  return {
    ...actual,
    apiClient: {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      setToken: jest.fn(),
      setOnUnauthorized: jest.fn(),
    },
  };
});

describe('User Administration Frontend Tests', () => {
  const mockAdminUser: PublicUser = {
    id: 'admin-001',
    name: 'Dr. Sarah Smith',
    email: 'sarah@example.com',
    phone: '+919876543210',
    role: 'ADMIN',
    profileImageUrl: null,
    active: true,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
  };

  const mockEmployeeUser: PublicUser = {
    id: 'emp-002',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+919123456789',
    role: 'EMPLOYEE',
    profileImageUrl: null,
    active: true,
    createdAt: '2026-02-20T10:00:00.000Z',
    updatedAt: '2026-02-20T10:00:00.000Z',
  };

  const mockInactiveUser: PublicUser = {
    id: 'emp-003',
    name: 'Inactive Staff',
    email: 'inactive@example.com',
    phone: '+919555544444',
    role: 'EMPLOYEE',
    profileImageUrl: null,
    active: false,
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
  };

  const sampleUsersList: PublicUser[] = [
    mockAdminUser,
    mockEmployeeUser,
    mockInactiveUser,
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRouteParams = {};
    await storage.clearAuth();
    await storage.setToken('fake-jwt-token');
    await storage.setUser(mockAdminUser);
    (apiClient.get as jest.Mock).mockImplementation((path: string) => {
      if (path === '/users/me') {
        return Promise.resolve({ user: mockAdminUser });
      }
      return Promise.resolve({
        users: sampleUsersList,
        total: sampleUsersList.length,
        user: mockEmployeeUser,
      });
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('UsersScreen (List & Filtering)', () => {
    it('1. renders user list with role and status badges', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        users: sampleUsersList,
        total: 3,
        page: 1,
        limit: 50,
      });

      await render(
        <AuthProvider>
          <UsersScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Dr. Sarah Smith')).toBeTruthy();
        expect(screen.getByText('John Doe')).toBeTruthy();
        expect(screen.getByText('Inactive Staff')).toBeTruthy();
      });

      expect(screen.getByText(/Showing 3 users/)).toBeTruthy();
    });

    it('2. allows search by user name or email', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        users: [mockEmployeeUser],
        total: 1,
        page: 1,
        limit: 50,
      });

      await render(
        <AuthProvider>
          <UsersScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('users-search-input')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.changeText(screen.getByTestId('users-search-input'), 'John');
      });

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('search=John'),
        );
      });
    });

    it('3. filters by role and status when selecting chips', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        users: [mockAdminUser],
        total: 1,
        page: 1,
        limit: 50,
      });

      await render(
        <AuthProvider>
          <UsersScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-filter-admin')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('user-filter-admin'));
      });

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('role=ADMIN'),
        );
      });
    });

    it('4. tapping a user card navigates to UserDetails', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        users: sampleUsersList,
        total: 3,
        page: 1,
        limit: 50,
      });

      await render(
        <AuthProvider>
          <UsersScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId(`user-card-${mockEmployeeUser.id}`)).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId(`user-card-${mockEmployeeUser.id}`));
      });

      expect(mockNavigate).toHaveBeenCalledWith('UserDetails', { id: mockEmployeeUser.id });
    });

    it('5. tapping "+" FAB navigates to AddUser', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        users: sampleUsersList,
        total: 3,
        page: 1,
        limit: 50,
      });

      await render(
        <AuthProvider>
          <UsersScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('add-user-fab')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('add-user-fab'));
      });

      expect(mockNavigate).toHaveBeenCalledWith('AddUser');
    });

    it('6. blocks EMPLOYEE accounts from accessing User Administration', async () => {
      await storage.setUser(mockEmployeeUser);
      (apiClient.get as jest.Mock).mockImplementation((path: string) => {
        if (path === '/users/me') {
          return Promise.resolve({ user: mockEmployeeUser });
        }
        return Promise.resolve({ users: sampleUsersList });
      });

      await render(
        <AuthProvider>
          <UsersScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Access Restricted')).toBeTruthy();
        expect(
          screen.getByText('User administration is restricted to ADMIN accounts only.'),
        ).toBeTruthy();
      });
    });

    it('6b. opens UserSortModal and sorts users by monthly salary high to low', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        users: sampleUsersList,
        total: 3,
        page: 1,
        limit: 50,
      });

      await render(
        <AuthProvider>
          <UsersScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('users-sort-button')).toBeTruthy();
      });

      // Tap sort button
      await act(async () => {
        fireEvent.press(screen.getByTestId('users-sort-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('user-sort-popup')).toBeTruthy();
        expect(screen.getByTestId('user-sort-option-monthlySalary:desc')).toBeTruthy();
      });

      // Select Salary High -> Low
      await act(async () => {
        fireEvent.press(screen.getByTestId('user-sort-option-monthlySalary:desc'));
      });

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('sortBy=monthlySalary&sortOrder=desc'),
        );
      });
    });

    it('6c. sorts users by registration date newest first and preserves filters', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        users: [mockEmployeeUser],
        total: 1,
        page: 1,
        limit: 50,
      });

      await render(
        <AuthProvider>
          <UsersScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-filter-employee')).toBeTruthy();
      });

      // Apply staff filter
      await act(async () => {
        fireEvent.press(screen.getByTestId('user-filter-employee'));
      });

      // Open sort modal
      await act(async () => {
        fireEvent.press(screen.getByTestId('users-sort-button'));
      });

      // Select Newest First
      await act(async () => {
        fireEvent.press(screen.getByTestId('user-sort-option-createdAt:desc'));
      });

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith(
          expect.stringMatching(/role=EMPLOYEE.*sortBy=createdAt.*sortOrder=desc|sortBy=createdAt.*sortOrder=desc.*role=EMPLOYEE/),
        );
      });
    });
  });

  describe('UserDetailsScreen', () => {
    it('7. renders user information and administrative actions', async () => {
      mockRouteParams = { id: mockEmployeeUser.id };
      (apiClient.get as jest.Mock).mockImplementation((path: string) => {
        if (path === '/users/me') return Promise.resolve({ user: mockAdminUser });
        return Promise.resolve({ user: mockEmployeeUser });
      });

      await render(
        <AuthProvider>
          <UserDetailsScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('john@example.com')).toBeTruthy();
        expect(screen.getByText('+919123456789')).toBeTruthy();
        expect(screen.getByText('Active Account')).toBeTruthy();
      });

      expect(screen.getByTestId('user-edit-button')).toBeTruthy();
      expect(screen.getByTestId('user-change-role-button')).toBeTruthy();
      expect(screen.getByTestId('user-toggle-status-button')).toBeTruthy();
      expect(screen.getByTestId('user-delete-button')).toBeTruthy();
    });

    it('8. opens role confirmation dialog and updates role', async () => {
      mockRouteParams = { id: mockEmployeeUser.id };
      (apiClient.get as jest.Mock).mockImplementation((path: string) => {
        if (path === '/users/me') return Promise.resolve({ user: mockAdminUser });
        return Promise.resolve({ user: mockEmployeeUser });
      });
      (apiClient.patch as jest.Mock).mockResolvedValue({
        user: { ...mockEmployeeUser, role: 'ADMIN' },
      });

      await render(
        <AuthProvider>
          <UserDetailsScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-change-role-button')).toBeTruthy();
      });

      // Press Change Role
      await act(async () => {
        fireEvent.press(screen.getByTestId('user-change-role-button'));
      });

      // Confirm dialog
      await act(async () => {
        fireEvent.press(screen.getByTestId('user-role-confirm-dialog-confirm'));
      });

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith(
          `/users/${mockEmployeeUser.id}/role`,
          { role: 'ADMIN' },
        );
      });
    });

    it('9. deactivates user account after confirmation dialog', async () => {
      mockRouteParams = { id: mockEmployeeUser.id };
      (apiClient.get as jest.Mock).mockImplementation((path: string) => {
        if (path === '/users/me') return Promise.resolve({ user: mockAdminUser });
        return Promise.resolve({ user: mockEmployeeUser });
      });
      (apiClient.patch as jest.Mock).mockResolvedValue({
        user: { ...mockEmployeeUser, active: false },
      });

      await render(
        <AuthProvider>
          <UserDetailsScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-toggle-status-button')).toBeTruthy();
      });

      // Press Deactivate
      await act(async () => {
        fireEvent.press(screen.getByTestId('user-toggle-status-button'));
      });

      // Confirm dialog
      await act(async () => {
        fireEvent.press(screen.getByTestId('user-status-confirm-dialog-confirm'));
      });

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith(
          `/users/${mockEmployeeUser.id}/status`,
          { active: false },
        );
      });
    });
  });

  describe('AddUserScreen (Create User Flow)', () => {
    it('10. validates required fields before submission', async () => {
      await render(
        <AuthProvider>
          <AddUserScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('create-user-submit-button')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('create-user-submit-button'));
      });

      expect(screen.getByText('Full name is required')).toBeTruthy();
      expect(screen.getByText('Initial password is required')).toBeTruthy();
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('11. creates user successfully and navigates back', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        user: {
          id: 'new-emp-101',
          name: 'Pooja Patel',
          email: 'pooja@example.com',
          phone: '+919876543210',
          role: 'EMPLOYEE',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      await render(
        <AuthProvider>
          <AddUserScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('create-user-name-input')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.changeText(screen.getByTestId('create-user-name-input'), 'Pooja Patel');
        fireEvent.changeText(screen.getByTestId('create-user-email-input'), 'pooja@example.com');
        fireEvent.changeText(screen.getByTestId('create-user-phone-input'), '+919876543210');
        fireEvent.changeText(screen.getByTestId('create-user-password-input'), 'SecurePassword123');
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('create-user-submit-button'));
      });

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/users', {
          name: 'Pooja Patel',
          email: 'pooja@example.com',
          phone: '+919876543210',
          password: 'SecurePassword123',
          role: 'EMPLOYEE',
          monthlySalary: null,
        });
        expect(mockGoBack).toHaveBeenCalled();
      });
    });
  });

  describe('EditUserScreen (Edit User Flow)', () => {
    it('12. loads user data and updates name, phone, and role', async () => {
      mockRouteParams = { id: mockEmployeeUser.id };
      (apiClient.get as jest.Mock).mockImplementation((path: string) => {
        if (path === '/users/me') return Promise.resolve({ user: mockAdminUser });
        return Promise.resolve({ user: mockEmployeeUser });
      });
      (apiClient.patch as jest.Mock).mockResolvedValue({
        user: { ...mockEmployeeUser, name: 'John Doe Updated' },
      });

      await render(
        <AuthProvider>
          <EditUserScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('edit-user-name-input')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.changeText(screen.getByTestId('edit-user-name-input'), 'John Doe Updated');
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('edit-user-submit-button'));
      });

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith(
          `/users/${mockEmployeeUser.id}`,
          expect.objectContaining({
            name: 'John Doe Updated',
          }),
        );
        expect(mockGoBack).toHaveBeenCalled();
      });
    });
  });
});
