import React from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { AddMedicineScreen } from '../src/screens/medicines/AddMedicineScreen';
import { apiClient } from '../src/services/api-client';
import { ocrService, type ScanMedicineResult } from '../src/services/ocrService';
import { storage } from '../src/lib/storage';

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
      params: {},
    }),
  };
});

jest.mock('../src/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', name: 'Admin Master', role: 'ADMIN' },
    isAdmin: true,
    isEmployee: false,
    isAuthenticated: true,
    isLoading: false,
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
    },
  };
});

jest.mock('../src/services/image-upload.service', () => ({
  uploadMedicinePackagingImage: jest.fn().mockResolvedValue({
    publicUrl: 'https://cdn.example.com/packaging.jpg',
    objectKey: 'packaging-key-1',
  }),
  cleanupMedicinePackagingImage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/ocrService', () => ({
  ocrService: {
    scanMedicinePhotos: jest.fn(),
  },
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

describe('Feature 3: Medicine Photo Scanner with Automatic Form Filling', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await storage.clearMedicineDraft();

    (apiClient.get as jest.Mock).mockImplementation((path: string) => {
      if (path === '/manufacturers') {
        return Promise.resolve({
          manufacturers: [
            { id: 'mfg-1', name: 'Micro Labs Limited', active: true },
            { id: 'mfg-2', name: 'GlaxoSmithKline Pharmaceuticals Ltd', active: true },
          ],
        });
      }
      if (path === '/salts') {
        return Promise.resolve({
          salts: [
            { id: 'salt-1', name: 'Paracetamol', active: true },
            { id: 'salt-2', name: 'Amoxycillin', active: true },
            { id: 'salt-3', name: 'Clavulanic Acid', active: true },
          ],
        });
      }
      if (path === '/mrs') {
        return Promise.resolve({ mrs: [] });
      }
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('1. renders the Scan Medicine / Fill Using Photo action card on Add Medicine screen', async () => {
    const { getByTestId, getAllByText } = await render(<AddMedicineScreen />);

    await waitFor(() => {
      expect(getByTestId('scan-medicine-hero-card')).toBeTruthy();
      expect(getAllByText('Scan Medicine / Fill Using Photo').length).toBeGreaterThanOrEqual(1);
      expect(getByTestId('btn-scan-medicine')).toBeTruthy();
    });
  });

  it('2. opens the photo scanner modal when action button is tapped', async () => {
    const { getByTestId, getByText } = await render(<AddMedicineScreen />);

    await waitFor(() => {
      expect(getByTestId('btn-scan-medicine')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('btn-scan-medicine'));
    });

    await waitFor(() => {
      expect(getByText('Scan Medicine Packaging')).toBeTruthy();
      expect(getByTestId('btn-capture-camera')).toBeTruthy();
      expect(getByTestId('btn-capture-gallery')).toBeTruthy();
    });
  });

  it('3. supports capturing multiple photos and displays thumbnails with removal option', async () => {
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://front-photo.jpg', base64: 'abc' }],
    });

    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://back-photo.jpg', base64: 'def' }],
    });

    const { getByTestId, getByText, queryByTestId } = await render(<AddMedicineScreen />);

    await act(async () => {
      fireEvent.press(getByTestId('btn-scan-medicine'));
    });

    // Capture first photo (Camera)
    await act(async () => {
      fireEvent.press(getByTestId('btn-capture-camera'));
    });

    await waitFor(() => {
      expect(getByTestId('scanned-photo-card-0')).toBeTruthy();
      expect(getByText('Front Packaging')).toBeTruthy();
    });

    // Capture second photo (Gallery)
    await act(async () => {
      fireEvent.press(getByTestId('btn-capture-gallery'));
    });

    await waitFor(() => {
      expect(getByTestId('scanned-photo-card-1')).toBeTruthy();
      expect(getByText('Back / Composition')).toBeTruthy();
    });

    // Verify remove button on photo 1
    expect(getByTestId('remove-photo-1')).toBeTruthy();
    await act(async () => {
      fireEvent.press(getByTestId('remove-photo-1'));
    });

    await waitFor(() => {
      expect(queryByTestId('scanned-photo-card-1')).toBeNull();
    });
  });

  it('4. extracts packaging info and populates the form fields without auto-saving', async () => {
    const mockOcrResult: ScanMedicineResult = {
      extracted: {
        name: 'Dolo 650',
        manufacturer: 'Micro Labs Limited',
        mrp: '34.15',
        batchNumber: 'G24019',
        manufacturingDate: '2024-03-01',
        expiryDate: '2027-02-28',
        form: 'TABLET',
        packQuantity: '15',
        packUnit: 'TABLET',
        salts: [{ name: 'Paracetamol', amount: '650', unit: 'MG' }],
      },
      conflicts: [],
      photosProcessed: 1,
      fieldsExtractedCount: 8,
    };

    (ocrService.scanMedicinePhotos as jest.Mock).mockResolvedValue(mockOcrResult);

    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://dolo-front.jpg', base64: 'base64-dolo' }],
    });

    const { getByTestId, getByText, getByDisplayValue } = await render(<AddMedicineScreen />);

    // Open scanner and capture photo
    await act(async () => {
      fireEvent.press(getByTestId('btn-scan-medicine'));
    });

    await act(async () => {
      fireEvent.press(getByTestId('btn-capture-camera'));
    });

    await waitFor(() => {
      expect(getByTestId('btn-process-photos')).toBeTruthy();
    });

    // Process photo
    await act(async () => {
      fireEvent.press(getByTestId('btn-process-photos'));
    });

    await waitFor(() => {
      // Modal should be closed and form populated
      expect(getByDisplayValue('Dolo 650')).toBeTruthy();
      expect(getByDisplayValue('34.15')).toBeTruthy();
      expect(getByDisplayValue('G24019')).toBeTruthy();
      expect(getByText('Mar 2024')).toBeTruthy();
      expect(getByText('Feb 2027')).toBeTruthy();
      expect(getByDisplayValue('15')).toBeTruthy();
      expect(getByDisplayValue('650')).toBeTruthy();
      expect(getByTestId('scan-feedback-banner')).toBeTruthy();
      expect(getByText(/Form successfully populated from 1 packaging photo/)).toBeTruthy();
    });

    // Verify form was NOT auto-saved to backend API
    expect(apiClient.post).not.toHaveBeenCalledWith(
      '/medicines',
      expect.anything(),
    );
  });

  it('5. flags conflicting extracted values across multiple photographs for review', async () => {
    const mockConflictResult: ScanMedicineResult = {
      extracted: {
        name: 'Pan 40',
        manufacturer: 'Alkem Laboratories Ltd',
        mrp: '155.00',
        batchNumber: 'ALK001',
        expiryDate: '2026-11-30',
        form: 'TABLET',
      },
      conflicts: [
        {
          field: 'mrp',
          values: ['155.00', '165.00'],
          message: 'Conflicting MRP detected across photos: ₹155.00 vs ₹165.00',
        },
      ],
      photosProcessed: 2,
      fieldsExtractedCount: 6,
    };

    (ocrService.scanMedicinePhotos as jest.Mock).mockResolvedValue(mockConflictResult);

    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://pan40-photo1.jpg' }],
    });

    const { getByTestId, getByText, getByDisplayValue } = await render(<AddMedicineScreen />);

    await act(async () => {
      fireEvent.press(getByTestId('btn-scan-medicine'));
    });

    await act(async () => {
      fireEvent.press(getByTestId('btn-capture-camera'));
    });

    await act(async () => {
      fireEvent.press(getByTestId('btn-process-photos'));
    });

    await waitFor(() => {
      expect(getByDisplayValue('Pan 40')).toBeTruthy();
      expect(getByTestId('scan-feedback-banner')).toBeTruthy();
      expect(getByText(/Conflicting MRP detected across photos/)).toBeTruthy();
    });
  });

  it('6. user can edit populated fields and successfully submit the form', async () => {
    const mockOcrResult: ScanMedicineResult = {
      extracted: {
        name: 'Dolo 650',
        manufacturer: 'Micro Labs Limited',
        mrp: '34.15',
        batchNumber: 'G24019',
        manufacturingDate: '2024-03-01',
        expiryDate: '2027-02-28',
        form: 'TABLET',
        packQuantity: '15',
        packUnit: 'TABLET',
        salts: [{ name: 'Paracetamol', amount: '650', unit: 'MG' }],
      },
      conflicts: [],
      photosProcessed: 1,
      fieldsExtractedCount: 8,
    };

    (ocrService.scanMedicinePhotos as jest.Mock).mockResolvedValue(mockOcrResult);

    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://photo.jpg' }],
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob()),
    });

    (apiClient.post as jest.Mock).mockImplementation((path: string) => {
      if (path === '/uploads/medicine-image') {
        return Promise.resolve({
          uploadUrl: 'https://upload.example.com',
          publicUrl: 'https://cdn.example.com/packaging.jpg',
          objectKey: 'packaging-key-1',
        });
      }
      if (path === '/medicines') {
        return Promise.resolve({
          medicine: {
            id: 'med-new-1',
            name: 'Dolo 650 Tablet',
            mrp: 35.0,
          },
        });
      }
      return Promise.resolve({});
    });

    const { getByTestId, getByDisplayValue } = await render(<AddMedicineScreen />);

    // Scan
    await act(async () => {
      fireEvent.press(getByTestId('btn-scan-medicine'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('btn-capture-camera'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('btn-process-photos'));
    });

    await waitFor(() => {
      expect(getByDisplayValue('Dolo 650')).toBeTruthy();
    });

    // User edits the name and price
    await act(async () => {
      fireEvent.changeText(getByTestId('input-medicine-name'), 'Dolo 650 Tablet');
      fireEvent.changeText(getByTestId('input-mrp'), '35.00');
    });

    // User saves the form manually
    await act(async () => {
      fireEvent.press(getByTestId('submit-add-medicine-button'));
    });

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/medicines',
        expect.objectContaining({
          name: 'Dolo 650 Tablet',
          commercialDetails: expect.objectContaining({ mrp: 35 }),
        }),
      );
    });
  });

  it('7. manual entry workflow remains functional without using photo scanner', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      medicine: {
        id: 'med-manual-1',
        name: 'Aspirin 75mg',
      },
    });

    const { getByTestId } = await render(<AddMedicineScreen />);

    await waitFor(() => {
      expect(getByTestId('input-medicine-name')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(getByTestId('input-medicine-name'), 'Aspirin 75mg');
      fireEvent.changeText(getByTestId('input-mrp'), '20.00');
    });

    await act(async () => {
      fireEvent.press(getByTestId('submit-add-medicine-button'));
    });

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/medicines',
        expect.objectContaining({
          name: 'Aspirin 75mg',
        }),
      );
    });
  });
});
