import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AddMedicineScreen } from '../src/screens/medicines/AddMedicineScreen';
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
  };
});

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

describe('Medicine Form Dropdown Overlay Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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
          ],
        });
      }
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('1. opens dosage form dropdown as an overlay and selects an option', async () => {
    const { getByTestId, queryByTestId } = await render(<AddMedicineScreen />);

    // Wait for all initial API calls and microtasks to settle
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/salts');
      expect(getByTestId('select-medicine-form')).toBeTruthy();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Open dosage form dropdown
    await act(async () => {
      fireEvent.press(getByTestId('select-medicine-form'));
    });

    // Modal menu overlay is rendered
    await waitFor(() => {
      expect(getByTestId('select-medicine-form-menu')).toBeTruthy();
      expect(getByTestId('select-medicine-form-option-CAPSULE')).toBeTruthy();
    });

    // Select Capsule
    await act(async () => {
      fireEvent.press(getByTestId('select-medicine-form-option-CAPSULE'));
    });

    // Menu is closed and value is updated
    await waitFor(() => {
      expect(queryByTestId('select-medicine-form-menu')).toBeNull();
      expect(screen.getByText('Capsule')).toBeTruthy();
    });
  });

  it('2. opens salt unit dropdown and handles outside backdrop dismissal', async () => {
    const { getByTestId, queryByTestId } = await render(<AddMedicineScreen />);

    await waitFor(() => {
      expect(getByTestId('select-salt-unit-0')).toBeTruthy();
    });

    // Open unit dropdown for row 0
    await act(async () => {
      fireEvent.press(getByTestId('select-salt-unit-0'));
    });

    await waitFor(() => {
      expect(getByTestId('select-salt-unit-0-menu')).toBeTruthy();
      expect(getByTestId('select-salt-unit-0-backdrop')).toBeTruthy();
    });

    // Tap backdrop to dismiss
    await act(async () => {
      fireEvent.press(getByTestId('select-salt-unit-0-backdrop'));
    });

    await waitFor(() => {
      expect(queryByTestId('select-salt-unit-0-menu')).toBeNull();
    });
  });

  it('3. handles dynamic salt row autocomplete and unit selection correctly', async () => {
    const { getByTestId, queryByTestId } = await render(<AddMedicineScreen />);

    await waitFor(() => {
      expect(getByTestId('add-salt-button')).toBeTruthy();
    });

    // Add second salt row
    await act(async () => {
      fireEvent.press(getByTestId('add-salt-button'));
    });

    await waitFor(() => {
      expect(getByTestId('select-salt-1')).toBeTruthy();
      expect(getByTestId('select-salt-unit-1')).toBeTruthy();
    });

    // Type in salt input for row 1 to open recommendations
    await act(async () => {
      fireEvent.changeText(getByTestId('select-salt-1'), 'Caff');
    });

    await waitFor(() => {
      expect(getByTestId('select-salt-1-menu')).toBeTruthy();
      expect(getByTestId('select-salt-1-option-salt-2')).toBeTruthy();
    });

    // Select Caffeine
    await act(async () => {
      fireEvent.press(getByTestId('select-salt-1-option-salt-2'));
    });

    await waitFor(() => {
      expect(queryByTestId('select-salt-1-menu')).toBeNull();
      expect(screen.getByDisplayValue('Caffeine')).toBeTruthy();
    });
  });

  it('4. opening another dropdown automatically closes the currently open dropdown', async () => {
    const { getByTestId, queryByTestId } = await render(<AddMedicineScreen />);

    await waitFor(() => {
      expect(getByTestId('select-medicine-form')).toBeTruthy();
      expect(getByTestId('select-pack-unit')).toBeTruthy();
    });

    // Open dosage form dropdown
    await act(async () => {
      fireEvent.press(getByTestId('select-medicine-form'));
    });

    await waitFor(() => {
      expect(getByTestId('select-medicine-form-menu')).toBeTruthy();
    });

    // Now open pack unit dropdown
    await act(async () => {
      fireEvent.press(getByTestId('select-pack-unit'));
    });

    await waitFor(() => {
      // Previous menu is closed
      expect(queryByTestId('select-medicine-form-menu')).toBeNull();
      // New menu is open
      expect(getByTestId('select-pack-unit-menu')).toBeTruthy();
    });
  });
});
