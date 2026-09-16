import React from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../src/features/auth';
import { storage } from '../src/lib/storage';
import { DashboardScreen } from '../src/screens/dashboard/DashboardScreen';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  const actualReact = jest.requireActual<typeof React>('react');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
      dispatch: jest.fn(),
    }),
    useFocusEffect: (cb: () => void | (() => void)) => {
      actualReact.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [cb]);
    },
  };
});

const mockAdminUser = {
  id: 'admin-1',
  name: 'Admin Master',
  email: 'admin@example.com',
  phone: '+919876543210',
  role: 'ADMIN' as const,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('DashboardScreen Visual & Functional Verification', () => {
  beforeEach(async () => {
    await storage.clearAuth();
    await storage.setToken('test-token');
    await storage.setUser(mockAdminUser);
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all Dashboard sections matching visual reference', async () => {
    const { getByTestId, getByText, getAllByText, queryByText } = await render(
      <AuthProvider>
        <DashboardScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByText('Admin Master')).toBeTruthy();
      expect(getByText('Administrator')).toBeTruthy();
    });

    // 1. Header
    expect(getByTestId('dashboard-header-logo')).toBeTruthy();
    expect(getByText('A.P. PHARMACY')).toBeTruthy();
    expect(getByText('Medicine Catalogue System')).toBeTruthy();
    expect(getByTestId('dashboard-avatar-button')).toBeTruthy();

    // 2. Welcome Card (shows name & role; no duplicate ADMIN badge in top-right)
    expect(getByText('Welcome back,')).toBeTruthy();
    expect(getByText('Admin Master')).toBeTruthy();
    expect(getByText('Administrator')).toBeTruthy();
    expect(queryByText('ADMIN')).toBeNull();

    // 3. Quick Actions
    expect(getByText('Quick Actions')).toBeTruthy();
    expect(getByText('Shortage Notes')).toBeTruthy();
    expect(getByText('Medicines')).toBeTruthy();
    expect(getByText('MR Registry')).toBeTruthy();
    expect(getByText('Manufacturers')).toBeTruthy();
    expect(getByText('Compositions')).toBeTruthy();
    expect(getByText('Salts')).toBeTruthy();
    expect(queryByText('Batches')).toBeNull();

    // 4. Recent Activity (Reference 1)
    expect(getByText('Recent Activity')).toBeTruthy();
    expect(getByText('Added new medicine')).toBeTruthy();
    expect(getByText('Paracetamol 650mg')).toBeTruthy();
    expect(getByText('Updated composition')).toBeTruthy();
    expect(getByText('Amoxicillin + Clavulanic Acid')).toBeTruthy();
    expect(getByText('Added manufacturer')).toBeTruthy();
    expect(getByText('Cipla Ltd.')).toBeTruthy();

    // 5. Admin Operations (Reference 2)
    expect(getByText('Admin Operations')).toBeTruthy();
    expect(getByText('Attendance & Salary')).toBeTruthy();
    expect(getByText('Users')).toBeTruthy();
    expect(getByText('Companies')).toBeTruthy();

    // 6. Recently Added (Reference 2)
    expect(getByText('Recently Added')).toBeTruthy();
    expect(getByText('Becosules Z Capsule')).toBeTruthy();
    expect(getByText('Multivitamin with Zinc')).toBeTruthy();
    expect(getAllByText('Medicine').length).toBeGreaterThanOrEqual(1);
    expect(getByText('Ascoril D Plus Syrup 100ml')).toBeTruthy();
    expect(getByText('Benadryl Cough Syrup 100ml')).toBeTruthy();
    expect(getByText(/Last updated:/)).toBeTruthy();
    expect(getByText(/"Better Care Through Knowledge"/)).toBeTruthy();
  });

  it('handles navigation for all Quick Actions and Admin Operations', async () => {
    const { getByLabelText, getByText } = await render(
      <AuthProvider>
        <DashboardScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByText('Admin Master')).toBeTruthy();
      expect(getByText('Quick Actions')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByLabelText('Medicines'));
    });
    expect(mockNavigate).toHaveBeenCalledWith('MainTabs', { screen: 'MedicinesTab' });

    await act(async () => {
      fireEvent.press(getByLabelText('MR Registry'));
    });
    expect(mockNavigate).toHaveBeenCalledWith('MainTabs', { screen: 'MrsTab' });

    await act(async () => {
      fireEvent.press(getByLabelText('Manufacturers'));
    });
    expect(mockNavigate).toHaveBeenCalledWith('Manufacturers');

    await act(async () => {
      fireEvent.press(getByLabelText('Compositions'));
    });
    expect(mockNavigate).toHaveBeenCalledWith('Compositions');

    await act(async () => {
      fireEvent.press(getByLabelText('Salts'));
    });
    expect(mockNavigate).toHaveBeenCalledWith('Salts');

    await act(async () => {
      fireEvent.press(getByLabelText('Manage user accounts'));
    });
    expect(mockNavigate).toHaveBeenCalledWith('Users');
  });

  it('toggles profile menu when avatar is tapped and dismissed', async () => {
    const { getByTestId, queryByTestId, getByText } = await render(
      <AuthProvider>
        <DashboardScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByText('Admin Master')).toBeTruthy();
      expect(getByText('Administrator')).toBeTruthy();
    });

    expect(queryByTestId('dashboard-profile-menu-content')).toBeNull();

    // 1. Tapping avatar opens ProfileMenu
    await act(async () => {
      fireEvent.press(getByTestId('dashboard-avatar-button'));
    });
    await waitFor(() => {
      expect(getByTestId('dashboard-profile-menu-content')).toBeTruthy();
      expect(getByTestId('dashboard-profile-menu-item-my-account')).toBeTruthy();
      expect(getByTestId('dashboard-profile-menu-item-settings')).toBeTruthy();
      expect(getByTestId('dashboard-profile-menu-item-admin-panel')).toBeTruthy();
      expect(getByTestId('dashboard-profile-menu-item-sign-out')).toBeTruthy();
    });

    // 2. Tapping backdrop dismisses the menu
    await act(async () => {
      fireEvent.press(getByTestId('dashboard-profile-menu-backdrop'));
    });
    await waitFor(() => {
      expect(queryByTestId('dashboard-profile-menu-content')).toBeNull();
    });

    // 3. Tapping avatar opens, then tapping avatar again closes it
    await act(async () => {
      fireEvent.press(getByTestId('dashboard-avatar-button'));
    });
    await waitFor(() => {
      expect(getByTestId('dashboard-profile-menu-content')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('dashboard-avatar-button'));
    });
    await waitFor(() => {
      expect(queryByTestId('dashboard-profile-menu-content')).toBeNull();
    });
  });

  it('handles Admin Panel navigation for ADMIN user', async () => {
    const { getByTestId, queryByTestId, getByText } = await render(
      <AuthProvider>
        <DashboardScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByText('Admin Master')).toBeTruthy();
      expect(getByText('Administrator')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('dashboard-avatar-button'));
    });
    await waitFor(() => {
      expect(getByTestId('dashboard-profile-menu-content')).toBeTruthy();
      expect(getByTestId('dashboard-profile-menu-item-admin-panel')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('dashboard-profile-menu-item-admin-panel'));
    });
    await waitFor(() => {
      expect(queryByTestId('dashboard-profile-menu-content')).toBeNull();
    });
    expect(mockNavigate).toHaveBeenCalledWith('Users');
  });

  it('hides Admin Panel for EMPLOYEE user', async () => {
    const mockEmployeeUser = {
      ...mockAdminUser,
      id: 'emp-1',
      name: 'Employee Staff',
      role: 'EMPLOYEE' as const,
    };
    await storage.setUser(mockEmployeeUser);

    const { getByTestId, queryByTestId, queryByText, getByText } = await render(
      <AuthProvider>
        <DashboardScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByText('Employee Staff')).toBeTruthy();
      expect(getByText('Catalogue Staff')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('dashboard-avatar-button'));
    });
    await waitFor(() => {
      expect(getByTestId('dashboard-profile-menu-content')).toBeTruthy();
      expect(getByTestId('dashboard-profile-menu-item-my-account')).toBeTruthy();
      expect(getByTestId('dashboard-profile-menu-item-settings')).toBeTruthy();
    });
    expect(queryByTestId('dashboard-profile-menu-item-admin-panel')).toBeNull();
    expect(queryByText('Admin Panel')).toBeNull();
    expect(getByTestId('dashboard-profile-menu-item-sign-out')).toBeTruthy();
  });

  it('handles My Account and Settings menu item actions', async () => {
    const { getByTestId, queryByTestId, getByText } = await render(
      <AuthProvider>
        <DashboardScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByText('Admin Master')).toBeTruthy();
      expect(getByText('Administrator')).toBeTruthy();
    });

    // Tap My Account -> closes menu cleanly
    await act(async () => {
      fireEvent.press(getByTestId('dashboard-avatar-button'));
    });
    await waitFor(() => {
      expect(getByTestId('dashboard-profile-menu-content')).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(getByTestId('dashboard-profile-menu-item-my-account'));
    });
    await waitFor(() => {
      expect(queryByTestId('dashboard-profile-menu-content')).toBeNull();
    });

    // Tap Settings -> closes menu cleanly
    await act(async () => {
      fireEvent.press(getByTestId('dashboard-avatar-button'));
    });
    await waitFor(() => {
      expect(getByTestId('dashboard-profile-menu-content')).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(getByTestId('dashboard-profile-menu-item-settings'));
    });
    await waitFor(() => {
      expect(queryByTestId('dashboard-profile-menu-content')).toBeNull();
    });
  });

  it('handles Sign Out confirmation flow from ProfileMenu (cancel and confirm)', async () => {
    const { getByTestId, queryByTestId, queryByText, getByText } = await render(
      <AuthProvider>
        <DashboardScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByText('Admin Master')).toBeTruthy();
      expect(getByText('Administrator')).toBeTruthy();
    });

    // 1. Open ProfileMenu and press Sign Out
    await act(async () => {
      fireEvent.press(getByTestId('dashboard-avatar-button'));
    });
    await waitFor(() => {
      expect(getByTestId('dashboard-profile-menu-content')).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(getByTestId('dashboard-profile-menu-item-sign-out'));
    });

    // ProfileMenu closes and ConfirmDialog opens
    await waitFor(() => {
      expect(queryByTestId('dashboard-profile-menu-content')).toBeNull();
      expect(getByText('Are you sure you want to sign out of the Medicine Catalogue app?')).toBeTruthy();
    });

    // 2. Cancel Sign Out -> remains logged in
    await act(async () => {
      fireEvent.press(getByTestId('dashboard-logout-dialog-cancel'));
    });
    await waitFor(() => {
      expect(queryByText('Are you sure you want to sign out of the Medicine Catalogue app?')).toBeNull();
    });
    expect(await storage.getToken()).toBe('test-token');

    // 3. Open ProfileMenu, press Sign Out, and Confirm
    await act(async () => {
      fireEvent.press(getByTestId('dashboard-avatar-button'));
    });
    await waitFor(() => {
      expect(getByTestId('dashboard-profile-menu-content')).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(getByTestId('dashboard-profile-menu-item-sign-out'));
    });
    await waitFor(() => {
      expect(getByText('Are you sure you want to sign out of the Medicine Catalogue app?')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('dashboard-logout-dialog-confirm'));
    });

    await waitFor(async () => {
      expect(await storage.getToken()).toBeNull();
    });
  });
});
