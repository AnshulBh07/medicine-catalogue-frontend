import { apiClient } from './api-client';
import type {
  CreateMedicineAlternativePayload,
  MedicineAlternativeStatus,
  PublicAlternativeGroup,
  UpdateMedicineAlternativePayload,
} from '../types/models';

export const medicineAlternativeService = {
  async listAlternatives(search?: string): Promise<PublicAlternativeGroup[]> {
    const params = new URLSearchParams();
    if (search && search.trim()) {
      params.append('search', search.trim());
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<{ alternatives: PublicAlternativeGroup[] }>(
      `/medicine-alternatives${queryString}`,
    );
    return res?.alternatives || [];
  },

  async getByMedicineId(medicineId: string): Promise<MedicineAlternativeStatus> {
    return apiClient.get<MedicineAlternativeStatus>(
      `/medicine-alternatives/by-medicine/${medicineId}`,
    );
  },

  async createAlternatives(
    payload: CreateMedicineAlternativePayload,
  ): Promise<PublicAlternativeGroup> {
    const res = await apiClient.post<{ alternative: PublicAlternativeGroup }>(
      '/medicine-alternatives',
      payload,
    );
    return res.alternative;
  },

  async updateAlternatives(
    sourceMedicineId: string,
    payload: UpdateMedicineAlternativePayload,
  ): Promise<PublicAlternativeGroup> {
    const res = await apiClient.put<{ alternative: PublicAlternativeGroup }>(
      `/medicine-alternatives/${sourceMedicineId}`,
      payload,
    );
    return res.alternative;
  },

  async deleteAlternatives(
    sourceMedicineId: string,
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/medicine-alternatives/${sourceMedicineId}`,
    );
  },
};
