import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiClient } from '../services/api-client';
import { borderRadius, colors, fontSizes, fontWeights, spacing } from '../theme';
import type { PublicMedicine } from '../types/models';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { Icon } from './Icon';
import { LoadingIndicator } from './LoadingIndicator';
import { SearchInput } from './SearchInput';

export interface MedicinePickerModalProps {
  visible: boolean;
  initialSelected?: PublicMedicine[];
  onApply: (selectedMedicines: PublicMedicine[]) => void;
  onClose: () => void;
  currentMrId?: string;
  title?: string;
  subtitle?: string;
  testID?: string;
}

export const MedicinePickerModal: React.FC<MedicinePickerModalProps> = ({
  visible,
  initialSelected = [],
  onApply,
  onClose,
  currentMrId,
  title = 'Select Associated Medicines',
  subtitle = 'Choose medicines represented by this MR',
  testID = 'medicine-picker-modal',
}) => {
  // Local state: map of selected medicines (id -> PublicMedicine)
  const [selectedMap, setSelectedMap] = useState<Map<string, PublicMedicine>>(new Map());
  const [search, setSearch] = useState('');
  const [medicines, setMedicines] = useState<PublicMedicine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const prevVisibleRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  // Fetch catalogue medicines
  const loadMedicines = useCallback(async (query: string = '') => {
    try {
      if (query.trim()) {
        setIsSearching(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      const params = new URLSearchParams();
      if (query.trim()) {
        params.append('search', query.trim());
      }

      const response = await apiClient.get<{ medicines: PublicMedicine[] }>(
        `/medicines?${params.toString()}`,
      );

      if (isMountedRef.current) {
        if (response && Array.isArray(response.medicines)) {
          setMedicines(response.medicines);
        } else {
          setMedicines([]);
        }
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to load medicines';
        setErrorMessage(msg);
        setMedicines([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsSearching(false);
      }
    }
  }, []);

  // Sync initial selections and reset search when modal opens
  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      const map = new Map<string, PublicMedicine>();
      initialSelected.forEach((m) => map.set(m.id, m));
      setSelectedMap(map);
      setSearch('');
      loadMedicines('');

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl && activeEl !== document.body && typeof activeEl.blur === 'function') {
          activeEl.blur();
        }
      }
    }
    prevVisibleRef.current = visible;
  }, [visible, initialSelected, loadMedicines]);

  // Debounced search
  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      loadMedicines(text);
    }, 250);
  };

  // Toggle selection
  const handleToggleMedicine = (item: PublicMedicine) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, item);
      }
      return next;
    });
  };

  const handleApply = () => {
    onApply(Array.from(selectedMap.values()));
    onClose();
  };

  const selectedCount = selectedMap.size;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close medicine picker modal"
          testID="medicine-picker-backdrop"
        />

        <View style={styles.sheet} testID="medicine-picker-content">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.headerIconCircle}>
                <Icon name="medicines" size={18} color={colors.primary} />
              </View>
              <View style={styles.headerTextGroup}>
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
              testID="close-medicine-picker-modal-button"
            >
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <SearchInput
              value={search}
              onChangeText={handleSearchChange}
              placeholder="Search medicines by name or salt..."
              testID="medicine-picker-search-input"
              style={styles.searchBar}
            />
          </View>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Icon name="warning" size={16} color={colors.error} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Content Area */}
          {isLoading ? (
            <LoadingIndicator message="Loading medicines..." />
          ) : medicines.length === 0 ? (
            <EmptyState
              icon="💊"
              title={search.trim() ? 'No Medicines Match Search' : 'No Medicines Available'}
              description={
                search.trim()
                  ? `No medicines found matching "${search}". Try searching with a different term.`
                  : 'No active medicines found in the catalogue.'
              }
              actionTitle={search.trim() ? 'Clear Search' : undefined}
              onAction={search.trim() ? () => handleSearchChange('') : undefined}
            />
          ) : (
            <ScrollView
              style={styles.scrollList}
              contentContainerStyle={styles.scrollListContent}
              showsVerticalScrollIndicator={false}
              testID="medicine-picker-list"
            >
              {isSearching ? (
                <View style={styles.searchingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.searchingText}>Searching medicines...</Text>
                </View>
              ) : null}

              {medicines.map((med) => {
                const isSelected = selectedMap.has(med.id);
                const isAssignedToOther = med.mr && (!currentMrId || med.mr.id !== currentMrId);

                return (
                  <TouchableOpacity
                    key={med.id}
                    style={[styles.medicineCard, isSelected && styles.medicineCardSelected]}
                    onPress={() => handleToggleMedicine(med)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`${med.name}, ${isSelected ? 'Selected' : 'Not selected'}`}
                    testID={`medicine-picker-item-${med.id}`}
                    activeOpacity={0.7}
                  >
                    {/* Checkbox Indicator */}
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected ? <Icon name="check" size={13} color="#FFFFFF" /> : null}
                    </View>

                    {/* Medicine Info */}
                    <View style={styles.medicineInfo}>
                      <Text
                        style={[styles.medicineName, isSelected && styles.medicineNameSelected]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {med.name}
                      </Text>

                      <Text style={styles.medicineSubtext} numberOfLines={1} ellipsizeMode="tail">
                        {med.form}
                        {med.composition?.displayText ? ` • ${med.composition.displayText}` : ''}
                        {med.manufacturer?.name ? ` • ${med.manufacturer.name}` : ''}
                      </Text>

                      {/* Conflict Badge */}
                      {isAssignedToOther && !isSelected ? (
                        <View style={styles.conflictBadge}>
                          <Icon name="person" size={11} color="#B45309" />
                          <Text style={styles.conflictBadgeText} numberOfLines={1}>
                            Assigned to {med.mr?.name}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Sticky Bottom Action Bar */}
          <View style={styles.bottomBar}>
            <View style={styles.selectedCountWrapper}>
              <Text style={styles.selectedCountText}>
                {selectedCount} {selectedCount === 1 ? 'medicine' : 'medicines'} selected
              </Text>
            </View>

            <Button
              title="Apply Selection"
              onPress={handleApply}
              style={styles.applyButton}
              testID="medicine-picker-apply-button"
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
    backgroundColor: colors.backdrop,
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    minHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -4px 16px rgba(0,0,0,0.12)',
      } as object,
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextGroup: {
    flex: 1,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  searchContainer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  searchBar: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.lg,
    height: 42,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.base,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: spacing.xs,
  },
  errorBannerText: {
    fontSize: fontSizes.xs,
    color: colors.error,
    fontWeight: fontWeights.medium,
    flex: 1,
  },
  scrollList: {
    flex: 1,
    paddingHorizontal: spacing.base,
  },
  scrollListContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.base,
    gap: 6,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  searchingText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  medicineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  medicineCardSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  medicineNameSelected: {
    color: '#065F46',
  },
  medicineSubtext: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  conflictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginTop: 4,
  },
  conflictBadgeText: {
    fontSize: 10.5,
    fontWeight: fontWeights.medium,
    color: '#92400E',
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  selectedCountWrapper: {
    flex: 1,
  },
  selectedCountText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  applyButton: {
    minWidth: 140,
    height: 42,
  },
});
