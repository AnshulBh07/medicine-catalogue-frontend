import { apiClient } from './api-client';
import type {
  CreateShortageItemPayload,
  DailyShortageResult,
  PatchShortageItemPayload,
  ShortageItem,
  ShortageStatus,
} from '../types/models';

export const shortageService = {
  async getDailyShortages(
    date?: string,
    search?: string,
    status?: ShortageStatus,
  ): Promise<DailyShortageResult> {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (search) params.append('search', search);
    if (status) params.append('status', status);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<DailyShortageResult>(`/shortages${queryString}`);
  },

  async getShortageItemById(id: string): Promise<{ shortageItem: ShortageItem }> {
    return apiClient.get<{ shortageItem: ShortageItem }>(`/shortages/${id}`);
  },

  async createShortageItem(
    payload: CreateShortageItemPayload,
  ): Promise<{ message: string; shortageItem: ShortageItem }> {
    return apiClient.post<{ message: string; shortageItem: ShortageItem }>(
      '/shortages',
      payload,
    );
  },

  async patchShortageItem(
    id: string,
    payload: PatchShortageItemPayload,
  ): Promise<{ message: string; shortageItem: ShortageItem }> {
    return apiClient.patch<{ message: string; shortageItem: ShortageItem }>(
      `/shortages/${id}`,
      payload,
    );
  },

  async deleteShortageItem(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/shortages/${id}`);
  },
};
