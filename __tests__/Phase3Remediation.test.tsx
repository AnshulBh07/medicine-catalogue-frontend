import React from 'react';
import { Alert, Linking } from 'react-native';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { AuthProvider, useAuth } from '../src/features/auth';
import { authService } from '../src/features/auth/authService';
import { storage } from '../src/lib/storage';
import { ApiError, apiClient } from '../src/services/api-client';
import {
  DEFAULT_LOCATION,
  resolveLocation,
} from '../src/services/location.service';
import { MedicineScannerModal } from '../src/screens/medicines/MedicineScannerModal';
import { EditProfileScreen } from '../src/screens/account/EditProfileScreen';
import { EditDealScreen } from '../src/screens/deals/EditDealScreen';
import { AddEditAlternativeScreen } from '../src/screens/medicine-alternatives/AddEditAlternativeScreen';
import { ManageMrMedicinesScreen } from '../src/screens/mrs/ManageMrMedicinesScreen';
import { MedicineDetailsScreen } from '../src/screens/medicines/MedicineDetailsScreen';
import { MedicinesScreen } from '../src/screens/medicines/MedicinesScreen';
import { CommercialDetailsScreen } from '../src/screens/commercial-details/CommercialDetailsScreen';
import type { PublicUser } from '../src/types/models';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockFocusListeners: Array<() => void> = [];
let mockRouteParams: Record<string, unknown> = { id: 'med-1', dealId: 'deal-1', mrId: 'mr-1', mrName: 'Ravi' };

const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  dispatch: jest.fn(),
  addListener: jest.fn((event: string, cb: () => void) => {
    if (event === 'focus') {
      mockFocusListeners.push(cb);
    }
    return () => {
      mockFocusListeners = mockFocusListeners.filter((l) => l !== cb);
    };
  }),
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
    useRoute: () => ({
      params: mockRouteParams,
    }),
    useFocusEffect: jest.fn(),
  };
});

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const mockAdminUser: PublicUser = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@appharmacy.com',
  phone: '+919876543210',
  role: 'ADMIN',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockEmployeeUser: PublicUser = {
  id: 'emp-1',
  name: 'Staff Member',
  email: 'staff@appharmacy.com',
  phone: '+919876543211',
  role: 'EMPLOYEE',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function createMockJwt(expDeltaSeconds: number, role: 'ADMIN' | 'EMPLOYEE' = 'ADMIN'): string {
  const exp = Math.floor(Date.now() / 1000) + expDeltaSeconds;
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({ sub: 'user-1', role, exp })).toString('base64');
  return `${header}.${payload}.sig`;
}

