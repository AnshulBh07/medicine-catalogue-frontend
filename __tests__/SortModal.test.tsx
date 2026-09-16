import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SortModal } from '../src/components/SortModal';

describe('SortModal Component', () => {
  const mockOnSelectSort = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible with all sort categories and options', async () => {
    await render(
      <SortModal
        visible={true}
        sortBy="name"
        sortOrder="asc"
        onSelectSort={mockOnSelectSort}
        onClose={mockOnClose}
      />,
    );

    // Title
    expect(screen.getByText('Sort Medicines')).toBeTruthy();

    // Category titles
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('MRP (Price)')).toBeTruthy();
    expect(screen.getByText('Pack Quantity')).toBeTruthy();
    expect(screen.getByText('Recently Added')).toBeTruthy();
    expect(screen.getByText('Recently Updated')).toBeTruthy();

    // Option labels
    expect(screen.getByText('A → Z')).toBeTruthy();
    expect(screen.getByText('Z → A')).toBeTruthy();
    expect(screen.getByTestId('sort-option-mrp:asc')).toBeTruthy();
    expect(screen.getByTestId('sort-option-mrp:desc')).toBeTruthy();
    expect(screen.getByTestId('sort-option-packQuantity:asc')).toBeTruthy();
    expect(screen.getByTestId('sort-option-createdAt:desc')).toBeTruthy();
    expect(screen.getByTestId('sort-option-updatedAt:desc')).toBeTruthy();
  });

  it('calls onSelectSort with selected criteria and closes modal when option tapped', async () => {
    await render(
      <SortModal
        visible={true}
        sortBy="name"
        sortOrder="asc"
        onSelectSort={mockOnSelectSort}
        onClose={mockOnClose}
      />,
    );

    const mrpAscOption = screen.getByTestId('sort-option-mrp:asc');
    fireEvent.press(mrpAscOption);

    expect(mockOnSelectSort).toHaveBeenCalledWith('mrp', 'asc');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('resets sort to default Name A-Z on Reset to Default press', async () => {
    await render(
      <SortModal
        visible={true}
        sortBy="mrp"
        sortOrder="desc"
        onSelectSort={mockOnSelectSort}
        onClose={mockOnClose}
      />,
    );

    const resetButton = screen.getByTestId('reset-sort-button');
    fireEvent.press(resetButton);

    expect(mockOnSelectSort).toHaveBeenCalledWith('name', 'asc');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when backdrop or close button is pressed', async () => {
    await render(
      <SortModal
        visible={true}
        sortBy="name"
        sortOrder="asc"
        onSelectSort={mockOnSelectSort}
        onClose={mockOnClose}
      />,
    );

    const backdrop = screen.getByTestId('sort-modal-backdrop');
    fireEvent.press(backdrop);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByTestId('close-sort-modal-button');
    fireEvent.press(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });
});
