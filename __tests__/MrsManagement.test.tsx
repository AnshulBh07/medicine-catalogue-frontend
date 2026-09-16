import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { MrFilterModal, MrSortModal } from '../src/components';
import {
  AddMrScreen,
  EditMrScreen,
  ManageMrMedicinesScreen,
  MrDetailsScreen,
  MrsScreen,
} from '../src/screens/mrs';
import { apiClient } from '../src/services/api-client';

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
      params: { id: 'mr-uuid-1', mrId: 'mr-uuid-1', mrName: 'Ravi Kumar' },
    }),
  };
});

jest.mock('../src/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', name: 'Admin User', role: 'ADMIN' },
    isAdmin: true,
    isEmployee: false,
    isAuthenticated: true,
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
      put: jest.fn(),
      delete: jest.fn(),
      setToken: jest.fn(),
      setOnUnauthorized: jest.fn(),
    },
  };
});

describe('MR Management Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (apiClient.get as jest.Mock).mockImplementation((path: string) => {
      if (path.startsWith('/manufacturers')) {
        return Promise.resolve({
          manufacturers: [
            { id: 'mfg-1', name: 'Apex Pharma', active: true },
          ],
        });
      }
      if (path.startsWith('/medicines')) {
        return Promise.resolve({
          medicines: [
            {
              id: 'med-uuid-1',
              name: 'Amlodipine 5mg',
              form: 'TABLET',
              packQuantity: 10,
              packUnit: 'TABLET',
              prescriptionRequired: false,
              active: true,
              manufacturer: { id: 'mfg-1', name: 'Apex Pharma' },
              mr: { id: 'mr-uuid-1', name: 'Ravi Kumar' },
            },
            {
              id: 'med-uuid-2',
              name: 'Paracetamol 500mg',
              form: 'TABLET',
              packQuantity: 10,
              packUnit: 'TABLET',
              prescriptionRequired: false,
              active: true,
              manufacturer: { id: 'mfg-1', name: 'Apex Pharma' },
              mr: null,
            },
            {
              id: 'med-uuid-3',
              name: 'Cetirizine 10mg',
              form: 'TABLET',
              packQuantity: 10,
              packUnit: 'TABLET',
              prescriptionRequired: false,
              active: true,
              manufacturer: { id: 'mfg-2', name: 'Other Pharma' },
              mr: { id: 'mr-uuid-2', name: 'Other MR' },
            },
          ],
        });
      }
      if (path.startsWith('/mrs/mr-uuid-1')) {
        return Promise.resolve({
          mr: {
            id: 'mr-uuid-1',
            name: 'Ravi Kumar',
            company: 'Apex Pharma',
            phone: '+91 98765 43210',
            email: 'ravi.kumar@apexpharma.com',
            notes: 'Specialist for cardiovascular segment',
            active: true,
            medicinesCount: 1,
            medicines: [
              {
                id: 'med-uuid-1',
                name: 'Amlodipine 5mg',
                form: 'TABLET',
                manufacturer: { id: 'mfg-1', name: 'Apex Pharma' },
              },
            ],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        });
      }
      if (path.startsWith('/mrs')) {
        return Promise.resolve({
          mrs: [
            {
              id: 'mr-uuid-1',
              name: 'Ravi Kumar',
              company: 'Apex Pharma',
              phone: '+91 98765 43210',
              email: 'ravi.kumar@apexpharma.com',
              notes: 'North territory coverage',
              active: true,
              medicinesCount: 4,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        });
      }
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('MrsScreen (List View)', () => {
    it('fetches and renders list of medical representatives with company, contact, and medicine count', async () => {
      await render(<MrsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Ravi Kumar')).toBeTruthy();
        expect(screen.getByText('Apex Pharma')).toBeTruthy();
        expect(screen.getByText('+91 98765 43210')).toBeTruthy();
        expect(screen.queryByText('ravi.kumar@apexpharma.com')).toBeNull();
        expect(screen.getByText('4 Meds')).toBeTruthy();
      });

      // Tapping card navigates to MrDetails
      await act(async () => {
        fireEvent.press(screen.getByTestId('mr-card-mr-uuid-1'));
      });
      expect(mockNavigate).toHaveBeenCalledWith('MrDetails', { id: 'mr-uuid-1' });
    });

    it('navigates to AddMr when FAB is pressed', async () => {
      await render(<MrsScreen />);
      await waitFor(() => {
        expect(screen.getByTestId('add-mr-fab')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('add-mr-fab'));
      });
      expect(mockNavigate).toHaveBeenCalledWith('AddMr');
    });

    it('supports debounced search query across MR, company, phone, email, and associated medicine name', async () => {
      await render(<MrsScreen />);
      const searchInput = screen.getByPlaceholderText('Search MR, medicine, phone, email or company...');
      expect(searchInput).toBeTruthy();

      // Search by company
      await act(async () => {
        fireEvent.changeText(searchInput, 'Apex');
      });

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('search=Apex'));
      });

      // Search by associated medicine name
      await act(async () => {
        fireEvent.changeText(searchInput, 'Amoxicillin 500mg');
      });

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('search=Amoxicillin+500mg'));
      });

      // Search by partial medicine name (case-insensitive)
      await act(async () => {
        fireEvent.changeText(searchInput, 'amoxi');
      });

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('search=amoxi'));
      });
    });

    it('displays empty state when search returns no representatives', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        mrs: [],
      });

      await render(<MrsScreen />);
      const searchInput = screen.getByPlaceholderText('Search MR, medicine, phone, email or company...');

      await act(async () => {
        fireEvent.changeText(searchInput, 'NonExistentMedicine999');
      });

      await waitFor(() => {
        expect(screen.getByText('No Representatives Found')).toBeTruthy();
        expect(screen.getByText('Try adjusting your search query or removing filters.')).toBeTruthy();
      });
    });
  });

  describe('MrFilterModal & MrSortModal', () => {
    it('applies company, contact, and inactive filters', async () => {
      const onApply = jest.fn();
      const onReset = jest.fn();
      const onClose = jest.fn();

      const initialFilters = { company: 'Apex Pharma', contact: 'HAS_PHONE' as const, includeInactive: true };

      await render(
        <MrFilterModal
          visible={true}
          filters={initialFilters}
          isAdmin={true}
          availableCompanies={['Apex Pharma', 'Beta Healthcare']}
          onApply={onApply}
          onReset={onReset}
          onClose={onClose}
        />,
      );

      // Apply
      await act(async () => {
        fireEvent.press(screen.getByTestId('apply-mr-filters-button'));
      });

      expect(onApply).toHaveBeenCalledWith({
        company: 'Apex Pharma',
        contact: 'HAS_PHONE',
        includeInactive: true,
      });
      expect(onClose).toHaveBeenCalled();
    });

    it('applies sorting options in MrSortModal', async () => {
      const onApply = jest.fn();
      const onClose = jest.fn();

      await render(
        <MrSortModal
          visible={true}
          sortBy="name"
          sortOrder="asc"
          onApply={onApply}
          onClose={onClose}
        />,
      );

      // Select Company A → Z (applies automatically)
      await act(async () => {
        fireEvent.press(screen.getByTestId('mr-sort-option-company:asc'));
      });

      expect(onApply).toHaveBeenCalledWith('company', 'asc');
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('MrDetailsScreen', () => {
    it('displays MR profile info, contact quick actions, tip banner, and associated medicines', async () => {
      await render(<MrDetailsScreen />);

      await waitFor(() => {
        expect(screen.getAllByText('Ravi Kumar').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Specialist for cardiovascular segment')).toBeTruthy();
        expect(screen.getByText('Amlodipine 5mg')).toBeTruthy();
        expect(screen.getByTestId('mr-details-call-button')).toBeTruthy();
        expect(screen.getByTestId('mr-details-email-button')).toBeTruthy();
        expect(screen.getByText('CONTACT & COMPANY DETAILS')).toBeTruthy();
        expect(screen.getByText('ASSOCIATED MEDICINES')).toBeTruthy();
        expect(screen.getByText('Tip')).toBeTruthy();
      });

      // Tapping associated medicine navigates to MedicineDetails
      await act(async () => {
        fireEvent.press(screen.getByTestId('mr-medicine-item-med-uuid-1'));
      });
      expect(mockNavigate).toHaveBeenCalledWith('MedicineDetails', { id: 'med-uuid-1' });

      // Tapping Edit button navigates to EditMr
      await act(async () => {
        fireEvent.press(screen.getByTestId('mr-details-edit-button'));
      });
      expect(mockNavigate).toHaveBeenCalledWith('EditMr', { id: 'mr-uuid-1' });

      // Tapping Manage Medicines button navigates to ManageMrMedicines
      await act(async () => {
        fireEvent.press(screen.getByTestId('mr-manage-medicines-button'));
      });
      expect(mockNavigate).toHaveBeenCalledWith('ManageMrMedicines', {
        mrId: 'mr-uuid-1',
        mrName: 'Ravi Kumar',
      });
    });

    it('renders empty medicines state and handles missing email/phone gracefully', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        mr: {
          id: 'mr-uuid-empty',
          name: 'Priya Sharma',
          company: null,
          phone: null,
          email: null,
          notes: null,
          active: false,
          medicinesCount: 0,
          medicines: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      });

      await render(<MrDetailsScreen />);

      await waitFor(() => {
        expect(screen.getAllByText('Priya Sharma').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Inactive')).toBeTruthy();
        expect(screen.getAllByText('Independent Representative').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Not provided').length).toBe(2);
        expect(screen.getByText('No medicines assigned to this representative.')).toBeTruthy();
        expect(screen.getByTestId('mr-manage-medicines-button')).toBeTruthy();
      });
    });
  });

  describe('ManageMrMedicinesScreen', () => {
    it('loads medicines catalogue with pre-selected assignments, supports multi-selection, and saves updates', async () => {
      (apiClient.put as jest.Mock).mockResolvedValueOnce({
        medicines: [
          { id: 'med-uuid-1', name: 'Amlodipine 5mg' },
          { id: 'med-uuid-2', name: 'Paracetamol 500mg' },
        ],
        count: 2,
      });

      await render(<ManageMrMedicinesScreen />);

      // Wait for medicines to load and initial assigned medicine (Amlodipine) to be pre-selected
      await waitFor(() => {
        expect(screen.getByText('Amlodipine 5mg')).toBeTruthy();
        expect(screen.getByText('Paracetamol 500mg')).toBeTruthy();
        expect(screen.getByText('1 medicine selected')).toBeTruthy();
        expect(screen.getByText('Assigned to Other MR')).toBeTruthy();
      });

      // Select Paracetamol 500mg
      await act(async () => {
        fireEvent.press(screen.getByTestId('manage-medicine-item-med-uuid-2'));
      });

      // Verify counter updates to 2 medicines selected
      await waitFor(() => {
        expect(screen.getByText('2 medicines selected')).toBeTruthy();
      });

      // Save assignments
      await act(async () => {
        fireEvent.press(screen.getByTestId('save-mr-medicines-button'));
      });

      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith('/mrs/mr-uuid-1/medicines', {
          medicineIds: expect.arrayContaining(['med-uuid-1', 'med-uuid-2']),
          allowReassign: true,
        });
        expect(mockGoBack).toHaveBeenCalled();
      });
    });
  });

  describe('MrForm (Add & Edit)', () => {
    it('validates required name field before submitting', async () => {
      await render(<AddMrScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('submit-add-mr-button')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('submit-add-mr-button'));
      });

      await waitFor(() => {
        expect(screen.getByText('Representative name is required.')).toBeTruthy();
      });
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('submits new MR and navigates to details', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        mr: {
          id: 'new-mr-uuid',
          name: 'Sunil Mehta',
          company: 'Sun Pharma',
          phone: '+91 91234 56789',
          email: 'sunil.mehta@sunpharma.com',
          notes: 'West zone clinics',
          active: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      });

      await render(<AddMrScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('input-mr-name')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.changeText(screen.getByTestId('input-mr-name'), 'Sunil Mehta');
        fireEvent.changeText(screen.getByTestId('input-mr-company'), 'Sun Pharma');
        fireEvent.changeText(screen.getByTestId('input-mr-phone'), '+91 91234 56789');
        fireEvent.changeText(screen.getByTestId('input-mr-email'), 'sunil.mehta@sunpharma.com');
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('submit-add-mr-button'));
      });

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/mrs', {
          name: 'Sunil Mehta',
          company: 'Sun Pharma',
          phone: '+91 91234 56789',
          email: 'sunil.mehta@sunpharma.com',
          notes: null,
        });
        expect(mockNavigate).toHaveBeenCalledWith('MrDetails', { id: 'new-mr-uuid' });
      });
    });

    it('creates new MR with optional initial medicines (opens picker, selects multiple, submits medicineIds)', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        mr: {
          id: 'new-mr-with-meds',
          name: 'Amit Patel',
          company: 'Apex Pharma',
          phone: '+91 98888 77777',
          email: null,
          notes: null,
          active: true,
          medicinesCount: 2,
          medicines: [
            { id: 'med-uuid-1', name: 'Amlodipine 5mg', form: 'TABLET', manufacturer: { id: 'mfg-1', name: 'Apex Pharma' } },
            { id: 'med-uuid-2', name: 'Paracetamol 500mg', form: 'TABLET', manufacturer: { id: 'mfg-1', name: 'Apex Pharma' } },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      });

      await render(<AddMrScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('input-mr-name')).toBeTruthy();
        expect(screen.getByText('ASSOCIATED MEDICINES')).toBeTruthy();
        expect(screen.getByTestId('associated-medicines-count-badge')).toBeTruthy();
        expect(screen.getByTestId('add-associated-medicines-button')).toBeTruthy();
      });

      // Fill MR details
      await act(async () => {
        fireEvent.changeText(screen.getByTestId('input-mr-name'), 'Amit Patel');
      });

      // Open Medicine Picker Modal
      await act(async () => {
        fireEvent.press(screen.getByTestId('add-associated-medicines-button'));
      });

      // Picker is open, medicines loaded
      await waitFor(() => {
        expect(screen.getByTestId('medicine-picker-search-input')).toBeTruthy();
        expect(screen.getByTestId('medicine-picker-item-med-uuid-1')).toBeTruthy();
        expect(screen.getByTestId('medicine-picker-item-med-uuid-2')).toBeTruthy();
        expect(screen.getByText('Assigned to Other MR')).toBeTruthy();
      });

      // Select Amlodipine 5mg and Paracetamol 500mg
      await act(async () => {
        fireEvent.press(screen.getByTestId('medicine-picker-item-med-uuid-1'));
        fireEvent.press(screen.getByTestId('medicine-picker-item-med-uuid-2'));
      });

      // Verify selected count in picker bottom bar
      await waitFor(() => {
        expect(screen.getByText('2 medicines selected')).toBeTruthy();
      });

      // Apply selection
      await act(async () => {
        fireEvent.press(screen.getByTestId('medicine-picker-apply-button'));
      });

      // Selected medicines appear in form list with remove buttons
      await waitFor(() => {
        expect(screen.getByTestId('selected-mr-medicine-med-uuid-1')).toBeTruthy();
        expect(screen.getByTestId('selected-mr-medicine-med-uuid-2')).toBeTruthy();
        expect(screen.getByTestId('add-more-medicines-button')).toBeTruthy();
      });

      // Submit form
      await act(async () => {
        fireEvent.press(screen.getByTestId('submit-add-mr-button'));
      });

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/mrs', {
          name: 'Amit Patel',
          company: null,
          phone: null,
          email: null,
          notes: null,
          medicineIds: ['med-uuid-1', 'med-uuid-2'],
          allowReassign: true,
        });
        expect(mockNavigate).toHaveBeenCalledWith('MrDetails', { id: 'new-mr-with-meds' });
      });
    });

    it('removes pending medicine before submission and updates count', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        mr: {
          id: 'new-mr-single',
          name: 'Kavita Singh',
          company: null,
          phone: null,
          email: null,
          notes: null,
          active: true,
          medicinesCount: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      });

      await render(<AddMrScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('input-mr-name')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.changeText(screen.getByTestId('input-mr-name'), 'Kavita Singh');
        fireEvent.press(screen.getByTestId('add-associated-medicines-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('medicine-picker-item-med-uuid-1')).toBeTruthy();
        expect(screen.getByTestId('medicine-picker-item-med-uuid-2')).toBeTruthy();
      });

      // Select both medicines
      await act(async () => {
        fireEvent.press(screen.getByTestId('medicine-picker-item-med-uuid-1'));
        fireEvent.press(screen.getByTestId('medicine-picker-item-med-uuid-2'));
      });

      await waitFor(() => {
        expect(screen.getByText('2 medicines selected')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('medicine-picker-apply-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('selected-mr-medicine-med-uuid-1')).toBeTruthy();
        expect(screen.getByTestId('selected-mr-medicine-med-uuid-2')).toBeTruthy();
      });

      // Remove med-uuid-2 from pending list
      await act(async () => {
        fireEvent.press(screen.getByTestId('remove-selected-medicine-med-uuid-2'));
      });

      // Verify med-uuid-2 removed, only med-uuid-1 remains
      await waitFor(() => {
        expect(screen.getByTestId('selected-mr-medicine-med-uuid-1')).toBeTruthy();
        expect(screen.queryByTestId('selected-mr-medicine-med-uuid-2')).toBeNull();
      });

      // Submit form
      await act(async () => {
        fireEvent.press(screen.getByTestId('submit-add-mr-button'));
      });

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/mrs', {
          name: 'Kavita Singh',
          company: null,
          phone: null,
          email: null,
          notes: null,
          medicineIds: ['med-uuid-1'],
          allowReassign: true,
        });
      });
    });

    it('navigates to AddDeal with createdMrId when returnDealParams is true', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        mr: {
          id: 'mr-deal-123',
          name: 'Sunil Verma',
          company: 'Cipla',
          phone: '+919811122233',
          email: null,
          notes: null,
          active: true,
          medicinesCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      });

      await render(
        <AddMrScreen
          route={{
            key: 'AddMr-test',
            name: 'AddMr',
            params: { returnDealParams: true },
          }}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('input-mr-name')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.changeText(screen.getByTestId('input-mr-name'), 'Sunil Verma');
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('submit-add-mr-button'));
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('AddDeal', {
          createdMrId: 'mr-deal-123',
        });
      });
    });

    it('loads existing MR in Edit mode, allows updating, and supports soft-deletion', async () => {
      (apiClient.delete as jest.Mock).mockResolvedValueOnce({
        mr: { id: 'mr-uuid-1', active: false },
      });

      await render(<EditMrScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('input-mr-name').props.value).toBe('Ravi Kumar');
      });

      // Verify Delete button is present in Edit mode
      const deleteButton = screen.getByTestId('delete-mr-button');
      expect(deleteButton).toBeTruthy();

      // Tap Delete button to open confirmation dialog
      await act(async () => {
        fireEvent.press(deleteButton);
      });

      // Verify confirmation dialog text contains the MR name
      await waitFor(() => {
        expect(screen.getByText('Do you want to delete Ravi Kumar?')).toBeTruthy();
      });

      // Confirm deletion
      await act(async () => {
        fireEvent.press(screen.getByTestId('confirm-delete-mr-button'));
      });

      await waitFor(() => {
        expect(apiClient.delete).toHaveBeenCalledWith('/mrs/mr-uuid-1');
        expect(mockNavigate).toHaveBeenCalledWith('MRs');
      });
    });
  });
});
