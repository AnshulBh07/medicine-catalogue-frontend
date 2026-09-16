import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { ProfileMenu } from '../src/components/ProfileMenu';
import type { PublicUser } from '../src/types/models';

const mockAdminUser: PublicUser = {
  id: 'admin-1',
  name: 'Admin Boss',
  email: 'admin@example.com',
  phone: '+919876543210',
  role: 'ADMIN',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockEmployeeUser: PublicUser = {
  id: 'emp-1',
  name: 'Staff User',
  email: 'staff@example.com',
  phone: '+919876543211',
  role: 'EMPLOYEE',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ProfileMenu Component', () => {
  const mockOnClose = jest.fn();
  const mockOnNavigateMyAccount = jest.fn();
  const mockOnNavigateSettings = jest.fn();
  const mockOnNavigateAdminPanel = jest.fn();
  const mockOnSignOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('1. renders correctly for ADMIN user with all options', async () => {
    await render(
      <ProfileMenu
        visible={true}
        onClose={mockOnClose}
        user={mockAdminUser}
        isAdmin={true}
        onNavigateMyAccount={mockOnNavigateMyAccount}
        onNavigateSettings={mockOnNavigateSettings}
        onNavigateAdminPanel={mockOnNavigateAdminPanel}
        onSignOut={mockOnSignOut}
        testID="profile-menu"
      />,
    );

    expect(screen.getByText('Admin Boss')).toBeTruthy();
    expect(screen.getByText('Administrator')).toBeTruthy();
    expect(screen.getByText('AB')).toBeTruthy();

    expect(screen.getByText('My Account')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('Admin Panel')).toBeTruthy();
    expect(screen.getByText('Sign Out')).toBeTruthy();
  });

  it('2. handles My Account press', async () => {
    await render(
      <ProfileMenu
        visible={true}
        onClose={mockOnClose}
        user={mockAdminUser}
        isAdmin={true}
        onNavigateMyAccount={mockOnNavigateMyAccount}
        onNavigateSettings={mockOnNavigateSettings}
        onNavigateAdminPanel={mockOnNavigateAdminPanel}
        onSignOut={mockOnSignOut}
        testID="profile-menu"
      />,
    );

    fireEvent.press(screen.getByTestId('profile-menu-item-my-account'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnNavigateMyAccount).toHaveBeenCalledTimes(1);
  });

  it('3. handles Settings press', async () => {
    await render(
      <ProfileMenu
        visible={true}
        onClose={mockOnClose}
        user={mockAdminUser}
        isAdmin={true}
        onNavigateMyAccount={mockOnNavigateMyAccount}
        onNavigateSettings={mockOnNavigateSettings}
        onNavigateAdminPanel={mockOnNavigateAdminPanel}
        onSignOut={mockOnSignOut}
        testID="profile-menu"
      />,
    );

    fireEvent.press(screen.getByTestId('profile-menu-item-settings'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnNavigateSettings).toHaveBeenCalledTimes(1);
  });

  it('4. handles Admin Panel press', async () => {
    await render(
      <ProfileMenu
        visible={true}
        onClose={mockOnClose}
        user={mockAdminUser}
        isAdmin={true}
        onNavigateMyAccount={mockOnNavigateMyAccount}
        onNavigateSettings={mockOnNavigateSettings}
        onNavigateAdminPanel={mockOnNavigateAdminPanel}
        onSignOut={mockOnSignOut}
        testID="profile-menu"
      />,
    );

    fireEvent.press(screen.getByTestId('profile-menu-item-admin-panel'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnNavigateAdminPanel).toHaveBeenCalledTimes(1);
  });

  it('5. handles Sign Out press', async () => {
    await render(
      <ProfileMenu
        visible={true}
        onClose={mockOnClose}
        user={mockAdminUser}
        isAdmin={true}
        onNavigateMyAccount={mockOnNavigateMyAccount}
        onNavigateSettings={mockOnNavigateSettings}
        onNavigateAdminPanel={mockOnNavigateAdminPanel}
        onSignOut={mockOnSignOut}
        testID="profile-menu"
      />,
    );

    fireEvent.press(screen.getByTestId('profile-menu-item-sign-out'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnSignOut).toHaveBeenCalledTimes(1);
  });

  it('6. closes menu when backdrop is pressed', async () => {
    await render(
      <ProfileMenu
        visible={true}
        onClose={mockOnClose}
        user={mockAdminUser}
        isAdmin={true}
        onNavigateMyAccount={mockOnNavigateMyAccount}
        onNavigateSettings={mockOnNavigateSettings}
        onNavigateAdminPanel={mockOnNavigateAdminPanel}
        onSignOut={mockOnSignOut}
        testID="profile-menu"
      />,
    );

    fireEvent.press(screen.getByTestId('profile-menu-backdrop'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('7. hides Admin Panel for non-admin EMPLOYEE user', async () => {
    await render(
      <ProfileMenu
        visible={true}
        onClose={mockOnClose}
        user={mockEmployeeUser}
        isAdmin={false}
        onSignOut={mockOnSignOut}
        testID="profile-menu"
      />,
    );

    expect(screen.getByText('Staff User')).toBeTruthy();
    expect(screen.getByText('Staff Member')).toBeTruthy();
    expect(screen.getByText('SU')).toBeTruthy();

    expect(screen.getByText('My Account')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.queryByText('Admin Panel')).toBeNull();
    expect(screen.queryByTestId('profile-menu-item-admin-panel')).toBeNull();
    expect(screen.getByText('Sign Out')).toBeTruthy();
  });
});

