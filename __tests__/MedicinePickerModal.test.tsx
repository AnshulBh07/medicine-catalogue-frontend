import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { MedicinePickerModal } from '../src/components/MedicinePickerModal';
import { apiClient } from '../src/services/api-client';
import type { PublicMedicine } from '../src/types/models';

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
    },
  };
});

const mockMedicines: PublicMedicine[] = [
  {
    id: 'med-1',
    name: 'Cetirizine 10mg Tablet',
    composition: { id: 'comp-1', displayText: 'Cetirizine 10mg' },
    form: 'TABLET',
    packQuantity: 10,
    packUnit: 'TABLET',
    shortDescription: null,
    imageUrl: null,
    uses: null,
    recommendedAgeGroup: null,
    directions: null,
    warnings: null,
    storageInstructions: null,
    barcode: null,
    prescriptionRequired: false,
    manufacturer: { id: 'mfg-1', name: "Dr. Reddy's Laboratories" },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'med-2',
    name: 'Omez 20mg Capsule',
    composition: { id: 'comp-2', displayText: 'Omeprazole 20mg' },
    form: 'CAPSULE',
    packQuantity: 15,
    packUnit: 'CAPSULE',
    shortDescription: null,
    imageUrl: null,
    uses: null,
    recommendedAgeGroup: null,
    directions: null,
    warnings: null,
    storageInstructions: null,
    barcode: null,
    prescriptionRequired: true,
    manufacturer: { id: 'mfg-1', name: "Dr. Reddy's Laboratories" },
    mr: { id: 'mr-other', name: 'Other Rep', company: 'Other Pharma', phone: '+91 99999 00000' },
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'med-3',
    name: 'Amoxicillin 500mg Tablet',
    composition: { id: 'comp-3', displayText: 'Amoxicillin 500mg' },
    form: 'TABLET',
    packQuantity: 10,
    packUnit: 'TABLET',
    shortDescription: null,
    imageUrl: null,
    uses: null,
    recommendedAgeGroup: null,
    directions: null,
    warnings: null,
    storageInstructions: null,
    barcode: null,
    prescriptionRequired: true,
    manufacturer: { id: 'mfg-2', name: 'Sun Pharma' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('MedicinePickerModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.get as jest.Mock).mockResolvedValue({
      medicines: mockMedicines,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders medicines catalogue with conflict badges and pre-selected items', async () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    await render(
      <MedicinePickerModal
        visible={true}
        initialSelected={[mockMedicines[0]!]}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Select Associated Medicines')).toBeTruthy();
      expect(screen.getByText('Cetirizine 10mg Tablet')).toBeTruthy();
      expect(screen.getByText('Omez 20mg Capsule')).toBeTruthy();
      expect(screen.getByText('Amoxicillin 500mg Tablet')).toBeTruthy();
      expect(screen.getByText('Assigned to Other Rep')).toBeTruthy();
      expect(screen.getByText('1 medicine selected')).toBeTruthy();
    });
  });

  it('allows toggling multiple medicines and applying selection', async () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    await render(
      <MedicinePickerModal
        visible={true}
        initialSelected={[]}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('medicine-picker-item-med-1')).toBeTruthy();
    });

    // Select med-1 and med-3
    await act(async () => {
      fireEvent.press(screen.getByTestId('medicine-picker-item-med-1'));
      fireEvent.press(screen.getByTestId('medicine-picker-item-med-3'));
    });

    await waitFor(() => {
      expect(screen.getByText('2 medicines selected')).toBeTruthy();
    });

    // Apply
    await act(async () => {
      fireEvent.press(screen.getByTestId('medicine-picker-apply-button'));
    });

    expect(onApply).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'med-1' }),
        expect.objectContaining({ id: 'med-3' }),
      ]),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('supports debounced search and maintains selected items across searches', async () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    (apiClient.get as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('search=Amox')) {
        return Promise.resolve({ medicines: [mockMedicines[2]!] });
      }
      return Promise.resolve({ medicines: mockMedicines });
    });

    await render(
      <MedicinePickerModal
        visible={true}
        initialSelected={[mockMedicines[0]!]} // Cetirizine already selected
        onApply={onApply}
        onClose={onClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('medicine-picker-item-med-1')).toBeTruthy();
    });

    // Search for Amox
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('medicine-picker-search-input'), 'Amox');
    });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('search=Amox'));
      expect(screen.getByText('Amoxicillin 500mg Tablet')).toBeTruthy();
    });

    // Select Amoxicillin as well
    await act(async () => {
      fireEvent.press(screen.getByTestId('medicine-picker-item-med-3'));
    });

    await waitFor(() => {
      expect(screen.getByText('2 medicines selected')).toBeTruthy();
    });

    // Apply: should contain both Cetirizine (from initial) and Amoxicillin (selected during search)
    await act(async () => {
      fireEvent.press(screen.getByTestId('medicine-picker-apply-button'));
    });

    expect(onApply).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'med-1' }),
        expect.objectContaining({ id: 'med-3' }),
      ]),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('closes modal on close button press', async () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    await render(
      <MedicinePickerModal
        visible={true}
        initialSelected={[]}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('close-medicine-picker-modal-button')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('close-medicine-picker-modal-button'));
    });

    expect(onClose).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });
});
