import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import {
  AdvancedFilterModal,
  INITIAL_ADVANCED_FILTERS,
} from '../src/components/AdvancedFilterModal';

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

const mockManufacturers = [
  { id: 'mfg-1', name: 'Acme Pharma Ltd.', active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'mfg-2', name: 'Global Pharma', active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
];

const mockSalts = [
  { id: 'salt-1', name: 'Paracetamol', description: null, active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'salt-2', name: 'Caffeine', description: null, active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
];

const mockMrs = [
  { id: 'mr-1', name: 'Ravi Kumar', company: 'Acme Pharma Ltd.', phone: '+919876543210', email: null, notes: null, active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
];

describe('AdvancedFilterModal & Catalogue Filters Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all 8 catalogue filters and excludes Medicine Form and Stock/Inventory', async () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    await render(
      <AdvancedFilterModal
        visible={true}
        onClose={onClose}
        filters={INITIAL_ADVANCED_FILTERS}
        onApply={onApply}
        manufacturers={mockManufacturers}
        mrs={mockMrs}
        salts={mockSalts}
      />,
    );

    // 1. Manufacturer
    expect(screen.getByText('1. Manufacturer')).toBeTruthy();

    // 2. Salt & Strength
    expect(screen.getByText('2. Salt & Strength')).toBeTruthy();
    expect(screen.getByText('+ Add Salt & Strength')).toBeTruthy();
    expect(screen.getByText('AND MATCH')).toBeTruthy();

    // 3. Pack Quantity
    expect(screen.getByText('3. Pack Quantity')).toBeTruthy();

    // 4. Pack Unit
    expect(screen.getByText('4. Pack Unit')).toBeTruthy();

    // 5. Recommended Age Group
    expect(screen.getByText('5. Recommended Age Group')).toBeTruthy();

    // 6. Prescription Required
    expect(screen.getByText('6. Prescription Required')).toBeTruthy();
    expect(screen.getByText('Rx Only (Yes)')).toBeTruthy();
    expect(screen.getByText('OTC (No)')).toBeTruthy();

    // 7. Price Range
    expect(screen.getByText('7. Price Range (MRP)')).toBeTruthy();

    // 8. MR
    expect(screen.getByText('8. Medical Representative (MR)')).toBeTruthy();

    // PROHIBITED: Form should NOT be in the advanced filter popup
    expect(screen.queryByText('Medicine Form')).toBeNull();
    expect(screen.queryByText('Dosage Form')).toBeNull();

    // PROHIBITED: Stock / Inventory / Batch availability should NOT be in the popup
    expect(screen.queryByText('Stock')).toBeNull();
    expect(screen.queryByText('Inventory')).toBeNull();
    expect(screen.queryByText('Low Stock')).toBeNull();
    expect(screen.queryByText('Batch Availability')).toBeNull();
    expect(screen.queryByText('Warehouse')).toBeNull();
    expect(screen.queryByText('Reports')).toBeNull();
  });

  it('supports adding and removing multiple paired Salt + Strength rows', async () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    await render(
      <AdvancedFilterModal
        visible={true}
        onClose={onClose}
        filters={INITIAL_ADVANCED_FILTERS}
        onApply={onApply}
        manufacturers={mockManufacturers}
        mrs={mockMrs}
        salts={mockSalts}
      />,
    );

    // Add first salt row
    fireEvent.press(screen.getByTestId('add-salt-row-button'));
    await waitFor(() => {
      expect(screen.getByTestId('salt-select-0')).toBeTruthy();
      expect(screen.getByTestId('strength-select-0')).toBeTruthy();
    });

    // Add second salt row
    fireEvent.press(screen.getByTestId('add-salt-row-button'));
    await waitFor(() => {
      expect(screen.getByTestId('salt-select-1')).toBeTruthy();
      expect(screen.getByTestId('strength-select-1')).toBeTruthy();
    });

    // Remove first salt row
    fireEvent.press(screen.getByTestId('remove-salt-row-0'));
    await waitFor(() => {
      // Should now only have 1 row (index 0)
      expect(screen.queryByTestId('salt-select-1')).toBeNull();
    });
  });

  it('closes when clicking the close X button', async () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    await render(
      <AdvancedFilterModal
        visible={true}
        onClose={onClose}
        filters={INITIAL_ADVANCED_FILTERS}
        onApply={onApply}
        manufacturers={mockManufacturers}
        mrs={mockMrs}
        salts={mockSalts}
      />,
    );

    fireEvent.press(screen.getByTestId('close-advanced-filters-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when clicking the backdrop outside modal content', async () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    await render(
      <AdvancedFilterModal
        visible={true}
        onClose={onClose}
        filters={INITIAL_ADVANCED_FILTERS}
        onApply={onApply}
        manufacturers={mockManufacturers}
        mrs={mockMrs}
        salts={mockSalts}
      />,
    );

    fireEvent.press(screen.getByTestId('advanced-filters-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('applies advanced filters', async () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    const sampleFilters = {
      ...INITIAL_ADVANCED_FILTERS,
      saltCriteria: [
        { id: 'row-1', saltId: 'salt-1', saltName: 'Paracetamol', strength: '500 mg' },
        { id: 'row-2', saltId: 'salt-2', saltName: 'Caffeine', strength: '65 mg' },
      ],
    };

    await render(
      <AdvancedFilterModal
        visible={true}
        onClose={onClose}
        filters={sampleFilters}
        onApply={onApply}
        manufacturers={mockManufacturers}
        mrs={mockMrs}
        salts={mockSalts}
      />,
    );

    // Verify both rows render
    expect(screen.getByText('Paracetamol')).toBeTruthy();
    expect(screen.getByText('500 mg')).toBeTruthy();
    expect(screen.getByText('Caffeine')).toBeTruthy();
    expect(screen.getByText('65 mg')).toBeTruthy();

    // Click Apply
    fireEvent.press(screen.getByTestId('apply-advanced-filters-button'));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        saltCriteria: expect.arrayContaining([
          expect.objectContaining({ saltName: 'Paracetamol', strength: '500 mg' }),
          expect.objectContaining({ saltName: 'Caffeine', strength: '65 mg' }),
        ]),
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('resets all filters when Reset All is pressed', async () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    const sampleFilters = {
      ...INITIAL_ADVANCED_FILTERS,
      packQuantity: '20',
      prescriptionRequired: 'YES' as const,
      minPrice: '100',
    };

    await render(
      <AdvancedFilterModal
        visible={true}
        onClose={onClose}
        filters={sampleFilters}
        onApply={onApply}
        manufacturers={mockManufacturers}
        mrs={mockMrs}
        salts={mockSalts}
      />,
    );

    // Click Reset All
    fireEvent.press(screen.getByTestId('reset-advanced-filters-button'));

    // Wait for input to be reset
    await waitFor(() => {
      expect(screen.getByTestId('filter-pack-quantity-input').props.value).toBe('');
    });

    // Click Apply to verify reset values
    fireEvent.press(screen.getByTestId('apply-advanced-filters-button'));
    expect(onApply).toHaveBeenCalledWith(INITIAL_ADVANCED_FILTERS);
  });
});
