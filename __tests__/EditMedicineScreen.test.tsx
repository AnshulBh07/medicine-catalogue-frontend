import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { EditMedicineScreen } from '../src/screens/medicines/EditMedicineScreen';
import { apiClient, ApiError } from '../src/services/api-client';

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
      params: { id: 'med-123' },
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
  const actualModule = jest.requireActual('../src/services/api-client');
  return {
    ...actualModule,
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

const mockMedicineData = {
  id: 'med-123',
  name: 'Augmentin 625 Duo Tablet',
  composition: { id: 'comp-100', displayText: 'Amoxicillin 500mg + Clavulanic Acid 125mg' },
  form: 'TABLET',
  packQuantity: 10,
  packUnit: 'TABLET',
  shortDescription: 'Broad Spectrum Antibiotic',
  imageUrl: 'https://images.example.com/medicines/existing/packaging-old.png',
  uses: 'Bacterial respiratory and soft tissue infections',
  recommendedAgeGroup: 'Adults',
  directions: 'Take 1 tablet twice daily with food',
  warnings: 'Complete full course. Contraindicated in penicillin allergy.',
  storageInstructions: 'Store in airtight container below 25C',
  barcode: '8901002003004',
  prescriptionRequired: true,
  manufacturer: { id: 'mfg-1', name: 'Acme Pharma Ltd.' },
  mr: { id: 'mr-1', name: 'Ravi Kumar', company: 'Acme Pharma Ltd.', phone: '+919876543210' },
  mrp: 200,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockCompositionData = {
  id: 'comp-100',
  displayText: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
  compositionSalts: [
    { id: 'cs-1', salt: { id: 'salt-3', name: 'Amoxicillin' }, amount: 500, unit: 'MG' },
    { id: 'cs-2', salt: { id: 'salt-4', name: 'Clavulanic Acid' }, amount: 125, unit: 'MG' },
  ],
};

const mockCommercialDetailsData = {
  id: 'comm-123',
  medicineId: 'med-123',
  purchaseRate: 140.0,
  mrp: 200.0,
  discountPercent: 10.0,
  scheme: { description: '10 + 1 Free' },
  privateNotes: 'Distributor credit 30 days',
  updatedBy: { id: 'user-admin', name: 'Admin', email: 'admin@example.com' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('EditMedicineScreen - R2 Image Management & Update Verification', () => {
  const originalFetch = global.fetch;

  const setupStandardMocks = () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.startsWith('file://')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          blob: () => Promise.resolve({ size: 2000, type: 'image/jpeg' }),
        });
      }
      if (typeof url === 'string' && url.startsWith('https://r2.example.com')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({}),
      });
    }) as unknown as typeof global.fetch;

    (apiClient.get as jest.Mock).mockImplementation((endpoint: string) => {
      if (endpoint === '/manufacturers') {
        return Promise.resolve({
          manufacturers: [
            { id: 'mfg-1', name: 'Acme Pharma Ltd.', active: true },
            { id: 'mfg-2', name: 'Global Pharma', active: true },
          ],
        });
      }
      if (endpoint === '/mrs') {
        return Promise.resolve({
          mrs: [
            { id: 'mr-1', name: 'Ravi Kumar', company: 'Acme Pharma Ltd.', phone: '+919876543210', active: true },
            { id: 'mr-2', name: 'Priya Sharma', company: 'Global Pharma', phone: '+919876543211', active: true },
          ],
        });
      }
      if (endpoint === '/salts') {
        return Promise.resolve({
          salts: [
            { id: 'salt-1', name: 'Paracetamol', active: true },
            { id: 'salt-2', name: 'Caffeine', active: true },
            { id: 'salt-3', name: 'Amoxicillin', active: true },
            { id: 'salt-4', name: 'Clavulanic Acid', active: true },
          ],
        });
      }
      if (endpoint === '/medicines/med-123') {
        return Promise.resolve({ medicine: mockMedicineData });
      }
      if (endpoint === '/compositions/comp-100') {
        return Promise.resolve({ composition: mockCompositionData });
      }
      if (endpoint === '/medicines/med-123/commercial-details') {
        return Promise.resolve({ commercialDetails: mockCommercialDetailsData });
      }
      return Promise.resolve({});
    });

    (apiClient.post as jest.Mock).mockImplementation((endpoint: string) => {
      if (endpoint === '/uploads/medicine-image') {
        return Promise.resolve({
          uploadUrl: 'https://r2.example.com/presigned-upload-new',
          objectKey: 'medicines/u1/packaging-replacement.jpg',
          publicUrl: 'https://images.example.com/medicines/u1/packaging-replacement.jpg',
        });
      }
      if (endpoint === '/uploads/cleanup') {
        return Promise.resolve({ success: true });
      }
      return Promise.resolve({});
    });

    (apiClient.patch as jest.Mock).mockResolvedValue({
      medicine: { ...mockMedicineData, name: 'Augmentin 625 Duo Tablet (Updated)' },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    setupStandardMocks();
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    global.fetch = originalFetch;
  });

  it('1. populates all existing medicine fields, composition salts, and commercial details on load', async () => {
    await render(<EditMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Augmentin 625 Duo Tablet')).toBeTruthy();
      expect(screen.getByDisplayValue('Broad Spectrum Antibiotic')).toBeTruthy();
      expect(screen.getByDisplayValue('8901002003004')).toBeTruthy();
      expect(screen.getByDisplayValue('Bacterial respiratory and soft tissue infections')).toBeTruthy();
      expect(screen.getByDisplayValue('Take 1 tablet twice daily with food')).toBeTruthy();
      expect(screen.getByDisplayValue('Complete full course. Contraindicated in penicillin allergy.')).toBeTruthy();
      expect(screen.getByDisplayValue('Store in airtight container below 25C')).toBeTruthy();
      expect(screen.getByDisplayValue('200')).toBeTruthy();
      expect(screen.getByDisplayValue('140')).toBeTruthy();
      expect(screen.getAllByDisplayValue('10').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByDisplayValue('10 + 1 Free')).toBeTruthy();
      expect(screen.getByDisplayValue('Distributor credit 30 days')).toBeTruthy();
      expect(screen.getByTestId('image-preview')).toBeTruthy();
    });
  });

  it('2. submits updates with unchanged image without requesting new R2 upload', async () => {
    await render(<EditMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Augmentin 625 Duo Tablet')).toBeTruthy();
    });

    const nameInput = screen.getByDisplayValue('Augmentin 625 Duo Tablet');
    fireEvent.changeText(nameInput, 'Augmentin 1000mg Forte');

    await waitFor(() => {
      expect(screen.getByDisplayValue('Augmentin 1000mg Forte')).toBeTruthy();
    });

    const submitBtn = screen.getByTestId('submit-edit-medicine-button');
    await act(async () => {
      fireEvent.press(submitBtn);
    });

    await waitFor(() => {
      // No R2 upload requested because image did not change
      expect(apiClient.post).not.toHaveBeenCalledWith('/uploads/medicine-image', expect.anything());
      expect(apiClient.patch).toHaveBeenCalledWith(
        '/medicines/med-123',
        expect.objectContaining({
          name: 'Augmentin 1000mg Forte',
          imageUrl: 'https://images.example.com/medicines/existing/packaging-old.png',
        }),
      );
    });
  });

  it('3. allows removing existing image so imageUrl is sent as null', async () => {
    await render(<EditMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Augmentin 625 Duo Tablet')).toBeTruthy();
      expect(screen.getByTestId('remove-image-button')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('remove-image-button'));
    });

    const submitBtn = screen.getByTestId('submit-edit-medicine-button');
    await act(async () => {
      fireEvent.press(submitBtn);
    });

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith(
        '/medicines/med-123',
        expect.objectContaining({
          imageUrl: null,
        }),
      );
    });
  });

  it('4. allows selecting a replacement gallery image, uploads to R2, and updates with new public imageUrl', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///local/cache/new-box.jpg',
          base64: 'base64str',
          mimeType: 'image/jpeg',
          fileSize: 50000,
        },
      ],
    });

    await render(<EditMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Augmentin 625 Duo Tablet')).toBeTruthy();
      expect(screen.getByTestId('image-picker-box')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('image-picker-box'));
    });

    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });

    const submitBtn = screen.getByTestId('submit-edit-medicine-button');
    await act(async () => {
      fireEvent.press(submitBtn);
    });

    await waitFor(() => {
      // 1. Requests R2 upload URL
      expect(apiClient.post).toHaveBeenCalledWith(
        '/uploads/medicine-image',
        expect.objectContaining({
          contentType: 'image/jpeg',
        }),
      );
      // 2. Direct PUT upload
      expect(global.fetch).toHaveBeenCalledWith(
        'https://r2.example.com/presigned-upload-new',
        expect.objectContaining({
          method: 'PUT',
        }),
      );
      // 3. PATCH sent with new public imageUrl
      expect(apiClient.patch).toHaveBeenCalledWith(
        '/medicines/med-123',
        expect.objectContaining({
          imageUrl: 'https://images.example.com/medicines/u1/packaging-replacement.jpg',
        }),
      );
    });
  });

  it('5. handles duplicate barcode conflict error from backend', async () => {
    (apiClient.patch as jest.Mock).mockRejectedValueOnce(
      new ApiError(409, 'DUPLICATE_BARCODE', 'Barcode already in use.'),
    );

    const { getByTestId, getByDisplayValue, getByText } = await render(<EditMedicineScreen />);

    await waitFor(() => {
      expect(getByDisplayValue('8901002003004')).toBeTruthy();
    });

    fireEvent.press(getByTestId('submit-edit-medicine-button'));

    await waitFor(() => {
      expect(getByTestId('form-error-banner')).toBeTruthy();
      expect(getByText('Barcode already in use. Please provide a unique barcode.')).toBeTruthy();
    });
  });

  it('6. handles initial load failure and displays error state with retry', async () => {
    (apiClient.get as jest.Mock).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/medicines/')) {
        return Promise.reject(new Error('Network connection failed'));
      }
      return Promise.resolve({});
    });

    await render(<EditMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Medicine')).toBeTruthy();
      expect(screen.getByText('Try Again')).toBeTruthy();
    });
  });
});
