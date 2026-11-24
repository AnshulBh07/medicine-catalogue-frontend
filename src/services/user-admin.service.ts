import { apiClient } from './api-client';
import type { PublicUser, UserRole } from '../types/models';

export interface ListUsersParams {
  search?: string;
  role?: UserRole;
  active?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'email' | 'role' | 'createdAt' | 'updatedAt' | 'monthlySalary';
  sortOrder?: 'asc' | 'desc';
}

export interface ListUsersResponse {
  users: PublicUser[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateUserPayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  password: string;
  role: UserRole;
  monthlySalary?: number | null;
  shiftType?: 'FULL_DAY' | 'HALF_DAY';
}

export interface UpdateUserPayload {
  name?: string;
  email?: string | null;
  phone?: string | null;
  password?: string;
  role?: UserRole;
  active?: boolean;
  monthlySalary?: number | null;
  shiftType?: 'FULL_DAY' | 'HALF_DAY';
}

export const userAdminService = {
  async listUsers(params?: ListUsersParams): Promise<ListUsersResponse> {
    const searchParams = new URLSearchParams();

    if (params?.search) {
      searchParams.append('search', params.search);
    }
    if (params?.role) {
      searchParams.append('role', params.role);
    }
    if (params?.active !== undefined) {
      searchParams.append('active', params.active ? 'true' : 'false');
    }
    if (params?.page) {
      searchParams.append('page', String(params.page));
    }
    if (params?.limit) {
      searchParams.append('limit', String(params.limit));
    }
    if (params?.sortBy) {
      searchParams.append('sortBy', params.sortBy);
    }
    if (params?.sortOrder) {
      searchParams.append('sortOrder', params.sortOrder);
    }

    const queryString = searchParams.toString();
    const path = queryString ? `/users?${queryString}` : '/users';
    return apiClient.get<ListUsersResponse>(path);
  },

  async getUser(id: string): Promise<PublicUser> {
    const response = await apiClient.get<{ user: PublicUser }>(`/users/${id}`);
    return response.user;
  },

  async createUser(payload: CreateUserPayload): Promise<PublicUser> {
    const response = await apiClient.post<{ user: PublicUser }>('/users', payload);
    return response.user;
  },

  async updateUser(id: string, payload: UpdateUserPayload): Promise<PublicUser> {
    const response = await apiClient.patch<{ user: PublicUser }>(`/users/${id}`, payload);
    return response.user;
  },

  async updateUserStatus(id: string, active: boolean): Promise<PublicUser> {
    const response = await apiClient.patch<{ user: PublicUser }>(`/users/${id}/status`, { active });
    return response.user;
  },

  async updateUserRole(id: string, role: UserRole): Promise<PublicUser> {
    const response = await apiClient.patch<{ user: PublicUser }>(`/users/${id}/role`, { role });
    return response.user;
  },

  async deleteUser(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/users/${id}`);
  },
};
