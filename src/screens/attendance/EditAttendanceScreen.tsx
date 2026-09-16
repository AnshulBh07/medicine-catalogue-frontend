import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppScreen,
  Card,
  ErrorState,
  Icon,
} from '../../components';
import { useAuth } from '../../features/auth';
import { attendanceService } from '../../services/attendanceService';
import { colors, fontSizes, fontWeights, theme } from '../../theme';
import type { AttendanceStatus } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EditAttendanceRouteProp = RouteProp<RootStackParamList, 'EditAttendance'>;

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

const DAY_FULL_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const EditAttendanceScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditAttendanceRouteProp>();
  const { isAdmin } = useAuth();

  const {
    userId,
    date,
    userName,
    monthlySalary,
    initialStatus = 'PRESENT',
    initialNotes = '',
  } = route.params;

  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>(initialStatus);
  const [notes, setNotes] = useState<string>(initialNotes ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <AppScreen
        headerProps={{
          title: 'Edit Attendance',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <ErrorState
          title="Access Restricted"
          message="Editing attendance records is restricted to ADMIN accounts."
        />
      </AppScreen>
    );
  }

  // Parse Date Info
  const [dYear, dMonth, dDay] = date.split('-').map(Number);
  const dateObj = new Date(Date.UTC(dYear, dMonth - 1, dDay));
  const dayName = DAY_FULL_NAMES[dateObj.getUTCDay()];
  const monthName = MONTH_NAMES[dMonth - 1];
  const formattedDateTitle = `${dayName}, ${dDay} ${monthName} ${dYear}`;

  const userInitials = userName.trim()
    ? userName
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'EM';

  // Status Payable Values for Impact Calculation
  const getPayableMultiplier = (status: AttendanceStatus): number => {
    switch (status) {
      case 'PRESENT':
        return 1.0;
      case 'HALF_DAY':
        return 0.5;
      case 'ABSENT':
      case 'LEAVE':
      default:
        return 0.0;
    }
  };

  const prevMultiplier = getPayableMultiplier(initialStatus);
  const nextMultiplier = getPayableMultiplier(selectedStatus);
  const payableDiff = nextMultiplier - prevMultiplier;

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (selectedStatus === 'PRESENT') {
        // PRESENT is default - reset/delete any exception record
        await attendanceService.resetAttendance(userId, date);
      } else {
        // Save exception record
        await attendanceService.createOrUpdateAttendance({
          userId,
          date,
          status: selectedStatus,
          notes: notes.trim() ? notes.trim() : null,
        });
      }

      navigation.goBack();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save attendance changes';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <AppScreen
      headerProps={{
        title: 'Edit Attendance',
        subtitle: `${userName} • ${dDay} ${monthName} ${dYear}`,
        showBack: true,
        onBack: () => navigation.goBack(),
      }}
      contentContainerStyle={styles.screenContent}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View style={styles.errorBanner} testID="edit-attendance-error-banner">
              <Icon name="warning" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Top Employee Info Card */}
          <Card style={styles.employeeCard} testID="edit-attendance-employee-card">
            <View style={styles.employeeLeft}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{userInitials}</Text>
              </View>
              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName} numberOfLines={1}>
                  {userName}
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

          {/* Date Banner */}
          <View style={styles.dateBanner}>
            <View style={styles.dateIconCircle}>
              <Icon name="calendar" size={16} color="#059669" />
            </View>
            <View style={styles.dateBannerTextCol}>
              <Text style={styles.dateBannerTitle}>
                Editing for {formattedDateTitle}
              </Text>
              <Text style={styles.dateBannerSub}>
                Select the attendance status for this date
              </Text>
            </View>
          </View>

          {/* 2x2 Status Selection Grid */}
          <Text style={styles.sectionHeading}>Attendance Status</Text>
          <View style={styles.statusGrid}>
            {/* Present */}
            <TouchableOpacity
              style={[
                styles.statusOptionCard,
                styles.statusOptionPresent,
                selectedStatus === 'PRESENT' ? styles.statusOptionSelectedPresent : null,
              ]}
              onPress={() => setSelectedStatus('PRESENT')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Select Present status"
              testID="status-option-present"
            >
              <View style={styles.statusOptionHeader}>
                <View style={[styles.statusIconCircle, { backgroundColor: '#DCFCE7' }]}>
                  <Icon name="check" size={18} color="#16A34A" />
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    selectedStatus === 'PRESENT' ? styles.radioSelectedPresent : null,
                  ]}
                >
                  {selectedStatus === 'PRESENT' ? <View style={styles.radioInnerDotPresent} /> : null}
                </View>
              </View>

              <Text style={styles.statusOptionTitle}>Present</Text>
              <Text style={styles.statusOptionSub}>Full working day • 1.0 day payable</Text>
            </TouchableOpacity>

            {/* Absent */}
            <TouchableOpacity
              style={[
                styles.statusOptionCard,
                styles.statusOptionAbsent,
                selectedStatus === 'ABSENT' ? styles.statusOptionSelectedAbsent : null,
              ]}
              onPress={() => setSelectedStatus('ABSENT')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Select Absent status"
              testID="status-option-absent"
            >
              <View style={styles.statusOptionHeader}>
                <View style={[styles.statusIconCircle, { backgroundColor: '#FEE2E2' }]}>
                  <Icon name="warning" size={18} color="#DC2626" />
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    selectedStatus === 'ABSENT' ? styles.radioSelectedAbsent : null,
                  ]}
                >
                  {selectedStatus === 'ABSENT' ? <View style={styles.radioInnerDotAbsent} /> : null}
                </View>
              </View>

              <Text style={styles.statusOptionTitle}>Absent</Text>
              <Text style={styles.statusOptionSub}>No attendance • 0.0 day payable</Text>
            </TouchableOpacity>

            {/* Half Day */}
            <TouchableOpacity
              style={[
                styles.statusOptionCard,
                styles.statusOptionHalfDay,
                selectedStatus === 'HALF_DAY' ? styles.statusOptionSelectedHalfDay : null,
              ]}
              onPress={() => setSelectedStatus('HALF_DAY')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Select Half Day status"
              testID="status-option-halfday"
            >
              <View style={styles.statusOptionHeader}>
                <View style={[styles.statusIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Icon name="time" size={18} color="#D97706" />
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    selectedStatus === 'HALF_DAY' ? styles.radioSelectedHalfDay : null,
                  ]}
                >
                  {selectedStatus === 'HALF_DAY' ? <View style={styles.radioInnerDotHalfDay} /> : null}
                </View>
              </View>

              <Text style={styles.statusOptionTitle}>Half Day</Text>
              <Text style={styles.statusOptionSub}>Half shift • 0.5 day payable</Text>
            </TouchableOpacity>

            {/* Leave */}
            <TouchableOpacity
              style={[
                styles.statusOptionCard,
                styles.statusOptionLeave,
                selectedStatus === 'LEAVE' ? styles.statusOptionSelectedLeave : null,
              ]}
              onPress={() => setSelectedStatus('LEAVE')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Select Leave status"
              testID="status-option-leave"
            >
              <View style={styles.statusOptionHeader}>
                <View style={[styles.statusIconCircle, { backgroundColor: '#DBEAFE' }]}>
                  <Icon name="tag" size={18} color="#2563EB" />
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    selectedStatus === 'LEAVE' ? styles.radioSelectedLeave : null,
                  ]}
                >
                  {selectedStatus === 'LEAVE' ? <View style={styles.radioInnerDotLeave} /> : null}
                </View>
              </View>

              <Text style={styles.statusOptionTitle}>Leave</Text>
              <Text style={styles.statusOptionSub}>Approved leave • 0.0 day payable</Text>
            </TouchableOpacity>
          </View>

          {/* Optional Notes Section */}
          <Text style={styles.sectionHeading}>Reason / Notes (Optional)</Text>
          <Card style={styles.notesCard} testID="edit-attendance-notes-card">
            <NativeTextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={(text) => {
                if (text.length <= 255) {
                  setNotes(text);
                }
              }}
              placeholder="e.g., Doctor appointment in the afternoon, approved personal leave, etc."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              testID="edit-attendance-notes-input"
            />
            <View style={styles.notesFooter}>
              <Text style={styles.charCount}>{notes.length} / 255</Text>
            </View>
          </Card>

          {/* Impact on Monthly Summary Card */}
          <Card style={styles.impactCard} testID="edit-attendance-impact-card">
            <Text style={styles.impactHeading}>Impact on Monthly Summary</Text>
            <View style={styles.impactRow}>
              <View style={styles.impactCol}>
                <Text style={styles.impactLabel}>Payable Day Impact</Text>
                <Text
                  style={[
                    styles.impactValue,
                    payableDiff > 0
                      ? styles.impactPositive
                      : payableDiff < 0
                        ? styles.impactNegative
                        : styles.impactNeutral,
                  ]}
                >
                  {payableDiff > 0 ? `+${payableDiff} Days` : payableDiff < 0 ? `${payableDiff} Days` : 'No Change'}
                </Text>
              </View>

              <View style={styles.impactCol}>
                <Text style={styles.impactLabel}>Status Transition</Text>
                <Text style={styles.impactStatusChange}>
                  {initialStatus} → {selectedStatus}
                </Text>
              </View>
            </View>
            <Text style={styles.impactSubtext}>
              Changes take effect immediately on monthly payroll calculations.
            </Text>
          </Card>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.saveButton, isSubmitting ? styles.saveButtonDisabled : null]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Save Changes"
              testID="edit-attendance-save-btn"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="check" size={18} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              testID="edit-attendance-cancel-btn"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#DC2626',
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
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
  dateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  dateIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBannerTextCol: {
    flex: 1,
  },
  dateBannerTitle: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#065F46',
  },
  dateBannerSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
  sectionHeading: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    marginBottom: 8,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  statusOptionCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  statusOptionPresent: {},
  statusOptionSelectedPresent: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  statusOptionAbsent: {},
  statusOptionSelectedAbsent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  statusOptionHalfDay: {},
  statusOptionSelectedHalfDay: {
    backgroundColor: '#FFFDF0',
    borderColor: '#D97706',
  },
  statusOptionLeave: {},
  statusOptionSelectedLeave: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  statusOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelectedPresent: {
    borderColor: '#059669',
  },
  radioInnerDotPresent: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#059669',
  },
  radioSelectedAbsent: {
    borderColor: '#DC2626',
  },
  radioInnerDotAbsent: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
  },
  radioSelectedHalfDay: {
    borderColor: '#D97706',
  },
  radioInnerDotHalfDay: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D97706',
  },
  radioSelectedLeave: {
    borderColor: '#2563EB',
  },
  radioInnerDotLeave: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  statusOptionTitle: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    marginBottom: 2,
  },
  statusOptionSub: {
    fontSize: 10.5,
    color: '#64748B',
    lineHeight: 14,
  },
  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  notesInput: {
    fontSize: fontSizes.sm,
    color: '#0F172A',
    minHeight: 64,
  },
  notesFooter: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  charCount: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  impactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  impactHeading: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    marginBottom: 10,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  impactCol: {
    flex: 1,
  },
  impactLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  impactValue: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
  },
  impactPositive: {
    color: '#059669',
  },
  impactNegative: {
    color: '#DC2626',
  },
  impactNeutral: {
    color: '#475569',
  },
  impactStatusChange: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  impactSubtext: {
    fontSize: 10.5,
    color: '#64748B',
  },
  actionsContainer: {
    gap: 10,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    ...theme.shadows.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  cancelButtonText: {
    color: '#475569',
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
});