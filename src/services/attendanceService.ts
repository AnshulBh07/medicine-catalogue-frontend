import { apiClient } from './api-client';
import type {
  AttendanceDashboardSummary,
  AttendanceRecord,
  AttendanceStatus,
  EmployeeAttendanceDetailResult,
} from '../types/models';

export interface CreateOrUpdateAttendancePayload {
  userId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string | null;
}

export interface PatchAttendancePayload {
  status?: AttendanceStatus;
  notes?: string | null;
}

export const attendanceService = {
  async getAttendanceSummary(year?: number, month?: number): Promise<AttendanceDashboardSummary> {
    const searchParams = new URLSearchParams();
    if (year !== undefined) {
      searchParams.append('year', String(year));
    }
    if (month !== undefined) {
      searchParams.append('month', String(month));
    }
    const queryString = searchParams.toString();
    const path = queryString ? `/attendance/summary?${queryString}` : '/attendance/summary';
    return apiClient.get<AttendanceDashboardSummary>(path);
  },

  async getEmployeeAttendance(
    userId: string,
    year?: number,
    month?: number,
  ): Promise<EmployeeAttendanceDetailResult> {
    const searchParams = new URLSearchParams();
    if (year !== undefined) {
      searchParams.append('year', String(year));
    }
    if (month !== undefined) {
      searchParams.append('month', String(month));
    }
    const queryString = searchParams.toString();
    const path = queryString
      ? `/attendance/users/${userId}?${queryString}`
      : `/attendance/users/${userId}`;
    return apiClient.get<EmployeeAttendanceDetailResult>(path);
  },

  async createOrUpdateAttendance(
    payload: CreateOrUpdateAttendancePayload,
  ): Promise<{ message: string; record: AttendanceRecord | null; status: AttendanceStatus }> {
    return apiClient.post<{ message: string; record: AttendanceRecord | null; status: AttendanceStatus }>(
      '/attendance',
      payload,
    );
  },

  async patchAttendance(
    id: string,
    payload: PatchAttendancePayload,
  ): Promise<{ message: string; record: AttendanceRecord | null; status: AttendanceStatus }> {
    return apiClient.patch<{ message: string; record: AttendanceRecord | null; status: AttendanceStatus }>(
      `/attendance/${id}`,
      payload,
    );
  },

  async deleteAttendanceRecord(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/attendance/${id}`);
  },

  async resetAttendance(userId: string, date: string): Promise<{ message: string }> {
    const searchParams = new URLSearchParams({ userId, date });
    return apiClient.delete<{ message: string }>(`/attendance?${searchParams.toString()}`);
  },
};
