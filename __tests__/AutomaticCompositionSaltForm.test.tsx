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

describe('Automatic Composition and Salt Frontend Form Tests (Section 28)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (apiClient.get as jest.Mock).mockImplementation((endpoint: string) => {
      if (endpoint === '/manufacturers' || endpoint.startsWith('/manufacturers?search=')) {
        return Promise.resolve({
          manufacturers: [
            { id: 'mfg-1', name: 'Acme Pharma Ltd.', active: true },
            { id: 'mfg-2', name: 'Global Pharma', active: true },
          ],
        });
      }
      if (endpoint === '/mrs' || endpoint.startsWith('/mrs?')) {
        return Promise.resolve({
          mrs: [
            { id: 'mr-1', name: 'Ravi Kumar', company: 'Acme Pharma Ltd.', active: true },
          ],
        });
      }
      if (endpoint === '/salts' || endpoint.startsWith('/salts?search=')) {
        return Promise.resolve({
          salts: [
            { id: 'salt-1', name: 'Paracetamol', active: true },
            { id: 'salt-2', name: 'Caffeine', active: true },
            { id: 'salt-3', name: 'Amoxicillin', active: true },
            { id: 'salt-4', name: 'Clavulanic Acid', active: true },
          ],
        });
      }
      return Promise.resolve({});
    });

    (apiClient.post as jest.Mock).mockResolvedValue({
      medicine: {
        id: 'new-med-999',
        name: 'Combiflam Tablet',
        form: 'TABLET',
        packQuantity: 10,
        packUnit: 'TABLET',
        mrp: 50.0,
        composition: {
          id: 'comp-999',
          displayText: 'Paracetamol 500 MG + Caffeine 30 MG',
        },
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('1. Salt autocomplete searches existing salts from backend on user typing', async () => {
    render(<AddMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('select-salt-0')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('select-salt-0'), 'Amox');
    });

    await waitFor(() => {
      expect(screen.getByTestId('select-salt-0-menu')).toBeTruthy();
      expect(screen.getByTestId('select-salt-0-option-salt-3')).toBeTruthy();
    });
  });

  it('2. New salt can be freely typed and submitted without requiring pre-existing recommendation', async () => {
    render(<AddMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('input-medicine-name')).toBeTruthy();
      expect(screen.getByTestId('select-salt-0')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-medicine-name'), 'Bio Novel Med');
      fireEvent.changeText(screen.getByTestId('select-salt-0'), 'Novel Experimental Salt API');
      fireEvent.changeText(screen.getByTestId('input-salt-amount-0'), '100');
      fireEvent.changeText(screen.getByTestId('select-manufacturer'), 'Acme Pharma Ltd.');
      fireEvent.changeText(screen.getByTestId('input-mrp'), '150');
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-add-medicine-button'));
    });

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/medicines',
        expect.objectContaining({
          name: 'Bio Novel Med',
          salts: [
            expect.objectContaining({
              name: 'Novel Experimental Salt API',
              amount: 100,
              unit: 'MG',
            }),
          ],
        }),
      );
    });
  });

  it('3. Existing salt recommendation can be selected and updates form state', async () => {
    render(<AddMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('select-salt-0')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('select-salt-0'), 'Caff');
    });

    await waitFor(() => {
      expect(screen.getByTestId('select-salt-0-option-salt-2')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('select-salt-0-option-salt-2'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('select-salt-0-menu')).toBeNull();
      expect(screen.getByDisplayValue('Caffeine')).toBeTruthy();
    });
  });

  it('4 & 5. Multiple salts can be entered and salts can be removed', async () => {
    render(<AddMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('add-salt-button')).toBeTruthy();
    });

    // Add 2nd salt row
    await act(async () => {
      fireEvent.press(screen.getByTestId('add-salt-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('select-salt-0')).toBeTruthy();
      expect(screen.getByTestId('select-salt-1')).toBeTruthy();
      expect(screen.getByTestId('remove-salt-1')).toBeTruthy();
    });

    // Add 3rd salt row
    await act(async () => {
      fireEvent.press(screen.getByTestId('add-salt-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('select-salt-2')).toBeTruthy();
    });

    // Remove 2nd salt row (index 1)
    await act(async () => {
      fireEvent.press(screen.getByTestId('remove-salt-1'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('select-salt-2')).toBeNull();
      expect(screen.getByTestId('select-salt-0')).toBeTruthy();
      expect(screen.getByTestId('select-salt-1')).toBeTruthy();
    });
  });

  it('6 & 7. Strength can be entered and form submits salt/strength data correctly', async () => {
    render(<AddMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('input-medicine-name')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-medicine-name'), 'Amox-Clav Duo');
      fireEvent.changeText(screen.getByTestId('select-salt-0'), 'Amoxicillin');
      fireEvent.changeText(screen.getByTestId('input-salt-amount-0'), '500');
      fireEvent.changeText(screen.getByTestId('select-manufacturer'), 'Acme Pharma Ltd.');
      fireEvent.changeText(screen.getByTestId('input-mrp'), '120');
      fireEvent.press(screen.getByTestId('add-salt-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('select-salt-1')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('select-salt-1'), 'Clavulanic Acid');
      fireEvent.changeText(screen.getByTestId('input-salt-amount-1'), '125');
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-add-medicine-button'));
    });

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/medicines',
        expect.objectContaining({
          name: 'Amox-Clav Duo',
          salts: [
            expect.objectContaining({ name: 'Amoxicillin', amount: 500, unit: 'MG' }),
            expect.objectContaining({ name: 'Clavulanic Acid', amount: 125, unit: 'MG' }),
          ],
        }),
      );
    });
  });

  it('8. Successful Medicine creation works and shows success banner', async () => {
    render(<AddMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('input-medicine-name')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-medicine-name'), 'Paracetamol Extra');
      fireEvent.changeText(screen.getByTestId('select-salt-0'), 'Paracetamol');
      fireEvent.changeText(screen.getByTestId('input-salt-amount-0'), '650');
      fireEvent.changeText(screen.getByTestId('select-manufacturer'), 'Acme Pharma Ltd.');
      fireEvent.changeText(screen.getByTestId('input-mrp'), '45.00');
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-add-medicine-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('form-success-banner')).toBeTruthy();
      expect(screen.getByText('"Combiflam Tablet" created successfully!')).toBeTruthy();
    });
  });

  it('9. Validation errors work for missing salt name, invalid strength amount, and duplicate salts', async () => {
    render(<AddMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('input-medicine-name')).toBeTruthy();
    });

    // 1. Missing salt name
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-medicine-name'), 'Test Med');
      fireEvent.changeText(screen.getByTestId('select-salt-0'), '');
      fireEvent.changeText(screen.getByTestId('input-salt-amount-0'), '500');
      fireEvent.changeText(screen.getByTestId('select-manufacturer'), 'Acme Pharma Ltd.');
      fireEvent.changeText(screen.getByTestId('input-mrp'), '50');
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-add-medicine-button'));
    });

    await waitFor(() => {
      expect(screen.getByText('Salt name is required')).toBeTruthy();
    });

    // 2. Invalid strength amount (0 or negative)
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('select-salt-0'), 'Paracetamol');
      fireEvent.changeText(screen.getByTestId('input-salt-amount-0'), '0');
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-add-medicine-button'));
    });

    await waitFor(() => {
      expect(screen.getByText('Enter a valid strength amount')).toBeTruthy();
    });

    // 3. Duplicate salts in form
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-salt-amount-0'), '500');
      fireEvent.press(screen.getByTestId('add-salt-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('select-salt-1')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('select-salt-1'), 'Paracetamol');
      fireEvent.changeText(screen.getByTestId('input-salt-amount-1'), '250');
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-add-medicine-button'));
    });

    await waitFor(() => {
      expect(screen.getByText('Duplicate salts entered. Each salt in the composition must be unique.')).toBeTruthy();
    });
  });

  it('10. Generated combined formula (composition preview) is displayed in real time', async () => {
    render(<AddMedicineScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('select-salt-0')).toBeTruthy();
    });

    // Single salt preview
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('select-salt-0'), 'Paracetamol');
      fireEvent.changeText(screen.getByTestId('input-salt-amount-0'), '500');
    });

    await waitFor(() => {
      expect(screen.getByTestId('composition-summary-preview')).toBeTruthy();
      expect(screen.getByText('Paracetamol (500 MG)')).toBeTruthy();
    });

    // Add 2nd salt -> combined formula preview
    await act(async () => {
      fireEvent.press(screen.getByTestId('add-salt-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('select-salt-1')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('select-salt-1'), 'Caffeine');
      fireEvent.changeText(screen.getByTestId('input-salt-amount-1'), '30');
    });

    await waitFor(() => {
      expect(screen.getByText('Paracetamol (500 MG) + Caffeine (30 MG)')).toBeTruthy();
    });
  });
});
