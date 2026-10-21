import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { MedicineAlternativesListScreen } from '../src/screens/medicine-alternatives/MedicineAlternativesListScreen';
import { AddEditAlternativeScreen } from '../src/screens/medicine-alternatives/AddEditAlternativeScreen';
import { MedicineDetailsScreen } from '../src/screens/medicines/MedicineDetailsScreen';
import { medicineAlternativeService } from '../src/services/medicineAlternativeService';
import { apiClient } from '../src/services/api-client';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockPush = jest.fn();
let mockRouteParams: Record<string, unknown> = {};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      push: mockPush,
      dispatch: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
  };
});

let mockIsAdmin = true;
jest.mock('../src/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Test User', role: mockIsAdmin ? 'ADMIN' : 'EMPLOYEE' },
    isAdmin: mockIsAdmin,
    isEmployee: !mockIsAdmin,
    isAuthenticated: true,
  }),
}));

const mockSampleAlternatives = [
  {
    sourceMedicine: {
      id: 'med-source-1',
      name: 'Rantac 150mg',
      form: 'TABLET' as const,
      packQuantity: 10,
      packUnit: 'TABLET',
      compositionText: 'Ranitidine 150mg',
      active: true,
    },
    alternatives: [
      {
        id: 'alt-rel-1',
        medicine: {
          id: 'med-target-1',
          name: 'Pantoprazole 40mg',
          form: 'TABLET' as const,
          packQuantity: 10,
          packUnit: 'TABLET',
          compositionText: 'Pantoprazole 40mg',
          active: true,
        },
        createdAt: '2026-09-01T00:00:00.000Z',
      },
      {
        id: 'alt-rel-2',
        medicine: {
          id: 'med-target-2',
          name: 'Omeprazole 20mg',
          form: 'CAPSULE' as const,
          packQuantity: 14,
          packUnit: 'CAPSULE',
          compositionText: 'Omeprazole 20mg',
          active: true,
        },
        createdAt: '2026-09-01T00:00:00.000Z',
      },
    ],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
];

describe('Medicine Alternatives Mobile Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAdmin = true;
    mockRouteParams = {};

    jest.spyOn(medicineAlternativeService, 'listAlternatives').mockResolvedValue(mockSampleAlternatives);
    jest.spyOn(medicineAlternativeService, 'getByMedicineId').mockResolvedValue({
      doNotUse: mockSampleAlternatives[0],
      isAlternativeFor: [],
    });
    jest.spyOn(medicineAlternativeService, 'createAlternatives').mockResolvedValue(mockSampleAlternatives[0]);
    jest.spyOn(medicineAlternativeService, 'updateAlternatives').mockResolvedValue(mockSampleAlternatives[0]);
    jest.spyOn(medicineAlternativeService, 'deleteAlternatives').mockResolvedValue({
      success: true,
      message: 'Deleted',
    });

    jest.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.startsWith('/medicines/med-source-1')) {
        return {
          medicine: {
            id: 'med-source-1',
            name: 'Rantac 150mg',
            form: 'TABLET',
            packQuantity: 10,
            packUnit: 'TABLET',
            composition: { id: 'c-1', displayText: 'Ranitidine 150mg' },
            active: true,
            prescriptionRequired: false,
          },
        };
      }
      if (url.startsWith('/medicines/med-target-1')) {
        return {
          medicine: {
            id: 'med-target-1',
            name: 'Pantoprazole 40mg',
            form: 'TABLET',
            packQuantity: 10,
            packUnit: 'TABLET',
            composition: { id: 'c-2', displayText: 'Pantoprazole 40mg' },
            active: true,
            prescriptionRequired: true,
          },
        };
      }
      if (url.startsWith('/medicines')) {
        return {
          medicines: [
            {
              id: 'med-source-1',
              name: 'Rantac 150mg',
              form: 'TABLET',
              packQuantity: 10,
              packUnit: 'TABLET',
              composition: { id: 'c-1', displayText: 'Ranitidine 150mg' },
              active: true,
              prescriptionRequired: false,
            },
            {
              id: 'med-target-1',
              name: 'Pantoprazole 40mg',
              form: 'TABLET',
              packQuantity: 10,
              packUnit: 'TABLET',
              composition: { id: 'c-2', displayText: 'Pantoprazole 40mg' },
              active: true,
              prescriptionRequired: true,
            },
            {
              id: 'med-target-2',
              name: 'Omeprazole 20mg',
              form: 'CAPSULE',
              packQuantity: 14,
              packUnit: 'CAPSULE',
              composition: { id: 'c-3', displayText: 'Omeprazole 20mg' },
              active: true,
              prescriptionRequired: false,
            },
          ],
        };
      }
      return {};
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('MedicineAlternativesListScreen', () => {
    it('renders the list with DO NOT USE and USE INSTEAD containers for Admin', async () => {
      await render(<MedicineAlternativesListScreen />);

      await waitFor(() => {
        expect(screen.getByText('Medicine Alternatives')).toBeTruthy();
        expect(screen.getByText('Approved alternatives for medicines')).toBeTruthy();
        expect(screen.getByTestId('add-alternative-button')).toBeTruthy();
      });

      // Check card content
      expect(screen.getByText('DO NOT USE')).toBeTruthy();
      expect(screen.getByText('Rantac 150mg')).toBeTruthy();
      expect(screen.getByText('USE INSTEAD')).toBeTruthy();
      expect(screen.getByText('Pantoprazole 40mg')).toBeTruthy();
      expect(screen.getByText('Omeprazole 20mg')).toBeTruthy();

      // Admin 3-dots action menu is visible
      expect(screen.getByTestId('action-menu-trigger-med-source-1')).toBeTruthy();
    });

    it('hides "+ Add Alternative" and 3-dots action menu for Employee (non-admin)', async () => {
      mockIsAdmin = false;
      await render(<MedicineAlternativesListScreen />);

      await waitFor(() => {
        expect(screen.getByText('Medicine Alternatives')).toBeTruthy();
        expect(screen.getByText('Rantac 150mg')).toBeTruthy();
      });

      // Non-admin cannot see Add button or 3-dots menu
      expect(screen.queryByTestId('add-alternative-button')).toBeNull();
      expect(screen.queryByTestId('action-menu-trigger-med-source-1')).toBeNull();
    });

    it('filters alternatives in real time using search input', async () => {
      await render(<MedicineAlternativesListScreen />);

      await waitFor(() => {
        expect(screen.getByText('Rantac 150mg')).toBeTruthy();
      });

      const searchInput = screen.getByTestId('search-alternatives-input');
      fireEvent.changeText(searchInput, 'NonExistentMedicine');

      await waitFor(() => {
        expect(screen.queryByText('Rantac 150mg')).toBeNull();
        expect(screen.getByText('No Alternatives Found')).toBeTruthy();
      });

      // Clear search
      fireEvent.changeText(searchInput, 'Rantac');
      await waitFor(() => {
        expect(screen.getByText('Rantac 150mg')).toBeTruthy();
      });
    });

    it('allows Admin to open action menu and navigate to Edit', async () => {
      await render(<MedicineAlternativesListScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('action-menu-trigger-med-source-1')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('action-menu-trigger-med-source-1'));

      await waitFor(() => {
        expect(screen.getByTestId('edit-alternative-action')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('edit-alternative-action'));
      expect(mockNavigate).toHaveBeenCalledWith('AddEditAlternative', {
        sourceMedicineId: 'med-source-1',
      });
    });

    it('allows Admin to open action menu and delete alternatives', async () => {
      await render(<MedicineAlternativesListScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('action-menu-trigger-med-source-1')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('action-menu-trigger-med-source-1'));

      await waitFor(() => {
        expect(screen.getByTestId('delete-alternative-action')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('delete-alternative-action'));

      await waitFor(() => {
        expect(screen.getByTestId('confirm-delete-alternative-dialog')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Delete'));

      await waitFor(() => {
        expect(medicineAlternativeService.deleteAlternatives).toHaveBeenCalledWith('med-source-1');
      });
    });
  });

  describe('AddEditAlternativeScreen', () => {
    it('creates approved alternatives for selected medicines', async () => {
      await render(<AddEditAlternativeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Add Alternative')).toBeTruthy();
        expect(screen.getByTestId('select-source-medicine-trigger')).toBeTruthy();
      });

      // 1. Select source medicine
      fireEvent.press(screen.getByTestId('select-source-medicine-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('picker-item-med-source-1')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('picker-item-med-source-1'));

      await waitFor(() => {
        expect(screen.getByTestId('selected-source-medicine-card')).toBeTruthy();
        expect(screen.getByText('Rantac 150mg')).toBeTruthy();
      });

      // 2. Select alternative medicine
      fireEvent.press(screen.getByTestId('add-alternative-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('picker-item-med-target-1')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('picker-item-med-target-1'));

      await waitFor(() => {
        expect(screen.getByTestId('selected-alt-item-med-target-1')).toBeTruthy();
      });

      // 3. Save
      fireEvent.press(screen.getByTestId('save-alternatives-button'));

      await waitFor(() => {
        expect(medicineAlternativeService.createAlternatives).toHaveBeenCalledWith({
          sourceMedicineId: 'med-source-1',
          alternativeMedicineIds: ['med-target-1'],
        });
        expect(mockGoBack).toHaveBeenCalled();
      });
    });
  });

  describe('MedicineDetailsScreen Integration', () => {
    it('displays DO NOT USE warning banner with approved alternatives when viewing restricted medicine', async () => {
      mockRouteParams = { id: 'med-source-1' };
      await render(<MedicineDetailsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('medicine-do-not-use-banner')).toBeTruthy();
        expect(screen.getByText('DO NOT USE — Alternatives Available')).toBeTruthy();
        expect(screen.getByTestId('replacement-link-med-target-1')).toBeTruthy();
        expect(screen.getByTestId('replacement-link-med-target-2')).toBeTruthy();
      });

      // Tap replacement navigates to that medicine
      fireEvent.press(screen.getByTestId('replacement-link-med-target-1'));
      expect(mockPush).toHaveBeenCalledWith('MedicineDetails', { id: 'med-target-1' });
    });

    it('displays Approved Alternative banner when viewing an approved replacement medicine', async () => {
      mockRouteParams = { id: 'med-target-1' };
      jest.spyOn(medicineAlternativeService, 'getByMedicineId').mockResolvedValueOnce({
        doNotUse: null,
        isAlternativeFor: [
          {
            sourceMedicineId: 'med-source-1',
            sourceMedicineName: 'Rantac 150mg',
            sourceForm: 'TABLET',
            sourceCompositionText: 'Ranitidine 150mg',
          },
        ],
      });

      await render(<MedicineDetailsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('medicine-approved-alternative-banner')).toBeTruthy();
        expect(screen.getByText('Approved Alternative')).toBeTruthy();
        expect(screen.getByText('Rantac 150mg')).toBeTruthy();
      });
    });
  });
});
