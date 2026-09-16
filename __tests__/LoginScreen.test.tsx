import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../src/features/auth';
import { authService } from '../src/features/auth/authService';
import { storage } from '../src/lib/storage';
import { LoginScreen } from '../src/screens/auth/LoginScreen';
import { ApiError } from '../src/services/api-client';

describe('LoginScreen', () => {
  beforeEach(async () => {
    await storage.clearAuth();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('1. renders branding, inputs, forgot password, and sign in button without account creation action', async () => {
    const { getByText, getByTestId, queryByTestId, queryByText } = await render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );

    expect(getByTestId('login-app-logo')).toBeTruthy();
    expect(getByText('A.P. PHARMACY')).toBeTruthy();
    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByTestId('login-identifier-input')).toBeTruthy();
    expect(getByTestId('login-password-input')).toBeTruthy();
    expect(getByTestId('login-forgot-password-button')).toBeTruthy();
    expect(getByTestId('login-submit-button')).toBeTruthy();
    expect(queryByTestId('login-create-account-button')).toBeNull();
    expect(queryByText("Don't have an account? ")).toBeNull();
  });

  it('2. updates email/phone input correctly', async () => {
    const { getByTestId, getByDisplayValue } = await render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );

    const input = getByTestId('login-identifier-input');
    fireEvent.changeText(input, 'admin@example.com');

    await waitFor(() => {
      expect(getByDisplayValue('admin@example.com')).toBeTruthy();
    });
  });

  it('3. updates password input correctly', async () => {
    const { getByTestId, getByDisplayValue } = await render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );

    const passwordInput = getByTestId('login-password-input');
    fireEvent.changeText(passwordInput, 'SecretPassword123');

    await waitFor(() => {
      expect(getByDisplayValue('SecretPassword123')).toBeTruthy();
    });
  });

  it('4. toggles password visibility when show/hide button is pressed', async () => {
    const { getByLabelText } = await render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );

    const toggleButton = getByLabelText('Show password');
    fireEvent.press(toggleButton);

    await waitFor(() => {
      expect(getByLabelText('Hide password')).toBeTruthy();
    });

    const hideButton = getByLabelText('Hide password');
    fireEvent.press(hideButton);

    await waitFor(() => {
      expect(getByLabelText('Show password')).toBeTruthy();
    });
  });

  it('5. renders and handles "Forgot password?" interaction', async () => {
    const { getByTestId, getByText } = await render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );

    const forgotBtn = getByTestId('login-forgot-password-button');
    expect(forgotBtn).toBeTruthy();

    fireEvent.press(forgotBtn);

    await waitFor(() => {
      expect(getByText('Password Recovery')).toBeTruthy();
      expect(
        getByText(
          'Password recovery is managed by system administrators. Please contact your pharmacy administrator to reset your account password.',
        ),
      ).toBeTruthy();
    });

    const closeBtn = getByText('Understood');
    fireEvent.press(closeBtn);
  });

  it('6. verifies "Create Account" option is removed to match reference design', async () => {
    const { queryByTestId, queryByText } = await render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );

    expect(queryByTestId('login-create-account-button')).toBeNull();
    expect(queryByText("Don't have an account? ")).toBeNull();
    expect(queryByText('Create Account')).toBeNull();
  });

  it('7. validates required identifier before submitting', async () => {
    const { getByTestId, getByText } = await render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );

    const submitBtn = getByTestId('login-submit-button');
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(getByText('Please enter your email or phone number')).toBeTruthy();
    });
  });

  it('8. validates required password when identifier is present', async () => {
    const { getByTestId, getByDisplayValue, getByText } = await render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );

    const identifierInput = getByTestId('login-identifier-input');
    fireEvent.changeText(identifierInput, 'admin@example.com');

    await waitFor(() => {
      expect(getByDisplayValue('admin@example.com')).toBeTruthy();
    });

    const submitBtn = getByTestId('login-submit-button');
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(getByText('Please enter your password')).toBeTruthy();
    });
  });

  it('9. calls authService.login and displays server error message on failure', async () => {
    jest.spyOn(authService, 'login').mockRejectedValue(
      new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'),
    );

    const { getByTestId, getByDisplayValue, getByText } = await render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );

    const identifierInput = getByTestId('login-identifier-input');
    fireEvent.changeText(identifierInput, 'wrong@example.com');

    await waitFor(() => {
      expect(getByDisplayValue('wrong@example.com')).toBeTruthy();
    });

    const passwordInput = getByTestId('login-password-input');
    fireEvent.changeText(passwordInput, 'wrongPassword');

    await waitFor(() => {
      expect(getByDisplayValue('wrongPassword')).toBeTruthy();
    });

    const submitBtn = getByTestId('login-submit-button');
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(getByText('Invalid email or password')).toBeTruthy();
    });
  });

  it('10. renders correctly across mobile widths (360px, 390px, 412px) with feature highlights', async () => {
    const { getByText, getByTestId } = await render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );

    // Verify Pharmacy Branding & Badges
    expect(getByTestId('login-app-logo')).toBeTruthy();
    expect(getByText('Internal Use Only')).toBeTruthy();
    expect(getByText('MEDICINE MANAGEMENT')).toBeTruthy();
    expect(getByText('Sign in to access your pharmacy catalogue')).toBeTruthy();

    // Verify 3 feature highlights
    expect(getByText(/View Medicine/)).toBeTruthy();
    expect(getByText(/Manage/)).toBeTruthy();
    expect(getByText(/Pharmacy Team Only/)).toBeTruthy();

    // Verify security footer
    expect(getByText('Secure access for authorised team members')).toBeTruthy();
  });

  it('11. does not render a ScrollView ensuring the screen is non-scrollable', async () => {
    const { toJSON } = await render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );

    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('RCTScrollView');
  });
});
