import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { BatchesScreen } from '../src/screens/batches/BatchesScreen';
import { CommercialDetailsModal } from '../src/screens/commercial-details/CommercialDetailsModal';
import { AddMedicineScreen } from '../src/screens/medicines/AddMedicineScreen';
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
      params: { id: 'med-1', medicineId: 'med-1', medicineName: 'Cetirizine 10mg Tablet' },
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

const sampleMedicine = {
  id: 'med-1',
  name: 'Cetirizine 10mg Tablet',
  composition: { id: 'comp-1', displayText: 'Cetirizine 10mg' },
  form: 'TABLET' as const,
  packQuantity: 10,
  packUnit: 'TABLET' as const,
  shortDescription: 'Antihistamine',
  imageUrl: null,
  uses: 'Allergies',
  recommendedAgeGroup: 'Adults',
  directions: '1 tab daily',
  warnings: 'May cause drowsiness',
  storageInstructions: 'Cool dry place',
  barcode: '123456789012',
  prescriptionRequired: false,
  manufacturer: { id: 'mfg-1', name: "Dr. Reddy's" },
  mr: null,
  mrp: 48.0,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const sampleBatches = [
  {
    id: 'batch-1',
    medicine: { id: 'med-1', name: 'Cetirizine 10mg Tablet' },
    batchNumber: 'C12C53',
    manufacturingDate: '2026-01-01',
    expiryDate: '2028-01-01',
    commercialDetails: {
      id: 'comm-1',
      batchId: 'batch-1',
      purchaseRate: 34.0,
      mrp: 48.0,
      discountPercent: 5.0,
      scheme: { type: 'bonus', description: '20 + 2' },
      privateNotes: 'Latest distributor delivery',
      updatedAt: '2026-01-01T00:00:00.000Z',
      updatedBy: { id: 'admin-1', name: 'Admin' },
    },
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'batch-2',
    medicine: { id: 'med-1', name: 'Cetirizine 10mg Tablet' },
    batchNumber: 'C11B42',
    manufacturingDate: '2025-06-01',
    expiryDate: '2027-06-01',
    commercialDetails: {
      id: 'comm-2',
      batchId: 'batch-2',
      purchaseRate: 32.0,
      mrp: 45.0,
      discountPercent: 4.0,
      scheme: { type: 'bonus', description: '15 + 1' },
      privateNotes: null,
      updatedAt: '2025-06-01T00:00:00.000Z',
      updatedBy: { id: 'admin-1', name: 'Admin' },
    },
    createdAt: '2025-06-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
  },
];

describe('Canonical Batch & Commercial Details Mobile Flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAdmin = true;
  });

  afterEach(() => {
    cleanup();
  });

  // ====================================================
  // 1. Batches Screen Tests
  // ====================================================
  describe('BatchesScreen', () => {
    it('renders batches list with batch numbers, dates, and commercial details for Admin', async () => {
      (apiClient.get as jest.Mock).mockImplementation((url: string) => {
        if (url.startsWith('/batches')) {
          return Promise.resolve({ batches: sampleBatches });
        }
        if (url.startsWith('/medicines')) {
          return Promise.resolve({ medicines: [sampleMedicine] });
        }
        return Promise.resolve({});
      });

      render(<BatchesScreen />);

      await waitFor(() => {
        expect(screen.getByText('C12C53')).toBeTruthy();
        expect(screen.getByText('C11B42')).toBeTruthy();
        expect(screen.getByText('₹48.00')).toBeTruthy();
        expect(screen.getByText('₹34.00')).toBeTruthy();
      });
    });

    it('allows Admin to open Add Batch modal and submit new batch', async () => {
      (apiClient.get as jest.Mock).mockImplementation((url: string) => {
        if (url.startsWith('/batches')) {
          return Promise.resolve({ batches: sampleBatches });
        }
        if (url.startsWith('/medicines')) {
          return Promise.resolve({ medicines: [sampleMedicine] });
        }
        return Promise.resolve({});
      });

      (apiClient.post as jest.Mock).mockResolvedValue({
        batch: {
          id: 'batch-new',
          batchNumber: 'BATCH-2026-099',
          expiryDate: '2028-12-31',
        },
      });

      render(<BatchesScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('add-batch-fab')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('add-batch-fab'));

      await waitFor(() => {
        expect(screen.getByTestId('add-batch-modal')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('submit-create-batch-btn'));

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          '/batches',
          expect.objectContaining({
            medicineId: 'med-1',
          }),
        );
      });
    });
  });

  // ====================================================
  // 2. Commercial Details Modal (Overview + Batch History)
  // ====================================================
  describe('CommercialDetailsModal', () => {
    it('displays Current Batch prominently and Batch-Wise Commercial History cards', async () => {
      (apiClient.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/commercial-details')) {
          return Promise.resolve({
            commercialDetails: {
              ...sampleBatches[0]!.commercialDetails,
              batch: {
                id: sampleBatches[0]!.id,
                batchNumber: sampleBatches[0]!.batchNumber,
                manufacturingDate: sampleBatches[0]!.manufacturingDate,
                expiryDate: sampleBatches[0]!.expiryDate,
              },
            },
          });
        }
        if (url.startsWith('/batches')) {
          return Promise.resolve({ batches: sampleBatches });
        }
        return Promise.resolve({});
      });

      render(
        <CommercialDetailsModal
          visible={true}
          medicine={sampleMedicine}
          onClose={jest.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('CURRENT BATCH: C12C53 (Exp: 2028-01-01)')).toBeTruthy();
        expect(screen.getByTestId('batch-wise-commercial-history')).toBeTruthy();
        expect(screen.getByText('Batch-Wise Commercial History')).toBeTruthy();
        expect(screen.getByText('Latest')).toBeTruthy();
      });
    });
  });

  // ====================================================
  // 3. Medicine Details Screen (Current Batch & View Batches)
  // ====================================================
  describe('MedicineDetailsScreen', () => {
    it('shows current batch details and View All Batches button for Admin', async () => {
      (apiClient.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/commercial-details')) {
          return Promise.resolve({
            commercialDetails: {
              ...sampleBatches[0]!.commercialDetails,
              batch: {
                id: sampleBatches[0]!.id,
                batchNumber: sampleBatches[0]!.batchNumber,
                manufacturingDate: sampleBatches[0]!.manufacturingDate,
                expiryDate: sampleBatches[0]!.expiryDate,
              },
            },
          });
        }
        if (url.startsWith('/medicines/med-1')) {
          return Promise.resolve({ medicine: sampleMedicine });
        }
        return Promise.resolve({});
      });

      render(<MedicineDetailsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('medicine-details-commercial-section')).toBeTruthy();
        expect(screen.getByTestId('commercial-batch-number')).toBeTruthy();
        expect(screen.getByText(/C12C53 \(Exp: (01 Jan 2028|2028-01-01)\)/)).toBeTruthy();
        expect(screen.getByTestId('view-all-batches-btn')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('view-all-batches-btn'));
      expect(mockNavigate).toHaveBeenCalledWith('Batches', {
        medicineId: 'med-1',
        medicineName: 'Cetirizine 10mg Tablet',
      });
    });
  });

  // ====================================================
  // 4. Medicine Form First Batch Section
  // ====================================================
  describe('AddMedicineScreen First Batch Workflow', () => {
    it('displays Section 7 First Batch Information and Section 8 Commercial Details', async () => {
      (apiClient.get as jest.Mock).mockImplementation((url: string) => {
        if (url.startsWith('/manufacturers')) {
          return Promise.resolve({
            manufacturers: [{ id: 'mfg-1', name: "Dr. Reddy's", active: true }],
          });
        }
        if (url.startsWith('/salts')) {
          return Promise.resolve({
            salts: [{ id: 'salt-1', name: 'Cetirizine', active: true }],
          });
        }
        if (url.startsWith('/mrs')) {
          return Promise.resolve({ mrs: [] });
        }
        return Promise.resolve({});
      });

      render(<AddMedicineScreen />);

      await waitFor(() => {
        expect(screen.getByText('7. First Batch Information')).toBeTruthy();
        expect(screen.getByTestId('input-batch-number')).toBeTruthy();
        expect(screen.getByTestId('input-expiry-date')).toBeTruthy();
        expect(screen.getByText('8. Commercial Details (First Batch)')).toBeTruthy();
        expect(screen.getByTestId('input-mrp')).toBeTruthy();
      });
    });
  });
});
