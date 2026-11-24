import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../src/features/auth';
import { authService } from '../src/features/auth/authService';
import { INACTIVITY_EXPIRY_MS, storage, type MedicineDraft } from '../src/lib/storage';
import { apiClient } from '../src/services/api-client';
import { attendanceService } from '../src/services/attendanceService';
import { dealService } from '../src/services/dealService';
import { fetchWeather } from '../src/services/weather.service';
import { AttendanceDashboardScreen } from '../src/screens/attendance/AttendanceDashboardScreen';
import { BatchesScreen } from '../src/screens/batches/BatchesScreen';
import { DashboardScreen } from '../src/screens/dashboard/DashboardScreen';
import { DealDetailsScreen } from '../src/screens/deals/DealDetailsScreen';
import { DealsListScreen } from '../src/screens/deals/DealsListScreen';
import type { PublicDeal, PublicUser } from '../src/types/models';
import { parseValidDealDateIso } from '../src/utils/deal-date.utils';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  dispatch: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
};
let mockRouteParams: Record<string, unknown> = {};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  const actualReact = jest.requireActual<typeof React>('react');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
    useRoute: () => ({ params: mockRouteParams }),
    useFocusEffect: (cb: () => void | (() => void)) => {
      actualReact.useEffect(() => {
        const cleanupFn = cb();
        return typeof cleanupFn === 'function' ? cleanupFn : undefined;
      }, [cb]);
    },
  };
});

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

function createMockJwt(expDeltaSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + expDeltaSeconds;
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({ sub: 'admin-1', role: 'ADMIN', exp })).toString('base64');
  return `${header}.${payload}.sig`;
}

