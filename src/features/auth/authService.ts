import { apiClient } from '../../services/api-client';
import type { LoginRequest, LoginResponse } from '../../types/api';

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/login', credentials);
  },
};
