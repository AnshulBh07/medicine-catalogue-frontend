import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthProvider } from '../src/features/auth';
import { storage } from '../src/lib/storage';
import { AddMedicineScreen } from '../src/screens/medicines/AddMedicineScreen';
import { apiClient, ApiError } from '../src/services/api-client';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  const actualReact = jest.requireActual<typeof React>('react');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      dispatch: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
    }),
    useFocusEffect: (cb: () => void) => {
      actualReact.useEffect(() => {
        cb();
      }, [cb]);
    },
  };
});

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({
    granted: true,
    canAskAgain: true,
  }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'file:///data/user/0/host.exp.exponent/cache/packaging.jpg',
        base64: 'base64-packaging-image-bytes',
        mimeType: 'image/jpeg',
        fileName: 'packaging.jpg',
        width: 800,
        height: 600,
      },
    ],
  }),
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

describe('AddMedicineScreen - Cloudflare R2 Image Upload & Form Verification', () => {
  const originalFetch = global.fetch;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    await storage.clearAuth();
    await storage.setToken('fake-admin-token');
    await storage.setUser({
      id: 'admin-001',
      name: 'Admin User',
      email: 'admin@medicina.com',
      role: 'ADMIN',
      phone: '+919999988888',
      profileImageUrl: null,
      active: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });
    await storage.clearMedicineDraft();

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.startsWith('file://')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          blob: () => Promise.resolve({ size: 1000, type: 'image/jpeg' }),
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

    (apiClient.get as jest.Mock).mockImplementation((path: string) => {
      if (path.startsWith('/manufacturers')) {
        return Promise.resolve({
          manufacturers: [
            { id: 'mfg-1', name: 'Acme Pharma Ltd.', active: true },
            { id: 'mfg-2', name: 'Global Pharma', active: true },
          ],
        });
      }
      if (path.startsWith('/mrs')) {
        return Promise.resolve({
          mrs: [
            { id: 'mr-1', name: 'Ravi Kumar', company: 'Acme Pharma Ltd.', phone: '+919876543210', active: true },
          ],
        });
      }
      if (path.startsWith('/salts')) {
        return Promise.resolve({
          salts: [
            { id: 'salt-1', name: 'Paracetamol', active: true },
            { id: 'salt-2', name: 'Caffeine', active: true },
            { id: 'salt-3', name: 'Amoxicillin', active: true },
          ],
        });
      }
      return Promise.resolve({});
    });

    (apiClient.post as jest.Mock).mockImplementation((path: string, body?: { name?: string; imageUrl?: string | null }) => {
      if (path === '/uploads/medicine-image') {
        return Promise.resolve({
          uploadUrl: 'https://r2.example.com/presigned-upload',
          objectKey: 'medicines/u1/packaging-u2.jpg',
          publicUrl: 'https://images.example.com/medicines/u1/packaging-u2.jpg',
        });
      }
      if (path === '/medicines') {
        return Promise.resolve({
          medicine: {
            id: 'med-new-123',
            name: body?.name || 'Test Medicine',
            imageUrl: body?.imageUrl || null,
          },
        });
      }
      return Promise.resolve({});
    });

    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///data/user/0/com.medicina/cache/amox_box.jpg',
          mimeType: 'image/jpeg',
          width: 800,
          height: 600,
          fileSize: 120400,
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    global.fetch = originalFetch;
  });

  it('1. confirms there is NO manual Image URL input and NO preset chips', async () => {
    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    // Confirm standard sections exist
    expect(screen.getByText('1. Basic Information')).toBeTruthy();
    expect(screen.getByTestId('input-medicine-name')).toBeTruthy();
    expect(screen.getByTestId('select-medicine-form')).toBeTruthy();

    // Confirm image picker box is present
    expect(screen.getByTestId('image-picker-box')).toBeTruthy();
    expect(screen.getByText('Tap to select image')).toBeTruthy();
    expect(screen.getByText('from gallery')).toBeTruthy();

    // Confirm NO manual Image URL text input or preset chips
    expect(screen.queryByTestId('input-image-url')).toBeNull();
    expect(screen.queryByText('Paste direct image URL or choose a preset below')).toBeNull();
    expect(screen.queryByTestId('preset-image-tablet-strip')).toBeNull();
  });

  it('2. opens gallery picker on tap, previews selected image, replaces it, and removes it', async () => {
    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('Tap to select image')).toBeTruthy());
    expect(screen.queryByTestId('image-preview')).toBeNull();

    // Tap image picker area
    await act(async () => {
      fireEvent.press(screen.getByTestId('image-picker-box'));
    });

    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
        }),
      );
    });

    // Image preview should now be visible with change and remove actions
    await waitFor(() => {
      expect(screen.getByTestId('image-preview')).toBeTruthy();
      expect(screen.getByText('Tap to change image')).toBeTruthy();
      expect(screen.getByTestId('remove-image-button')).toBeTruthy();
    });

    // Tap change image
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///data/user/0/host.exp.exponent/cache/replaced-box.jpg',
          base64: 'base64-replaced-image-bytes',
          mimeType: 'image/jpeg',
          fileName: 'replaced-box.jpg',
        },
      ],
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('image-picker-box'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('image-preview')).toBeTruthy();
    });

    // Tap remove image
    await act(async () => {
      fireEvent.press(screen.getByTestId('remove-image-button'));
    });

    // Should return to empty gallery picker prompt
    await waitFor(() => {
      expect(screen.queryByTestId('image-preview')).toBeNull();
      expect(screen.getByText('Tap to select image')).toBeTruthy();
      expect(screen.getByText('from gallery')).toBeTruthy();
    });
  });

  it('3. handles gallery picker cancellation gracefully without error', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: true,
      assets: null,
    });

    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('image-picker-box'));
    });

    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });

    // Remains in empty state without crashing or setting preview
    expect(screen.queryByTestId('image-preview')).toBeNull();
    expect(screen.getByText('Tap to select image')).toBeTruthy();
  });

  it('4. submits medicine with NO image selected (imageUrl is null, no R2 upload requested)', async () => {
    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('image-picker-box')).toBeTruthy());

    // 1. Fill basic info
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-medicine-name'), 'Amoxicillin 250mg');
    });
    await waitFor(() => expect(screen.getByDisplayValue('Amoxicillin 250mg')).toBeTruthy());

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-short-description'), 'Antibiotic capsules');
    });
    await waitFor(() => expect(screen.getByDisplayValue('Antibiotic capsules')).toBeTruthy());

    // 2. Fill MRP
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-mrp'), '75.00');
    });
    await waitFor(() => expect(screen.getByDisplayValue('75.00')).toBeTruthy());

    // Submit
    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-add-medicine-button'));
    });

    await waitFor(() => {
      expect(apiClient.post).not.toHaveBeenCalledWith('/uploads/medicine-image', expect.anything());
      expect(apiClient.post).toHaveBeenCalledWith(
        '/medicines',
        expect.objectContaining({
          name: 'Amoxicillin 250mg',
          imageUrl: null,
          manufacturerId: 'mfg-1',
        }),
      );
      expect(screen.getByTestId('form-success-banner')).toBeTruthy();
    });
  });

  it('5. submits medicine with image selected (requests R2 upload URL, uploads directly, sends public imageUrl)', async () => {
    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('image-picker-box')).toBeTruthy());

    // 1. Pick an image from gallery
    await act(async () => {
      fireEvent.press(screen.getByTestId('image-picker-box'));
    });
    await waitFor(() => expect(screen.getByTestId('image-preview')).toBeTruthy());

    // 2. Fill basic info
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-medicine-name'), 'Paracetamol & Caffeine Extra');
    });
    await waitFor(() => expect(screen.getByDisplayValue('Paracetamol & Caffeine Extra')).toBeTruthy());

    // 3. Fill MRP
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-mrp'), '120.00');
    });
    await waitFor(() => expect(screen.getByDisplayValue('120.00')).toBeTruthy());

    // Submit
    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-add-medicine-button'));
    });

    await waitFor(() => {
      // 1. Upload URL requested
      expect(apiClient.post).toHaveBeenCalledWith(
        '/uploads/medicine-image',
        expect.objectContaining({
          contentType: 'image/jpeg',
        }),
      );

      // 2. Direct R2 PUT upload performed
      expect(global.fetch).toHaveBeenCalledWith(
        'https://r2.example.com/presigned-upload',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'image/jpeg',
          },
        }),
      );

      // 3. Medicine created with real R2 public imageUrl
      expect(apiClient.post).toHaveBeenCalledWith(
        '/medicines',
        expect.objectContaining({
          name: 'Paracetamol & Caffeine Extra',
          imageUrl: 'https://images.example.com/medicines/u1/packaging-u2.jpg',
        }),
      );
      expect(screen.getByTestId('form-success-banner')).toBeTruthy();
    });
  });

  it('6. handles R2 upload failure gracefully without creating broken medicine', async () => {
    // Mock direct upload failure
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.startsWith('file://')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          blob: () => Promise.resolve({ size: 1000 }),
        });
      }
      if (typeof url === 'string' && url.startsWith('https://r2.example.com')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Storage Error',
        });
      }
      return Promise.resolve({ ok: true, status: 200 });
    }) as unknown as typeof global.fetch;

    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    // 1. Pick image
    await act(async () => {
      fireEvent.press(screen.getByTestId('image-picker-box'));
    });
    await waitFor(() => expect(screen.getByTestId('image-preview')).toBeTruthy());

    // 2. Fill info
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-medicine-name'), 'Failed Upload Medicine');
    });
    await waitFor(() => expect(screen.getByDisplayValue('Failed Upload Medicine')).toBeTruthy());

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-mrp'), '100');
    });
    await waitFor(() => expect(screen.getByDisplayValue('100')).toBeTruthy());

    // 3. Submit
    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-add-medicine-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('form-error-banner')).toBeTruthy();
      expect(screen.getByText(/Image Upload Failed/i)).toBeTruthy();
    });

    // Medicine creation was NOT attempted with broken/local URI
    expect(apiClient.post).not.toHaveBeenCalledWith('/medicines', expect.anything());
    // Local image preview remains intact so user can retry
    expect(screen.getByTestId('image-preview')).toBeTruthy();
  });

  it('7. cleans up newly uploaded R2 object if medicine creation fails after upload', async () => {
    (apiClient.post as jest.Mock).mockImplementation((path: string) => {
      if (path === '/uploads/medicine-image') {
        return Promise.resolve({
          uploadUrl: 'https://r2.example.com/presigned-upload',
          objectKey: 'medicines/u1/packaging-u2.jpg',
          publicUrl: 'https://images.example.com/medicines/u1/packaging-u2.jpg',
        });
      }
      if (path === '/uploads/cleanup') {
        return Promise.resolve({ success: true });
      }
      if (path === '/medicines') {
        return Promise.reject(new ApiError(500, 'SERVER_ERROR', 'Database transaction timeout'));
      }
      return Promise.resolve({});
    });

    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    // 1. Pick image
    await act(async () => {
      fireEvent.press(screen.getByTestId('image-picker-box'));
    });
    await waitFor(() => expect(screen.getByTestId('image-preview')).toBeTruthy());

    // 2. Fill info
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-medicine-name'), 'Orphaned Image Medicine');
    });
    await waitFor(() => expect(screen.getByDisplayValue('Orphaned Image Medicine')).toBeTruthy());

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-mrp'), '100');
    });
    await waitFor(() => expect(screen.getByDisplayValue('100')).toBeTruthy());

    // 3. Submit
    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-add-medicine-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('form-error-banner')).toBeTruthy();
      expect(screen.getByText('Database transaction timeout')).toBeTruthy();
      expect(apiClient.post).toHaveBeenCalledWith('/uploads/cleanup', {
        objectKey: 'medicines/u1/packaging-u2.jpg',
        publicUrl: 'https://images.example.com/medicines/u1/packaging-u2.jpg',
      });
    });
  });

  it('8. validates required fields and displays validation messages', async () => {
    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('input-medicine-name')).toBeTruthy());

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-medicine-name'), '');
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-add-medicine-button'));
    });

    await waitFor(() => {
      expect(screen.getByText('Please resolve the highlighted validation errors above.')).toBeTruthy();
      expect(screen.getByText('Medicine Name is required')).toBeTruthy();
    });

    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('9. restores unfinished draft automatically on mount with clear draft banner', async () => {
    await storage.saveMedicineDraft({
      name: 'Restored Draft Medicine',
      form: 'CAPSULE',
      shortDescription: 'Saved draft description',
      barcode: '1234567890123',
      saltRows: [
        {
          id: 'salt-row-1',
          saltId: 'salt-3',
          name: 'Amoxicillin',
          amount: '250',
          unit: 'MG',
        },
      ],
      packQuantity: '20',
      packUnit: 'CAPSULE',
      uses: 'Bacterial infections',
      recommendedAgeGroup: 'Adults',
      directions: 'Take with food',
      warnings: 'Complete full course',
      storageInstructions: 'Store in cool dry place',
      prescriptionRequired: true,
      manufacturerName: 'Global Pharma',
      manufacturerId: 'mfg-2',
      mrId: null,
      batchNumber: 'DRAFT-BATCH-001',
      manufacturingDate: '2026-04-01',
      expiryDate: '2029-04-01',
      mrp: '150.00',
      purchaseRate: '110.00',
      discountPercent: '5',
      scheme: '10+1 free',
      privateNotes: 'Draft private note',
      savedAt: '2026-08-31T12:00:00.000Z',
    });

    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('draft-restored-banner')).toBeTruthy();
      expect(screen.getByDisplayValue('Restored Draft Medicine')).toBeTruthy();
      expect(screen.getByDisplayValue('Saved draft description')).toBeTruthy();
      expect(screen.getByDisplayValue('150.00')).toBeTruthy();
      expect(screen.getByDisplayValue('DRAFT-BATCH-001')).toBeTruthy();
    });
  });

  it('10. discards draft upon user confirmation and resets form to initial state', async () => {
    await storage.saveMedicineDraft({
      name: 'Draft To Discard',
      form: 'TABLET',
      shortDescription: 'Discard me',
      barcode: '',
      saltRows: [
        {
          id: 'salt-row-1',
          saltId: 'salt-1',
          name: 'Paracetamol',
          amount: '500',
          unit: 'MG',
        },
      ],
      packQuantity: '10',
      packUnit: 'TABLET',
      uses: '',
      recommendedAgeGroup: 'Adults',
      directions: '',
      warnings: '',
      storageInstructions: '',
      prescriptionRequired: false,
      manufacturerName: 'Acme Pharma Ltd.',
      manufacturerId: 'mfg-1',
      mrId: null,
      batchNumber: '',
      mrp: '99.00',
      purchaseRate: '',
      discountPercent: '',
      scheme: '',
      privateNotes: '',
      savedAt: '2026-08-31T12:00:00.000Z',
    });

    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('draft-restored-banner')).toBeTruthy();
      expect(screen.getByTestId('discard-draft-button')).toBeTruthy();
    });

    // Press Discard Draft
    await act(async () => {
      fireEvent.press(screen.getByTestId('discard-draft-button'));
    });

    // Confirm Discard Dialog
    await waitFor(() => {
      expect(screen.getByTestId('discard-draft-dialog')).toBeTruthy();
      expect(screen.getByTestId('confirm-discard-draft-button')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-discard-draft-button'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('draft-restored-banner')).toBeNull();
      expect(screen.queryByDisplayValue('Draft To Discard')).toBeNull();
    });

    const storedDraft = await storage.getMedicineDraft();
    expect(storedDraft).toBeNull();
  });

  it('11. clears local draft upon successful medicine creation', async () => {
    await storage.saveMedicineDraft({
      name: 'Success Draft Medicine',
      form: 'TABLET',
      shortDescription: '',
      barcode: '',
      saltRows: [
        {
          id: 'salt-row-1',
          saltId: 'salt-1',
          name: 'Paracetamol',
          amount: '500',
          unit: 'MG',
        },
      ],
      packQuantity: '10',
      packUnit: 'TABLET',
      uses: '',
      recommendedAgeGroup: 'Adults',
      directions: '',
      warnings: '',
      storageInstructions: '',
      prescriptionRequired: false,
      manufacturerName: 'Acme Pharma Ltd.',
      manufacturerId: 'mfg-1',
      mrId: null,
      batchNumber: '',
      mrp: '100.00',
      purchaseRate: '',
      discountPercent: '',
      scheme: '',
      privateNotes: '',
      savedAt: '2026-08-31T12:00:00.000Z',
    });

    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('draft-restored-banner')).toBeTruthy();
    });

    // Submit
    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-add-medicine-button'));
    });

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/medicines', expect.anything());
      expect(screen.getByTestId('form-success-banner')).toBeTruthy();
    });

    const storedDraft = await storage.getMedicineDraft();
    expect(storedDraft).toBeNull();
  });

  it('12. preserves local draft when medicine creation fails', async () => {
    await storage.saveMedicineDraft({
      name: 'Failing Medicine Name',
      form: 'TABLET',
      shortDescription: '',
      barcode: '',
      saltRows: [
        {
          id: 'salt-row-1',
          saltId: 'salt-1',
          name: 'Paracetamol',
          amount: '500',
          unit: 'MG',
        },
      ],
      packQuantity: '10',
      packUnit: 'TABLET',
      uses: '',
      recommendedAgeGroup: 'Adults',
      directions: '',
      warnings: '',
      storageInstructions: '',
      prescriptionRequired: false,
      manufacturerName: 'Acme Pharma Ltd.',
      manufacturerId: 'mfg-1',
      mrId: null,
      batchNumber: '',
      mrp: '100.00',
      purchaseRate: '',
      discountPercent: '',
      scheme: '',
      privateNotes: '',
      savedAt: '2026-08-31T12:00:00.000Z',
    });

    (apiClient.post as jest.Mock).mockImplementationOnce((path: string) => {
      if (path === '/medicines') {
        return Promise.reject(new ApiError(400, 'VALIDATION_ERROR', 'Name already exists'));
      }
      return Promise.resolve({});
    });

    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('input-medicine-name')).toBeTruthy());
    await waitFor(() => expect(screen.getByDisplayValue('Failing Medicine Name')).toBeTruthy());

    // Submit
    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-add-medicine-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('form-error-banner')).toBeTruthy();
    });

    // Draft was NOT deleted on failure
    const stored = await storage.getMedicineDraft();
    expect(stored).not.toBeNull();
    expect(stored?.name).toBe('Failing Medicine Name');
  });

  it('13. allows selecting Month + Year for first batch expiry and maps to YYYY-MM-01 format in API payload', async () => {
    (apiClient.post as jest.Mock).mockImplementation((path: string) => {
      if (path === '/medicines') {
        return Promise.resolve({
          medicine: {
            id: 'new-med-123',
            name: 'Batch Date Tested Medicine',
          },
        });
      }
      return Promise.resolve({});
    });

    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('input-expiry-date')).toBeTruthy());

    // 1. Fill basic fields
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-medicine-name'), 'Batch Date Tested Medicine');
    });
    await waitFor(() => expect(screen.getByDisplayValue('Batch Date Tested Medicine')).toBeTruthy());

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-mrp'), '200.00');
    });

    // 2. Open expiry date MonthYearSelector modal
    await act(async () => {
      fireEvent.press(screen.getByTestId('input-expiry-date'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('exp-month-picker-modal')).toBeTruthy();
      expect(screen.getByTestId('month-option-4')).toBeTruthy(); // May (0-indexed index 4)
    });

    // Pick May
    await act(async () => {
      fireEvent.press(screen.getByTestId('month-option-4'));
    });

    // Submit
    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-add-medicine-button'));
    });

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/medicines',
        expect.objectContaining({
          name: 'Batch Date Tested Medicine',
          firstBatch: expect.objectContaining({
            expiryDate: expect.stringMatching(/^\d{4}-05-01$/),
          }),
        }),
      );
    });
  });

  it('14. blocks EMPLOYEE accounts from accessing Add Medicine screen', async () => {
    await storage.setToken('emp-token');
    await storage.setUser({
      id: 'emp-001',
      name: 'Employee User',
      email: 'employee@medicina.com',
      role: 'EMPLOYEE',
      phone: '+919999911111',
      profileImageUrl: null,
      active: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });

    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeTruthy();
      expect(screen.getByText('Adding new medicines is restricted to ADMIN accounts only.')).toBeTruthy();
    });
  });

  it('15. navigates to AddDeal with createdMedicineId when returnDealParams is true', async () => {
    (apiClient.post as jest.Mock).mockImplementation((path: string) => {
      if (path === '/medicines') {
        return Promise.resolve({
          medicine: {
            id: 'med-created-999',
            name: 'Deal Medicine',
          },
        });
      }
      return Promise.resolve({});
    });

    await render(
      <AuthProvider>
        <AddMedicineScreen
          route={{
            key: 'AddMedicine-test',
            name: 'AddMedicine',
            params: { returnDealParams: true },
          }}
        />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('input-medicine-name')).toBeTruthy());

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-medicine-name'), 'Deal Medicine');
      fireEvent.changeText(screen.getByTestId('input-mrp'), '180.00');
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-add-medicine-button'));
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('AddDeal', {
        createdMedicineId: 'med-created-999',
      });
    });
  });
});
