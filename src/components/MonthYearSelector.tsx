import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { borderRadius, colors, fontSizes, fontWeights, spacing, theme } from '../theme';
import { Icon } from './Icon';

export const MONTH_NAMES = [
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
] as const;

export const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export interface MonthYearSelectorProps {
  label?: string;
  value?: string | null; // e.g. "YYYY-MM-DD" or "YYYY-MM"
  onChange: (value: string | null) => void;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
  required?: boolean;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  clearable?: boolean;
  testID?: string;
  modalTestID?: string;
}

/**
 * Parses YYYY-MM-DD or YYYY-MM string to { year, month } (1-indexed month)
 */
export function parseMonthYear(dateStr?: string | null): { year: number; month: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length < 2) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return null;
  return { year, month };
}

/**
 * Formats year and 1-indexed month to standard YYYY-MM-01 API format
 */
export function formatMonthYearToApi(year: number, month: number): string {
  const m = String(month).padStart(2, '0');
  return `${year}-${m}-01`;
}

/**
 * Formats year and 1-indexed month to readable display text (e.g. "May 2028")
 */
export function formatMonthYearDisplay(year: number, month: number): string {
  const monthName = SHORT_MONTH_NAMES[month - 1] || 'Month';
  return `${monthName} ${year}`;
}

export const MonthYearSelector: React.FC<MonthYearSelectorProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select Month & Year',
  minYear = 2000,
  maxYear = 2050,
  required = false,
  error,
  helperText,
  disabled = false,
  clearable = true,
  testID,
  modalTestID = 'month-picker-modal',
}) => {
  const parsed = parseMonthYear(value);
  const currentYear = new Date().getFullYear();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(parsed?.year || currentYear);

  const handleOpen = () => {
    if (disabled) return;
    const current = parseMonthYear(value);
    setSelectedYear(current?.year || currentYear);
    setModalVisible(true);
  };

  const handlePrevYear = () => {
    if (selectedYear > minYear) {
      setSelectedYear((prev) => prev - 1);
    }
  };

  const handleNextYear = () => {
    if (selectedYear < maxYear) {
      setSelectedYear((prev) => prev + 1);
    }
  };

  const handleSelectMonth = (monthIndex: number) => {
    const month = monthIndex + 1;
    const apiValue = formatMonthYearToApi(selectedYear, month);
    onChange(apiValue);
    setModalVisible(false);
  };

  const handleClear = () => {
    onChange(null);
    setModalVisible(false);
  };

  const displayString = parsed
    ? formatMonthYearDisplay(parsed.year, parsed.month)
    : null;

  return (
    <View style={styles.container}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required ? <Text style={styles.requiredAsterisk}> *</Text> : null}
        </View>
      ) : null}

      <TouchableOpacity
        style={[
          styles.selectorButton,
          error ? styles.selectorButtonError : null,
          disabled ? styles.selectorButtonDisabled : null,
        ]}
        onPress={handleOpen}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
        testID={testID}
      >
        <View style={styles.selectorLeft}>
          <Icon
            name="calendar"
            size={18}
            color={displayString ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.selectorText,
              !displayString ? styles.selectorPlaceholderText : null,
            ]}
          >
            {displayString || placeholder}
          </Text>
        </View>

        <Icon name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      {error ? (
        <Text style={styles.errorText} testID={testID ? `${testID}-error` : undefined}>
          {error}
        </Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}

      {/* Month-Year Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
        testID={modalTestID}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={styles.modalCard}>
            {/* Header with Year navigation */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={handlePrevYear}
                style={styles.navYearBtn}
                accessibilityRole="button"
                accessibilityLabel="Previous Year"
                testID="year-prev-btn"
              >
                <Icon name="chevron-left" size={18} color="#0F172A" />
              </TouchableOpacity>

              <Text style={styles.modalTitle} testID="selected-year-title">
                {selectedYear}
              </Text>

              <TouchableOpacity
                onPress={handleNextYear}
                style={styles.navYearBtn}
                accessibilityRole="button"
                accessibilityLabel="Next Year"
                testID="year-next-btn"
              >
                <Icon name="chevron-right" size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Month Grid */}
            <View style={styles.monthGrid}>
              {SHORT_MONTH_NAMES.map((name, index) => {
                const monthNum = index + 1;
                const isSelected =
                  parsed?.year === selectedYear && parsed?.month === monthNum;

                return (
                  <TouchableOpacity
                    key={name}
                    style={[
                      styles.monthGridItem,
                      isSelected ? styles.monthGridItemSelected : null,
                    ]}
                    onPress={() => handleSelectMonth(index)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${name} ${selectedYear}`}
                    testID={`month-option-${index}`}
                  >
                    <Text
                      style={[
                        styles.monthGridItemText,
                        isSelected ? styles.monthGridItemTextSelected : null,
                      ]}
                    >
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer Buttons */}
            <View style={styles.modalFooterRow}>
              {clearable ? (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={handleClear}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Clear Date"
                  testID="clear-date-btn"
                >
                  <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.closeBtn, !clearable ? { flex: 1 } : null]}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Close Picker"
              >
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  requiredAsterisk: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.error,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    minHeight: 46,
  },
  selectorButtonError: {
    borderColor: colors.error,
    backgroundColor: '#FEF2F2',
  },
  selectorButtonDisabled: {
    backgroundColor: colors.surfaceMuted,
    opacity: 0.6,
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  selectorText: {
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    fontWeight: fontWeights.medium,
  },
  selectorPlaceholderText: {
    color: colors.textMuted,
    fontWeight: fontWeights.regular,
  },
  errorText: {
    fontSize: fontSizes.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  helperText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navYearBtn: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceMuted,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: spacing.md,
  },
  monthGridItem: {
    width: '30%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  monthGridItemSelected: {
    backgroundColor: colors.primaryLighter,
    borderColor: colors.primary,
  },
  monthGridItemText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  monthGridItemTextSelected: {
    color: colors.primaryDark,
    fontWeight: fontWeights.bold,
  },
  modalFooterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  clearBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  closeBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
});
