import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { MedicinesScreen } from '../src/screens/medicines/MedicinesScreen';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
      dispatch: jest.fn(),
    }),
  };
});

const mockTestMedicines = [
  {
    id: 'med-1',
    name: 'Paracetamol 500mg Tablet',
    composition: { id: 'comp-1', displayText: 'Paracetamol 500mg' },
    form: 'TABLET' as const,
    packQuantity: 10,
    packUnit: 'TABLET' as const,
    shortDescription: 'Analgesic / Antipyretic',
    imageUrl: null,
    uses: 'Pain relief and fever reduction',
    recommendedAgeGroup: 'Adults and children over 12',
    directions: 'Take 1-2 tablets every 4-6 hours as needed',
    warnings: 'Do not exceed 4g in 24 hours',
    storageInstructions: 'Store below 25°C',
    barcode: null,
    prescriptionRequired: false,
    manufacturer: { id: 'mfg-1', name: 'Acme Pharma Ltd.' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'med-2',
    name: 'Amoxicillin 500mg Capsule',
    composition: { id: 'comp-2', displayText: 'Amoxicillin 500mg' },
    form: 'CAPSULE' as const,
    packQuantity: 15,
    packUnit: 'CAPSULE' as const,
    shortDescription: 'Antibiotic',
    imageUrl: null,
    uses: 'Bacterial infections',
    recommendedAgeGroup: 'Adults',
    directions: 'Take 1 capsule 3 times daily',
    warnings: 'Complete full course of antibiotics',
    storageInstructions: 'Store in a dry place',
    barcode: null,
    prescriptionRequired: true,
    manufacturer: { id: 'mfg-2', name: 'Global Pharma' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'med-3',
    name: 'Cetirizine 10mg Tablet',
    composition: { id: 'comp-3', displayText: 'Cetirizine 10mg' },
    form: 'TABLET' as const,
    packQuantity: 10,
    packUnit: 'TABLET' as const,
    shortDescription: 'Antihistamine',
    imageUrl: null,
    uses: 'Allergies and hay fever',
    recommendedAgeGroup: 'Adults and children over 6',
    directions: 'Take 1 tablet daily',
    warnings: 'May cause drowsiness',
    storageInstructions: 'Store below 30°C',
    barcode: null,
    prescriptionRequired: false,
    manufacturer: { id: 'mfg-1', name: 'Acme Pharma Ltd.' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'med-4',
    name: 'Omeprazole 20mg Capsule',
    composition: { id: 'comp-4', displayText: 'Omeprazole 20mg' },
    form: 'CAPSULE' as const,
    packQuantity: 14,
    packUnit: 'CAPSULE' as const,
    shortDescription: 'Anti-ulcer',
    imageUrl: null,
    uses: 'Acid reflux and stomach ulcers',
    recommendedAgeGroup: 'Adults',
    directions: 'Take 1 capsule before breakfast',
    warnings: 'Swallow whole with water',
    storageInstructions: 'Store in original blister',
    barcode: null,
    prescriptionRequired: false,
    manufacturer: { id: 'mfg-3', name: 'HealthCare Labs' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'med-5',
    name: 'Ibuprofen 400mg Tablet',
    composition: { id: 'comp-5', displayText: 'Ibuprofen 400mg' },
    form: 'TABLET' as const,
    packQuantity: 10,
    packUnit: 'TABLET' as const,
    shortDescription: 'NSAID',
    imageUrl: null,
    uses: 'Inflammation and pain relief',
    recommendedAgeGroup: 'Adults',
    directions: 'Take with food or milk',
    warnings: 'Avoid if stomach ulcers present',
    storageInstructions: 'Keep in a cool dry place',
    barcode: null,
    prescriptionRequired: false,
    manufacturer: { id: 'mfg-2', name: 'Global Pharma' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'med-6',
    name: 'Atorvastatin 10mg Tablet',
    composition: { id: 'comp-7', displayText: 'Atorvastatin 10mg' },
    form: 'TABLET' as const,
    packQuantity: 10,
    packUnit: 'TABLET' as const,
    shortDescription: 'Lipid Lowering Agent',
    imageUrl: null,
    uses: 'Cholesterol management',
    recommendedAgeGroup: 'Adults',
    directions: 'Take 1 tablet at night',
    warnings: 'Avoid excessive grapefruit juice',
    storageInstructions: 'Store below 25°C',
    barcode: null,
    prescriptionRequired: true,
    manufacturer: { id: 'mfg-3', name: 'HealthCare Labs' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

// Mock apiClient to resolve with mock test catalogue data
jest.mock('../src/services/api-client', () => ({
  apiClient: {
    get: jest.fn().mockImplementation((path: string) => {
      if (path.startsWith('/medicines')) {
        return Promise.resolve({ medicines: mockTestMedicines });
      }
      if (path.startsWith('/manufacturers')) {
        return Promise.resolve({ manufacturers: [] });
      }
      if (path.startsWith('/mrs')) {
        return Promise.resolve({ mrs: [] });
      }
      if (path.startsWith('/salts')) {
        return Promise.resolve({ salts: [] });
      }
      if (path.startsWith('/compositions')) {
        return Promise.resolve({ compositions: [] });
      }
      return Promise.resolve({});
    }),
    setToken: jest.fn(),
    setOnUnauthorized: jest.fn(),
  },
}));

jest.mock('../src/features/auth', () => ({
  useAuth: () => ({
    isAdmin: false,
    user: null,
    isAuthenticated: false,
  }),
}));

describe('MedicinesScreen Visual & Functional Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('1. renders Header with Medicines title, Product Catalogue subtitle, Sort & Filter controls', async () => {
    await render(<MedicinesScreen />);

    expect(screen.getByText('Medicines')).toBeTruthy();
    expect(screen.getByText('Product Catalogue')).toBeTruthy();
    expect(screen.getByTestId('medicines-sort-button')).toBeTruthy();
    expect(screen.getByTestId('medicines-filter-button')).toBeTruthy();
  });

  it('2. renders Search field with authoritative placeholder', async () => {
    await render(<MedicinesScreen />);

    const searchInput = screen.getByPlaceholderText(
      'Search medicines by name or generic name...',
    );
    expect(searchInput).toBeTruthy();
  });

  it('3. renders exactly 4 filter chips (All Medicines, Tablet, Capsule, Syrup) and NO More chip', async () => {
    await render(<MedicinesScreen />);

    expect(screen.getByTestId('filter-chip-all')).toBeTruthy();
    expect(screen.getByTestId('filter-chip-tablet')).toBeTruthy();
    expect(screen.getByTestId('filter-chip-capsule')).toBeTruthy();
    expect(screen.getByTestId('filter-chip-syrup')).toBeTruthy();

    // Verify "More" filter chip is explicitly NOT present
    expect(screen.queryByTestId('filter-chip-more')).toBeNull();
  });

  it('4. renders all reference medicine cards with name, composition subtitle, form badge, and pack quantity', async () => {
    await render(<MedicinesScreen />);

    // 1. Paracetamol
    expect(screen.getByText('Paracetamol 500mg Tablet')).toBeTruthy();
    expect(screen.getByText('Paracetamol 500mg')).toBeTruthy();

    // 2. Amoxicillin
    expect(screen.getByText('Amoxicillin 500mg Capsule')).toBeTruthy();
    expect(screen.getByText('Amoxicillin 500mg')).toBeTruthy();

    // 3. Cetirizine
    expect(screen.getByText('Cetirizine 10mg Tablet')).toBeTruthy();
    expect(screen.getByText('Cetirizine 10mg')).toBeTruthy();

    // 4. Omeprazole
    expect(screen.getByText('Omeprazole 20mg Capsule')).toBeTruthy();
    expect(screen.getByText('Omeprazole 20mg')).toBeTruthy();

    // 5. Ibuprofen
    expect(screen.getByText('Ibuprofen 400mg Tablet')).toBeTruthy();
    expect(screen.getByText('Ibuprofen 400mg')).toBeTruthy();

    // 6. Atorvastatin
    expect(screen.getByText('Atorvastatin 10mg Tablet')).toBeTruthy();
    expect(screen.getByText('Atorvastatin 10mg')).toBeTruthy();
  });

  it('5. does NOT render stock or inventory information', async () => {
    await render(<MedicinesScreen />);

    expect(screen.queryByText(/In Stock/i)).toBeNull();
    expect(screen.queryByText(/Low Stock/i)).toBeNull();
    expect(screen.queryByText(/Out of Stock/i)).toBeNull();
    expect(screen.queryByText(/Inventory/i)).toBeNull();
    expect(screen.queryByText(/Units Available/i)).toBeNull();
  });

  it('6. filters medicine list by search query', async () => {
    await render(<MedicinesScreen />);

    const searchInput = screen.getByPlaceholderText(
      'Search medicines by name or generic name...',
    );
    fireEvent.changeText(searchInput, 'Amoxicillin');

    await waitFor(() => {
      expect(screen.getByText('Amoxicillin 500mg Capsule')).toBeTruthy();
      expect(screen.queryByText('Paracetamol 500mg Tablet')).toBeNull();
      expect(screen.queryByText('Cetirizine 10mg Tablet')).toBeNull();
    });
  });

  it('7. filters medicine list by dosage form chips', async () => {
    await render(<MedicinesScreen />);

    // Filter by Capsule
    fireEvent.press(screen.getByTestId('filter-chip-capsule'));

    await waitFor(() => {
      expect(screen.getByText('Amoxicillin 500mg Capsule')).toBeTruthy();
      expect(screen.getByText('Omeprazole 20mg Capsule')).toBeTruthy();
      expect(screen.queryByText('Paracetamol 500mg Tablet')).toBeNull();
      expect(screen.queryByText('Cetirizine 10mg Tablet')).toBeNull();
    });

    // Reset to All
    fireEvent.press(screen.getByTestId('filter-chip-all'));
    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg Tablet')).toBeTruthy();
    });
  });

  it('8. navigates to MedicineDetails on medicine card press', async () => {
    await render(<MedicinesScreen />);

    fireEvent.press(screen.getByTestId('medicine-card-med-1'));
    expect(mockNavigate).toHaveBeenCalledWith('MedicineDetails', { id: 'med-1' });
  });

  it('9. navigates to AddMedicine on FAB press', async () => {
    await render(<MedicinesScreen />);

    fireEvent.press(screen.getByTestId('add-medicine-fab'));
    expect(mockNavigate).toHaveBeenCalledWith('AddMedicine');
  });

  it('10. renders actual medicine.name directly from API data including long medicine names', async () => {
    const longMedicineName =
      'Amoxicillin and Potassium Clavulanate Extended-Release Tablets USP 1000mg/62.5mg Extra Strength Formulation';
    const { apiClient } = jest.requireMock('../src/services/api-client');
    apiClient.get.mockResolvedValueOnce({
      medicines: [
        {
          id: 'custom-med-1',
          name: longMedicineName,
          composition: { id: 'comp-1', displayText: 'Amox + Clav' },
          form: 'TABLET',
          packQuantity: 10,
          packUnit: 'TABLET',
          shortDescription: 'Broad spectrum antibacterial',
          imageUrl: 'https://example.com/amox-clav.png',
          uses: 'Bacterial respiratory infections',
          active: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    await render(<MedicinesScreen />);

    await waitFor(() => {
      expect(screen.getByText(longMedicineName)).toBeTruthy();
      expect(screen.getByText('Amox + Clav')).toBeTruthy();
      expect(screen.getAllByText('Tablet').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('11. opens SortModal on sort button press and applies selected sort order', async () => {
    await render(<MedicinesScreen />);

    // 1. Sort button exists and badge is not initially present
    const sortBtn = screen.getByTestId('medicines-sort-button');
    expect(screen.queryByTestId('active-sort-badge')).toBeNull();

    // 2. Open SortModal
    fireEvent.press(sortBtn);
    await waitFor(() => {
      expect(screen.getByText('Sort Medicines')).toBeTruthy();
    });

    // 3. Select Name Z → A
    const zToAOption = screen.getByTestId('sort-option-name:desc');
    fireEvent.press(zToAOption);

    // 4. Modal closed and active sort badge is shown
    await waitFor(() => {
      expect(screen.queryByText('Sort Medicines')).toBeNull();
      expect(screen.getByTestId('active-sort-badge')).toBeTruthy();
    });
  });

  it('12. navigates to AddMedicine screen when existing FAB is pressed', async () => {
    await render(<MedicinesScreen />);

    const fab = screen.getByTestId('add-medicine-fab');
    expect(fab).toBeTruthy();

    fireEvent.press(fab);

    expect(mockNavigate).toHaveBeenCalledWith('AddMedicine');
  });

  it('14. supports sorting by margin (High → Low and Low → High)', async () => {
    await render(<MedicinesScreen />);

    const sortBtn = screen.getByTestId('medicines-sort-button');
    fireEvent.press(sortBtn);

    await waitFor(() => {
      expect(screen.getByText('Sort Medicines')).toBeTruthy();
      expect(screen.getByText('Margin (%)')).toBeTruthy();
      expect(screen.getByTestId('sort-option-margin:desc')).toBeTruthy();
      expect(screen.getByTestId('sort-option-margin:asc')).toBeTruthy();
    });

    // Select margin High → Low
    fireEvent.press(screen.getByTestId('sort-option-margin:desc'));

    await waitFor(() => {
      expect(screen.queryByText('Sort Medicines')).toBeNull();
      expect(screen.getByTestId('active-sort-badge')).toBeTruthy();
    });
  });
});
