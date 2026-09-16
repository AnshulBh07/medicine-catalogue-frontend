import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { DropdownSelect } from '../src/components/DropdownSelect';

describe('DropdownSelect Component', () => {
  afterEach(() => {
    cleanup();
  });

  const options = [
    { label: 'All Items', value: null },
    { label: 'Item 1', value: 'item-1' },
    { label: 'Item 2', value: 'item-2' },
  ];

  it('1. renders trigger with label and selected option', async () => {
    const onToggle = jest.fn();
    const onSelect = jest.fn();

    await render(
      <DropdownSelect
        label="Test Category"
        placeholder="Select an item"
        options={options}
        selectedValue="item-1"
        onSelect={onSelect}
        isOpen={false}
        onToggle={onToggle}
        testID="test-dropdown"
      />,
    );

    expect(screen.getByText('Test Category')).toBeTruthy();
    expect(screen.getByText('Item 1')).toBeTruthy();
  });

  it('2. calls onToggle when trigger button is clicked', async () => {
    const onToggle = jest.fn();
    const onSelect = jest.fn();

    await render(
      <DropdownSelect
        label="Test Category"
        placeholder="Select an item"
        options={options}
        selectedValue={null}
        onSelect={onSelect}
        isOpen={false}
        onToggle={onToggle}
        testID="test-dropdown"
      />,
    );

    fireEvent.press(screen.getByTestId('test-dropdown'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('3. renders options overlay menu when isOpen is true and handles selection', async () => {
    const onToggle = jest.fn();
    const onSelect = jest.fn();

    await render(
      <DropdownSelect
        label="Test Category"
        placeholder="Select an item"
        options={options}
        selectedValue={null}
        onSelect={onSelect}
        isOpen={true}
        onToggle={onToggle}
        testID="test-dropdown"
      />,
    );

    expect(screen.getByText('Item 2')).toBeTruthy();
    fireEvent.press(screen.getByText('Item 2'));
    expect(onSelect).toHaveBeenCalledWith('item-2');
  });

  it('4. closes overlay when backdrop is tapped', async () => {
    const onToggle = jest.fn();
    const onClose = jest.fn();
    const onSelect = jest.fn();

    await render(
      <DropdownSelect
        label="Test Category"
        placeholder="Select an item"
        options={options}
        selectedValue={null}
        onSelect={onSelect}
        isOpen={true}
        onToggle={onToggle}
        onClose={onClose}
        testID="test-dropdown"
      />,
    );

    expect(screen.getByTestId('test-dropdown-backdrop')).toBeTruthy();
    fireEvent.press(screen.getByTestId('test-dropdown-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('5. does not fire onToggle when disabled', async () => {
    const onToggle = jest.fn();
    const onSelect = jest.fn();

    await render(
      <DropdownSelect
        label="Test Category"
        placeholder="Select an item"
        options={options}
        selectedValue={null}
        onSelect={onSelect}
        isOpen={false}
        onToggle={onToggle}
        disabled={true}
        testID="test-dropdown"
      />,
    );

    fireEvent.press(screen.getByTestId('test-dropdown'));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('6. supports upward openDirection and small size prop', async () => {
    const onToggle = jest.fn();
    const onSelect = jest.fn();

    await render(
      <DropdownSelect
        label="Small Up Dropdown"
        placeholder="Choose"
        options={options}
        selectedValue="item-2"
        onSelect={onSelect}
        isOpen={true}
        onToggle={onToggle}
        openDirection="up"
        size="small"
        testID="small-dropdown"
      />,
    );

    expect(screen.getByText('Small Up Dropdown')).toBeTruthy();
    expect(screen.getByTestId('small-dropdown-menu')).toBeTruthy();
    expect(screen.getAllByText('Item 2').length).toBe(2);
  });
});
