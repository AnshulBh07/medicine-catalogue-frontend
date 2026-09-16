import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { MedicineDetailsScreen } from '../src/screens/medicines/MedicineDetailsScreen';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

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
    user: { id: 'admin-1', name: 'Admin', role: 'ADMIN' },
    isAdmin: true,
    isEmployee: false,
    isAuthenticated: true,
  }),
}));

jest.mock('../src/services/api-client', () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({
      medicine: {
        id: 'med-1',
        name: 'Paracetamol 500mg Tablet',
        composition: { id: 'comp-1', displayText: 'Paracetamol 500mg' },
        form: 'TABLET',
        packQuantity: 10,
        packUnit: 'TABLET',
        shortDescription: 'Analgesic / Antipyretic',
        imageUrl: 'https://example.com/paracetamol.png',
        uses: 'Pain relief and fever reduction',
        recommendedAgeGroup: 'Adults and children over 12',
        directions: 'Take 1-2 tablets every 4-6 hours as needed',
        warnings: 'Do not exceed 4g in 24 hours',
        storageInstructions: 'Store below 25°C',
        barcode: '123456789012',
        prescriptionRequired: false,
        manufacturer: { id: 'mfg-1', name: 'Acme Pharma Ltd.' },
        mr: { id: 'mr-1', name: 'Ravi Kumar', company: 'Acme Pharma Ltd.', phone: '+919876543210' },
        active: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    }),
    setToken: jest.fn(),
    setOnUnauthorized: jest.fn(),
  },
}));

describe('MedicineDetailsScreen Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all medicine details correctly from API data', async () => {
    await render(<MedicineDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('medicine-details-name')).toBeTruthy();
      expect(screen.getAllByText('Paracetamol 500mg Tablet').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Analgesic / Antipyretic')).toBeTruthy();
      expect(screen.getByText('Paracetamol 500mg')).toBeTruthy();
      expect(screen.getByText('Acme Pharma Ltd.')).toBeTruthy();
      expect(screen.getByText('Pain relief and fever reduction')).toBeTruthy();
      expect(screen.getByText('Take 1-2 tablets every 4-6 hours as needed')).toBeTruthy();
      expect(screen.getByText('Do not exceed 4g in 24 hours')).toBeTruthy();
      expect(screen.getByText('Store below 25°C')).toBeTruthy();
      expect(screen.getByText('123456789012')).toBeTruthy();
    });
  });

  it('handles back button navigation', async () => {
    await render(<MedicineDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByLabelText('Go back')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates to EditMedicine with medicine ID when edit header button is pressed', async () => {
    await render(<MedicineDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('app-header-right-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('app-header-right-button'));
    expect(mockNavigate).toHaveBeenCalledWith('EditMedicine', { id: 'med-1' });
  });

  it('renders commercial trade scheme as clean string and current batch date human-formatted', async () => {
    const { apiClient } = require('../src/services/api-client');
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/commercial-details')) {
        return Promise.resolve({
          commercialDetails: {
            id: 'comm-1',
            mrp: 255,
            purchaseRate: 194.26,
            discountPercent: 5,
            gstPercent: 5,
            scheme: { description: '10+3' },
            batch: {
              id: 'batch-1',
              batchNumber: 'ZRST-4246',
              expiryDate: '2028-06-01T00:00:00.000Z',
            },
          },
        });
      }
      return Promise.resolve({
        medicine: {
          id: 'med-1',
          name: 'Paracetamol 500mg Tablet',
          composition: { id: 'comp-1', displayText: 'Paracetamol 500mg' },
          form: 'TABLET',
          packQuantity: 10,
          packUnit: 'TABLET',
          manufacturer: { id: 'mfg-1', name: 'Acme Pharma Ltd.' },
          active: true,
        },
      });
    });

    await render(<MedicineDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('commercial-scheme')).toBeTruthy();
      expect(screen.getByText('10+3')).toBeTruthy();
      expect(screen.getByTestId('commercial-batch-number')).toBeTruthy();
      expect(screen.getByText('ZRST-4246 (Exp: 01 Jun 2028)')).toBeTruthy();
    });
  });
});
