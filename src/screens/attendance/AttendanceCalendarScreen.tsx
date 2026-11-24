import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppScreen,
  Card,
  ErrorState,
  Icon,
  LoadingIndicator,
} from '../../components';
import { useAuth } from '../../features/auth';
import { attendanceService } from '../../services/attendanceService';
import { colors, fontSizes, fontWeights, theme } from '../../theme';
import type {
  AttendanceRecord,
  AttendanceStatus,
  EmployeeAttendanceDetailResult,
} from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CalendarRouteProp = RouteProp<RootStackParamList, 'AttendanceCalendar'>;

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAY_FULL_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const AttendanceCalendarScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CalendarRouteProp>();
  const { isAdmin } = useAuth();

  const userId = route.params?.userId;
  const initialYear = route.params?.year ?? new Date().getFullYear();
  const initialMonth = route.params?.month ?? new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);

  const today = new Date();
  const isCurrentMonthNow =
    today.getFullYear() === selectedYear && today.getMonth() + 1 === selectedMonth;
  const [selectedDay, setSelectedDay] = useState<number>(
    isCurrentMonthNow ? today.getDate() : 1,
  );

  const [attendanceData, setAttendanceData] = useState<EmployeeAttendanceDetailResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = useCallback(
    async (isRefresh = false) => {
      if (!userId) return;
      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(null);
        const data = await attendanceService.getEmployeeAttendance(
          userId,
          selectedYear,
          selectedMonth,
        );
        setAttendanceData(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load attendance records';
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [userId, selectedYear, selectedMonth],
  );

  useFocusEffect(
    useCallback(() => {
      if (isAdmin && userId) {
        fetchAttendance();
      }
    }, [fetchAttendance, isAdmin, userId]),
  );

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((m) => m - 1);
    }
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
    setSelectedDay(1);
  };

  const handleGoToToday = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
    setSelectedDay(now.getDate());
  };

  const recordsMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    if (attendanceData?.records) {
      for (const rec of attendanceData.records) {
        map.set(rec.date, rec);
      }
    }
    return map;
  }, [attendanceData?.records]);

  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(Date.UTC(selectedYear, selectedMonth, 0)).getUTCDate();
    const firstDayOfWeek = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1)).getUTCDay();
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const daysInPrevMonth = new Date(
      Date.UTC(selectedYear, selectedMonth - 1, 0),
    ).getUTCDate();

    const cells = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        dateStr: '',
        status: null as AttendanceStatus | null,
        isSunday: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(Date.UTC(selectedYear, selectedMonth - 1, day));
      const dayOfWeek = d.getUTCDay();
      const isSunday = dayOfWeek === 0;

      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(
        day,
      ).padStart(2, '0')}`;

      const rec = recordsMap.get(dateStr);
      let status: AttendanceStatus = 'PRESENT';
      if (rec) {
        status = rec.status;
      }

      cells.push({
        day,
        isCurrentMonth: true,
        dateStr,
        status,
        isSunday,
      });
    }

    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let day = 1; day <= remaining; day++) {
        cells.push({
          day,
          isCurrentMonth: false,
          dateStr: '',
          status: null as AttendanceStatus | null,
          isSunday: false,
        });
      }
    }

    return cells;
  }, [selectedYear, selectedMonth, recordsMap]);

  const selectedDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(
    selectedDay,
  ).padStart(2, '0')}`;
  const selectedDateObj = new Date(
    Date.UTC(selectedYear, selectedMonth - 1, selectedDay),
  );
  const selectedDayName = DAY_FULL_NAMES[selectedDateObj.getUTCDay()];
  const selectedDateFormatted = `${selectedDayName}, ${selectedDay} ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  const selectedRecord = recordsMap.get(selectedDateStr);
  const currentStatus: AttendanceStatus = selectedRecord
    ? selectedRecord.status
    : 'PRESENT';

  const handleQuickStatusChange = async (newStatus: AttendanceStatus) => {
    if (!userId || isUpdatingStatus) return;

    try {
      setIsUpdatingStatus(true);
      await attendanceService.createOrUpdateAttendance({
        userId,
        date: selectedDateStr,
        status: newStatus,
        workUnits: newStatus === 'PRESENT' ? 2 : newStatus === 'HALF_DAY' ? 1 : 0,
        notes: selectedRecord?.notes ?? null,
      });
      await fetchAttendance();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update attendance status';
      Alert.alert('Error', msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleOpenEditScreen = () => {
    if (!attendanceData?.user) return;
    navigation.navigate('EditAttendance', {
      userId: attendanceData.user.id,
      date: selectedDateStr,
      userName: attendanceData.user.name,
      userRole: attendanceData.user.role,
      monthlySalary: attendanceData.user.monthlySalary,
      shiftType: attendanceData.user.shiftType,
      initialStatus: currentStatus,
      initialWorkUnits: selectedRecord?.workUnits ?? null,
      initialNotes: selectedRecord?.notes ?? null,
      year: selectedYear,
      month: selectedMonth,
    });
  };

  if (!isAdmin) {
    return (
      <AppScreen
        headerProps={{
          title: 'Attendance Calendar',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <ErrorState
          title="Access Restricted"
          message="Attendance records are strictly restricted to ADMIN accounts."
        />
      </AppScreen>
    );
  }

  const user = attendanceData?.user;
  const monthName = MONTH_NAMES[selectedMonth - 1];
  const userInitials = user?.name.trim()
    ? user.name
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'AP';

  const presentCount = attendanceData?.presentDays ?? 0;
  const absentCount = attendanceData?.absentDays ?? 0;
  const halfDayCount = attendanceData?.halfDays ?? 0;
  const leaveCount = attendanceData?.leaveDays ?? 0;
  const workingDays = attendanceData?.workingDays ?? 0;
  const payableDays = attendanceData?.payableDays ?? 0;
  const attendancePct = attendanceData?.attendancePercentage ?? 0;
  const estimatedSalary = attendanceData?.estimatedSalary ?? 0;
  const monthlySalary = user?.monthlySalary;

  return (
    <AppScreen
      scrollable={false}
      headerProps={{
        title: 'Attendance Calendar',
        subtitle: `${user?.name ?? 'Employee'} • ${monthName} ${selectedYear}`,
        showBack: true,
        onBack: () => navigation.goBack(),
      }}
      contentContainerStyle={styles.screenContent}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchAttendance(true)}
            colors={[colors.primary]}
          />
        }
      >
        {isLoading && !isRefreshing ? (
          <LoadingIndicator message="Loading attendance records..." />
        ) : error ? (
          <ErrorState
            title="Failed to Load Attendance"
            message={error}
            onRetry={() => fetchAttendance()}
          />
        ) : (
          <>
            {/* Top Employee Card */}
            <Card style={styles.employeeCard} testID="calendar-employee-card">
          <View style={styles.employeeLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{userInitials}</Text>
            </View>
            <View style={styles.employeeInfo}>
              <Text style={styles.employeeName} numberOfLines={1}>
                {user?.name ?? 'Employee'}
              </Text>
              <Text style={styles.employeeSubtitle}>Staff Employee</Text>
            </View>
          </View>

          <View style={styles.cardVerticalDivider} />

          <View style={styles.employeeRight}>
            <Text style={styles.salaryLabel}>Monthly Salary</Text>
            <Text style={styles.salaryValue}>
              {monthlySalary !== null && monthlySalary !== undefined
                ? `₹${Number(monthlySalary).toLocaleString('en-IN')}`
                : 'Not set'}
            </Text>
          </View>
        </Card>

        {/* Month Navigation Row */}
        <View style={styles.monthNavRow}>
          <TouchableOpacity
            onPress={handlePrevMonth}
            style={styles.monthNavArrow}
            accessibilityRole="button"
            accessibilityLabel="Previous Month"
            testID="calendar-prev-month-btn"
          >
            <Icon name="chevron-left" size={20} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.monthNavTitle}>
            {monthName} {selectedYear}
          </Text>

          <TouchableOpacity
            onPress={handleNextMonth}
            style={styles.monthNavArrow}
            accessibilityRole="button"
            accessibilityLabel="Next Month"
            testID="calendar-next-month-btn"
          >
            <Icon name="chevron-right" size={20} color="#0F172A" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGoToToday}
            style={styles.todayButton}
            accessibilityRole="button"
            accessibilityLabel="Go to Today"
            testID="calendar-today-btn"
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Grid Card */}
        <Card style={styles.calendarCard} testID="calendar-grid-card">
          {/* Weekday Header */}
          <View style={styles.weekdayRow}>
            {WEEKDAY_NAMES.map((name) => (
              <View key={name} style={styles.weekdayCell}>
                <Text style={styles.weekdayText}>{name}</Text>
              </View>
            ))}
          </View>

          {/* Date Grid */}
          <View style={styles.dateGrid}>
            {calendarCells.map((cell, index) => {
              if (!cell.isCurrentMonth) {
                return (
                  <View key={`outside-${index}`} style={styles.dateCell}>
                    <Text style={styles.dateTextOutside}>{cell.day}</Text>
                  </View>
                );
              }

              const isSelected = cell.day === selectedDay;
              const isTodayCell =
                isCurrentMonthNow && cell.day === today.getDate();

              let dotColor = '#10B981';
              if (cell.status === 'ABSENT') {
                dotColor = '#EF4444';
              } else if (cell.status === 'HALF_DAY') {
                dotColor = '#F59E0B';
              } else if (cell.status === 'LEAVE') {
                dotColor = '#3B82F6';
              }

              return (
                <TouchableOpacity
                  key={`day-${cell.day}`}
                  style={[
                    styles.dateCell,
                    isSelected ? styles.dateCellSelected : null,
                    isTodayCell && !isSelected ? styles.dateCellToday : null,
                  ]}
                  onPress={() => setSelectedDay(cell.day)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${cell.day} ${monthName}, status ${cell.status ?? 'PRESENT'}`}
                  testID={`calendar-day-${cell.day}`}
                >
                  <Text
                    style={[
                      styles.dateText,
                      isSelected ? styles.dateTextSelected : null,
                    ]}
                  >
                    {cell.day}
                  </Text>
                  <View
                    style={[
                      styles.calendarDot,
                      { backgroundColor: dotColor },
                      isSelected ? styles.calendarDotSelected : null,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>Absent</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>Half Day</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.legendText}>Leave</Text>
            </View>
          </View>
        </Card>

        {/* 4-Stat Monthly Counters Grid */}
        <View style={styles.statsGrid}>
          {/* Present */}
          <View style={[styles.summaryBox, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}>
            <View style={[styles.summaryIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Icon name="check" size={16} color="#16A34A" />
            </View>
            <Text style={styles.summaryCount}>{presentCount}</Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>

          {/* Absent */}
          <View style={[styles.summaryBox, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
            <View style={[styles.summaryIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Icon name="warning" size={16} color="#DC2626" />
            </View>
            <Text style={styles.summaryCount}>{absentCount}</Text>
            <Text style={styles.summaryLabel}>Absent</Text>
          </View>

          {/* Half Day */}
          <View style={[styles.summaryBox, { backgroundColor: '#FFFDF0', borderColor: '#FEF3C7' }]}>
            <View style={[styles.summaryIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Icon name="time" size={16} color="#D97706" />
            </View>
            <Text style={styles.summaryCount}>{halfDayCount}</Text>
            <Text style={styles.summaryLabel}>Half Day</Text>
          </View>

          {/* Leave */}
          <View style={[styles.summaryBox, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
            <View style={[styles.summaryIconCircle, { backgroundColor: '#DBEAFE' }]}>
              <Icon name="tag" size={16} color="#2563EB" />
            </View>
            <Text style={styles.summaryCount}>{leaveCount}</Text>
            <Text style={styles.summaryLabel}>Leave</Text>
          </View>
        </View>

        {/* Attendance & Salary Summary Card */}
        <Card style={styles.impactCard} testID="calendar-impact-card">
          <View style={styles.impactLeft}>
            <Text style={styles.impactLabel}>Attendance</Text>
            <Text style={styles.impactPercentage}>{attendancePct}%</Text>
            <Text style={styles.impactWorkingDays}>
              {payableDays} / {workingDays} Working Days
            </Text>
            <View style={styles.impactProgressBarBg}>
              <View
                style={[
                  styles.impactProgressBarFill,
                  { width: `${Math.min(100, attendancePct)}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.cardVerticalDivider} />

          <View style={styles.impactRight}>
            <View style={styles.salaryTitleRow}>
              <Text style={styles.impactLabel}>Estimated Salary</Text>
              <Icon name="shield" size={12} color="#94A3B8" />
            </View>
            <Text style={styles.impactSalaryValue}>
              ₹{estimatedSalary.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.impactSalarySubtext}>
              Payable for {monthName} {selectedYear}
            </Text>
          </View>
        </Card>

        {/* Bottom Selected Date Action Panel */}
        <Card style={styles.selectedDatePanel} testID="calendar-selected-date-panel">
          <View style={styles.panelHandle} />

          <View style={styles.panelHeaderRow}>
            <View style={styles.panelBadge}>
              <Text style={styles.panelBadgeDay}>{selectedDay}</Text>
              <Text style={styles.panelBadgeMonth}>{monthName.slice(0, 3).toUpperCase()}</Text>
            </View>

            <View style={styles.panelTextCol}>
              <Text style={styles.panelDateText}>{selectedDateFormatted}</Text>
              <View style={styles.panelStatusRow}>
                <Text style={styles.panelStatusLabel}>Current Status: </Text>
                <Text
                  style={[
                    styles.panelStatusValue,
                    currentStatus === 'PRESENT'
                      ? styles.statusTextPresent
                      : currentStatus === 'ABSENT'
                        ? styles.statusTextAbsent
                        : currentStatus === 'HALF_DAY'
                          ? styles.statusTextHalfDay
                          : styles.statusTextLeave,
                  ]}
                >
                  {currentStatus === 'PRESENT'
                    ? 'Present'
                    : currentStatus === 'ABSENT'
                      ? 'Absent'
                      : currentStatus === 'HALF_DAY'
                        ? 'Half Day'
                        : 'Leave'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.editStatusBtn}
              onPress={handleOpenEditScreen}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Edit Status"
              testID="calendar-edit-status-btn"
            >
              <Icon name="edit" size={14} color="#059669" />
              <Text style={styles.editStatusBtnText}>Edit Status</Text>
            </TouchableOpacity>
          </View>

          {/* 4 Quick Action Buttons */}
          <View style={styles.quickButtonsRow}>
            {/* Present */}
            <TouchableOpacity
              style={[
                styles.quickBtn,
                styles.quickBtnPresent,
                currentStatus === 'PRESENT' ? styles.quickBtnSelectedPresent : null,
              ]}
              onPress={() => handleQuickStatusChange('PRESENT')}
              activeOpacity={0.7}
              disabled={isUpdatingStatus}
              accessibilityRole="button"
              accessibilityLabel="Mark Present"
              testID="quick-btn-present"
            >
              <Icon name="check" size={16} color="#16A34A" />
              <Text style={styles.quickBtnText}>Present</Text>
            </TouchableOpacity>

            {/* Absent */}
            <TouchableOpacity
              style={[
                styles.quickBtn,
                styles.quickBtnAbsent,
                currentStatus === 'ABSENT' ? styles.quickBtnSelectedAbsent : null,
              ]}
              onPress={() => handleQuickStatusChange('ABSENT')}
              activeOpacity={0.7}
              disabled={isUpdatingStatus}
              accessibilityRole="button"
              accessibilityLabel="Mark Absent"
              testID="quick-btn-absent"
            >
              <Icon name="warning" size={16} color="#DC2626" />
              <Text style={styles.quickBtnText}>Absent</Text>
            </TouchableOpacity>

            {/* Half Day */}
            <TouchableOpacity
              style={[
                styles.quickBtn,
                styles.quickBtnHalfDay,
                currentStatus === 'HALF_DAY' ? styles.quickBtnSelectedHalfDay : null,
              ]}
              onPress={() => handleQuickStatusChange('HALF_DAY')}
              activeOpacity={0.7}
              disabled={isUpdatingStatus}
              accessibilityRole="button"
              accessibilityLabel="Mark Half Day"
              testID="quick-btn-halfday"
            >
              <Icon name="time" size={16} color="#D97706" />
              <Text style={styles.quickBtnText}>Half Day</Text>
            </TouchableOpacity>

            {/* Leave */}
            <TouchableOpacity
              style={[
                styles.quickBtn,
                styles.quickBtnLeave,
                currentStatus === 'LEAVE' ? styles.quickBtnSelectedLeave : null,
              ]}
              onPress={() => handleQuickStatusChange('LEAVE')}
              activeOpacity={0.7}
              disabled={isUpdatingStatus}
              accessibilityRole="button"
              accessibilityLabel="Mark Leave"
              testID="quick-btn-leave"
            >
              <Icon name="tag" size={16} color="#2563EB" />
              <Text style={styles.quickBtnText}>Leave</Text>
            </TouchableOpacity>
          </View>
        </Card>
          </>
        )}
      </ScrollView>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  employeeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  employeeLeft: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#7C3AED',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  employeeSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  cardVerticalDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 12,
  },
  employeeRight: {
    flex: 1,
    alignItems: 'flex-start',
  },
  salaryLabel: {
    fontSize: 10.5,
    color: '#64748B',
  },
  salaryValue: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#059669',
    marginTop: 2,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  monthNavArrow: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthNavTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  todayButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  todayButtonText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: '#0F172A',
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#475569',
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dateCell: {
    width: '14.28%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginVertical: 2,
  },
  dateCellSelected: {
    backgroundColor: '#085444',
  },
  dateCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dateText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  dateTextSelected: {
    color: '#FFFFFF',
  },
  dateTextSunday: {
    color: '#94A3B8',
  },
  dateTextOutside: {
    fontSize: 13,
    color: '#CBD5E1',
  },
  calendarDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 3,
  },
  calendarDotSelected: {
    backgroundColor: '#FDE047',
  },
  calendarDotEmpty: {
    width: 5,
    height: 5,
    marginTop: 3,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 10.5,
    fontWeight: fontWeights.medium,
    color: '#475569',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  summaryBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...theme.shadows.sm,
  },
  summaryIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  summaryLabel: {
    fontSize: 10.5,
    fontWeight: fontWeights.semibold,
    color: '#475569',
    marginTop: 1,
  },
  impactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  impactLeft: {
    flex: 1.2,
  },
  impactLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  impactPercentage: {
    fontSize: 20,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    marginVertical: 2,
  },
  impactWorkingDays: {
    fontSize: 10.5,
    color: '#475569',
    marginBottom: 6,
  },
  impactProgressBarBg: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  impactProgressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 2,
  },
  impactRight: {
    flex: 1,
  },
  salaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  impactSalaryValue: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: '#059669',
    marginVertical: 2,
  },
  impactSalarySubtext: {
    fontSize: 10.5,
    color: '#64748B',
  },
  selectedDatePanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    ...theme.shadows.md,
  },
  panelHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 10,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  panelBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#085444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelBadgeDay: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    lineHeight: 16,
  },
  panelBadgeMonth: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#A7F3D0',
    lineHeight: 10,
  },
  panelTextCol: {
    flex: 1,
  },
  panelDateText: {
    fontSize: 12.5,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  panelStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  panelStatusLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  panelStatusValue: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
  },
  statusTextPresent: {
    color: '#16A34A',
  },
  statusTextAbsent: {
    color: '#DC2626',
  },
  statusTextHalfDay: {
    color: '#D97706',
  },
  statusTextLeave: {
    color: '#2563EB',
  },
  editStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  editStatusBtnText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#059669',
  },
  quickButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
  },
  quickBtnPresent: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  quickBtnSelectedPresent: {
    borderColor: '#16A34A',
    borderWidth: 2,
  },
  quickBtnAbsent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  quickBtnSelectedAbsent: {
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  quickBtnHalfDay: {
    backgroundColor: '#FFFDF0',
    borderColor: '#FEF3C7',
  },
  quickBtnSelectedHalfDay: {
    borderColor: '#D97706',
    borderWidth: 2,
  },
  quickBtnLeave: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  quickBtnSelectedLeave: {
    borderColor: '#2563EB',
    borderWidth: 2,
  },
  quickBtnText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
});