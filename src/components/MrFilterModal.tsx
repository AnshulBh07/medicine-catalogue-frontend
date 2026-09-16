import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { borderRadius, colors, fontSizes, fontWeights, spacing, theme } from '../theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { TextInput } from './TextInput';

export type MrContactFilter = 'ALL' | 'HAS_PHONE' | 'HAS_EMAIL';

export interface MrFilters {
  company: string;
  contact: MrContactFilter;
  includeInactive: boolean;
}

export const INITIAL_MR_FILTERS: MrFilters = {
  company: '',
  contact: 'ALL',
  includeInactive: false,
};

export interface MrFilterModalProps {
  visible: boolean;
  filters: MrFilters;
  isAdmin?: boolean;
  availableCompanies?: string[];
  onApply: (filters: MrFilters) => void;
  onReset: () => void;
  onClose: () => void;
}

export const countActiveMrFilters = (filters: MrFilters): number => {
  let count = 0;
  if (filters.company.trim()) count++;
  if (filters.contact !== 'ALL') count++;
  if (filters.includeInactive) count++;
  return count;
};

export const MrFilterModal: React.FC<MrFilterModalProps> = ({
  visible,
  filters,
  isAdmin = false,
  availableCompanies = [],
  onApply,
  onReset,
  onClose,
}) => {
  const [localFilters, setLocalFilters] = useState<MrFilters>(filters);
  const prevVisibleRef = React.useRef(visible);

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      setLocalFilters(filters);

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl && activeEl !== document.body && typeof activeEl.blur === 'function') {
          activeEl.blur();
        }
      }
    }
    prevVisibleRef.current = visible;
  }, [visible, filters]);

  const activeCount = countActiveMrFilters(localFilters);

  const handleReset = () => {
    setLocalFilters(INITIAL_MR_FILTERS);
    onReset();
    onClose();
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="mr-filter-modal"
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close filter modal"
          testID="mr-filter-modal-backdrop"
        />

        <View style={styles.sheet} testID="mr-filter-modal-content">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Icon name="filter" size={20} color={colors.primary} />
              <Text style={styles.title}>Filter Medical Representatives</Text>
              {activeCount > 0 ? (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{activeCount}</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
              testID="close-mr-filter-modal-button"
            >
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* 1. Company Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Company / Manufacturer</Text>
              <TextInput
                placeholder="Filter by company name..."
                value={localFilters.company}
                onChangeText={(text) => setLocalFilters((p) => ({ ...p, company: text }))}
                testID="mr-filter-company-input"
              />

              {availableCompanies.length > 0 ? (
                <View style={styles.companyPillRow}>
                  {availableCompanies.slice(0, 6).map((c) => {
                    const isSelected = localFilters.company.toLowerCase() === c.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[styles.pill, isSelected && styles.pillSelected]}
                        onPress={() =>
                          setLocalFilters((p) => ({
                            ...p,
                            company: isSelected ? '' : c,
                          }))
                        }
                        accessibilityRole="button"
                        testID={`mr-filter-company-pill-${c}`}
                      >
                        <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                          {c}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>

            {/* 2. Contact Information Available */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <View style={styles.segmentedRow}>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    localFilters.contact === 'ALL' && styles.segmentButtonSelected,
                  ]}
                  onPress={() => setLocalFilters((p) => ({ ...p, contact: 'ALL' }))}
                  accessibilityRole="button"
                  testID="mr-filter-contact-all"
                >
                  <Text
                    style={[
                      styles.segmentText,
                      localFilters.contact === 'ALL' && styles.segmentTextSelected,
                    ]}
                  >
                    All MRs
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    localFilters.contact === 'HAS_PHONE' && styles.segmentButtonSelected,
                  ]}
                  onPress={() => setLocalFilters((p) => ({ ...p, contact: 'HAS_PHONE' }))}
                  accessibilityRole="button"
                  testID="mr-filter-contact-phone"
                >
                  <Text
                    style={[
                      styles.segmentText,
                      localFilters.contact === 'HAS_PHONE' && styles.segmentTextSelected,
                    ]}
                  >
                    Has Phone
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    localFilters.contact === 'HAS_EMAIL' && styles.segmentButtonSelected,
                  ]}
                  onPress={() => setLocalFilters((p) => ({ ...p, contact: 'HAS_EMAIL' }))}
                  accessibilityRole="button"
                  testID="mr-filter-contact-email"
                >
                  <Text
                    style={[
                      styles.segmentText,
                      localFilters.contact === 'HAS_EMAIL' && styles.segmentTextSelected,
                    ]}
                  >
                    Has Email
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. Status (Admin Only) */}
            {isAdmin ? (
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Record Status</Text>
                <TouchableOpacity
                  style={[
                    styles.statusToggle,
                    localFilters.includeInactive && styles.statusToggleSelected,
                  ]}
                  onPress={() =>
                    setLocalFilters((p) => ({ ...p, includeInactive: !p.includeInactive }))
                  }
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: localFilters.includeInactive }}
                  testID="mr-filter-include-inactive"
                >
                  <View
                    style={[
                      styles.checkbox,
                      localFilters.includeInactive && styles.checkboxSelected,
                    ]}
                  >
                    {localFilters.includeInactive ? (
                      <Icon name="check" size={14} color="#FFFFFF" />
                    ) : null}
                  </View>
                  <View style={styles.statusTextContainer}>
                    <Text style={styles.statusLabel}>Include Inactive / Archived MRs</Text>
                    <Text style={styles.statusSublabel}>
                      Show deactivated representatives in catalogue
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Button
              title="Reset All"
              variant="outline"
              size="md"
              onPress={handleReset}
              style={styles.footerButton}
              testID="reset-mr-filters-button"
            />
            <Button
              title={`Apply Filters${activeCount > 0 ? ` (${activeCount})` : ''}`}
              variant="primary"
              size="md"
              onPress={handleApply}
              style={styles.footerButton}
              testID="apply-mr-filters-button"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    width: '100%',
    ...theme.shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  filterSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  companyPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textPrimary,
  },
  pillTextSelected: {
    color: colors.primary,
    fontWeight: fontWeights.bold,
  },
  segmentedRow: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    backgroundColor: '#F1F5F9',
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  segmentButtonSelected: {
    backgroundColor: '#FFFFFF',
    ...theme.shadows.sm,
  },
  segmentText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  segmentTextSelected: {
    color: colors.primary,
    fontWeight: fontWeights.bold,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusToggleSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: colors.primary,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textPrimary,
  },
  statusSublabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerButton: {
    flex: 1,
  },
});