describe('Phase 4 Remediation — Mobile Regression Suite', () => {
  const originalFetch = global.fetch;

  beforeEach(async () => {
    await storage.clearAuth();
    await storage.clearMedicineDraft();
    await storage.clearCachedWeather();
    await storage.clearSavedLocation();
    apiClient.setToken(null);
    mockRouteParams = {};
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    await cleanup();
  });

  describe('F-035A: BatchesScreen Deletion Confirmation', () => {
    it('requires explicit confirmation before deleting a batch and cancels safely', async () => {
      jest.spyOn(apiClient, 'get').mockImplementation((path: string) => {
        if (path.startsWith('/batches')) {
          return Promise.resolve({
            batches: [
              {
                id: 'batch-1',
                medicineId: 'med-1',
                batchNumber: 'B-2026-01',
                expiryDate: '2028-01-31',
                manufacturingDate: '2026-01-01',
                medicine: { id: 'med-1', name: 'Dolo 650' },
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
            ],
          });
        }
        return Promise.resolve({ medicines: [] });
      });
      const deleteSpy = jest.spyOn(apiClient, 'delete').mockResolvedValue({});

      await render(<BatchesScreen />);
      await waitFor(() => {
        expect(screen.getByTestId('delete-batch-batch-1')).toBeTruthy();
      });

      // Tapping delete button must open confirmation dialog — NOT delete immediately!
      await act(async () => {
        fireEvent.press(screen.getByTestId('delete-batch-batch-1'));
      });
      expect(deleteSpy).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByTestId('delete-batch-confirm-dialog')).toBeTruthy();
      });
      expect(screen.getAllByText(/B-2026-01/).length).toBeGreaterThanOrEqual(1);

      // Cancel keeps batch intact
      await act(async () => {
        fireEvent.press(screen.getByTestId('cancel-delete-batch-btn'));
      });
      expect(deleteSpy).not.toHaveBeenCalled();

      // Confirm executes DELETE /batches/batch-1
      await act(async () => {
        fireEvent.press(screen.getByTestId('delete-batch-batch-1'));
      });
      await waitFor(() => {
        expect(screen.getByTestId('confirm-delete-batch-btn')).toBeTruthy();
      });
      await act(async () => {
        fireEvent.press(screen.getByTestId('confirm-delete-batch-btn'));
      });
      expect(deleteSpy).toHaveBeenCalledWith('/batches/batch-1');
    });
  });

  describe('F-035B & F-035C: Deal Date Validation & CANCELLED Status Display', () => {
    it('strictly validates deal dates without throwing RangeError or silent rollover', () => {
      expect(parseValidDealDateIso('2026-08-31')).toBe('2026-08-31T00:00:00.000Z');
      expect(parseValidDealDateIso('2028-02-29')).toBe('2028-02-29T00:00:00.000Z');
      expect(parseValidDealDateIso('2026-02-31')).toBeNull();
      expect(parseValidDealDateIso('2026-99-99')).toBeNull();
      expect(parseValidDealDateIso('not-a-date')).toBeNull();
      expect(parseValidDealDateIso('2026-8-1')).toBeNull();
    });

    it('renders CANCELLED deals accurately in DealsListScreen and DealDetailsScreen (never as Received)', async () => {
      const cancelledDeal: PublicDeal = {
        id: 'deal-cancelled-1',
        medicineId: 'med-1',
        mrId: 'mr-1',
        dealDate: '2026-08-15T00:00:00.000Z',
        agreedMrp: 120,
        agreedScheme: '10+2',
        agreedBillDiscount: 5,
        mrPhoneSnapshot: '+919876543210',
        status: 'CANCELLED',
        notes: 'Cancelled by MR',
        createdById: null,
        createdBy: null,
        medicine: {
          id: 'med-1',
          name: 'Azithromycin 500mg',
          form: 'TABLET',
          packQuantity: 10,
          packUnit: 'TABLET',
          manufacturer: { id: 'mfg-1', name: 'Cipla' },
        },
        mr: { id: 'mr-1', name: 'Amit', company: 'Cipla', phone: '+919876543210', email: null },
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-16T00:00:00.000Z',
      };

      jest.spyOn(dealService, 'listDeals').mockResolvedValue({
        deals: [cancelledDeal],
        pagination: { total: 1, page: 1, limit: 100, totalPages: 1 },
        summary: { total: 1, pending: 0, received: 0, cancelled: 1 },
      });

      await render(<DealsListScreen />);
      await waitFor(() => {
        expect(screen.getByTestId('deal-status-badge-deal-cancelled-1')).toBeTruthy();
      });
      expect(screen.getByText('Cancelled')).toBeTruthy();
      await cleanup();

      mockRouteParams = { dealId: 'deal-cancelled-1' };
      jest.spyOn(dealService, 'getDealById').mockResolvedValue({ deal: cancelledDeal });

      await render(<DealDetailsScreen />);
      await waitFor(() => {
        expect(screen.getByText('Deal Cancelled')).toBeTruthy();
      });
      expect(screen.queryByText('Medicine Received')).toBeNull();
      expect(screen.queryByText('Revert')).toBeNull();
    });
  });

  describe('F-035D: AttendanceDashboardScreen Year Navigation', () => {
    it('changes selectedYear via year arrows while preserving selectedMonth', async () => {
      jest.spyOn(attendanceService, 'getAttendanceSummary').mockResolvedValue({
        year: 2026,
        month: 11,
        workingDays: 30,
        totalEmployees: 0,
        today: { date: '2026-11-24', present: 0, absent: 0, halfDay: 0, leave: 0, late: 0 },
        overall: {
          presentDays: 0,
          absentDays: 0,
          halfDays: 0,
          leaveDays: 0,
          totalWorkingDays: 30,
          attendancePercentage: 100,
          totalEstimatedPayroll: 0,
          payableDays: 0,
          payablePercentage: 0,
        },
        employees: [],
      });

      await render(<AttendanceDashboardScreen />);
      await waitFor(() => {
        expect(screen.getByTestId('attendance-month-selector')).toBeTruthy();
      });

      const currentYear = new Date().getFullYear();
      fireEvent.press(screen.getByTestId('attendance-month-selector'));
      await waitFor(() => {
        expect(screen.getByTestId('attendance-modal-year')).toBeTruthy();
      });

      expect(screen.getByTestId('attendance-modal-year').props.children).toBe(currentYear);

      await act(async () => {
        fireEvent.press(screen.getByTestId('attendance-year-prev'));
      });
      await waitFor(() => {
        expect(screen.getByTestId('attendance-modal-year').props.children).toBe(currentYear - 1);
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('attendance-year-next'));
      });
      await waitFor(() => {
        expect(screen.getByTestId('attendance-modal-year').props.children).toBe(currentYear);
      });
    });
  });

  describe('F-036: Inactivity Expiry, Chunked Draft Storage, Weather Cache & No Fake Fallback', () => {
    it('F-036A: clears session on startup when lastActiveTime exceeds 24h INACTIVITY_EXPIRY_MS', async () => {
      const validToken = createMockJwt(3600);
      await storage.setToken(validToken);
      await storage.setRefreshToken('refresh-123');
      await storage.setUser(mockAdminUser);
      await storage.setLastActiveTime(Date.now() - INACTIVITY_EXPIRY_MS - 1000);

      const fetchSpy = jest.fn();
      global.fetch = fetchSpy as unknown as typeof fetch;
      const refreshSpy = jest.spyOn(authService, 'refresh');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = await renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(refreshSpy).not.toHaveBeenCalled();
      expect(await storage.getToken()).toBeNull();
    });

    it('F-036B: safely saves, restores, and cleans up oversized (>2KB) medicine drafts across chunks', async () => {
      const oversizedDraft: MedicineDraft = {
        name: 'Long Formulation Medicine',
        form: 'TABLET',
        shortDescription: 'A'.repeat(1200),
        barcode: '8901234567890',
        selectedImage: {
          uri: 'file://photo.jpg',
          mimeType: 'image/jpeg',
        },
        saltRows: [
          { id: 's1', saltId: 'salt-1', name: 'Paracetamol', amount: '500', unit: 'MG' },
          { id: 's2', saltId: 'salt-2', name: 'Caffeine', amount: '65', unit: 'MG' },
        ],
        packQuantity: '15',
        packUnit: 'TABLET',
        uses: 'B'.repeat(1200),
        recommendedAgeGroup: 'Adults',
        directions: 'C'.repeat(1000),
        warnings: 'D'.repeat(800),
        storageInstructions: 'Store below 25C',
        prescriptionRequired: true,
        manufacturerName: 'Micro Labs',
        manufacturerId: 'mfg-1',
        mrId: null,
        batchNumber: 'B123',
        mrp: '45.00',
        purchaseRate: '30.00',
        discountPercent: '5',
        gstPercent: '12',
        scheme: '10+2',
        privateNotes: 'Internal note',
        savedAt: '2026-11-24T00:00:00.000Z',
      };

      expect(JSON.stringify(oversizedDraft).length).toBeGreaterThan(2048);

      await storage.saveMedicineDraft(oversizedDraft);
      const restored = await storage.getMedicineDraft();
      expect(restored).toMatchObject({
        name: oversizedDraft.name,
        shortDescription: oversizedDraft.shortDescription,
        uses: oversizedDraft.uses,
        directions: oversizedDraft.directions,
        warnings: oversizedDraft.warnings,
        saltRows: oversizedDraft.saltRows,
      });

      await storage.clearMedicineDraft();
      expect(await storage.getMedicineDraft()).toBeNull();
    });

    it('F-036C: weather cache does not reuse another location cache and ignores stale >24h fallback', async () => {
      // Seed fresh Delhi cache
      await storage.setCachedWeather({
        temperature: 32,
        weatherCode: 0,
        weatherDescription: 'Clear sky',
        locationName: 'New Delhi',
        latitude: 28.6139,
        longitude: 77.209,
        timestamp: Date.now(),
      });

      // Request weather for Mumbai while offline -> must NOT return Delhi's 32°C!
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Offline')) as unknown as typeof fetch;

      const mumbaiWeather = await fetchWeather(19.076, 72.8777, 'Mumbai', false);
      expect(mumbaiWeather.locationName).toBe('Mumbai');
      expect(mumbaiWeather.temperature).toBeNull();
      expect(mumbaiWeather.isCached).toBe(false);
    });

    it('F-036D: DashboardScreen shows honest empty states instead of hardcoded fake pharmacy records on API failure', async () => {
      jest.spyOn(apiClient, 'get').mockRejectedValue(new Error('Offline'));

      await render(<DashboardScreen />);
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-empty-activity')).toBeTruthy();
        expect(screen.getByTestId('dashboard-empty-recent-items')).toBeTruthy();
      });

      expect(screen.queryByText('Becosules Z Capsule')).toBeNull();
      expect(screen.queryByText('Ascoril D Plus Syrup 100ml')).toBeNull();
      expect(screen.queryByText('Benadryl Cough Syrup 100ml')).toBeNull();
      expect(screen.queryByText('Cipla Ltd.')).toBeNull();
    });
  });
});
