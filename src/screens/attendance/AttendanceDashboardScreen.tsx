import React, { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppScreen,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  LoadingIndicator,
  SectionHeader,
} from '../../components';
import { useAuth } from '../../features/auth';
import { attendanceService } from '../../services/attendanceService';
import { colors, fontSizes, fontWeights, theme } from '../../theme';
import type { AttendanceDashboardSummary } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

const PASTEL_AVATARS: Array<{ bg: string; text: string }> = [
  { bg: '#EDE9FE', text: '#7C3AED' },
  { bg: '#FCE7F3', text: '#DB2777' },
  { bg: '#FEF3C7', text: '#D97706' },
  { bg: '#DCFCE7', text: '#15803D', },
  { bg: '#E0F2FE', text: '#0284C7' },
  { bg: '#CCFBF1', text: '#0D9488' },
];

export const AttendanceDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isAdmin } = useAuth();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  const [summary, setSummary] = useState<AttendanceDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Month Selector Modal
  const [showMonthModal, setShowMonthModal] = useState(false);

  const fetchSummary = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      const data = await attendanceService.getAttendanceSummary(selectedYear, selectedMonth);
      setSummary(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load attendance dashboard';
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedYear, selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) {
        fetchSummary();
      }
    }, [fetchSummary, isAdmin]),
  );

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleSelectMonth = (mIndex: number) => {
    setSelectedMonth(mIndex + 1);
    setShowMonthModal(false);
  };

  if (!isAdmin) {
    return (
      <AppScreen
        headerProps={{
          title: 'Attendance Dashboard',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <ErrorState
          title="Access Restricted"
          message="Attendance and salary records are strictly restricted to ADMIN accounts."
        />
      </AppScreen>
    );
  }

  const monthLabel = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
  const totalEmployeesCount = summary?.totalEmployees ?? 0;
  const todayPresent = summary?.today.present ?? 0;
  const todayAbsent = summary?.today.absent ?? 0;
  const todayHalfDay = summary?.today.halfDay ?? 0;
  const todayLeave = summary?.today.leave ?? 0;
  const todayLate = summary?.today.late ?? 0;

  const todayPresentPct = totalEmployeesCount > 0 ? ((todayPresent / totalEmployeesCount) * 100).toFixed(1) : '0';
  const todayAbsentPct = totalEmployeesCount > 0 ? ((todayAbsent / totalEmployeesCount) * 100).toFixed(1) : '0';
  const todayHalfDayPct = totalEmployeesCount > 0 ? ((todayHalfDay / totalEmployeesCount) * 100).toFixed(1) : '0';
  const todayLeavePct = totalEmployeesCount > 0 ? ((todayLeave / totalEmployeesCount) * 100).toFixed(1) : '0';

  const overallPresentDays = summary?.overall.presentDays ?? 0;
  const overallAbsentDays = summary?.overall.absentDays ?? 0;
  const overallHalfDays = summary?.overall.halfDays ?? 0;
  const overallLeaveDays = summary?.overall.leaveDays ?? 0;
  const overallWorkingDays = summary?.overall.totalWorkingDays ?? 0;
  const overallAttendancePct = summary?.overall.attendancePercentage ?? 0;

  const totalPayroll = summary?.overall.totalEstimatedPayroll ?? 0;
  const paidDays = summary?.overall.payableDays ?? 0;
  const payablePct = summary?.overall.payablePercentage ?? 0;

  const employees = summary?.employees ?? [];

  return (
    <AppScreen
      scrollable={false}
      headerProps={{
        title: 'Attendance Dashboard',
        subtitle: 'Overview of staff attendance & payroll',
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
            onRefresh={() => fetchSummary(true)}
            colors={[colors.primary]}
          />
        }
      >
        {/* Month Selector & Filter Row */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.monthSelectorButton}
            onPress={() => setShowMonthModal(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Select Month, current is ${monthLabel}`}
            testID="attendance-month-selector"
          >
            <Icon name="calendar" size={16} color={colors.primary} />
            <Text style={styles.monthSelectorText}>{monthLabel}</Text>
            <Icon name="chevron-down" size={14} color="#64748B" />
          </TouchableOpacity>

          <View style={styles.employeesFilterBadge}>
            <Icon name="users" size={15} color={colors.primary} />
            <Text style={styles.employeesFilterText}>All Employees</Text>
          </View>
        </View>

        {isLoading && !isRefreshing ? (
          <LoadingIndicator message="Calculating monthly attendance..." />
        ) : error ? (
          <ErrorState
            title="Failed to Load Summary"
            message={error}
            onRetry={() => fetchSummary()}
          />
        ) : (
          <>
            {/* Top 6 Stat Cards Grid */}
            <View style={styles.statsGrid}>
              {/* Card 1: Total Employees */}
              <View style={styles.statCard}>
                <View style={[styles.statIconCircle, { backgroundColor: '#D1FAE5' }]}>
                  <Icon name="users" size={18} color="#059669" />
                </View>
                <Text style={styles.statCount}>{totalEmployeesCount}</Text>
                <Text style={styles.statLabel}>Total Employees</Text>
                <Text style={styles.statSubText}>All Active Staff</Text>
              </View>

              {/* Card 2: Present Today */}
              <View style={styles.statCard}>
                <View style={[styles.statIconCircle, { backgroundColor: '#DCFCE7' }]}>
                  <Icon name="check" size={18} color="#16A34A" />
                </View>
                <Text style={styles.statCount}>{todayPresent}</Text>
                <Text style={styles.statLabel}>Present Today</Text>
                <Text style={styles.statSubText}>{todayPresentPct}%</Text>
              </View>

              {/* Card 3: Absent Today */}
              <View style={styles.statCard}>
                <View style={[styles.statIconCircle, { backgroundColor: '#FEE2E2' }]}>
                  <Icon name="warning" size={18} color="#DC2626" />
                </View>
                <Text style={styles.statCount}>{todayAbsent}</Text>
                <Text style={styles.statLabel}>Absent Today</Text>
                <Text style={styles.statSubText}>{todayAbsentPct}%</Text>
              </View>

              {/* Card 4: Half Day */}
              <View style={styles.statCard}>
                <View style={[styles.statIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Icon name="time" size={18} color="#D97706" />
                </View>
                <Text style={styles.statCount}>{todayHalfDay}</Text>
                <Text style={styles.statLabel}>Half Day</Text>
                <Text style={styles.statSubText}>{todayHalfDayPct}%</Text>
              </View>

              {/* Card 5: On Leave */}
              <View style={styles.statCard}>
                <View style={[styles.statIconCircle, { backgroundColor: '#DBEAFE' }]}>
                  <Icon name="tag" size={18} color="#2563EB" />
                </View>
                <Text style={styles.statCount}>{todayLeave}</Text>
                <Text style={styles.statLabel}>On Leave</Text>
                <Text style={styles.statSubText}>{todayLeavePct}%</Text>
              </View>

              {/* Card 6: Late */}
              <View style={styles.statCard}>
                <View style={[styles.statIconCircle, { backgroundColor: '#F3E8FF' }]}>
                  <Icon name="time" size={18} color="#7C3AED" />
                </View>
                <Text style={styles.statCount}>{todayLate}</Text>
                <Text style={styles.statLabel}>Late</Text>
                <Text style={styles.statSubText}>0%</Text>
              </View>
            </View>

            {/* Overall Attendance Card */}
            <Card style={styles.overallCard} testID="dashboard-overall-card">
              <Text style={styles.overallHeading}>Overall Attendance</Text>
              <View style={styles.overallBody}>
                {/* Left Progress Ring / Donut graphic */}
                <View style={styles.donutContainer}>
                  <View style={styles.donutOuter}>
                    <View style={styles.donutInner}>
                      <Text style={styles.donutPercentage}>{overallAttendancePct}%</Text>
                      <Text style={styles.donutSubtitle}>This Month</Text>
                    </View>
                  </View>
                </View>

                {/* Right Breakdown stats */}
                <View style={styles.breakdownCol}>
                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownLabelGroup}>
                      <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                      <Text style={styles.breakdownLabel}>Present Days</Text>
                    </View>
                    <Text style={styles.breakdownValue}>{overallPresentDays}</Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownLabelGroup}>
                      <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
                      <Text style={styles.breakdownLabel}>Absent Days</Text>
                    </View>
                    <Text style={styles.breakdownValue}>{overallAbsentDays}</Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownLabelGroup}>
                      <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
                      <Text style={styles.breakdownLabel}>Half Days</Text>
                    </View>
                    <Text style={styles.breakdownValue}>{overallHalfDays}</Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownLabelGroup}>
                      <View style={[styles.statusDot, { backgroundColor: '#3B82F6' }]} />
                      <Text style={styles.breakdownLabel}>Leave Days</Text>
                    </View>
                    <Text style={styles.breakdownValue}>{overallLeaveDays}</Text>
                  </View>

                  <View style={styles.breakdownDivider} />

                  <View style={styles.breakdownRow}>
                    <Text style={styles.totalWorkingLabel}>Total Working Days</Text>
                    <Text style={styles.totalWorkingValue}>{overallWorkingDays}</Text>
                  </View>
                </View>
              </View>
            </Card>

            {/* Estimated Payroll Card */}
            <Card style={styles.payrollCard} testID="dashboard-payroll-card">
              <View style={styles.payrollLeft}>
                <View style={styles.payrollTitleRow}>
                  <View style={styles.walletIconBox}>
                    <Icon name="commercial" size={16} color="#059669" />
                  </View>
                  <Text style={styles.payrollHeading}>Estimated Payroll</Text>
                  <Icon name="shield" size={13} color="#94A3B8" />
                </View>

                <Text style={styles.payrollAmount}>
                  ₹{totalPayroll.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.payrollSubtext}>For {monthLabel}</Text>
              </View>

              <View style={styles.payrollDivider} />

              <View style={styles.payrollRight}>
                <Text style={styles.paidDaysLabel}>Paid Days</Text>
                <Text style={styles.paidDaysValue}>
                  {paidDays} / {overallWorkingDays}
                </Text>

                <Text style={styles.payablePctLabel}>Payable Percentage</Text>
                <Text style={styles.payablePctValue}>{payablePct}%</Text>
              </View>
            </Card>

            {/* Employee Attendance List Section */}
            <SectionHeader
              title="Employee Attendance"
              actionTitle={`${employees.length} Staff`}
              style={styles.sectionHeader}
            />

            {employees.length === 0 ? (
              <EmptyState
                icon="users"
                title="No Active Employees"
                description="Create employee accounts in User Administration to start recording monthly attendance."
              />
            ) : (
              <View style={styles.employeeListContainer}>
                {employees.map((emp, index) => {
                  const avatarColor = PASTEL_AVATARS[index % PASTEL_AVATARS.length];
                  const initials = emp.name.trim()
                    ? emp.name
                        .trim()
                        .split(' ')
                        .filter(Boolean)
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    : 'EM';

                  return (
                    <TouchableOpacity
                      key={emp.id}
                      style={styles.employeeCard}
                      onPress={() =>
                        navigation.navigate('AttendanceCalendar', {
                          userId: emp.id,
                          year: selectedYear,
                          month: selectedMonth,
                        })
                      }
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`View attendance for ${emp.name}`}
                      testID={`employee-card-${emp.id}`}
                    >
                      {/* Avatar */}
                      <View
                        style={[styles.employeeAvatar, { backgroundColor: avatarColor.bg }]}
                      >
                        <Text
                          style={[styles.employeeAvatarText, { color: avatarColor.text }]}
                        >
                          {initials}
                        </Text>
                      </View>

                      {/* Info & Progress */}
                      <View style={styles.employeeBody}>
                        <View style={styles.employeeNameRow}>
                          <Text style={styles.employeeName} numberOfLines={1}>
                            {emp.name}
                          </Text>
                          <Text style={styles.employeeAttendancePct}>
                            {emp.attendancePercentage}%
                          </Text>
                        </View>

                        <Text style={styles.employeeRole}>Staff Employee</Text>

                        {/* Visual Progress Bar */}
                        <View style={styles.progressBarBg}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { width: `${Math.min(100, emp.attendancePercentage)}%` },
                            ]}
                          />
                        </View>
                      </View>

                      {/* Salary & Chevron */}
                      <View style={styles.employeeRight}>
                        <Text style={styles.employeeSalary}>
                          ₹{emp.estimatedSalary.toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.employeePayableLabel}>Payable</Text>
                      </View>

                      <Icon name="chevron-right" size={14} color="#94A3B8" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Month Selection Modal */}
      <Modal
        visible={showMonthModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthModal(false)}
        testID="month-picker-modal"
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowMonthModal(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navMonthBtn}>
                <Icon name="chevron-left" size={18} color="#0F172A" />
              </TouchableOpacity>

              <Text style={styles.modalTitle}>{selectedYear}</Text>

              <TouchableOpacity onPress={handleNextMonth} style={styles.navMonthBtn}>
                <Icon name="chevron-right" size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <View style={styles.monthGrid}>
              {MONTH_NAMES.map((name, index) => {
                const isSelected = selectedMonth === index + 1;
                return (
                  <TouchableOpacity
                    key={name}
                    style={[
                      styles.monthGridItem,
                      isSelected ? styles.monthGridItemSelected : null,
                    ]}
                    onPress={() => handleSelectMonth(index)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.monthGridItemText,
                        isSelected ? styles.monthGridItemTextSelected : null,
                      ]}
                    >
                      {name.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowMonthModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 36,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  monthSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    flex: 1,
    ...theme.shadows.sm,
  },
  monthSelectorText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    flex: 1,
  },
  employeesFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    ...theme.shadows.sm,
  },
  employeesFilterText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: '#0F172A',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  statCard: {
    width: '31.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statCount: {
    fontSize: 20,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: '#334155',
    marginTop: 2,
  },
  statSubText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  overallCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  overallHeading: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    marginBottom: 12,
  },
  overallBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  donutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 9,
    borderColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
  },
  donutInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutPercentage: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  donutSubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  breakdownCol: {
    flex: 1,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontSize: fontSizes.xs,
    color: '#475569',
    fontWeight: fontWeights.medium,
  },
  breakdownValue: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  totalWorkingLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  totalWorkingValue: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  payrollCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  payrollLeft: {
    flex: 1.2,
  },
  payrollTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  walletIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payrollHeading: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: '#065F46',
  },
  payrollAmount: {
    fontSize: 22,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    letterSpacing: -0.5,
    marginVertical: 2,
  },
  payrollSubtext: {
    fontSize: 11,
    color: '#64748B',
  },
  payrollDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#CBD5E1',
    marginHorizontal: 12,
  },
  payrollRight: {
    flex: 1,
  },
  paidDaysLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  paidDaysValue: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#065F46',
    marginBottom: 6,
  },
  payablePctLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  payablePctValue: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#059669',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  employeeListContainer: {
    gap: 10,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    ...theme.shadows.sm,
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeAvatarText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
  },
  employeeBody: {
    flex: 1,
  },
  employeeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  employeeName: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
  },
  employeeAttendancePct: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: '#059669',
  },
  employeeRole: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 6,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 2,
  },
  employeeRight: {
    alignItems: 'flex-end',
  },
  employeeSalary: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  employeePayableLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    ...theme.shadows.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navMonthBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  monthGridItem: {
    width: '30%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthGridItemSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: colors.primary,
  },
  monthGridItemText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: '#475569',
  },
  monthGridItemTextSelected: {
    color: colors.primary,
    fontWeight: fontWeights.bold,
  },
  modalCloseBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
});
