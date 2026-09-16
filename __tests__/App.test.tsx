import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import App from '../App';

describe('App Bootstrap', () => {
  it('renders without crashing and shows sign in screen initially', async () => {
    await render(<App />);

    await waitFor(() => {
      expect(screen.getByText('A.P. PHARMACY')).toBeTruthy();
      expect(screen.getByText('Welcome Back')).toBeTruthy();
      expect(screen.getAllByText('Sign In').length).toBeGreaterThan(0);
      expect(screen.getByTestId('login-identifier-input')).toBeTruthy();
      expect(screen.getByTestId('login-password-input')).toBeTruthy();
      expect(screen.getByTestId('login-submit-button')).toBeTruthy();
    });
  });
});
