import React from 'react';
import { Alert } from 'react-native';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SaltsScreen } from '../src/screens/salts/SaltsScreen';
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

const mockSalts = [
  {
    id: 'salt-1',
    name: 'Amlodipine Besylate',
    description: 'Calcium channel blocker API',
    active: true,
    compositionsCount: 3,
    medicinesCount: 8,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'salt-2',
    name: 'Unused Salt',
    description: 'Standalone API without medicines',
    active: true,
    compositionsCount: 0,
    medicinesCount: 0,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
];

describe('Salts Master Management Mobile Tests', () => {
  afterEach(cleanup);

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAdmin = true;
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    (apiClient.get as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('/salts/salt-2/impact')) {
        return Promise.resolve({
          impact: {
            salt: mockSalts[1],
            compositionsCount: 0,
            medicinesCount: 0,
            compositions: [],
            medicines: [],
          },
        });
      }
      if (path.includes('/impact')) {
        return Promise.resolve({
          impact: {
            salt: mockSalts[0],
            compositionsCount: 3,
            medicinesCount: 8,
            compositions: [{ id: 'comp-1', displayText: 'Amlodipine 5 MG', active: true }],
            medicines: [{ id: 'med-1', name: 'Amlip 5', active: true }],
          },
        });
      }
      if (path.startsWith('/salts')) {
        return Promise.resolve({ salts: mockSalts });
      }
      return Promise.resolve({});
    });
  });

  it('1. Renders salts list with title, subtitle, and cards with usages', async () => {
    await render(<SaltsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Amlodipine Besylate')).toBeTruthy();
      expect(screen.getByText('Unused Salt')).toBeTruthy();
    });

    expect(screen.getByText('3 Compositions')).toBeTruthy();
    expect(screen.getByText('8 Medicines')).toBeTruthy();
    expect(screen.getByText('0 Compositions')).toBeTruthy();
    expect(screen.getByText('0 Medicines')).toBeTruthy();
  });

  it('2. Filters by active and inactive tabs', async () => {
    await render(<SaltsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('filter-active-salts')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('filter-inactive-salts'));
    });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('active=inactive'));
    });
  });

  it('3. Searches salts with debounce', async () => {
    await render(<SaltsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('salt-search-input')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('salt-search-input'), 'Amlodipine');
    });

    await waitFor(
      () => {
        expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('search=Amlodipine'));
      },
      { timeout: 1000 },
    );
  });

  it('4. Opens Add Salt modal, submits new salt and calls API', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      salt: {
        id: 'salt-new',
        name: 'Metformin Hydrochloride',
        description: 'Biguanide API',
        active: true,
        compositionsCount: 0,
        medicinesCount: 0,
      },
    });

    await render(<SaltsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('add-salt-fab')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('add-salt-fab'));
    });

    await waitFor(() => {
      expect(screen.getByText('Add Active Salt')).toBeTruthy();
      expect(screen.getByTestId('salt-name-input')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('salt-name-input'), 'Metformin Hydrochloride');
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('salt-description-input'), 'Biguanide API');
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('salt-submit-btn'));
    });

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/salts', {
        name: 'Metformin Hydrochloride',
        description: 'Biguanide API',
      });
    });
  });

  it('5. Opens Edit Salt modal and shows hierarchy propagation warning with impact count', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValueOnce({
      salt: {
        ...mockSalts[0],
        name: 'Amlodipine Besylate Trihydrate',
      },
    });

    await render(<SaltsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('edit-salt-salt-1')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('edit-salt-salt-1'));
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Active Salt')).toBeTruthy();
      expect(screen.getByText('Hierarchy Propagation Notice')).toBeTruthy();
    });

    expect(screen.getByText(/Renaming this salt will automatically update/)).toBeTruthy();

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('salt-name-input'), 'Amlodipine Besylate Trihydrate');
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('salt-submit-btn'));
    });

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/salts/salt-1', {
        name: 'Amlodipine Besylate Trihydrate',
        description: 'Calcium channel blocker API',
        active: true,
      });
    });
  });

  it('6. Shows dependency dialog when attempting to delete a used salt, and provides Deactivate action', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValueOnce({
      salt: { ...mockSalts[0], active: false },
    });

    await render(<SaltsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-salt-salt-1')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-salt-salt-1'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('dependency-dialog-salt')).toBeTruthy();
      expect(screen.getByText('Cannot Delete "Amlodipine Besylate"')).toBeTruthy();
    });

    expect(screen.getByText(/currently used by/)).toBeTruthy();
    expect(screen.getByText(/3 composition\(s\)/)).toBeTruthy();
    expect(screen.getByText(/8 medicine\(s\)/)).toBeTruthy();

    // Confirm deactivation from dependency dialog
    await act(async () => {
      fireEvent.press(screen.getByTestId('dependency-dialog-salt-confirm'));
    });

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/salts/salt-1', { active: false });
    });
  });

  it('7. Allows hard delete of unused salt with zero dependencies via ConfirmDialog', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ success: true, deletedSaltId: 'salt-2' });

    await render(<SaltsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-salt-salt-2')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-salt-salt-2'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('confirm-delete-salt-dialog')).toBeTruthy();
      expect(screen.getByText('Delete "Unused Salt"?')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-delete-salt-dialog-confirm'));
    });

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith('/salts/salt-2');
    });
  });

  it('8. Cancelling delete dialog leaves salt unchanged without calling delete API', async () => {
    await render(<SaltsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-salt-salt-2')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-salt-salt-2'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('confirm-delete-salt-dialog')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-delete-salt-dialog-cancel'));
    });

    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it('9. Displays structured error alert when delete API returns a conflict', async () => {
    (apiClient.delete as jest.Mock).mockRejectedValueOnce(
      new Error('This salt cannot be deleted because it is currently in use by 1 composition(s) and 1 medicine(s).'),
    );

    await render(<SaltsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-salt-salt-2')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-salt-salt-2'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('confirm-delete-salt-dialog')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-delete-salt-dialog-confirm'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Cannot Delete Salt',
        'This salt cannot be deleted because it is currently in use by 1 composition(s) and 1 medicine(s).',
      );
    });
  });

  it('10. Hides FAB and modification actions for employee role', async () => {
    mockIsAdmin = false;
    await render(<SaltsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Amlodipine Besylate')).toBeTruthy();
    });

    expect(screen.queryByTestId('add-salt-fab')).toBeNull();
    expect(screen.queryByTestId('edit-salt-salt-1')).toBeNull();
    expect(screen.queryByTestId('delete-salt-salt-1')).toBeNull();
  });
});
