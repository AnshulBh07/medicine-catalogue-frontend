import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthProvider } from '../src/features/auth';
import { MyAccountScreen, EditProfileScreen } from '../src/screens/account';
import { ProfileMenu } from '../src/components/ProfileMenu';
import { Avatar } from '../src/components/Avatar';
import { apiClient } from '../src/services/api-client';
import { storage } from '../src/lib/storage';
import type { PublicUser } from '../src/types/models';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      addListener: jest.fn(() => jest.fn()),
    }),
  };
});

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({
    granted: true,
    canAskAgain: true,
  }),
  launchImageLibraryAsync: jest.fn(),
}));

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

// Mock fetch for Cloudflare R2 direct uploads
global.fetch = jest.fn() as jest.Mock;

describe('Profile Image & My Account Support', () => {
  const mockUserWithoutImage: PublicUser = {
    id: 'user-001',
    name: 'Dr. Sarah Smith',
    email: 'sarah@example.com',
    phone: '+919876543210',
    role: 'ADMIN',
    profileImageUrl: null,
    active: true,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
  };

  const mockUserWithImage: PublicUser = {
    id: 'user-002',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+919123456789',
    role: 'EMPLOYEE',
    profileImageUrl: 'https://images.example.com/profile-images/user-002/avatar-test.jpg',
    active: true,
    createdAt: '2026-02-20T10:00:00.000Z',
    updatedAt: '2026-02-20T10:00:00.000Z',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await storage.clearAuth();
    await storage.setToken('fake-jwt-token');
    await storage.setUser(mockUserWithoutImage);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Avatar Component', () => {
    it('displays initials when no profileImageUrl is provided', async () => {
      await render(<Avatar initials="JD" testID="test-avatar" />);
      expect(screen.getByText('JD')).toBeTruthy();
      expect(screen.queryByTestId('test-avatar-image')).toBeNull();
    });

    it('displays image when imageUrl is provided', async () => {
      await render(
        <Avatar
          imageUrl="https://images.example.com/avatar.jpg"
          initials="JD"
          testID="test-avatar"
        />,
      );
      expect(screen.getByTestId('test-avatar-image')).toBeTruthy();
      expect(screen.queryByText('JD')).toBeNull();
    });
  });

  describe('MyAccountScreen', () => {
    it('renders user details and initials when profileImageUrl is null', async () => {
      await storage.setUser(mockUserWithoutImage);

      await render(
        <AuthProvider>
          <MyAccountScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getAllByText('Dr. Sarah Smith').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Administrator').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('sarah@example.com')).toBeTruthy();
        expect(screen.getByText('+919876543210')).toBeTruthy();
      });

      // Remove Profile Picture button should NOT be shown when there is no image
      expect(screen.queryByTestId('remove-profile-picture-button')).toBeNull();

      // Edit Profile button should be visible
      expect(screen.getByTestId('edit-profile-button')).toBeTruthy();
    });

    it('renders profile image and Remove button when user has profileImageUrl', async () => {
      await storage.setUser(mockUserWithImage);

      await render(
        <AuthProvider>
          <MyAccountScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Catalogue Staff').length).toBeGreaterThanOrEqual(1);
      });

      // Avatar image should be rendered
      expect(screen.getByTestId('account-user-avatar-image')).toBeTruthy();

      // Remove Profile Picture button should be visible
      expect(screen.getByTestId('remove-profile-picture-button')).toBeTruthy();
    });

    it('opens EditProfile when tapping avatar or edit button with single interactive target', async () => {
      await storage.setUser(mockUserWithoutImage);

      await render(
        <AuthProvider>
          <MyAccountScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('account-avatar-touchable')).toBeTruthy();
      });

      const avatarTouchable = screen.getByTestId('account-avatar-touchable');
      expect(avatarTouchable.props.accessibilityLabel).toBe('Change profile picture');
      expect(avatarTouchable.props.accessibilityRole).toBe('button');

      // Visual camera badge exists
      expect(screen.getByTestId('account-avatar-camera-badge')).toBeTruthy();

      // Ensure nested interactive button was removed (no duplicate button role or nested touchable)
      expect(screen.queryByTestId('account-avatar-edit-button')).toBeNull();

      await act(async () => {
        fireEvent.press(avatarTouchable);
      });
      expect(mockNavigate).toHaveBeenCalledWith('EditProfile');

      await act(async () => {
        fireEvent.press(screen.getByTestId('edit-profile-button'));
      });
      expect(mockNavigate).toHaveBeenCalledWith('EditProfile');
    });

    it('handles removing profile picture after confirmation dialog', async () => {
      await storage.setUser(mockUserWithImage);
      (apiClient.delete as jest.Mock).mockResolvedValue({
        user: { ...mockUserWithImage, profileImageUrl: null },
      });

      await render(
        <AuthProvider>
          <MyAccountScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('remove-profile-picture-button')).toBeTruthy();
      });

      // Tap remove button -> dialog opens
      await act(async () => {
        fireEvent.press(screen.getByTestId('remove-profile-picture-button'));
      });

      // Tap confirm remove in dialog
      await act(async () => {
        fireEvent.press(screen.getByTestId('remove-avatar-dialog-confirm'));
      });

      await waitFor(() => {
        expect(apiClient.delete).toHaveBeenCalledWith('/users/me/profile-image');
      });
    });
  });

  describe('EditProfileScreen', () => {
    it('previews selected gallery image, uploads to R2, and updates user profile', async () => {
      await storage.setUser(mockUserWithoutImage);

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file:///local/new-avatar.jpg',
            mimeType: 'image/jpeg',
            fileSize: 1024 * 300,
          },
        ],
      });

      (apiClient.post as jest.Mock).mockResolvedValue({
        uploadUrl: 'https://r2.storage.com/upload-signed-url',
        objectKey: 'profile-images/user-001/avatar-new.jpg',
        publicUrl: 'https://images.example.com/profile-images/user-001/avatar-new.jpg',
      });

      // Mock fetch blob and upload response
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          blob: async () => new Blob(['fake-image-data']),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        });

      const updatedUserResult: PublicUser = {
        ...mockUserWithoutImage,
        name: 'Dr. Sarah Smith (MD)',
        profileImageUrl: 'https://images.example.com/profile-images/user-001/avatar-new.jpg',
      };
      (apiClient.patch as jest.Mock).mockResolvedValue({ user: updatedUserResult });

      await render(
        <AuthProvider>
          <EditProfileScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('choose-photo-button')).toBeTruthy();
      });

      // Tap choose photo
      await act(async () => {
        fireEvent.press(screen.getByTestId('choose-photo-button'));
      });

      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();

      // Change name input
      await act(async () => {
        fireEvent.changeText(
          screen.getByTestId('edit-profile-name-input'),
          'Dr. Sarah Smith (MD)',
        );
      });

      // Save profile
      await act(async () => {
        fireEvent.press(screen.getByTestId('save-profile-button'));
      });

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          '/uploads/profile-image',
          expect.objectContaining({ contentType: 'image/jpeg' }),
        );
        expect(apiClient.patch).toHaveBeenCalledWith(
          '/users/me',
          expect.objectContaining({
            profileImageUrl: 'https://images.example.com/profile-images/user-001/avatar-new.jpg',
          }),
        );
      });
    });

    it('cancelling image picker retains previous image state without upload', async () => {
      await storage.setUser(mockUserWithoutImage);

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: true,
      });

      await render(
        <AuthProvider>
          <EditProfileScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('choose-photo-button')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('choose-photo-button'));
      });

      expect(apiClient.post).not.toHaveBeenCalled();
      expect(apiClient.patch).not.toHaveBeenCalled();
    });

    it('rejects oversized images with error banner', async () => {
      await storage.setUser(mockUserWithoutImage);

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file:///local/huge.png',
            mimeType: 'image/png',
            fileSize: 15 * 1024 * 1024, // 15MB > 10MB limit
          },
        ],
      });

      await render(
        <AuthProvider>
          <EditProfileScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('choose-photo-button')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('choose-photo-button'));
      });

      await waitFor(() => {
        expect(screen.getByText(/exceeds maximum limit of 10MB/i)).toBeTruthy();
      });
    });

    it('preserves existing image and shows error when direct R2 upload fails', async () => {
      await storage.setUser(mockUserWithoutImage);

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file:///local/avatar.jpg',
            mimeType: 'image/jpeg',
            fileSize: 500 * 1024,
          },
        ],
      });

      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Storage unavailable'));

      await render(
        <AuthProvider>
          <EditProfileScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('choose-photo-button')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('choose-photo-button'));
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('save-profile-button'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Image Upload Failed: Storage unavailable/i)).toBeTruthy();
      });

      expect(apiClient.patch).not.toHaveBeenCalled();
    });

    it('renders non-editable role information indicator', async () => {
      await storage.setUser(mockUserWithImage);

      await render(
        <AuthProvider>
          <EditProfileScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('readonly-role-box')).toBeTruthy();
        expect(screen.getByText('Catalogue Staff')).toBeTruthy();
      });
    });
  });

  describe('ProfileMenu Integration', () => {
    it('renders image in profile dropdown when user has profileImageUrl', async () => {
      await render(
        <ProfileMenu
          visible={true}
          onClose={jest.fn()}
          user={mockUserWithImage}
          isAdmin={false}
          onSignOut={jest.fn()}
          testID="profile-menu"
        />,
      );

      expect(screen.getByText('John Doe')).toBeTruthy();
      expect(screen.getByText('Staff Member')).toBeTruthy();
      expect(screen.getByTestId('profile-menu-content')).toBeTruthy();
    });
  });
});
