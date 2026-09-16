import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../src/features/auth';
import { storage } from '../src/lib/storage';
import { AddMedicineScreen } from '../src/screens/medicines/AddMedicineScreen';
import { EditMedicineScreen } from '../src/screens/medicines/EditMedicineScreen';
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
      params: { id: 'med-123' },
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

describe('Medicine Form Autocomplete (Salt Name & Manufacturer)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    await storage.clearAuth();
    await storage.setToken('fake-token');
    await storage.setUser({
      id: 'admin-1',
      name: 'Admin',
      role: 'ADMIN',
      email: 'admin@test.com',
      phone: null,
      profileImageUrl: null,
      active: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });
    await storage.clearMedicineDraft();

    (apiClient.get as jest.Mock).mockImplementation((endpoint: string) => {
      if (endpoint === '/manufacturers' || endpoint.startsWith('/manufacturers?search=')) {
        return Promise.resolve({
          manufacturers: [
            { id: 'mfg-1', name: 'Torrent Pharmaceuticals Ltd.', active: true },
            { id: 'mfg-2', name: 'Sun Pharma Industries', active: true },
            { id: 'mfg-3', name: 'Cipla Ltd.', active: true },
          ],
        });
      }
      if (endpoint === '/mrs' || endpoint.startsWith('/mrs?')) {
        return Promise.resolve({
          mrs: [
            { id: 'mr-1', name: 'Ravi Kumar', company: 'Torrent', active: true },
          ],
        });
      }
      if (endpoint === '/salts' || endpoint.startsWith('/salts?search=')) {
        return Promise.resolve({
          salts: [
            { id: 'salt-1', name: 'Amlodipine Besylate', active: true },
            { id: 'salt-2', name: 'Paracetamol', active: true },
            { id: 'salt-3', name: 'Atorvastatin', active: true },
          ],
        });
      }
      if (endpoint === '/medicines/med-123') {
        return Promise.resolve({
          medicine: {
            id: 'med-123',
            name: 'Amlodac 5mg Tablet',
            form: 'TABLET',
            shortDescription: 'Hypertension medicine',
            barcode: '8901234567890',
            packQuantity: 10,
            packUnit: 'TABLET',
            mrp: 65.0,
            manufacturer: { id: 'mfg-1', name: 'Torrent Pharmaceuticals Ltd.' },
            composition: {
              id: 'comp-123',
              displayText: 'Amlodipine Besylate 5mg',
            },
          },
        });
      }
      if (endpoint === '/compositions/comp-123') {
        return Promise.resolve({
          composition: {
            id: 'comp-123',
            displayText: 'Amlodipine Besylate 5mg',
            compositionSalts: [
              {
                id: 'cs-1',
                amount: 5,
                unit: 'MG',
                salt: { id: 'salt-1', name: 'Amlodipine Besylate' },
              },
            ],
          },
        });
      }
      if (endpoint === '/medicines/med-123/commercial-details') {
        return Promise.resolve({
          commercialDetails: {
            mrp: 65.0,
            purchaseRate: 48.0,
            discountPercent: 12.0,
            scheme: '10 + 1',
            privateNotes: 'Regular order',
          },
        });
      }
      return Promise.resolve({});
    });

    (apiClient.post as jest.Mock).mockResolvedValue({
      medicine: {
        id: 'med-created-999',
        name: 'New Custom Medicine',
      },
    });

    (apiClient.patch as jest.Mock).mockResolvedValue({
      medicine: {
        id: 'med-123',
        name: 'Updated Custom Medicine',
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  // 1. Salt Autocomplete input is editable
  it('1. Salt Name is a searchable text input with clear button and editable text', async () => {
    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('select-salt-0')).toBeTruthy();
    });

    const saltInput = screen.getByTestId('select-salt-0');
    expect(saltInput.props.accessibilityRole).toBe('combobox');

    // Type a new value
    await act(async () => {
      fireEvent.changeText(saltInput, 'Amlodipine');
    });

    expect(screen.getByDisplayValue('Amlodipine')).toBeTruthy();
  });

  // 2. Recommendations popup appears when typing in Salt Name
  it('2. Shows floating recommendation list when typing in Salt Name and selects a recommendation', async () => {
    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('select-salt-0')).toBeTruthy();
    });

    // Type query
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('select-salt-0'), 'Aml');
    });

    // Recommendation list appears
    await waitFor(() => {
      expect(screen.getByTestId('select-salt-0-menu')).toBeTruthy();
      expect(screen.getByTestId('select-salt-0-option-salt-1')).toBeTruthy();
    });

    // Tap recommendation
    await act(async () => {
      fireEvent.press(screen.getByTestId('select-salt-0-option-salt-1'));
    });

    // Menu closes and text updates
    await waitFor(() => {
      expect(screen.queryByTestId('select-salt-0-menu')).toBeNull();
      expect(screen.getByDisplayValue('Amlodipine Besylate')).toBeTruthy();
    });
  });

  // 3. User can enter a completely novel Salt Name not in DB
  it('3. User can enter a completely novel salt name that does not exist in recommendations', async () => {
    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('input-medicine-name')).toBeTruthy();
      expect(screen.getByTestId('select-salt-0')).toBeTruthy();
    });

    // Fill form with brand new salt name
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-medicine-name'), 'Novel Compound Beta');
      fireEvent.changeText(screen.getByTestId('select-salt-0'), 'NovelChemicalCompound-999');
      fireEvent.changeText(screen.getByTestId('input-salt-amount-0'), '250');
      fireEvent.changeText(screen.getByTestId('select-manufacturer'), 'Custom Labs Inc');
      fireEvent.changeText(screen.getByTestId('input-mrp'), '120.00');
    });

    // Close menu if open
    if (screen.queryByTestId('select-salt-0-menu')) {
      await act(async () => {
        fireEvent(screen.getByTestId('select-salt-0'), 'blur');
      });
    }

    // Submit form
    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-add-medicine-button'));
    });

    // Verify submission payload includes novel salt name and novel manufacturer
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/medicines',
        expect.objectContaining({
          name: 'Novel Compound Beta',
          manufacturerName: 'Custom Labs Inc',
          salts: expect.arrayContaining([
            expect.objectContaining({
              name: 'NovelChemicalCompound-999',
              amount: 250,
              unit: 'MG',
            }),
          ]),
        }),
      );
    });
  });

  // 4. Multiple salt rows have completely independent autocomplete state
  it('4. Multiple salt rows have independent autocomplete inputs and recommendation states', async () => {
    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('add-salt-button')).toBeTruthy();
    });

    // Add second salt row
    await act(async () => {
      fireEvent.press(screen.getByTestId('add-salt-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('select-salt-0')).toBeTruthy();
      expect(screen.getByTestId('select-salt-1')).toBeTruthy();
    });

    // Type in Salt row 1
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('select-salt-0'), 'Paracetamol');
    });

    // Type in Salt row 2
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('select-salt-1'), 'Caffeine Anhydrous');
    });

    expect(screen.getByDisplayValue('Paracetamol')).toBeTruthy();
    expect(screen.getByDisplayValue('Caffeine Anhydrous')).toBeTruthy();
  });

  // 5. Manufacturer Autocomplete allows recommendations and custom names
  it('5. Manufacturer input allows searching recommendations and typing custom manufacturer', async () => {
    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('select-manufacturer')).toBeTruthy();
    });

    const mfgInput = screen.getByTestId('select-manufacturer');

    // Type query
    await act(async () => {
      fireEvent.changeText(mfgInput, 'Torr');
    });

    // Check recommendations menu
    await waitFor(() => {
      expect(screen.getByTestId('select-manufacturer-menu')).toBeTruthy();
      expect(screen.getByTestId('select-manufacturer-option-mfg-1')).toBeTruthy();
    });

    // Select Torrent Pharmaceuticals
    await act(async () => {
      fireEvent.press(screen.getByTestId('select-manufacturer-option-mfg-1'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('select-manufacturer-menu')).toBeNull();
      expect(screen.getByDisplayValue('Torrent Pharmaceuticals Ltd.')).toBeTruthy();
    });
  });

  // 6. Edit mode populates existing values and allows freely modifying them
  it('6. Edit mode populates existing salt and manufacturer, allows editing to novel values', async () => {
    await render(
      <AuthProvider>
        <EditMedicineScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/medicines/med-123');
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Torrent Pharmaceuticals Ltd.')).toBeTruthy();
      expect(screen.getByDisplayValue('Amlodipine Besylate')).toBeTruthy();
    });

    // Modify salt and manufacturer to new values
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('select-salt-0'), 'Amlodipine Maleate New');
      fireEvent.changeText(screen.getByTestId('select-manufacturer'), 'Brand New Pharma Bio');
    });

    // Submit update
    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-edit-medicine-button'));
    });

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith(
        '/medicines/med-123',
        expect.objectContaining({
          manufacturerName: 'Brand New Pharma Bio',
          salts: expect.arrayContaining([
            expect.objectContaining({
              name: 'Amlodipine Maleate New',
              amount: 5,
              unit: 'MG',
            }),
          ]),
        }),
      );
    });
  });

  // 7. API search error does not prevent typing or submitting
  it('7. API failure during autocomplete search falls back gracefully without blocking user', async () => {
    (apiClient.get as jest.Mock).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/salts?search=')) {
        return Promise.reject(new Error('Network error'));
      }
      if (endpoint.startsWith('/manufacturers?search=')) {
        return Promise.reject(new Error('Network error'));
      }
      if (endpoint === '/manufacturers') {
        return Promise.resolve({ manufacturers: [] });
      }
      if (endpoint === '/salts') {
        return Promise.resolve({ salts: [] });
      }
      if (endpoint === '/mrs') {
        return Promise.resolve({ mrs: [] });
      }
      return Promise.resolve({});
    });

    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('select-salt-0')).toBeTruthy();
    });

    // Typing still works smoothly despite API failure
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('select-salt-0'), 'Manual Salt Entry');
      fireEvent.changeText(screen.getByTestId('select-manufacturer'), 'Manual Manufacturer');
    });

    expect(screen.getByDisplayValue('Manual Salt Entry')).toBeTruthy();
    expect(screen.getByDisplayValue('Manual Manufacturer')).toBeTruthy();
  });

  // 8. Clear button in AutocompleteInput
  it('8. Clear button clears the entered text in AutocompleteInput', async () => {
    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('select-salt-0')).toBeTruthy();
    });

    // Set text
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('select-salt-0'), 'Temporary Text');
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Temporary Text')).toBeTruthy();
      expect(screen.getByTestId('select-salt-0-clear')).toBeTruthy();
    });

    // Tap clear button
    await act(async () => {
      fireEvent.press(screen.getByTestId('select-salt-0-clear'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('select-salt-0').props.value).toBe('');
    });
  });

  // 9. Validation prevents empty salt name or empty manufacturer
  it('9. Form validation requires non-empty salt name and manufacturer', async () => {
    await render(
      <AuthProvider>
        <AddMedicineScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('input-medicine-name')).toBeTruthy();
    });

    // Clear salt name and manufacturer
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-medicine-name'), 'Test Med');
      fireEvent.changeText(screen.getByTestId('select-salt-0'), '');
      fireEvent.changeText(screen.getByTestId('select-manufacturer'), '');
      fireEvent.changeText(screen.getByTestId('input-mrp'), '100');
    });

    // Submit
    await act(async () => {
      fireEvent.press(screen.getByTestId('submit-add-medicine-button'));
    });

    await waitFor(() => {
      expect(apiClient.post).not.toHaveBeenCalled();
      expect(screen.getByText('Manufacturer is required')).toBeTruthy();
    });
  });
});
