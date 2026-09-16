import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { CommercialDetailsScreen } from '../src/screens/commercial-details/CommercialDetailsScreen';
import { MedicineDetailsScreen } from '../src/screens/medicines/MedicineDetailsScreen';
import { apiClient } from '../src/services/api-client';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockIsAdmin = true;

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      dispatch: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
    }),
    useRoute: () => ({
      params: { id: 'med-1' },
    }),
  };
});

jest.mock('../src/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Test User', role: mockIsAdmin ? 'ADMIN' : 'EMPLOYEE' },
    isAdmin: mockIsAdmin,
    isEmployee: !mockIsAdmin,
    isAuthenticated: true,
  }),
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

const mockMedicines = [
  {
    id: 'med-1',
    name: 'Paracetamol 500mg Tablet',
    composition: { id: 'comp-1', displayText: 'Paracetamol 500mg' },
    form: 'TABLET',
    packQuantity: 10,
    packUnit: 'TABLET',
    shortDescription: 'Analgesic',
    imageUrl: null,
    uses: 'Fever',
    recommendedAgeGroup: 'Adults',
    directions: '1 tab',
    warnings: 'Max 4g',
    storageInstructions: 'Dry place',
    barcode: '123456789012',
    prescriptionRequired: false,
    manufacturer: { id: 'mfg-1', name: 'Cipla Ltd.' },
    mr: null,
    mrp: 20.0,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'med-2',
    name: 'Amoxicillin 500mg Capsule',
    composition: { id: 'comp-2', displayText: 'Amoxicillin 500mg' },
    form: 'CAPSULE',
    packQuantity: 10,
    packUnit: 'CAPSULE',
    shortDescription: 'Antibiotic',
    imageUrl: null,
    uses: 'Infection',
    recommendedAgeGroup: 'Adults',
    directions: '1 cap',
    warnings: 'Complete course',
    storageInstructions: 'Dry place',
    barcode: null,
    prescriptionRequired: true,
    manufacturer: { id: 'mfg-2', name: 'Sun Pharma' },
    mr: null,
    mrp: null, // missing commercials
    active: true,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
];

const mockCommercialDetails = {
  id: 'comm-1',
  medicineId: 'med-1',
  purchaseRate: 12.5,
  mrp: 20.0,
  discountPercent: 10,
  gstPercent: 5,
  scheme: '10+1',
  privateNotes: 'Distributor direct rate',
  updatedAt: '2026-01-01T00:00:00.000Z',
  updatedBy: { id: 'admin-1', name: 'Dr. Sarah Smith' },
};

describe('Commercial Details & Scheme & Admin Protection Suite', () => {
  afterEach(cleanup);

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAdmin = true;

    (apiClient.get as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('/medicines/med-1/commercial-details')) {
        return Promise.resolve({
          commercialDetails: mockCommercialDetails,
        });
      }
      if (path.includes('/medicines/med-2/commercial-details')) {
        return Promise.reject(new Error('COMMERCIAL_DETAILS_NOT_FOUND'));
      }
      if (path.includes('/medicines/med-1')) {
        return Promise.resolve({
          medicine: mockMedicines[0],
        });
      }
      if (path.includes('/medicines/med-2')) {
        return Promise.resolve({
          medicine: mockMedicines[1],
        });
      }
      return Promise.resolve({
        medicines: mockMedicines,
      });
    });

    (apiClient.patch as jest.Mock).mockImplementation((path: string, body: unknown) => {
      return Promise.resolve({
        commercialDetails: {
          ...mockCommercialDetails,
          ...(body as object),
        },
      });
    });

    (apiClient.post as jest.Mock).mockImplementation((path: string, body: unknown) => {
      return Promise.resolve({
        commercialDetails: {
          id: 'comm-new',
          medicineId: 'med-2',
          ...(body as object),
        },
      });
    });
  });

  describe('CommercialDetailsScreen', () => {
    it('1. blocks non-admin users with Access Restricted error state', async () => {
      mockIsAdmin = false;
      await render(<CommercialDetailsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('commercial-access-restricted')).toBeTruthy();
        expect(screen.getByText('Access Restricted')).toBeTruthy();
      });
    });

    it('2. renders medicine list with search, filter chips and commercial status badges for admin', async () => {
      await render(<CommercialDetailsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Commercial Details')).toBeTruthy();
        expect(screen.getByTestId('commercial-search-input')).toBeTruthy();
        expect(screen.getByTestId('filter-all-commercial')).toBeTruthy();
        expect(screen.getByTestId('filter-has-commercial')).toBeTruthy();
        expect(screen.getByTestId('filter-missing-commercial')).toBeTruthy();
        expect(screen.getByText('Paracetamol 500mg Tablet')).toBeTruthy();
        expect(screen.getByText('Amoxicillin 500mg Capsule')).toBeTruthy();
        expect(screen.getByText('MRP ₹20.00')).toBeTruthy();
        expect(screen.getByText('Missing Rates')).toBeTruthy();
      });
    });

    it('3. filters list by Has Commercials and Missing Commercials chips', async () => {
      await render(<CommercialDetailsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('filter-has-commercial')).toBeTruthy();
      });

      // Filter: Has Commercials
      await act(async () => {
        fireEvent.press(screen.getByTestId('filter-has-commercial'));
      });

      expect(screen.getByText('Paracetamol 500mg Tablet')).toBeTruthy();
      expect(screen.queryByText('Amoxicillin 500mg Capsule')).toBeNull();

      // Filter: Missing Commercials
      await act(async () => {
        fireEvent.press(screen.getByTestId('filter-missing-commercial'));
      });

      expect(screen.queryByText('Paracetamol 500mg Tablet')).toBeNull();
      expect(screen.getByText('Amoxicillin 500mg Capsule')).toBeTruthy();
    });

    it('4. opens CommercialDetailsModal when medicine card is pressed and displays Scheme and profit metrics', async () => {
      await render(<CommercialDetailsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('commercial-med-item-med-1')).toBeTruthy();
      });

      // Tap Paracetamol
      await act(async () => {
        fireEvent.press(screen.getByTestId('commercial-med-item-med-1'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('commercial-details-modal')).toBeTruthy();
        expect(screen.getByTestId('commercial-scheme-display')).toBeTruthy();
        expect(screen.getByText('10+1')).toBeTruthy();
        expect(screen.getByText('₹12.50')).toBeTruthy(); // purchase rate
        expect(screen.getByText('₹20.00')).toBeTruthy(); // MRP
      });
    });

    it('5. allows editing and updating commercial details including scheme', async () => {
      await render(<CommercialDetailsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('commercial-med-item-med-1')).toBeTruthy();
      });

      // Tap Paracetamol
      await act(async () => {
        fireEvent.press(screen.getByTestId('commercial-med-item-med-1'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('commercial-edit-btn')).toBeTruthy();
      });

      // Press Edit Commercials
      await act(async () => {
        fireEvent.press(screen.getByTestId('commercial-edit-btn'));
      });

      expect(screen.getByTestId('commercial-scheme-input')).toBeTruthy();

      // Update scheme and rates
      await act(async () => {
        fireEvent.changeText(screen.getByTestId('commercial-purchase-rate-input'), '14.00');
        fireEvent.changeText(screen.getByTestId('commercial-scheme-input'), 'Buy 10 Get 2 Free');
      });

      // Save
      await act(async () => {
        fireEvent.press(screen.getByTestId('commercial-modal-save-btn'));
      });

      expect(apiClient.patch).toHaveBeenCalledWith('/medicines/med-1/commercial-details', {
        purchaseRate: 14.0,
        mrp: 20.0,
        discountPercent: 10,
        gstPercent: 5,
        scheme: 'Buy 10 Get 2 Free',
        privateNotes: 'Distributor direct rate',
      });
    });
  });

  describe('MedicineDetailsScreen Commercial Section Protection', () => {
    it('6. displays Commercial Details section on MedicineDetailsScreen for ADMIN', async () => {
      mockIsAdmin = true;
      await render(<MedicineDetailsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('medicine-details-commercial-section')).toBeTruthy();
        expect(screen.getByText('Commercial & Pricing Details')).toBeTruthy();
        expect(screen.getByTestId('commercial-purchase-rate')).toBeTruthy();
        expect(screen.getByTestId('commercial-scheme')).toBeTruthy();
        expect(screen.getByText('10+1')).toBeTruthy();
      });
    });

    it('7. strictly hides Commercial Details section on MedicineDetailsScreen for EMPLOYEE', async () => {
      mockIsAdmin = false;
      await render(<MedicineDetailsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('medicine-details-name')).toBeTruthy();
      });

      expect(screen.queryByTestId('medicine-details-commercial-section')).toBeNull();
      expect(screen.queryByText('Commercial & Pricing Details')).toBeNull();
      expect(screen.queryByTestId('commercial-purchase-rate')).toBeNull();
    });
  });
});