describe('Phase 3 Remediation — Mobile Regression Suite', () => {
  const originalFetch = global.fetch;

  beforeEach(async () => {
    await storage.clearAuth();
    await storage.clearSavedLocation();
    apiClient.setToken(null);
    apiClient.setOnUnauthorized(null);
    apiClient.setOnTokenRefreshed(null);
    mockFocusListeners = [];
    mockRouteParams = { id: 'med-1', dealId: 'deal-1', mrId: 'mr-1', mrName: 'Ravi' };
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    cleanup();
  });

  describe('F-017: Authentication Bootstrap & Race Condition Prevention', () => {
    it('prevents stale in-flight bootstrap from restoring session after explicit logout', async () => {
      const validToken = createMockJwt(3600);
      await storage.setToken(validToken);
      await storage.setUser(mockAdminUser);

      let resolveProfileFetch!: (val: unknown) => void;
      const profilePromise = new Promise((resolve) => {
        resolveProfileFetch = resolve;
      });

      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/users/me')) {
          return profilePromise;
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ success: true }),
        });
      }) as unknown as typeof fetch;

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = await renderHook(() => useAuth(), { wrapper });

      // Wait a tick for bootstrap to reach /users/me fetch
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      // Trigger logout while bootstrap /users/me is still in flight
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();

      // Now resolve the stale bootstrap /users/me request
      await act(async () => {
        resolveProfileFetch({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ user: mockAdminUser }),
        });
        await Promise.resolve();
        await Promise.resolve();
      });

      // Stale bootstrap MUST NOT re-authenticate logged-out user
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it('performs only ONE refresh attempt when startup /users/me returns 401 (no duplicate refresh/logout)', async () => {
      const validToken = createMockJwt(3600);
      await storage.setToken(validToken);
      await storage.setRefreshToken('revoked-refresh');
      await storage.setUser(mockAdminUser);

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ error: { code: 'UNAUTHENTICATED', message: 'Revoked' } }),
      }) as unknown as typeof fetch;

      const refreshSpy = jest
        .spyOn(authService, 'refresh')
        .mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Refresh token invalid'));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = await renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(refreshSpy).toHaveBeenCalledTimes(1);
      expect(result.current.isAuthenticated).toBe(false);
      expect(await storage.getToken()).toBeNull();
    });

    it('clears credentials in apiClient.refreshTokens on 403/404 and respects logout epoch', async () => {
      await storage.setRefreshToken('deactivated-user-refresh');
      const onUnauthorized = jest.fn();
      apiClient.setOnUnauthorized(onUnauthorized);

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ error: { code: 'FORBIDDEN', message: 'Account deactivated' } }),
      }) as unknown as typeof fetch;

      const refreshed = await apiClient.refreshTokens();
      expect(refreshed).toBeNull();
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      expect(await storage.getRefreshToken()).toBeNull();
    });

    it('unregisters apiClient callbacks on AuthProvider unmount', async () => {
      const setUnauthSpy = jest.spyOn(apiClient, 'setOnUnauthorized');
      const setRefreshSpy = jest.spyOn(apiClient, 'setOnTokenRefreshed');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { unmount } = await renderHook(() => useAuth(), { wrapper });
      await act(async () => {
        await Promise.resolve();
      });

      await unmount();

      expect(setUnauthSpy).toHaveBeenLastCalledWith(null);
      expect(setRefreshSpy).toHaveBeenLastCalledWith(null);
    });
  });

  describe('F-018: Mobile Role-Based Navigation & Screen Guards (EMPLOYEE vs ADMIN)', () => {
    const renderWithEmployeeAuth = async (element: React.ReactElement) => {
      const validToken = createMockJwt(3600, 'EMPLOYEE');
      await storage.setToken(validToken);
      await storage.setUser(mockEmployeeUser);

      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/users/me')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({ user: mockEmployeeUser }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () =>
            Promise.resolve({
              medicines: [],
              manufacturers: [],
              mrs: [],
              salts: [],
              compositions: [],
              medicine: {
                id: 'med-1',
                name: 'Paracetamol 500mg',
                composition: { id: 'c1', displayText: 'Paracetamol 500mg' },
                form: 'TABLET',
                packQuantity: 10,
                packUnit: 'TABLET',
                manufacturer: { id: 'm1', name: 'Acme' },
                active: true,
              },
            }),
        });
      }) as unknown as typeof fetch;

      return render(<AuthProvider>{element}</AuthProvider>);
    };

    it('hides Add Medicine FAB on MedicinesScreen and Edit button on MedicineDetailsScreen for EMPLOYEE', async () => {
      await renderWithEmployeeAuth(<MedicinesScreen />);
      await waitFor(() => {
        expect(screen.getByText('Medicines')).toBeTruthy();
      });
      expect(screen.queryByTestId('add-medicine-fab')).toBeNull();
      cleanup();

      await renderWithEmployeeAuth(<MedicineDetailsScreen />);
      await waitFor(() => {
        expect(screen.getByTestId('medicine-details-name')).toBeTruthy();
      });
      expect(screen.queryByTestId('app-header-right-button')).toBeNull();
    });

    it('blocks EMPLOYEE with Access Restricted and skips API fetches on EditDeal, AddEditAlternative, and ManageMrMedicines', async () => {
      const apiGetSpy = jest.spyOn(apiClient, 'get');

      await renderWithEmployeeAuth(<EditDealScreen />);
      await waitFor(() => {
        expect(screen.getByTestId('deals-access-restricted')).toBeTruthy();
      });
      expect(apiGetSpy).not.toHaveBeenCalledWith(expect.stringContaining('/deals/'), expect.anything());
      expect(apiGetSpy).not.toHaveBeenCalledWith(expect.stringContaining('/deals/'));
      cleanup();

      await renderWithEmployeeAuth(<AddEditAlternativeScreen />);
      await waitFor(() => {
        expect(screen.getByTestId('alternatives-access-restricted')).toBeTruthy();
      });
      cleanup();

      await renderWithEmployeeAuth(<ManageMrMedicinesScreen />);
      await waitFor(() => {
        expect(screen.getByTestId('mr-medicines-access-restricted')).toBeTruthy();
      });
      expect(apiGetSpy).not.toHaveBeenCalledWith(expect.stringContaining('/mrs/mr-1'));
    });
  });

  describe('F-029: Scanner Modal Lifecycle, Error Display & Cancel Guard', () => {
    it('disables remove photo button while scanning, renders inline error, and supports cancelling scan', async () => {
      const onRemovePhoto = jest.fn();
      const onCancelScan = jest.fn();

      await render(
        <MedicineScannerModal
          visible={true}
          onClose={jest.fn()}
          scannedPhotos={[{ uri: 'file://box.jpg', label: 'Front Packaging' }]}
          isScanningOcr={true}
          onCapturePhoto={jest.fn()}
          onRemovePhoto={onRemovePhoto}
          onProcessPhotos={jest.fn()}
          onCancelScan={onCancelScan}
          errorMessage="Camera permission is required."
        />,
      );

      // Inline error visible inside modal
      expect(screen.getByTestId('scanner-modal-error')).toBeTruthy();
      expect(screen.getByText('Camera permission is required.')).toBeTruthy();

      // Remove photo button disabled during scan
      fireEvent.press(screen.getByTestId('remove-photo-0'));
      expect(onRemovePhoto).not.toHaveBeenCalled();

      // Explicit cancel scan button works
      fireEvent.press(screen.getByTestId('btn-cancel-scanner-ocr'));
      expect(onCancelScan).toHaveBeenCalledTimes(1);
    });
  });

  describe('F-030: Location Timeout & Media Permission Recovery', () => {
    it('bounds slow GPS queries with a timeout and falls back cleanly to default location', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
        canAskAgain: true,
      });
      // Never-resolving GPS promise
      (Location.getCurrentPositionAsync as jest.Mock).mockImplementationOnce(
        () => new Promise(() => {}),
      );

      const result = await resolveLocation({ timeoutMs: 25 });
      expect(result.isFallback).toBe(true);
      expect(result.locationName).toBe(DEFAULT_LOCATION.locationName);
    });

    it('requests foreground permission only when explicitly opted-in and reports permanent denial', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
        canAskAgain: false,
      });

      const result = await resolveLocation({ requestPermission: true });
      expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
      expect(result.permissionStatus).toBe('permanently_denied');
      expect(result.isFallback).toBe(true);
    });

    it('blocks EditProfileScreen gallery launch on first denial and offers Settings recovery on permanent denial', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue();

      // Case 1: First denial (granted: false, canAskAgain: true) -> must NOT launch picker!
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        granted: false,
        canAskAgain: true,
      });

      await render(<EditProfileScreen />);
      const pickBtn = screen.getByTestId('choose-photo-button');
      await act(async () => {
        fireEvent.press(pickBtn);
      });

      expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
      expect(screen.getByText(/Photo gallery permission was denied/i)).toBeTruthy();

      // Case 2: Permanent denial (granted: false, canAskAgain: false) -> offers Open Settings
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        granted: false,
        canAskAgain: false,
      });

      await act(async () => {
        fireEvent.press(pickBtn);
      });

      expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        'Photo Library Permission Needed',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Open Settings' }),
        ]),
      );

      // Invoke Open Settings button callback
      const buttons = alertSpy.mock.calls[0]?.[2] as Array<{ text: string; onPress?: () => void }>;
      buttons?.find((b) => b.text === 'Open Settings')?.onPress?.();
      expect(openSettingsSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('F-033 & F-015: Request Timeouts, Deduplication & Search Debounce', () => {
    it('throws distinct 408 REQUEST_TIMEOUT ApiError when apiClient request exceeds timeoutMs', async () => {
      const onUnauthorized = jest.fn();
      apiClient.setOnUnauthorized(onUnauthorized);
      apiClient.setToken(createMockJwt(3600));

      global.fetch = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('Aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      }) as unknown as typeof fetch;

      await expect(apiClient.get('/medicines', { timeoutMs: 25 })).rejects.toMatchObject({
        statusCode: 408,
        code: 'REQUEST_TIMEOUT',
      });
      // Timeout must NEVER trigger auth logout
      expect(onUnauthorized).not.toHaveBeenCalled();
    });

    it('sends only ONE /medicines request on mount (no mount+focus duplicate) and ONE on sortBy=margin change', async () => {
      const apiGetSpy = jest.spyOn(apiClient, 'get').mockImplementation((path: string) => {
        if (path.startsWith('/medicines')) {
          return Promise.resolve({ medicines: [] });
        }
        return Promise.resolve({ manufacturers: [], mrs: [], salts: [], compositions: [] });
      });

      await render(<MedicinesScreen />);
      await waitFor(() => {
        expect(screen.getByTestId('medicines-sort-button')).toBeTruthy();
      });

      const initialMedCalls = apiGetSpy.mock.calls.filter(([p]) => p.startsWith('/medicines'));
      expect(initialMedCalls.length).toBe(1);

      // Simulate React Navigation emitting initial focus event right after mount
      await act(async () => {
        mockFocusListeners.forEach((cb) => cb());
        await Promise.resolve();
      });

      // Initial focus must NOT trigger a duplicate mount fetch
      const afterInitialFocusCalls = apiGetSpy.mock.calls.filter(([p]) => p.startsWith('/medicines'));
      expect(afterInitialFocusCalls.length).toBe(1);

      // Select sortBy=margin
      fireEvent.press(screen.getByTestId('medicines-sort-button'));
      await waitFor(() => {
        expect(screen.getByTestId('sort-option-margin:desc')).toBeTruthy();
      });
      fireEvent.press(screen.getByTestId('sort-option-margin:desc'));

      await waitFor(() => {
        const marginCalls = apiGetSpy.mock.calls.filter(([p]) =>
          p.includes('sortBy=margin&sortOrder=desc'),
        );
        expect(marginCalls.length).toBe(1);
      });
    });

    it('debounces CommercialDetailsScreen search and prevents duplicate requests per keystroke', async () => {
      jest.useFakeTimers();
      const apiGetSpy = jest.spyOn(apiClient, 'get').mockResolvedValue({ medicines: [] });

      await render(<CommercialDetailsScreen />);
      await act(async () => {
        await Promise.resolve();
      });

      const initialCount = apiGetSpy.mock.calls.length;
      expect(initialCount).toBe(1);

      const searchInput = screen.getByTestId('commercial-search-input');
      fireEvent.changeText(searchInput, 'P');
      fireEvent.changeText(searchInput, 'Pa');
      fireEvent.changeText(searchInput, 'Par');
      fireEvent.changeText(searchInput, 'Para');

      // Before debounce expires -> NO new API requests fired!
      expect(apiGetSpy.mock.calls.length).toBe(initialCount);

      // Advance past 300ms debounce -> exactly ONE search request for "Para"
      await act(async () => {
        jest.advanceTimersByTime(350);
        await Promise.resolve();
      });

      expect(apiGetSpy.mock.calls.length).toBe(initialCount + 1);
      expect(apiGetSpy.mock.calls[initialCount]?.[0]).toContain('search=Para');

      jest.useRealTimers();
    });
  });
});
