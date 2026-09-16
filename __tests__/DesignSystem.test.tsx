import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  AppLogo,
  Avatar,
  Badge,
  EmptyState,
  ErrorState,
  FloatingActionButton,
  FormField,
  ListItem,
  PrimaryButton,
  SearchInput,
  SectionHeader,
  TextInput,
} from '../src/components';

describe('Design System UI Components', () => {
  it('renders PrimaryButton and responds to press events', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton title="Submit Action" onPress={onPress} />);

    const button = screen.getByRole('button');
    expect(screen.getByText('Submit Action')).toBeTruthy();

    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders TextInput with label, helper, and handles input changes', async () => {
    const onChangeText = jest.fn();
    await render(
      <TextInput
        label="Medicine Name"
        placeholder="Enter medicine name"
        helperText="Enter full brand name"
        onChangeText={onChangeText}
      />,
    );

    expect(screen.getByText('Medicine Name')).toBeTruthy();
    expect(screen.getByText('Enter full brand name')).toBeTruthy();

    const input = screen.getByPlaceholderText('Enter medicine name');
    fireEvent.changeText(input, 'Paracetamol');
    expect(onChangeText).toHaveBeenCalledWith('Paracetamol');
  });

  it('renders multiline TextInput textarea with character counter', async () => {
    await render(
      <TextInput
        label="Description / Category"
        placeholder="e.g. Dihydropyridine calcium channel blocker"
        multiline
        numberOfLines={3}
        maxLength={500}
        value="Dihydropyridine calcium channel blocker"
      />,
    );

    expect(screen.getByText('Description / Category')).toBeTruthy();
    expect(screen.getByDisplayValue('Dihydropyridine calcium channel blocker')).toBeTruthy();
    expect(screen.getByText('39 / 500')).toBeTruthy();
  });

  it('renders FormField with required star and error state', async () => {
    await render(
      <FormField label="Batch Number" required error="Batch number is required">
        <TextInput placeholder="Enter batch" />
      </FormField>,
    );

    expect(screen.getByText('Batch Number')).toBeTruthy();
    expect(screen.getByText(' *')).toBeTruthy();
    expect(screen.getByText('Batch number is required')).toBeTruthy();
  });

  it('renders ErrorState with title, message, and retry button', async () => {
    const onRetry = jest.fn();
    await render(
      <ErrorState
        title="Failed to load medicines"
        message="Network timeout while connecting to server"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText('Failed to load medicines')).toBeTruthy();
    expect(screen.getByText('Network timeout while connecting to server')).toBeTruthy();

    fireEvent.press(screen.getByRole('button'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders EmptyState with icon, title, and action button', async () => {
    const onAction = jest.fn();
    await render(
      <EmptyState
        icon="💊"
        title="No Medicines Found"
        description="Try searching with a different term or add a new medicine."
        actionTitle="Add Medicine"
        onAction={onAction}
      />,
    );

    expect(screen.getByText('No Medicines Found')).toBeTruthy();
    expect(
      screen.getByText('Try searching with a different term or add a new medicine.'),
    ).toBeTruthy();

    fireEvent.press(screen.getByRole('button'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders Badges for roles and statuses correctly', async () => {
    await render(
      <>
        <Badge label="ADMIN" variant="admin" />
        <Badge label="EMPLOYEE" variant="employee" />
        <Badge label="Active" variant="success" />
        <Badge label="Inactive" variant="secondary" />
      </>,
    );

    expect(screen.getByText('ADMIN')).toBeTruthy();
    expect(screen.getByText('EMPLOYEE')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Inactive')).toBeTruthy();
  });

  it('renders SearchInput with clear button functionality', async () => {
    const onChangeText = jest.fn();
    await render(
      <SearchInput
        value="Amoxicillin"
        onChangeText={onChangeText}
        placeholder="Search catalogue..."
      />,
    );

    expect(screen.getByPlaceholderText('Search catalogue...')).toBeTruthy();
    const clearBtn = screen.getByLabelText('Clear search');
    fireEvent.press(clearBtn);
    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('renders ListItem with avatar, title, subtitle, and tertiary text', async () => {
    const onPress = jest.fn();
    await render(
      <ListItem
        title="Paracetamol 500mg Tablet"
        subtitle="Analgesic / Antipyretic"
        tertiary="Tablet • 500 mg"
        avatarIcon="medicines"
        avatarColor="red"
        onPress={onPress}
      />,
    );

    expect(screen.getByText('Paracetamol 500mg Tablet')).toBeTruthy();
    expect(screen.getByText('Analgesic / Antipyretic')).toBeTruthy();
    expect(screen.getByText('Tablet • 500 mg')).toBeTruthy();

    fireEvent.press(screen.getByText('Paracetamol 500mg Tablet'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders Avatar with initials and icons', async () => {
    await render(
      <>
        <Avatar initials="RK" colorVariant="blue" />
        <Avatar icon="medicines" colorVariant="red" />
      </>,
    );

    expect(screen.getByText('RK')).toBeTruthy();
  });

  it('renders SectionHeader with title and optional action', async () => {
    const onAction = jest.fn();
    await render(
      <SectionHeader
        title="Recent Medicines"
        actionTitle="View All"
        onAction={onAction}
      />,
    );

    expect(screen.getByText('Recent Medicines')).toBeTruthy();
    expect(screen.getByText('View All')).toBeTruthy();

    fireEvent.press(screen.getByText('View All'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders FloatingActionButton and handles press', async () => {
    const onPress = jest.fn();
    await render(
      <FloatingActionButton
        onPress={onPress}
        accessibilityLabel="Add Medicine FAB"
      />,
    );

    const fab = screen.getByLabelText('Add Medicine FAB');
    fireEvent.press(fab);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders AppLogo correctly with custom size', async () => {
    await render(
      <>
        <AppLogo testID="logo-default" />
        <AppLogo testID="logo-custom" size={80} />
      </>,
    );

    expect(screen.getByTestId('logo-default')).toBeTruthy();
    expect(screen.getByTestId('logo-custom')).toBeTruthy();
  });
});
