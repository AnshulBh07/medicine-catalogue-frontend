import React from 'react';
import { Alert } from 'react-native';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ManufacturersScreen } from '../src/screens/manufacturers/ManufacturersScreen';
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
  };
});

jest.mock('../src/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', name: 'Admin User', role: mockIsAdmin ? 'ADMIN' : 'EMPLOYEE' },
    isAdmin: mockIsAdmin,
    isEmployee: !mockIsAdmin,
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

const mockManufacturers = [
  {
    id: 'mfg-1',
    name: 'Cipla Ltd.',
    active: true,
    medicinesCount: 5,
    medicines: [
      {
        id: 'med-1',
        name: 'Amoxicillin 500mg Capsule',
        form: 'CAPSULE',
        packQuantity: 10,
        packUnit: 'CAPSULE',
        active: true,
        composition: { id: 'comp-1', displayText: 'Amoxicillin 500 MG' },
      },
      {
        id: 'med-2',
        name: 'Ciplox 500mg Tablet',
        form: 'TABLET',
        packQuantity: 10,
        packUnit: 'TABLET',
        active: true,
        composition: { id: 'comp-2', displayText: 'Ciprofloxacin 500 MG' },
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'mfg-2',
    name: 'Sun Pharma',
    active: true,
    medicinesCount: 0,
    medicines: [],
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'mfg-3',
    name: 'Old Inactive Labs',
    active: false,
    medicinesCount: 1,
    medicines: [
      {
        id: 'med-3',
        name: 'Old Syrups',
        form: 'SYRUP',
        packQuantity: 100,
        packUnit: 'ML',
        active: false,
      },
    ],
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
  },
];

describe('Manufacturers Master Management Mobile Tests', () => {
  afterEach(cleanup);

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAdmin = true;
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    (apiClient.get as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('/manufacturers/mfg-1')) {
        return Promise.resolve({
          manufacturer: mockManufacturers[0],
        });
      }
      if (path.includes('/manufacturers/mfg-2')) {
        return Promise.resolve({
          manufacturer: mockManufacturers[1],
        });
      }
      if (path.includes('/manufacturers/mfg-3')) {
        return Promise.resolve({
          manufacturer: mockManufacturers[2],
        });
      }
      return Promise.resolve({
        manufacturers: mockManufacturers,
      });
    });

    (apiClient.post as jest.Mock).mockImplementation((path: string, body: unknown) => {
      return Promise.resolve({
        manufacturer: {
          id: 'mfg-new',
          name: (body as { name: string }).name,
          active: true,
          medicinesCount: 0,
          medicines: [],
          createdAt: '2026-08-31T00:00:00.000Z',
          updatedAt: '2026-08-31T00:00:00.000Z',
        },
      });
    });

    (apiClient.patch as jest.Mock).mockImplementation((path: string, body: unknown) => {
      return Promise.resolve({
        manufacturer: {
          ...mockManufacturers[0],
          ...(body as object),
        },
      });
    });

    (apiClient.delete as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        success: true,
        deletedManufacturerId: 'mfg-2',
        name: 'Sun Pharma',
      });
    });
  });

  it('1. renders header, search input, filter chips, sort trigger and manufacturer list cards', async () => {
    await render(<ManufacturersScreen />);

    await waitFor(() => {
      expect(screen.getByText('Manufacturers')).toBeTruthy();
      expect(screen.getByText('Pharmaceutical Producers')).toBeTruthy();
      expect(screen.getByTestId('mfg-search-input')).toBeTruthy();
      expect(screen.getByTestId('filter-active-mfg')).toBeTruthy();
      expect(screen.getByTestId('filter-has-meds')).toBeTruthy();
      expect(screen.getByTestId('mfg-sort-btn')).toBeTruthy();
      expect(screen.getByText('Cipla Ltd.')).toBeTruthy();
      expect(screen.getByText('Sun Pharma')).toBeTruthy();
    });
  });

  it('2. filters manufacturers by status chips (active, inactive, all)', async () => {
    await render(<ManufacturersScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('filter-active-mfg')).toBeTruthy();
    });

    // Tap Inactive filter
    await act(async () => {
      fireEvent.press(screen.getByTestId('filter-inactive-mfg'));
    });

    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('active=inactive'));

    // Tap All Status filter
    await act(async () => {
      fireEvent.press(screen.getByTestId('filter-all-mfg'));
    });

    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('active=all'));
  });

  it('3. filters manufacturers by medicine count chips (has medicines, no medicines)', async () => {
    await render(<ManufacturersScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('filter-has-meds')).toBeTruthy();
    });

    // Tap Has Medicines filter
    await act(async () => {
      fireEvent.press(screen.getByTestId('filter-has-meds'));
    });

    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('hasMedicines=true'));

    // Tap No Medicines filter
    await act(async () => {
      fireEvent.press(screen.getByTestId('filter-no-meds'));
    });

    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('hasMedicines=false'));
  });

  it('4. opens sort modal and allows selecting sorting options', async () => {
    await render(<ManufacturersScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('mfg-sort-btn')).toBeTruthy();
    });

    // Open sort modal
    await act(async () => {
      fireEvent.press(screen.getByTestId('mfg-sort-btn'));
    });

    expect(screen.getByText('Sort Manufacturers')).toBeTruthy();
    expect(screen.getByTestId('sort-opt-medicines_high')).toBeTruthy();

    // Select Medicines High to Low
    await act(async () => {
      fireEvent.press(screen.getByTestId('sort-opt-medicines_high'));
    });

    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('sortBy=medicines_high'));
  });

  it('5. tapping a manufacturer card opens details modal with associated medicines', async () => {
    await render(<ManufacturersScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('mfg-item-mfg-1')).toBeTruthy();
    });

    // Tap Cipla card
    await act(async () => {
      fireEvent.press(screen.getByTestId('mfg-item-mfg-1'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('manufacturer-details-modal')).toBeTruthy();
      expect(screen.getByTestId('mfg-details-name')).toBeTruthy();
      expect(screen.getByText('Amoxicillin 500mg Capsule')).toBeTruthy();
      expect(screen.getByText('Ciplox 500mg Tablet')).toBeTruthy();
    });
  });

  it('6. tapping an associated medicine inside details modal navigates to MedicineDetails', async () => {
    await render(<ManufacturersScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('mfg-item-mfg-1')).toBeTruthy();
    });

    // Tap Cipla card
    await act(async () => {
      fireEvent.press(screen.getByTestId('mfg-item-mfg-1'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('mfg-med-card-med-1')).toBeTruthy();
    });

    // Tap on medicine card
    await act(async () => {
      fireEvent.press(screen.getByTestId('mfg-med-card-med-1'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('MedicineDetails', { id: 'med-1' });
  });

  it('7. displays empty state inside details modal when manufacturer has no medicines', async () => {
    await render(<ManufacturersScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('mfg-item-mfg-2')).toBeTruthy();
    });

    // Tap Sun Pharma card (has 0 medicines)
    await act(async () => {
      fireEvent.press(screen.getByTestId('mfg-item-mfg-2'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('mfg-no-medicines-card')).toBeTruthy();
      expect(screen.getByText('No Associated Medicines')).toBeTruthy();
    });
  });

  it('8. admin FAB opens Add Manufacturer modal and creates a new manufacturer', async () => {
    await render(<ManufacturersScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('add-manufacturer-fab')).toBeTruthy();
    });

    // Press FAB
    await act(async () => {
      fireEvent.press(screen.getByTestId('add-manufacturer-fab'));
    });

    expect(screen.getByTestId('manufacturer-form-modal')).toBeTruthy();
    expect(screen.getByText('Add Manufacturer')).toBeTruthy();

    // Type name
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('manufacturer-name-input'), 'Dr. Reddy Labs');
    });

    // Submit
    await act(async () => {
      fireEvent.press(screen.getByTestId('manufacturer-submit-btn'));
    });

    expect(apiClient.post).toHaveBeenCalledWith('/manufacturers', {
      name: 'Dr. Reddy Labs',
      active: true,
    });
  });

  it('9. admin Edit button opens Edit Manufacturer modal and updates details', async () => {
    await render(<ManufacturersScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('edit-mfg-mfg-1')).toBeTruthy();
    });

    // Press Edit icon on Cipla
    await act(async () => {
      fireEvent.press(screen.getByTestId('edit-mfg-mfg-1'));
    });

    expect(screen.getByTestId('manufacturer-form-modal')).toBeTruthy();
    expect(screen.getByText('Edit Manufacturer')).toBeTruthy();

    // Update name
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('manufacturer-name-input'), 'Cipla Therapeutics');
    });

    // Submit
    await act(async () => {
      fireEvent.press(screen.getByTestId('manufacturer-submit-btn'));
    });

    expect(apiClient.patch).toHaveBeenCalledWith('/manufacturers/mfg-1', {
      name: 'Cipla Therapeutics',
      active: true,
    });
  });

  it('10. deleting a manufacturer with medicines triggers safe deactivation flow', async () => {
    await render(<ManufacturersScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-mfg-mfg-1')).toBeTruthy();
    });

    // Press Delete on Cipla (5 medicines)
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-mfg-mfg-1'));
    });

    expect(screen.getByTestId('deactivate-mfg-dialog')).toBeTruthy();
    expect(screen.getByText('Manufacturer In Use')).toBeTruthy();

    // Confirm Deactivate
    const confirmBtn = screen.getByTestId('deactivate-mfg-dialog-confirm');
    await act(async () => {
      fireEvent.press(confirmBtn);
    });

    expect(apiClient.patch).toHaveBeenCalledWith('/manufacturers/mfg-1', {
      active: false,
    });
  });

  it('11. deleting a manufacturer with 0 medicines triggers permanent deletion flow', async () => {
    await render(<ManufacturersScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-mfg-mfg-2')).toBeTruthy();
    });

    // Press Delete on Sun Pharma (0 medicines)
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-mfg-mfg-2'));
    });

    expect(screen.getByTestId('delete-mfg-dialog')).toBeTruthy();
    expect(screen.getByText('Delete Manufacturer?')).toBeTruthy();

    // Confirm Delete
    const confirmBtn = screen.getByTestId('delete-mfg-dialog-confirm');
    await act(async () => {
      fireEvent.press(confirmBtn);
    });

    expect(apiClient.delete).toHaveBeenCalledWith('/manufacturers/mfg-2?permanent=true');
  });

  it('12. non-admin (EMPLOYEE) users do not see FAB or Edit/Delete buttons', async () => {
    mockIsAdmin = false;
    await render(<ManufacturersScreen />);

    await waitFor(() => {
      expect(screen.getByText('Cipla Ltd.')).toBeTruthy();
    });

    expect(screen.queryByTestId('add-manufacturer-fab')).toBeNull();
    expect(screen.queryByTestId('edit-mfg-mfg-1')).toBeNull();
    expect(screen.queryByTestId('delete-mfg-mfg-1')).toBeNull();
  });
});
