import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { AuthProvider } from '../src/features/auth';
import { storage } from '../src/lib/storage';
import {
  ShortageListScreen,
  AddShortageMedicineScreen,
  ShortageDetailsScreen,
} from '../src/screens/shortage';
import { DashboardScreen } from '../src/screens/dashboard/DashboardScreen';
import { MoreScreen } from '../src/screens/more/MoreScreen';
import { apiClient } from '../src/services/api-client';
import { shortageService } from '../src/services/shortageService';
import type { DailyShortageResult, ShortageItem } from '../src/types/models';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: Record<string, unknown> = {};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  const ReactModule = jest.requireActual('react');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      addListener: jest.fn(() => jest.fn()),
      dispatch: jest.fn(),
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
    useFocusEffect: (cb: () => void) => {
      ReactModule.useEffect(() => {
        const cleanup = cb();
        if (typeof cleanup === 'function') {
          return cleanup;
        }
      }, [cb]);
    },
  };
});

jest.mock('../src/services/shortageService', () => ({
  shortageService: {
    getDailyShortages: jest.fn(),
    getShortageItemById: jest.fn(),
    createShortageItem: jest.fn(),
    patchShortageItem: jest.fn(),
    deleteShortageItem: jest.fn(),
  },
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

describe('Daily Shortage Notebook Mobile Tests', () => {
  const mockItem1: ShortageItem = {
    id: 'shortage-001',
    medicineId: 'med-001',
    date: '2026-08-31',
    quantity: 10,
    unit: 'PACK',
    status: 'PENDING',
    note: 'Urgent for morning delivery',
    createdById: 'user-001',
    createdBy: {
      id: 'user-001',
      name: 'Rahul Kumar',
      email: 'rahul@pharmacy.com',
      role: 'EMPLOYEE',
    },
    medicine: {
      id: 'med-001',
      name: 'Amoxicillin 500mg Capsule',
      form: 'CAPSULE',
      packQuantity: 10,
      packUnit: 'CAPSULE',
      imageUrl: null,
      shortDescription: null,
      composition: { id: 'comp-001', displayText: 'Amoxicillin 500 MG' },
      manufacturer: { id: 'mfg-001', name: 'Cipla Ltd.' },
      mr: {
        id: 'mr-001',
        name: 'Ravi Kumar',
        company: 'Cipla',
        phone: '+919876543210',
        email: 'ravi@cipla.com',
        active: true,
      },
    },
    createdAt: '2026-08-31T00:00:00.000Z',
    updatedAt: '2026-08-31T00:00:00.000Z',
  };

  const mockItem2: ShortageItem = {
    id: 'shortage-002',
    medicineId: 'med-002',
    date: '2026-08-31',
    quantity: 5,
    unit: 'STRIP',
    status: 'ORDERED',
    note: null,
    createdById: 'user-002',
    createdBy: {
      id: 'user-002',
      name: 'Dr. Sarah Smith',
      email: 'admin@pharmacy.com',
      role: 'ADMIN',
    },
    medicine: {
      id: 'med-002',
      name: 'Paracetamol 650mg Tablet',
      form: 'TABLET',
      packQuantity: 15,
      packUnit: 'TABLET',
      imageUrl: null,
      shortDescription: null,
      composition: { id: 'comp-002', displayText: 'Paracetamol 650 MG' },
      manufacturer: { id: 'mfg-002', name: 'Micro Labs Ltd.' },
      mr: null,
    },
    createdAt: '2026-08-31T00:00:00.000Z',
    updatedAt: '2026-08-31T00:00:00.000Z',
  };

  const mockShortageResult: DailyShortageResult = {
    date: '2026-08-31',
    summary: {
      total: 2,
      pending: 1,
      ordered: 1,
      completed: 0,
    },
    items: [mockItem1, mockItem2],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('ShortageListScreen', () => {
    beforeEach(() => {
      mockRouteParams = {};
      (shortageService.getDailyShortages as jest.Mock).mockImplementation(() =>
        Promise.resolve(mockShortageResult),
      );
    });

    it('1. renders header, date navigation, and summary stat cards', async () => {
      await render(<ShortageListScreen />);

      await waitFor(() => {
        expect(screen.getByText('Daily Shortage Notebook')).toBeTruthy();
        expect(screen.getByText("Today's medicines to order")).toBeTruthy();
        expect(screen.getByText('Total')).toBeTruthy();
        expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Ordered').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Done')).toBeTruthy();
      });
    });

    it('2. groups shortage items into PENDING and ORDERED sections', async () => {
      await render(<ShortageListScreen />);

      await waitFor(() => {
        expect(screen.getByText('PENDING (1)')).toBeTruthy();
        expect(screen.getByText('ORDERED (1)')).toBeTruthy();
        expect(screen.getByText('Amoxicillin 500mg Capsule')).toBeTruthy();
        expect(screen.getByText('Paracetamol 650mg Tablet')).toBeTruthy();
        expect(screen.getByText('Cipla Ltd.')).toBeTruthy();
        expect(screen.getByText('Micro Labs Ltd.')).toBeTruthy();
      });
    });

    it('3. navigates to previous and next days when tapping arrow buttons', async () => {
      const { unmount } = await render(<ShortageListScreen />);

      await waitFor(() => {
        expect(shortageService.getDailyShortages).toHaveBeenCalledWith(
          expect.any(String),
          undefined,
        );
      });

      const prevBtn = screen.getByTestId('shortage-date-prev');
      await act(async () => {
        fireEvent.press(prevBtn);
      });

      await waitFor(() => {
        expect(shortageService.getDailyShortages).toHaveBeenCalledTimes(2);
      });

      const nextBtn = screen.getByTestId('shortage-date-next');
      await act(async () => {
        fireEvent.press(nextBtn);
      });

      await waitFor(() => {
        expect(shortageService.getDailyShortages).toHaveBeenCalledTimes(3);
      });

      unmount();
    });

    it('4. navigates to ShortageDetails when tapping a medicine card', async () => {
      await render(<ShortageListScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('shortage-item-shortage-001')).toBeTruthy();
      });

      const itemCard = screen.getByTestId('shortage-item-shortage-001');
      await act(async () => {
        fireEvent.press(itemCard);
      });

      expect(mockNavigate).toHaveBeenCalledWith('ShortageDetails', {
        shortageId: 'shortage-001',
      });
    });

    it('5. navigates to AddShortageMedicine when tapping + Add button', async () => {
      await render(<ShortageListScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('shortage-add-btn')).toBeTruthy();
      });

      const addBtn = screen.getByTestId('shortage-add-btn');
      await act(async () => {
        fireEvent.press(addBtn);
      });

      expect(mockNavigate).toHaveBeenCalledWith('AddShortageMedicine', {
        date: expect.any(String),
      });
    });

    it('6. displays empty state when no shortage items exist', async () => {
      (shortageService.getDailyShortages as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          date: '2026-08-31',
          summary: { total: 0, pending: 0, ordered: 0, completed: 0 },
          items: [],
        }),
      );

      await render(<ShortageListScreen />);

      await waitFor(() => {
        expect(screen.getByText('No shortage items')).toBeTruthy();
        expect(screen.getByText('+ Add Medicine')).toBeTruthy();
      });
    });

    it('6b. does not render redundant header calendar button and displays Added by user on medicine cards', async () => {
      await render(<ShortageListScreen />);

      await waitFor(() => {
        expect(screen.queryByTestId('shortage-date-picker-btn')).toBeNull();
        expect(screen.getByText('Added by Rahul Kumar')).toBeTruthy();
        expect(screen.getByText('Added by Dr. Sarah Smith')).toBeTruthy();
      });
    });
  });

  describe('AddShortageMedicineScreen', () => {
    const mockMedicinesList = [
      {
        id: 'med-001',
        name: 'Amoxicillin 500mg Capsule',
        form: 'CAPSULE',
        packQuantity: 10,
        packUnit: 'CAPSULE',
        imageUrl: null,
        shortDescription: null,
        manufacturer: { id: 'mfg-001', name: 'Cipla Ltd.' },
      },
      {
        id: 'med-002',
        name: 'Paracetamol 650mg Tablet',
        form: 'TABLET',
        packQuantity: 15,
        packUnit: 'TABLET',
        imageUrl: null,
        shortDescription: null,
        manufacturer: { id: 'mfg-002', name: 'Micro Labs Ltd.' },
      },
      {
        id: 'med-003',
        name: 'Azithromycin 500mg Tablet',
        form: 'TABLET',
        packQuantity: 3,
        packUnit: 'TABLET',
        imageUrl: null,
        shortDescription: null,
        manufacturer: { id: 'mfg-003', name: 'Zydus Cadila' },
      },
      {
        id: 'med-004',
        name: 'Pantoprazole 40mg Tablet',
        form: 'TABLET',
        packQuantity: 10,
        packUnit: 'TABLET',
        imageUrl: null,
        shortDescription: null,
        manufacturer: { id: 'mfg-004', name: 'Sun Pharma' },
      },
      {
        id: 'med-005',
        name: 'Metformin 500mg Tablet',
        form: 'TABLET',
        packQuantity: 20,
        packUnit: 'TABLET',
        imageUrl: null,
        shortDescription: null,
        manufacturer: { id: 'mfg-005', name: 'USV Ltd.' },
      },
    ];

    beforeEach(() => {
      (shortageService.createShortageItem as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          message: 'Success',
          shortageItem: mockItem1,
        }),
      );
      (apiClient.get as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          medicines: mockMedicinesList,
        }),
      );
    });

    it('7. displays search input and exactly 4 popular medicine suggestions initially', async () => {
      await render(<AddShortageMedicineScreen />);

      await waitFor(() => {
        expect(screen.getByText('Add Medicine to Shortage')).toBeTruthy();
        expect(screen.getByText('Select Medicine')).toBeTruthy();
        expect(screen.getByText('POPULAR MEDICINES')).toBeTruthy();
        expect(screen.getByText('Amoxicillin 500mg Capsule')).toBeTruthy();
        expect(screen.getByText('Paracetamol 650mg Tablet')).toBeTruthy();
        expect(screen.getByText('Azithromycin 500mg Tablet')).toBeTruthy();
        expect(screen.getByText('Pantoprazole 40mg Tablet')).toBeTruthy();
        // 5th medicine should NOT be displayed in popular medicines (limit to 4)
        expect(screen.queryByText('Metformin 500mg Tablet')).toBeNull();
      });
    });

    it('8. selecting a medicine updates the selected card state', async () => {
      await render(<AddShortageMedicineScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('add-shortage-med-med-001')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('add-shortage-med-med-001'));
      });

      expect(screen.getByTestId('add-shortage-selected-card')).toBeTruthy();
      expect(screen.getByText('Change')).toBeTruthy();
    });

    it('9. quick quantity pills update quantity input value', async () => {
      await render(<AddShortageMedicineScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('quick-qty-20')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('quick-qty-20'));
      });

      const qtyInput = screen.getByTestId('add-shortage-qty-input');
      expect(qtyInput.props.value).toBe('20');
    });

    it('9b. manual stepper [-] and [+] buttons decrement and increment quantity', async () => {
      await render(<AddShortageMedicineScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('add-shortage-qty-input')).toBeTruthy();
      });

      const qtyInput = screen.getByTestId('add-shortage-qty-input');
      const decBtn = screen.getByTestId('shortage-qty-decrement');
      const incBtn = screen.getByTestId('shortage-qty-increment');

      expect(qtyInput.props.value).toBe('1');

      // Decrementing at 1 should keep it at 1 (never goes below minimum 1)
      await act(async () => {
        fireEvent.press(decBtn);
      });
      expect(qtyInput.props.value).toBe('1');

      // Increment
      await act(async () => {
        fireEvent.press(incBtn);
      });
      expect(qtyInput.props.value).toBe('2');

      // Increment again
      await act(async () => {
        fireEvent.press(incBtn);
      });
      expect(qtyInput.props.value).toBe('3');

      // Decrement back to 2
      await act(async () => {
        fireEvent.press(decBtn);
      });
      expect(qtyInput.props.value).toBe('2');
    });

    it('10. submits create shortage item and navigates back on success', async () => {
      (shortageService.createShortageItem as jest.Mock).mockResolvedValueOnce({
        message: 'Success',
        shortageItem: mockItem1,
      });

      await render(<AddShortageMedicineScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('add-shortage-med-med-001')).toBeTruthy();
      });

      // Select medicine
      await act(async () => {
        fireEvent.press(screen.getByTestId('add-shortage-med-med-001'));
      });

      // Submit
      const submitBtn = screen.getByTestId('add-shortage-submit-btn');
      await act(async () => {
        fireEvent.press(submitBtn);
      });

      expect(shortageService.createShortageItem).toHaveBeenCalledWith(
        expect.objectContaining({
          medicineId: 'med-001',
          quantity: expect.any(Number),
        }),
      );
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('11. search queries backend and displays search results header', async () => {
      await render(<AddShortageMedicineScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('add-shortage-search-input')).toBeTruthy();
      });

      const searchInput = screen.getByTestId('add-shortage-search-input');
      await act(async () => {
        fireEvent.changeText(searchInput, 'Azithromycin');
      });

      await waitFor(() => {
        expect(screen.getByText('SEARCH RESULTS')).toBeTruthy();
      });
    });

    it('11b. supports selecting order unit chip and prevents submitting on past dates', async () => {
      (shortageService.createShortageItem as jest.Mock).mockResolvedValueOnce({
        message: 'Success',
        shortageItem: mockItem1,
      });

      // Render for today
      await render(<AddShortageMedicineScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('unit-chip-strip')).toBeTruthy();
      });

      // Select Strip unit
      await act(async () => {
        fireEvent.press(screen.getByTestId('unit-chip-strip'));
      });

      // Select medicine
      await act(async () => {
        fireEvent.press(screen.getByTestId('add-shortage-med-med-001'));
      });

      // Submit
      await act(async () => {
        fireEvent.press(screen.getByTestId('add-shortage-submit-btn'));
      });

      expect(shortageService.createShortageItem).toHaveBeenCalledWith(
        expect.objectContaining({
          unit: 'STRIP',
        }),
      );

      // Now test past date
      mockRouteParams = { date: '2026-08-01' };
      render(<AddShortageMedicineScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('add-shortage-past-date-banner')).toBeTruthy();
      });
    });
  });

  describe('ShortageDetailsScreen', () => {
    beforeEach(() => {
      mockRouteParams = { shortageId: 'shortage-001' };
      (shortageService.getShortageItemById as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          shortageItem: mockItem1,
        }),
      );
      (shortageService.patchShortageItem as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          message: 'Updated',
          shortageItem: { ...mockItem1, status: 'ORDERED' },
        }),
      );
      (shortageService.deleteShortageItem as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          message: 'Deleted',
        }),
      );
    });

    it('12. displays medicine overview, shortage details, and MR information', async () => {
      await render(<ShortageDetailsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Amoxicillin 500mg Capsule')).toBeTruthy();
        expect(screen.getByText('Shortage Information')).toBeTruthy();
        expect(screen.getByText('Medical Representative')).toBeTruthy();
        expect(screen.getByText('Ravi Kumar')).toBeTruthy();
        expect(screen.getByText('+919876543210')).toBeTruthy();
        expect(screen.getByText('Verified MR')).toBeTruthy();
      });
    });

    it('13. tapping Call button invokes Linking.openURL with tel: URL', async () => {
      const openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
      jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);

      await render(<ShortageDetailsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Amoxicillin 500mg Capsule')).toBeTruthy();
        expect(screen.getByTestId('shortage-details-call-mr-btn')).toBeTruthy();
      });

      const callBtn = screen.getByTestId('shortage-details-call-mr-btn');
      await act(async () => {
        fireEvent.press(callBtn);
      });

      expect(openUrlSpy).toHaveBeenCalledWith('tel:+919876543210');
    });

    it('14. transitions status from PENDING to ORDERED', async () => {
      await render(<ShortageDetailsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Amoxicillin 500mg Capsule')).toBeTruthy();
        expect(screen.getByTestId('shortage-details-status-btn')).toBeTruthy();
        expect(screen.getByText('Mark Ordered')).toBeTruthy();
      });

      const statusBtn = screen.getByTestId('shortage-details-status-btn');
      await act(async () => {
        fireEvent.press(statusBtn);
      });

      expect(shortageService.patchShortageItem).toHaveBeenCalledWith('shortage-001', {
        status: 'ORDERED',
      });
    });

    it('15. opens remove confirmation dialog and deletes item', async () => {
      await render(<ShortageDetailsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Amoxicillin 500mg Capsule')).toBeTruthy();
        expect(screen.getByTestId('shortage-details-remove-btn')).toBeTruthy();
      });

      // Tap remove button
      await act(async () => {
        fireEvent.press(screen.getByTestId('shortage-details-remove-btn'));
      });

      expect(screen.getByText('Remove from Shortage?')).toBeTruthy();

      // Confirm remove
      const confirmBtn = screen.getByTestId('confirm-remove-btn');
      await act(async () => {
        fireEvent.press(confirmBtn);
      });

      expect(shortageService.deleteShortageItem).toHaveBeenCalledWith('shortage-001');
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('16. displays empty MR state when medicine has no assigned MR', async () => {
      (shortageService.getShortageItemById as jest.Mock).mockResolvedValueOnce({
        shortageItem: mockItem2,
      });

      await render(<ShortageDetailsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 650mg Tablet')).toBeTruthy();
        expect(screen.getByTestId('shortage-details-no-mr-card')).toBeTruthy();
        expect(screen.getByText('No medical representative assigned')).toBeTruthy();
      });
    });

    it('16b. opens Edit Quantity modal and updates quantity and order unit', async () => {
      (shortageService.patchShortageItem as jest.Mock).mockResolvedValueOnce({
        message: 'Updated',
        shortageItem: { ...mockItem1, quantity: 50, unit: 'BOX' },
      });

      await render(<ShortageDetailsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Amoxicillin 500mg Capsule')).toBeTruthy();
        expect(screen.getByTestId('shortage-details-edit-qty-btn')).toBeTruthy();
      });

      // Tap Edit Qty button
      await act(async () => {
        fireEvent.press(screen.getByTestId('shortage-details-edit-qty-btn'));
      });

      // Select 50 preset and Box unit
      await act(async () => {
        fireEvent.press(screen.getByTestId('edit-quick-qty-50'));
        fireEvent.press(screen.getByTestId('edit-unit-chip-box'));
      });

      // Save
      await act(async () => {
        fireEvent.press(screen.getByTestId('save-edit-qty-btn'));
      });

      expect(shortageService.patchShortageItem).toHaveBeenCalledWith('shortage-001', {
        quantity: 50,
        unit: 'BOX',
        note: expect.any(String),
      });
    });
  });

  describe('Navigation & Dashboard Integration', () => {
    beforeEach(async () => {
      mockRouteParams = {};
      await storage.clearAuth();
      await storage.setToken('test-token');
      await storage.setUser({
        id: 'admin-001',
        name: 'Dr. Sarah Smith',
        email: 'admin@example.com',
        phone: '+919876543210',
        profileImageUrl: null,
        role: 'ADMIN',
        active: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
      (apiClient.get as jest.Mock).mockImplementation(() => Promise.resolve({}));
    });

    it('17. DashboardScreen contains Shortage Notebook quick action and navigates to it', async () => {
      await render(
        <AuthProvider>
          <DashboardScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText(/Shortage Note(book|s)/)).toBeTruthy();
      });

      const shortageAction = screen.getByText(/Shortage Note(book|s)/);
      await act(async () => {
        fireEvent.press(shortageAction);
      });

      expect(mockNavigate).toHaveBeenCalledWith('ShortageNotebook');
    });

    it('18. MoreScreen contains Daily Shortage Notebook item and navigates to it', async () => {
      await render(
        <AuthProvider>
          <MoreScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Daily Shortage Notebook')).toBeTruthy();
      });

      const shortageItem = screen.getByText('Daily Shortage Notebook');
      await act(async () => {
        fireEvent.press(shortageItem);
      });

      expect(mockNavigate).toHaveBeenCalledWith('ShortageNotebook');
    });
  });
});