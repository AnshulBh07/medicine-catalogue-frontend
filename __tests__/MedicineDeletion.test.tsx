import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AddMedicineScreen } from '../src/screens/medicines/AddMedicineScreen';
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
  imageUrl: 'https://cdn.example.com/augmentin.png',
  uses: 'Bacterial infections',
  recommendedAgeGroup: 'Adults',
  directions: 'Take 1 tablet twice daily',
  warnings: 'Contraindicated in penicillin allergy',
  storageInstructions: 'Store in dry place',
  barcode: '8901002003004',
  prescriptionRequired: true,
  manufacturer: { id: 'mfg-1', name: 'Acme Pharma Ltd.' },
  mr: { id: 'mr-1', name: 'Ravi Kumar', company: 'Acme Pharma Ltd.' },
  mrp: 200,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('Medicine Deletion Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (apiClient.get as jest.Mock).mockImplementation((endpoint: string) => {
      if (endpoint === '/manufacturers') {
        return Promise.resolve({
          manufacturers: [{ id: 'mfg-1', name: 'Acme Pharma Ltd.', active: true }],
        });
      }
      if (endpoint === '/mrs') {
        return Promise.resolve({
          mrs: [{ id: 'mr-1', name: 'Ravi Kumar', company: 'Acme Pharma Ltd.', active: true }],
        });
      }
      if (endpoint === '/salts') {
        return Promise.resolve({
          salts: [
            { id: 'salt-3', name: 'Amoxicillin', active: true },
            { id: 'salt-4', name: 'Clavulanic Acid', active: true },
          ],
        });
      }
      if (endpoint === '/medicines/med-123') {
        return Promise.resolve({ medicine: mockMedicineData });
      }
      if (endpoint === '/compositions/comp-100') {
        return Promise.resolve({
          composition: {
            id: 'comp-100',
            displayText: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
            compositionSalts: [
              { id: 'cs-1', salt: { id: 'salt-3', name: 'Amoxicillin' }, amount: 500, unit: 'MG' },
              { id: 'cs-2', salt: { id: 'salt-4', name: 'Clavulanic Acid' }, amount: 125, unit: 'MG' },
            ],
          },
        });
      }
      if (endpoint === '/medicines/med-123/commercial-details') {
        return Promise.resolve({
          commercialDetails: {
            id: 'comm-123',
            medicineId: 'med-123',
            purchaseRate: 140.0,
            mrp: 200.0,
            discountPercent: 10.0,
            scheme: '10 + 1 Free',
            privateNotes: 'Regular terms',
          },
        });
      }
      return Promise.resolve({});
    });

    (apiClient.delete as jest.Mock).mockResolvedValue({
      medicine: {
        ...mockMedicineData,
        active: false,
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  // 1. Delete button exists on Edit screen
  it('1. Displays destructive Delete Medicine button on Edit Medicine screen', async () => {
    await render(<EditMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-medicine-button')).toBeTruthy();
      expect(screen.getByText('Delete Medicine')).toBeTruthy();
    });
  });

  // 2. Delete button is absent on Add Medicine screen
  it('2. Does not display Delete Medicine button on Add Medicine screen', async () => {
    await render(<AddMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('submit-add-medicine-button')).toBeTruthy();
      expect(screen.queryByTestId('delete-medicine-button')).toBeNull();
    });
  });

  // 3. Delete button opens confirmation modal without immediate deletion
  it('3. Tapping Delete Medicine opens confirmation modal without immediately deleting', async () => {
    await render(<EditMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-medicine-button')).toBeTruthy();
    });

    // Tap Delete Medicine
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-medicine-button'));
    });

    // Modal is opened, DELETE has not been called yet
    expect(screen.getByTestId('delete-medicine-dialog')).toBeTruthy();
    expect(screen.getAllByText('Delete Medicine').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText('Do you want to delete Augmentin 625 Duo Tablet?'),
    ).toBeTruthy();
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  // 4. Cancel dismisses modal and keeps user on Edit screen
  it('4. Tapping Cancel in modal closes confirmation dialog without modifying medicine', async () => {
    await render(<EditMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-medicine-button')).toBeTruthy();
    });

    // Open modal
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-medicine-button'));
    });

    expect(screen.getByTestId('cancel-delete-button')).toBeTruthy();

    // Tap Cancel
    await act(async () => {
      fireEvent.press(screen.getByTestId('cancel-delete-button'));
    });

    expect(apiClient.delete).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByTestId('delete-medicine-button')).toBeTruthy();
  });

  // 5. If user modified input name, modal still uses persisted medicine name
  it('5. Modal message refers to persisted medicine name even if unsaved edits exist in name field', async () => {
    await render(<EditMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('input-medicine-name')).toBeTruthy();
    });

    // Type a draft unsaved name in the input
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-medicine-name'), 'Draft Unsaved Changed Name');
    });

    // Open Delete confirmation dialog
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-medicine-button'));
    });

    // Confirmation must still use persisted name: "Augmentin 625 Duo Tablet"
    expect(
      screen.getByText('Do you want to delete Augmentin 625 Duo Tablet?'),
    ).toBeTruthy();
  });

  // 6. Confirming deletion executes DELETE and navigates to Medicines
  it('6. Confirming deletion executes DELETE /api/v1/medicines/:id and navigates to Medicines', async () => {
    await render(<EditMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-medicine-button')).toBeTruthy();
    });

    // Open modal
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-medicine-button'));
    });

    // Tap Confirm Delete
    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-delete-button'));
    });

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith('/medicines/med-123');
      expect(mockNavigate).toHaveBeenCalledWith('Medicines');
    });
  });

  // 7. Prevent duplicate deletion requests while deleting is active
  it('7. Disables buttons and prevents duplicate DELETE requests while deletion is in progress', async () => {
    let resolveDelete: (val: unknown) => void;
    (apiClient.delete as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDelete = resolve;
        }),
    );

    await render(<EditMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-medicine-button')).toBeTruthy();
    });

    // Open modal
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-medicine-button'));
    });

    // Tap Confirm Delete
    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-delete-button'));
    });

    // Attempt second tap while first is pending
    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-delete-button'));
    });

    expect(apiClient.delete).toHaveBeenCalledTimes(1);

    // Resolve deletion
    await act(async () => {
      resolveDelete!({ medicine: { ...mockMedicineData, active: false } });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Medicines');
    });
  });

  // 8. API failure displays error and stays on Edit Medicine screen
  it('8. Failed deletion keeps user on Edit Medicine screen and displays error banner', async () => {
    (apiClient.delete as jest.Mock).mockRejectedValue(
      new ApiError(500, 'INTERNAL_ERROR', 'Database connection timeout'),
    );

    await render(<EditMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-medicine-button')).toBeTruthy();
    });

    // Open modal & confirm
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-medicine-button'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-delete-button'));
    });

    // Stays on form and shows error banner
    await waitFor(() => {
      expect(screen.getByTestId('form-error-banner')).toBeTruthy();
      expect(screen.getByText('Database connection timeout')).toBeTruthy();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    // Form inputs and delete button remain interactive for retry
    expect(screen.getByTestId('delete-medicine-button')).toBeTruthy();
  });

  // 9. Concurrently deleted / 404 handling
  it('9. Concurrently deleted medicine (404) displays graceful message and redirects to Medicines', async () => {
    (apiClient.delete as jest.Mock).mockRejectedValue(
      new ApiError(404, 'MEDICINE_NOT_FOUND', 'Medicine not found'),
    );

    await render(<EditMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-medicine-button')).toBeTruthy();
    });

    // Open modal & confirm
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-medicine-button'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-delete-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('form-error-banner')).toBeTruthy();
      expect(
        screen.getByText('Medicine was not found or has already been deleted.'),
      ).toBeTruthy();
    });

    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith('Medicines');
      },
      { timeout: 2000 },
    );
  });

  // 10. Forbidden (403) handling
  it('10. Displays permission error when user is forbidden from deleting medicine', async () => {
    (apiClient.delete as jest.Mock).mockRejectedValue(
      new ApiError(403, 'FORBIDDEN', 'Forbidden'),
    );

    await render(<EditMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-medicine-button')).toBeTruthy();
    });

    // Open modal & confirm
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-medicine-button'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-delete-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('form-error-banner')).toBeTruthy();
      expect(
        screen.getByText('You do not have permission to delete this medicine.'),
      ).toBeTruthy();
    });
  });
});
