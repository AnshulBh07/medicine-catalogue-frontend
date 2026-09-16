import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../src/features/auth';
import {
  AttendanceDashboardScreen,
  AttendanceCalendarScreen,
  EditAttendanceScreen,
} from '../src/screens/attendance';
import { apiClient } from '../src/services/api-client';
import { attendanceService } from '../src/services/attendanceService';
import { storage } from '../src/lib/storage';
import type {
  AttendanceDashboardSummary,
  EmployeeAttendanceDetailResult,
  PublicUser,
} from '../src/types/models';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: Record<string, unknown> = {};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  const ReactModule = jest.requireActual('react');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      addListener: jest.fn(() => jest.fn()),
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
    useFocusEffect: (cb: () => void) => {
      ReactModule.useEffect(() => {
        cb();
      }, [cb]);
    },
  };
});

jest.mock('../src/services/api-client', () => {
  const actual = jest.requireActual('../src/services/api-client');
  return {
    ...actual,
    apiClient: {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      setToken: jest.fn(),
      setOnUnauthorized: jest.fn(),
    },
  };
});

describe('Admin Attendance System Frontend Tests', () => {
  const mockAdminUser: PublicUser = {
    id: 'admin-001',
    name: 'Dr. Sarah Smith',
    email: 'sarah@example.com',
    phone: '+919876543210',
    role: 'ADMIN',
    profileImageUrl: null,
    active: true,
    monthlySalary: 50000,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
  };

  const mockEmployeeUser: PublicUser = {
    id: 'emp-002',
    name: 'Amit Patel',
    email: 'amit@example.com',
    phone: '+919123456789',
    role: 'EMPLOYEE',
    profileImageUrl: null,
    active: true,
    monthlySalary: 25000,
    createdAt: '2026-02-20T10:00:00.000Z',
    updatedAt: '2026-02-20T10:00:00.000Z',
  };

  const mockDashboardData: AttendanceDashboardSummary = {
    year: 2026,
    month: 8,
    workingDays: 26,
    totalEmployees: 3,
    today: {
      date: '2026-08-31',
      present: 2,
      absent: 1,
      halfDay: 0,
      leave: 0,
      late: 0,
    },
    overall: {
      totalWorkingDays: 26,
      presentDays: 70,
      absentDays: 4,
      halfDays: 2,
      leaveDays: 2,
      payableDays: 71,
      totalEstimatedPayroll: 75000,
      attendancePercentage: 89.7,
      payablePercentage: 91.0,
    },
    employees: [
      {
        id: 'emp-002',
        name: 'Amit Patel',
        email: 'amit@example.com',
        phone: '+919123456789',
        profileImageUrl: null,
        role: 'EMPLOYEE',
        monthlySalary: 25000,
        workingDays: 26,
        presentDays: 23,
        absentDays: 2,
        halfDays: 1,
        leaveDays: 0,
        payableDays: 23.5,
        attendancePercentage: 88.5,
        estimatedSalary: 22596,
      },
    ],
  };

  const mockCalendarData: EmployeeAttendanceDetailResult = {
    user: mockEmployeeUser,
    year: 2026,
    month: 8,
    workingDays: 26,
    presentDays: 23,
    absentDays: 2,
    halfDays: 1,
    leaveDays: 0,
    payableDays: 23.5,
    dailySalary: 961.54,
    attendancePercentage: 88.5,
    estimatedSalary: 22596,
    records: [
      {
        id: 'rec-1',
        userId: 'emp-002',
        date: '2026-08-10',
        status: 'ABSENT',
        notes: 'Fever',
        createdAt: '2026-08-10T10:00:00Z',
        updatedAt: '2026-08-10T10:00:00Z',
      },
      {
        id: 'rec-2',
        userId: 'emp-002',
        date: '2026-08-18',
        status: 'HALF_DAY',
        notes: 'Personal work',
        createdAt: '2026-08-18T10:00:00Z',
        updatedAt: '2026-08-18T10:00:00Z',
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRouteParams = {};
    await storage.clearAuth();
    await storage.setToken('fake-jwt-token');
    await storage.setUser(mockAdminUser);
    (apiClient.get as jest.Mock).mockImplementation((path: string) => {
      if (path === '/users/me') {
        return Promise.resolve({ user: mockAdminUser });
      }
      return Promise.resolve(mockDashboardData);
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('AttendanceDashboardScreen', () => {
    it('1. renders summary stats, overall attendance, payroll, and employee list for admin', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue(mockDashboardData);

      render(
        <AuthProvider>
          <AttendanceDashboardScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Attendance Dashboard')).toBeTruthy();
        expect(screen.getByText('Total Employees')).toBeTruthy();
        expect(screen.getByText('Present Today')).toBeTruthy();
        expect(screen.getByText('Absent Today')).toBeTruthy();
        expect(screen.getByText('Amit Patel')).toBeTruthy();
        expect(screen.getByText('₹75,000')).toBeTruthy();
        expect(screen.getByText('₹22,596')).toBeTruthy();
      });

      // Verify redundant top-right calendar icon button is not rendered
      expect(screen.queryByTestId('dashboard-header-calendar-btn')).toBeNull();
    });

    it('2. navigates to AttendanceCalendar when an employee card is tapped', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue(mockDashboardData);

      render(
        <AuthProvider>
          <AttendanceDashboardScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('employee-card-emp-002')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('employee-card-emp-002'));
      });

      expect(mockNavigate).toHaveBeenCalledWith('AttendanceCalendar', {
        userId: 'emp-002',
        year: expect.any(Number),
        month: expect.any(Number),
      });
    });

    it('3. blocks non-admin users with access restricted message', async () => {
      await storage.setUser(mockEmployeeUser);
      (apiClient.get as jest.Mock).mockImplementation((path: string) => {
        if (path === '/users/me') {
          return Promise.resolve({ user: mockEmployeeUser });
        }
        return Promise.resolve(mockDashboardData);
      });

      render(
        <AuthProvider>
          <AttendanceDashboardScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Access Restricted')).toBeTruthy();
      });
    });
  });

  describe('AttendanceCalendarScreen', () => {
    it('4. renders monthly calendar grid, status dots, and summary counters', async () => {
      mockRouteParams = { userId: 'emp-002', year: 2026, month: 8 };
      (apiClient.get as jest.Mock).mockImplementation((path: string) => {
        if (path === '/users/me') return Promise.resolve({ user: mockAdminUser });
        return Promise.resolve(mockCalendarData);
      });

      render(
        <AuthProvider>
          <AttendanceCalendarScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Attendance Calendar')).toBeTruthy();
        expect(screen.getByText('Amit Patel')).toBeTruthy();
        expect(screen.getByText('₹25,000')).toBeTruthy();
        expect(screen.getByText('88.5%')).toBeTruthy();
        expect(screen.getByText('₹22,596')).toBeTruthy();
        expect(screen.getByTestId('calendar-selected-date-panel')).toBeTruthy();
      });
    });

    it('5. triggers quick status update when quick action button is tapped', async () => {
      mockRouteParams = { userId: 'emp-002', year: 2026, month: 8 };
      (apiClient.get as jest.Mock).mockImplementation((path: string) => {
        if (path === '/users/me') return Promise.resolve({ user: mockAdminUser });
        return Promise.resolve(mockCalendarData);
      });
      (apiClient.post as jest.Mock).mockResolvedValue({
        message: 'Attendance recorded',
        record: { status: 'ABSENT' },
        status: 'ABSENT',
      });

      render(
        <AuthProvider>
          <AttendanceCalendarScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('quick-btn-absent')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('quick-btn-absent'));
      });

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          '/attendance',
          expect.objectContaining({
            userId: 'emp-002',
            status: 'ABSENT',
          }),
        );
      });
    });

    it('6. navigates to EditAttendance screen when Edit Status button is pressed', async () => {
      mockRouteParams = { userId: 'emp-002', year: 2026, month: 8 };
      (apiClient.get as jest.Mock).mockImplementation((path: string) => {
        if (path === '/users/me') return Promise.resolve({ user: mockAdminUser });
        return Promise.resolve(mockCalendarData);
      });

      render(
        <AuthProvider>
          <AttendanceCalendarScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('calendar-edit-status-btn')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('calendar-edit-status-btn'));
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'EditAttendance',
        expect.objectContaining({
          userId: 'emp-002',
          userName: 'Amit Patel',
        }),
      );
    });
  });

  describe('EditAttendanceScreen', () => {
    it('7. renders status selection cards, notes input, and saves changes', async () => {
      mockRouteParams = {
        userId: 'emp-002',
        date: '2026-08-18',
        userName: 'Amit Patel',
        monthlySalary: 25000,
        initialStatus: 'HALF_DAY',
        initialNotes: 'Personal work',
        year: 2026,
        month: 8,
      };

      (apiClient.post as jest.Mock).mockResolvedValue({
        message: 'Attendance recorded',
        record: { status: 'LEAVE' },
        status: 'LEAVE',
      });

      render(
        <AuthProvider>
          <EditAttendanceScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Attendance')).toBeTruthy();
        expect(screen.getByText('Amit Patel')).toBeTruthy();
        expect(screen.getByText('Impact on Monthly Summary')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('status-option-leave'));
        fireEvent.changeText(
          screen.getByTestId('edit-attendance-notes-input'),
          'Approved medical leave',
        );
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('edit-attendance-save-btn'));
      });

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/attendance', {
          userId: 'emp-002',
          date: '2026-08-18',
          status: 'LEAVE',
          notes: 'Approved medical leave',
        });
        expect(mockGoBack).toHaveBeenCalled();
      });
    });

    it('8. resetting attendance to PRESENT calls delete/reset endpoint', async () => {
      mockRouteParams = {
        userId: 'emp-002',
        date: '2026-08-10',
        userName: 'Amit Patel',
        monthlySalary: 25000,
        initialStatus: 'ABSENT',
        initialNotes: 'Fever',
        year: 2026,
        month: 8,
      };

      (apiClient.delete as jest.Mock).mockResolvedValue({
        message: 'Attendance marked as PRESENT (default)',
      });

      render(
        <AuthProvider>
          <EditAttendanceScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('status-option-present')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('status-option-present'));
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('edit-attendance-save-btn'));
      });

      await waitFor(() => {
        expect(apiClient.delete).toHaveBeenCalledWith(
          expect.stringContaining('/attendance?userId=emp-002&date=2026-08-10'),
        );
        expect(mockGoBack).toHaveBeenCalled();
      });
    });
  });

  describe('attendanceService', () => {
    it('9. correctly formats query params for getAttendanceSummary and getEmployeeAttendance', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue(mockDashboardData);

      await attendanceService.getAttendanceSummary(2026, 8);
      expect(apiClient.get).toHaveBeenCalledWith('/attendance/summary?year=2026&month=8');

      await attendanceService.getEmployeeAttendance('emp-002', 2026, 8);
      expect(apiClient.get).toHaveBeenCalledWith('/attendance/users/emp-002?year=2026&month=8');
    });
  });
});