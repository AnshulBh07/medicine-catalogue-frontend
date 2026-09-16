import { apiClient } from './api-client';
import type {
  CreateDealPayload,
  DealsListResult,
  DealStatus,
  PublicDeal,
  UpdateDealPayload,
} from '../types/models';

export interface ListDealsParams {
  medicineId?: string;
  mrId?: string;
  status?: DealStatus | 'ALL';
  search?: string;
  sortBy?: 'dealDate' | 'medicineName' | 'mrName' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const dealService = {
  async listDeals(params: ListDealsParams = {}): Promise<DealsListResult> {
    const query = new URLSearchParams();
    if (params.medicineId) query.append('medicineId', params.medicineId);
    if (params.mrId) query.append('mrId', params.mrId);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.search && params.search.trim()) query.append('search', params.search.trim());
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<DealsListResult>(`/deals${qs}`);
  },

  async getDealById(id: string): Promise<{ deal: PublicDeal }> {
    return apiClient.get<{ deal: PublicDeal }>(`/deals/${id}`);
  },

  async checkPendingDeal(
    medicineId: string,
    mrId: string,
  ): Promise<{ hasPendingDeal: boolean; deal: PublicDeal | null }> {
    return apiClient.get<{ hasPendingDeal: boolean; deal: PublicDeal | null }>(
      `/deals/check-pending?medicineId=${medicineId}&mrId=${mrId}`,
    );
  },

  async createDeal(
    payload: CreateDealPayload,
  ): Promise<{ deal: PublicDeal; warning?: string }> {
    return apiClient.post<{ deal: PublicDeal; warning?: string }>('/deals', payload);
  },

  async updateDeal(
    id: string,
    payload: UpdateDealPayload,
  ): Promise<{ deal: PublicDeal }> {
    return apiClient.patch<{ deal: PublicDeal }>(`/deals/${id}`, payload);
  },

  async updateDealStatus(
    id: string,
    status: DealStatus,
  ): Promise<{ deal: PublicDeal }> {
    return apiClient.patch<{ deal: PublicDeal }>(`/deals/${id}/status`, { status });
  },

  async deleteDeal(id: string): Promise<{ message: string; id: string }> {
    return apiClient.delete<{ message: string; id: string }>(`/deals/${id}`);
  },
};
