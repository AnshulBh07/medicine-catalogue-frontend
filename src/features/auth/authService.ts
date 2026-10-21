import { apiClient } from '../../services/api-client';
import type { LoginRequest, LoginResponse, RefreshResponse } from '../../types/api';

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/login', credentials);
  },

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    return apiClient.post<RefreshResponse>(
      '/auth/refresh',
      { refreshToken },
      { skipAuthValidation: true },
    );
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post<{ success: boolean }>('/auth/logout', {}, { skipAuthValidation: true });
    } catch {
      // Ignore network failures on logout
    }
  },
};
