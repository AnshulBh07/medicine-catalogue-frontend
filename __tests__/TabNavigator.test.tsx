import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from '../src/features/auth';
import { TabNavigator } from '../src/navigation/TabNavigator';

describe('TabNavigator Verification (4-tab bottom navigation)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders exactly 4 bottom navigation items: Dashboard, Medicines, MR Registry, More', async () => {
    const { getByLabelText, queryByText } = await render(
      <AuthProvider>
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>
      </AuthProvider>,
    );

    // Verify all 4 tabs are present
    expect(getByLabelText('Dashboard, tab, 1 of 4')).toBeTruthy();
    expect(getByLabelText('Medicines, tab, 2 of 4')).toBeTruthy();
    expect(getByLabelText('MR Registry, tab, 3 of 4')).toBeTruthy();
    expect(getByLabelText('More, tab, 4 of 4')).toBeTruthy();

    // Verify Reports, Stock, Inventory are NOT present
    expect(queryByText('Reports')).toBeNull();
    expect(queryByText('Stock')).toBeNull();
    expect(queryByText('Inventory')).toBeNull();
  });

  it('switches between tabs on press', async () => {
    const { getByLabelText, getByText, getByPlaceholderText } = await render(
      <AuthProvider>
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>
      </AuthProvider>,
    );

    // Navigate to Medicines via tab button
    fireEvent.press(getByLabelText('Medicines, tab, 2 of 4'));
    await waitFor(() => {
      expect(getByPlaceholderText('Search medicines by name or generic name...')).toBeTruthy();
    });

    // Navigate to MR Registry via tab button
    fireEvent.press(getByLabelText('MR Registry, tab, 3 of 4'));
    await waitFor(() => {
      expect(getByText('Medical Representatives Directory')).toBeTruthy();
    });

    // Navigate to More via tab button
    fireEvent.press(getByLabelText('More, tab, 4 of 4'));
    await waitFor(() => {
      expect(getByText('More & Catalogue')).toBeTruthy();
    });

    // Navigate back to Dashboard
    fireEvent.press(getByLabelText('Dashboard, tab, 1 of 4'));
    await waitFor(() => {
      expect(getByText('A.P. PHARMACY')).toBeTruthy();
    });
  });
});
