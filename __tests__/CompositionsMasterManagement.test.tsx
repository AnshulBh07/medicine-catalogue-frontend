import React from 'react';
import { Alert } from 'react-native';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { CompositionsScreen } from '../src/screens/compositions/CompositionsScreen';
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

const mockCompositions = [
  {
    id: 'comp-1',
    displayText: 'Amlodipine Besylate 5 MG + Atorvastatin Calcium 10 MG',
    description: 'Dual anti-hypertensive and lipid regulator',
    active: true,
    medicinesCount: 6,
    compositionSalts: [
      { id: 'cs-1', salt: { id: 's-1', name: 'Amlodipine Besylate' }, amount: 5, unit: 'MG' },
      { id: 'cs-2', salt: { id: 's-2', name: 'Atorvastatin Calcium' }, amount: 10, unit: 'MG' },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'comp-2',
    displayText: 'Paracetamol 500 MG',
    description: 'Monotherapy analgesic',
    active: true,
    medicinesCount: 0,
    compositionSalts: [
      { id: 'cs-3', salt: { id: 's-3', name: 'Paracetamol' }, amount: 500, unit: 'MG' },
    ],
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
];

describe('Compositions Master Management Mobile Tests', () => {
  afterEach(cleanup);

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAdmin = true;
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    (apiClient.get as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('/compositions/comp-2/impact')) {
        return Promise.resolve({
          impact: {
            composition: mockCompositions[1],
            medicinesCount: 0,
            medicines: [],
          },
        });
      }
      if (path.includes('/impact')) {
        return Promise.resolve({
          impact: {
            composition: mockCompositions[0],
            medicinesCount: 6,
            medicines: [
              { id: 'med-1', name: 'Amlokem-A', active: true },
              { id: 'med-2', name: 'Lipikind-AM', active: true },
            ],
          },
        });
      }
      if (path.startsWith('/salts')) {
        return Promise.resolve({
          salts: [
            { id: 's-1', name: 'Amlodipine Besylate', active: true },
            { id: 's-2', name: 'Atorvastatin Calcium', active: true },
            { id: 's-3', name: 'Paracetamol', active: true },
          ],
        });
      }
      if (path.startsWith('/compositions')) {
        return Promise.resolve({ compositions: mockCompositions });
      }
      return Promise.resolve({});
    });
  });

  it('1. Renders compositions list with formulas, breakdown chips, and usage counts', async () => {
    await render(<CompositionsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Amlodipine Besylate 5 MG + Atorvastatin Calcium 10 MG')).toBeTruthy();
      expect(screen.getByText('Paracetamol 500 MG')).toBeTruthy();
    });

    expect(screen.getByText('6 Medicines linked')).toBeTruthy();
    expect(screen.getByText('0 Medicines linked')).toBeTruthy();
    expect(screen.getByText('Amlodipine Besylate • 5 MG')).toBeTruthy();
    expect(screen.getByText('Atorvastatin Calcium • 10 MG')).toBeTruthy();
  });

  it('2. Filters by active and inactive tabs', async () => {
    await render(<CompositionsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('filter-active-compositions')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('filter-inactive-compositions'));
    });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('includeInactive=true'));
    });
  });

  it('3. Searches compositions with debounce', async () => {
    await render(<CompositionsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('composition-search-input')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('composition-search-input'), 'Paracetamol');
    });

    await waitFor(
      () => {
        expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('search=Paracetamol'));
      },
      { timeout: 1000 },
    );
  });

  it('4. Opens Add Composition modal, builds multi-salt formula with live preview, and submits', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      composition: {
        id: 'comp-new',
        displayText: 'Amoxicillin 500 MG + Clavulanic Acid 125 MG',
        description: 'Antibiotic combo',
        active: true,
        medicinesCount: 0,
        compositionSalts: [],
      },
    });

    await render(<CompositionsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('add-composition-fab')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('add-composition-fab'));
    });

    await waitFor(() => {
      expect(screen.getByText('Add Composition')).toBeTruthy();
      expect(screen.getByTestId('salt-row-name-0')).toBeTruthy();
    });

    // Enter first salt
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('salt-row-name-0'), 'Amoxicillin');
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('salt-row-amount-0'), '500');
    });

    // Add second salt row
    await act(async () => {
      fireEvent.press(screen.getByTestId('add-salt-row-btn'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('salt-row-name-1')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('salt-row-name-1'), 'Clavulanic Acid');
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('salt-row-amount-1'), '125');
    });

    // Verify live preview shows canonical formula
    expect(screen.getByText('Amoxicillin 500 MG + Clavulanic Acid 125 MG')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('composition-submit-btn'));
    });

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/compositions', {
        salts: [
          { name: 'Amoxicillin', amount: 500, unit: 'MG' },
          { name: 'Clavulanic Acid', amount: 125, unit: 'MG' },
        ],
        description: null,
      });
    });
  });

  it('5. Opens Edit Composition modal and shows shared formula impact warning', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValueOnce({
      composition: {
        ...mockCompositions[0],
        displayText: 'Amlodipine Besylate 10 MG + Atorvastatin Calcium 10 MG',
      },
    });

    await render(<CompositionsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('edit-composition-comp-1')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('edit-composition-comp-1'));
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Composition Formula')).toBeTruthy();
      expect(screen.getByText('Shared Formula Impact Warning')).toBeTruthy();
    });

    expect(screen.getByText(/Modifying this composition will update the chemical formula shown for all/)).toBeTruthy();

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('salt-row-amount-0'), '10');
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('composition-submit-btn'));
    });

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/compositions/comp-1', {
        salts: [
          { saltId: 's-1', name: 'Amlodipine Besylate', amount: 10, unit: 'MG' },
          { saltId: 's-2', name: 'Atorvastatin Calcium', amount: 10, unit: 'MG' },
        ],
        description: 'Dual anti-hypertensive and lipid regulator',
        active: true,
      });
    });
  });

  it('6. Shows dependency dialog when attempting to delete a used composition, and provides Deactivate action', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValueOnce({
      composition: { ...mockCompositions[0], active: false },
    });

    await render(<CompositionsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-composition-comp-1')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-composition-comp-1'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('dependency-dialog-composition')).toBeTruthy();
      expect(screen.getByText('Cannot Delete Composition')).toBeTruthy();
    });

    expect(screen.getByText(/currently used by 6 medicine\(s\)/)).toBeTruthy();

    // Confirm deactivation
    await act(async () => {
      fireEvent.press(screen.getByTestId('dependency-dialog-composition-confirm'));
    });

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/compositions/comp-1', { active: false });
    });
  });

  it('7. Allows hard delete of unused composition via ConfirmDialog', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ success: true, deletedCompositionId: 'comp-2' });

    await render(<CompositionsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-composition-comp-2')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-composition-comp-2'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('confirm-delete-composition-dialog')).toBeTruthy();
      expect(screen.getByText('Delete Composition?')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-delete-composition-dialog-confirm'));
    });

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith('/compositions/comp-2');
    });
  });

  it('8. Cancelling delete dialog leaves composition unchanged', async () => {
    await render(<CompositionsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-composition-comp-2')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-composition-comp-2'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('confirm-delete-composition-dialog')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-delete-composition-dialog-cancel'));
    });

    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it('9. Displays structured error alert when composition delete returns a conflict', async () => {
    (apiClient.delete as jest.Mock).mockRejectedValueOnce(
      new Error('Cannot delete composition because it is currently used by 2 medicine(s).'),
    );

    await render(<CompositionsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-composition-comp-2')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-composition-comp-2'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('confirm-delete-composition-dialog')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-delete-composition-dialog-confirm'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Cannot Delete Composition',
        'Cannot delete composition because it is currently used by 2 medicine(s).',
      );
    });
  });

  it('10. Hides FAB and modification actions for employee role', async () => {
    mockIsAdmin = false;
    await render(<CompositionsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500 MG')).toBeTruthy();
    });

    expect(screen.queryByTestId('add-composition-fab')).toBeNull();
    expect(screen.queryByTestId('edit-composition-comp-1')).toBeNull();
    expect(screen.queryByTestId('delete-composition-comp-1')).toBeNull();
  });
});
