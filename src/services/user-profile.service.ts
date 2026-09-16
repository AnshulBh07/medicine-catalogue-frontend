import { apiClient } from './api-client';
import type { PublicUser } from '../types/models';

export interface UpdateProfilePayload {
  name?: string;
  email?: string | null;
  phone?: string | null;
  profileImageUrl?: string | null;
}

export const userProfileService = {
  async getProfile(): Promise<PublicUser> {
    const data = await apiClient.get<{ user: PublicUser }>('/users/me');
    return data.user;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<PublicUser> {
    const data = await apiClient.patch<{ user: PublicUser }>('/users/me', payload);
    return data.user;
  },

  async removeProfileImage(): Promise<PublicUser> {
    const data = await apiClient.delete<{ user: PublicUser }>('/users/me/profile-image');
    return data.user;
  },
};
