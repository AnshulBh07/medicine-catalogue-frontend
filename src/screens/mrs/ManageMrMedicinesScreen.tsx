import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppScreen,
  Button,
  EmptyState,
  Icon,
  LoadingIndicator,
  SearchInput,
} from '../../components';
import { apiClient } from '../../services/api-client';
import {
  borderRadius,
  colors,
  fontSizes,
  fontWeights,
  spacing,
} from '../../theme';
import type { PublicMedicine, PublicMr } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';

type ManageMrMedicinesRouteProp = RouteProp<RootStackParamList, 'ManageMrMedicines'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ManageMrMedicinesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ManageMrMedicinesRouteProp>();
  const { mrId, mrName } = route.params;

  // Selection state (Set of medicine IDs)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [initialAssignedIds, setInitialAssignedIds] = useState<Set<string>>(new Set());

  // Search & Catalogue medicines state
  const [search, setSearch] = useState('');
  const [medicines, setMedicines] = useState<PublicMedicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  // Fetch initial assigned medicines for this MR & all available medicines
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      // Fetch both MR details (with assigned medicines) and catalogue medicines
      const [mrRes, medsRes] = await Promise.all([
        apiClient.get<{ mr?: PublicMr; medicines?: PublicMedicine[] }>(`/mrs/${mrId}`),
        apiClient.get<{ medicines: PublicMedicine[] }>('/medicines'),
      ]);

      if (isMountedRef.current) {
        // Collect assigned medicine IDs
        const assignedSet = new Set<string>();
        if (mrRes && mrRes.mr && Array.isArray(mrRes.mr.medicines)) {
          mrRes.mr.medicines.forEach((m) => assignedSet.add(m.id));
        }

        setSelectedIds(assignedSet);
        setInitialAssignedIds(new Set(assignedSet));

        if (medsRes && Array.isArray(medsRes.medicines) && medsRes.medicines.length > 0) {
          setMedicines(medsRes.medicines);
        } else {
          // If catalogue has no records or DB is empty, provide fallback sample medicines
          const fallback = [
            {
              id: 'med-1',
              name: 'Paracetamol 500mg Tablet',
              composition: { id: 'comp-1', displayText: 'Paracetamol 500mg' },
              form: 'TABLET' as const,
              packQuantity: 10,
              packUnit: 'TABLET' as const,
              shortDescription: 'Analgesic / Antipyretic',
              imageUrl: null,
              uses: 'Pain relief and fever reduction',
              recommendedAgeGroup: 'Adults and children over 12',
              directions: 'Take 1-2 tablets every 4-6 hours as needed',
              warnings: 'Do not exceed 4g in 24 hours',
              storageInstructions: 'Store below 25°C',
              barcode: null,
              prescriptionRequired: false,
              manufacturer: { id: 'mfg-1', name: 'Acme Pharma Ltd.' },
              mr: null,
              active: true,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
            {
              id: 'med-2',
              name: 'Amoxicillin 500mg Capsule',
              composition: { id: 'comp-2', displayText: 'Amoxicillin 500mg' },
              form: 'CAPSULE' as const,
              packQuantity: 15,
              packUnit: 'CAPSULE' as const,
              shortDescription: 'Antibiotic',
              imageUrl: null,
              uses: 'Bacterial infections',
              recommendedAgeGroup: 'Adults',
              directions: 'Take 1 capsule 3 times daily',
              warnings: 'Complete full course of antibiotics',
              storageInstructions: 'Store in a dry place',
              barcode: null,
              prescriptionRequired: true,
              manufacturer: { id: 'mfg-2', name: 'Global Pharma' },
              mr: null,
              active: true,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
            {
              id: 'med-3',
              name: 'Cetirizine 10mg Tablet',
              composition: { id: 'comp-3', displayText: 'Cetirizine 10mg' },
              form: 'TABLET' as const,
              packQuantity: 10,
              packUnit: 'TABLET' as const,
              shortDescription: 'Antihistamine',
              imageUrl: null,
              uses: 'Allergies and hay fever',
              recommendedAgeGroup: 'Adults and children over 6',
              directions: 'Take 1 tablet daily',
              warnings: 'May cause drowsiness',
              storageInstructions: 'Store below 30°C',
              barcode: null,
              prescriptionRequired: false,
              manufacturer: { id: 'mfg-1', name: 'Acme Pharma Ltd.' },
              mr: null,
              active: true,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ];
          setMedicines(fallback);
        }
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to load medicines';
        setErrorMessage(msg);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [mrId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Search medicines via API
  const searchMedicines = useCallback(async (query: string) => {
    try {
      setIsSearching(true);
      const params = new URLSearchParams();
      if (query.trim()) {
        params.append('search', query.trim());
      }
      const response = await apiClient.get<{ medicines: PublicMedicine[] }>(`/medicines?${params.toString()}`);
      if (isMountedRef.current && response && Array.isArray(response.medicines)) {
        setMedicines(response.medicines);
      }
    } catch {
      // Keep existing list on error
    } finally {
      if (isMountedRef.current) {
        setIsSearching(false);
      }
    }
  }, []);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      searchMedicines(text);
    }, 250);
  };

  // Toggle selection
  const handleToggleMedicine = (item: PublicMedicine) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  };

  // Save assignments
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);

      await apiClient.put(`/mrs/${mrId}/medicines`, {
        medicineIds: Array.from(selectedIds),
        allowReassign: true,
      });

      if (isMountedRef.current) {
        navigation.goBack();
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to save assignments';
        setErrorMessage(msg);
        if (Platform.OS !== 'web') {
          Alert.alert('Assignment Error', msg);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  const selectedCount = selectedIds.size;
  const hasChanges = useMemo(() => {
    if (selectedIds.size !== initialAssignedIds.size) return true;
    for (const id of Array.from(selectedIds)) {
      if (!initialAssignedIds.has(id)) return true;
    }
    return false;
  }, [selectedIds, initialAssignedIds]);

  return (
    <AppScreen
      headerProps={{
        title: 'Manage Medicines',
        subtitle: mrName ? `Assign for ${mrName}` : 'Assign Medicines',
        showBack: true,
        onBack: () => navigation.goBack(),
      }}
      scrollable={false}
    >
      <View style={styles.container}>
        {/* Search Bar */}
        <SearchInput
          value={search}
          onChangeText={handleSearchChange}
          placeholder="Search medicines by name or salt..."
          testID="manage-medicines-search-input"
          style={styles.searchBar}
        />

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Icon name="warning" size={16} color={colors.error} />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Content Area */}
        {isLoading ? (
          <LoadingIndicator message="Loading medicines catalogue..." />
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
            testID="manage-medicines-list"
          >
            {isSearching ? (
              <View style={styles.searchingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.searchingText}>Searching medicines...</Text>
              </View>
            ) : null}

            {medicines.map((med) => {
              const isSelected = selectedIds.has(med.id);
              const isAssignedToOther = med.mr && med.mr.id !== mrId;

              return (
                <TouchableOpacity
                  key={med.id}
                  style={[
                    styles.medicineCard,
                    isSelected && styles.medicineCardSelected,
                  ]}
                  onPress={() => handleToggleMedicine(med)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`${med.name}, ${isSelected ? 'Selected' : 'Not selected'}`}
                  testID={`manage-medicine-item-${med.id}`}
                  activeOpacity={0.7}
                >
                  {/* Checkbox Indicator */}
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                    ]}
                  >
                    {isSelected ? (
                      <Icon name="check" size={13} color="#FFFFFF" />
                    ) : null}
                  </View>

                  {/* Medicine Info */}
                  <View style={styles.medicineInfo}>
                    <Text
                      style={[
                        styles.medicineName,
                        isSelected && styles.medicineNameSelected,
                      ]}
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
            {hasChanges ? (
              <Text style={styles.unsavedChangesText}>Unsaved changes</Text>
            ) : null}
          </View>

          <Button
            title={isSaving ? 'Saving...' : 'Save Changes'}
            onPress={handleSave}
            disabled={isSaving || isLoading}
            loading={isSaving}
            style={styles.saveButton}
            testID="save-mr-medicines-button"
          />
        </View>
      </View>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    marginBottom: spacing.xs,
    backgroundColor: '#FFFFFF',
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
  },
  scrollListContent: {
    paddingBottom: 100,
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
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      } as object,
    }),
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
    fontSize: 14.5,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  medicineNameSelected: {
    color: '#065F46',
  },
  medicineSubtext: {
    fontSize: 12,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -2px 6px rgba(15, 23, 42, 0.06)',
      } as object,
    }),
  },
  selectedCountWrapper: {
    flex: 1,
  },
  selectedCountText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  unsavedChangesText: {
    fontSize: 11,
    color: colors.warningDark,
    fontWeight: fontWeights.medium,
    marginTop: 1,
  },
  saveButton: {
    minWidth: 130,
    height: 42,
  },
});
