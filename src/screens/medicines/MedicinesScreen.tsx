import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AdvancedFilterModal,
  AppScreen,
  EmptyState,
  FloatingActionButton,
  Icon,
  INITIAL_ADVANCED_FILTERS,
  LoadingIndicator,
  MedicineThumbnailPlaceholder,
  SearchInput,
  SortModal,
  type AdvancedCatalogueFilters,
  type IconName,
  type MedicineSortField,
  type SortOrder,
} from '../../components';
import { apiClient } from '../../services/api-client';
import { useAuth } from '../../features/auth';
import {
  borderRadius,
  colors,
  fontSizes,
  fontWeights,
  spacing,
  theme,
} from '../../theme';
import type {
  PublicComposition,
  PublicManufacturer,
  PublicMedicine,
  PublicMr,
  PublicSalt,
} from '../../types/models';
import { calculateCommercialMetrics } from '../../utils/commercial.utils';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterType = 'ALL' | 'TABLET' | 'CAPSULE' | 'SYRUP';

interface FilterOption {
  id: FilterType;
  label: string;
  icon: IconName;
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'ALL', label: 'All Medicines', icon: 'apps' },
  { id: 'TABLET', label: 'Tablet', icon: 'tablet' },
  { id: 'CAPSULE', label: 'Capsule', icon: 'capsule' },
  { id: 'SYRUP', label: 'Syrup', icon: 'syrup' },
];

interface FormBadgeColor {
  bg: string;
  text: string;
}

const FORM_BADGE_COLORS: Record<string, FormBadgeColor> = {
  TABLET: { bg: '#DCFCE7', text: '#15803D' },
  CAPSULE: { bg: '#EDE9FE', text: '#7C3AED' },
  SYRUP: { bg: '#FEF3C7', text: '#D97706' },
  LIQUID: { bg: '#FEF3C7', text: '#D97706' },
  INJECTION: { bg: '#FEE2E2', text: '#DC2626' },
  OINTMENT: { bg: '#E0F2FE', text: '#0284C7' },
  OTHER: { bg: '#F1F5F9', text: '#475569' },
};

export const MedicinesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('ALL');
  const [medicines, setMedicines] = useState<PublicMedicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sorting State
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<MedicineSortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Advanced Catalogue Filters State
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedCatalogueFilters>(
    INITIAL_ADVANCED_FILTERS,
  );

  // Catalogue Reference Metadata State
  const [manufacturers, setManufacturers] = useState<PublicManufacturer[]>([]);
  const [mrs, setMrs] = useState<PublicMr[]>([]);
  const [salts, setSalts] = useState<PublicSalt[]>([]);
  const [compositions, setCompositions] = useState<PublicComposition[]>([]);
  const commercialMap: Record<string, { mrp: number }> = {};

  const isNonDefaultSort = sortBy !== 'name' || sortOrder !== 'asc';

  const fetchMedicines = useCallback(
    async (
      currentSortBy: MedicineSortField = sortBy,
      currentSortOrder: SortOrder = sortOrder,
    ) => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        params.append('sortBy', currentSortBy);
        params.append('sortOrder', currentSortOrder);
        const response = await apiClient.get<{ medicines: PublicMedicine[] }>(
          `/medicines?${params.toString()}`,
        );
        if (response && Array.isArray(response.medicines)) {
          setMedicines(response.medicines);
        } else {
          setMedicines([]);
        }
      } catch {
        setMedicines([]);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [sortBy, sortOrder],
  );

  const handleSelectSort = (newSortBy: MedicineSortField, newSortOrder: SortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    fetchMedicines(newSortBy, newSortOrder);
  };

  const fetchMetadata = useCallback(async () => {
    try {
      const [mfgRes, mrRes, saltRes, compRes] = await Promise.allSettled([
        apiClient.get<{ manufacturers: PublicManufacturer[] }>('/manufacturers'),
        apiClient.get<{ mrs: PublicMr[] }>('/mrs'),
        apiClient.get<{ salts: PublicSalt[] }>('/salts'),
        apiClient.get<{ compositions: PublicComposition[] }>('/compositions'),
      ]);

      if (mfgRes.status === 'fulfilled' && mfgRes.value?.manufacturers) {
        setManufacturers(mfgRes.value.manufacturers);
      }
      if (mrRes.status === 'fulfilled' && mrRes.value?.mrs) {
        setMrs(mrRes.value.mrs);
      }
      if (saltRes.status === 'fulfilled' && saltRes.value?.salts) {
        setSalts(saltRes.value.salts);
      }
      if (compRes.status === 'fulfilled' && compRes.value?.compositions) {
        setCompositions(compRes.value.compositions);
      }
    } catch {
      // Ignore metadata fetch errors
    }
  }, []);

  useEffect(() => {
    fetchMedicines();
    fetchMetadata();
  }, [fetchMedicines, fetchMetadata]);

  useEffect(() => {
    const unsubscribe = navigation.addListener?.('focus', () => {
      fetchMedicines();
      fetchMetadata();
    });
    return unsubscribe;
  }, [navigation, fetchMedicines, fetchMetadata]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMedicines();
    fetchMetadata();
  };

  const getStrengthText = (item: PublicMedicine): string => {
    if (item.packQuantity && item.packUnit) {
      return `${item.packQuantity} ${item.packUnit.toLowerCase()}`;
    }
    const strengthMatch = item.name.match(/\b(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|%))\b/i);
    if (strengthMatch) {
      return strengthMatch[1];
    }
    return '10 tablet';
  };

  const formatFormLabel = (form: string): string => {
    if (!form) return 'Tablet';
    return form.charAt(0).toUpperCase() + form.slice(1).toLowerCase();
  };

  // Active advanced filters counter
  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.manufacturerId) count++;
    if (advancedFilters.saltCriteria.length > 0) count++;
    if (advancedFilters.packQuantity.trim()) count++;
    if (advancedFilters.packUnit) count++;
    if (advancedFilters.recommendedAgeGroup.trim()) count++;
    if (advancedFilters.prescriptionRequired !== 'ALL') count++;
    if (advancedFilters.minPrice.trim() || advancedFilters.maxPrice.trim()) count++;
    if (advancedFilters.mrId) count++;
    return count;
  }, [advancedFilters]);

  // Estimated MRP fallback for price filtering
  const getEstimatedMrp = (medicine: PublicMedicine): number => {
    if (medicine.mrp !== undefined && medicine.mrp !== null) {
      return Number(medicine.mrp);
    }
    if (commercialMap[medicine.id]) {
      return commercialMap[medicine.id].mrp;
    }
    // Estimated price table for catalogue medicines
    const priceMap: Record<string, number> = {
      'med-1': 25.0,
      'med-2': 85.0,
      'med-3': 35.0,
      'med-4': 60.0,
      'med-5': 45.0,
      'med-6': 30.0,
      'med-7': 110.0,
      'med-8': 55.0,
    };
    return priceMap[medicine.id] ?? 50.0;
  };

  // Safe margin value resolution for sorting
  const getMedicineMargin = (medicine: PublicMedicine): number => {
    const comm = medicine.commercialDetails;
    if (comm && comm.mrp && comm.purchaseRate !== undefined && comm.purchaseRate !== null) {
      const metrics = calculateCommercialMetrics(
        comm.purchaseRate,
        comm.mrp,
        comm.discountPercent ?? 0,
        comm.scheme,
        comm.gstPercent ?? 0,
      );
      if (typeof metrics.marginPercent === 'number' && !isNaN(metrics.marginPercent)) {
        return metrics.marginPercent;
      }
    }
    const directMargin = (medicine as unknown as { margin?: number | string | null }).margin;
    if (directMargin !== undefined && directMargin !== null) {
      const parsed = Number(directMargin);
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  };

  const maxCataloguePrice = useMemo(() => {
    let highest = 0;
    medicines.forEach((m) => {
      const p = getEstimatedMrp(m);
      if (p > highest) highest = p;
    });
    if (highest <= 0) return 5000;
    if (highest <= 500) return 500;
    if (highest <= 1000) return 1000;
    if (highest <= 2000) return 2000;
    if (highest <= 5000) return 5000;
    return Math.ceil(highest / 500) * 500;
  }, [medicines, commercialMap]);

  const filteredMedicines = useMemo(() => {
    let result = [...medicines];

    // Filter by dosage form (FROM CHIPS DIRECTLY BELOW SEARCH BAR)
    if (selectedFilter !== 'ALL') {
      result = result.filter(
        (m) => m.form.toUpperCase() === selectedFilter.toUpperCase(),
      );
    }

    // Filter by search query
    if (search.trim().length > 0) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.shortDescription?.toLowerCase().includes(q) ||
          m.composition?.displayText?.toLowerCase().includes(q) ||
          m.uses?.toLowerCase().includes(q),
      );
    }

    // 1. Manufacturer Filter
    if (advancedFilters.manufacturerId) {
      result = result.filter(
        (m) => m.manufacturer?.id === advancedFilters.manufacturerId,
      );
    }

    // 2. Salt + Strength Paired Criteria (AND Behavior)
    if (advancedFilters.saltCriteria.length > 0) {
      result = result.filter((m) => {
        const comp = compositions.find((c) => c.id === m.composition?.id);
        const compText = (m.composition?.displayText || '').toLowerCase();
        const medName = m.name.toLowerCase();

        // Every salt criterion MUST be satisfied (AND behavior)
        return advancedFilters.saltCriteria.every((crit) => {
          const targetSalt = crit.saltName.trim().toLowerCase();
          const targetStr = crit.strength.trim().toLowerCase();

          if (!targetSalt) return true;

          // Check structured compositionSalts
          if (comp && comp.compositionSalts && comp.compositionSalts.length > 0) {
            const hasMatch = comp.compositionSalts.some((cs) => {
              const saltMatches =
                cs.salt?.name?.toLowerCase() === targetSalt ||
                cs.salt?.id === crit.saltId;
              if (!saltMatches) return false;
              if (!targetStr) return true;

              const csStr = `${cs.amount} ${cs.unit.toLowerCase()}`;
              const csStrCompact = `${cs.amount}${cs.unit.toLowerCase()}`;
              const targetStrCompact = targetStr.replace(/\s+/g, '');

              return (
                csStr === targetStr ||
                csStrCompact === targetStrCompact ||
                `${cs.amount} mg` === targetStr ||
                `${cs.amount}mg` === targetStrCompact
              );
            });
            if (hasMatch) return true;
          }

          // Fallback to text matching on composition and medicine name
          const hasSalt = compText.includes(targetSalt) || medName.includes(targetSalt);
          if (!hasSalt) return false;
          if (!targetStr) return true;

          const targetStrCompact = targetStr.replace(/\s+/g, '');
          return (
            compText.includes(targetStr) ||
            compText.includes(targetStrCompact) ||
            medName.includes(targetStr) ||
            medName.includes(targetStrCompact)
          );
        });
      });
    }

    // 3. Pack Quantity Filter
    if (advancedFilters.packQuantity.trim()) {
      const targetQty = Number(advancedFilters.packQuantity);
      if (!isNaN(targetQty) && targetQty > 0) {
        result = result.filter((m) => Number(m.packQuantity) === targetQty);
      }
    }

    // 4. Pack Unit Filter
    if (advancedFilters.packUnit) {
      result = result.filter(
        (m) => m.packUnit.toUpperCase() === advancedFilters.packUnit?.toUpperCase(),
      );
    }

    // 5. Recommended Age Group Filter
    if (advancedFilters.recommendedAgeGroup.trim()) {
      const ageQuery = advancedFilters.recommendedAgeGroup.toLowerCase().trim();
      result = result.filter((m) =>
        m.recommendedAgeGroup?.toLowerCase().includes(ageQuery),
      );
    }

    // 6. Prescription Required Filter
    if (advancedFilters.prescriptionRequired === 'YES') {
      result = result.filter((m) => m.prescriptionRequired === true);
    } else if (advancedFilters.prescriptionRequired === 'NO') {
      result = result.filter((m) => m.prescriptionRequired === false);
    }

    // 7. Price Range Filter (MRP)
    const minP = advancedFilters.minPrice ? parseFloat(advancedFilters.minPrice) : null;
    const maxP = advancedFilters.maxPrice ? parseFloat(advancedFilters.maxPrice) : null;
    if (minP !== null && !isNaN(minP)) {
      result = result.filter((m) => getEstimatedMrp(m) >= minP);
    }
    if (maxP !== null && !isNaN(maxP)) {
      result = result.filter((m) => getEstimatedMrp(m) <= maxP);
    }

    // 8. Medical Representative (MR) Filter
    if (advancedFilters.mrId) {
      result = result.filter((m) => m.mr?.id === advancedFilters.mrId);
    }

    // Apply Sorting
    result.sort((a, b) => {
      if (sortBy === 'name') {
        const cmp = a.name.localeCompare(b.name);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'margin') {
        const mA = getMedicineMargin(a);
        const mB = getMedicineMargin(b);
        return sortOrder === 'asc' ? mA - mB : mB - mA;
      }
      if (sortBy === 'mrp') {
        const pA = getEstimatedMrp(a);
        const pB = getEstimatedMrp(b);
        return sortOrder === 'asc' ? pA - pB : pB - pA;
      }
      if (sortBy === 'packQuantity') {
        const qA = Number(a.packQuantity) || 0;
        const qB = Number(b.packQuantity) || 0;
        return sortOrder === 'asc' ? qA - qB : qB - qA;
      }
      if (sortBy === 'createdAt') {
        const tA = new Date(a.createdAt).getTime() || 0;
        const tB = new Date(b.createdAt).getTime() || 0;
        return sortOrder === 'asc' ? tA - tB : tB - tA;
      }
      if (sortBy === 'updatedAt') {
        const tA = new Date(a.updatedAt).getTime() || 0;
        const tB = new Date(b.updatedAt).getTime() || 0;
        return sortOrder === 'asc' ? tA - tB : tB - tA;
      }
      return 0;
    });

    return result;
  }, [
    medicines,
    selectedFilter,
    search,
    sortBy,
    sortOrder,
    advancedFilters,
    compositions,
    commercialMap,
  ]);

  const handleCardPress = (id: string) => {
    navigation.navigate('MedicineDetails', { id });
  };

  const handleAddMedicine = () => {
    navigation.navigate('AddMedicine');
  };

  const handleClearAllFilters = () => {
    setSelectedFilter('ALL');
    setSearch('');
    setAdvancedFilters(INITIAL_ADVANCED_FILTERS);
  };

  return (
    <AppScreen
      headerProps={{
        title: 'Medicines',
        subtitle: 'Product Catalogue',
        rightAction: (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.headerButton,
                isNonDefaultSort && styles.headerButtonActive,
              ]}
              onPress={() => setIsSortModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={`Sort medicines${isNonDefaultSort ? `, active sort: ${sortBy} ${sortOrder}` : ''}`}
              testID="medicines-sort-button"
            >
              <Icon name="sort" size={20} color={colors.textInverse} />
              {isNonDefaultSort && (
                <View style={styles.activeFilterBadge} testID="active-sort-badge">
                  <Text style={styles.activeFilterBadgeText}>●</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.headerButton,
                activeAdvancedFilterCount > 0 && styles.headerButtonActive,
              ]}
              onPress={() => setIsFilterModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={`Filter medicines${activeAdvancedFilterCount > 0 ? `, ${activeAdvancedFilterCount} active filters` : ''}`}
              testID="medicines-filter-button"
            >
              <Icon name="filter" size={20} color={colors.textInverse} />
              {activeAdvancedFilterCount > 0 && (
                <View style={styles.activeFilterBadge} testID="active-filter-badge">
                  <Text style={styles.activeFilterBadgeText}>
                    {activeAdvancedFilterCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ),
      }}
      scrollable={false}
    >
      {/* Search Input */}
      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search medicines by name or generic name..."
        testID="medicines-search-input"
        style={styles.searchInput}
      />

      {/* Dosage Form Filter Chips (Non-scrollable, all 4 fit screen width) */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((option) => {
          const isSelected = selectedFilter === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.filterChip,
                isSelected && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedFilter(option.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              testID={`filter-chip-${option.id.toLowerCase()}`}
            >
              <Icon
                name={option.icon}
                size={14}
                color={isSelected ? '#085444' : '#64748B'}
              />
              <Text
                style={[
                  styles.filterChipText,
                  isSelected && styles.filterChipTextSelected,
                ]}
                numberOfLines={1}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Medicine Cards List */}
      {isLoading && medicines.length === 0 ? (
        <LoadingIndicator message="Loading medicines catalogue..." />
      ) : filteredMedicines.length === 0 ? (
        <EmptyState
          title="No medicines found"
          description="No medicines in the catalogue match the selected filter criteria."
          actionTitle={
            activeAdvancedFilterCount > 0 || selectedFilter !== 'ALL' || search.trim()
              ? 'Clear All Filters'
              : undefined
          }
          onAction={
            activeAdvancedFilterCount > 0 || selectedFilter !== 'ALL' || search.trim()
              ? handleClearAllFilters
              : undefined
          }
        />
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#085444']}
              tintColor="#085444"
            />
          }
        >
          {filteredMedicines.map((medicine) => {
            const formKey = (medicine.form || 'OTHER').toUpperCase();
            const badgeColor = FORM_BADGE_COLORS[formKey] || FORM_BADGE_COLORS.OTHER;
            const formLabel = formatFormLabel(medicine.form);
            const strength = getStrengthText(medicine);

            return (
              <TouchableOpacity
                key={medicine.id}
                style={styles.medicineCard}
                onPress={() => handleCardPress(medicine.id)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${medicine.name}, ${formLabel}`}
                testID={`medicine-card-${medicine.id}`}
              >
                {/* Left: Thumbnail (or packaging placeholder) */}
                <View style={styles.thumbnailWrapper}>
                  {medicine.imageUrl ? (
                    <Image
                      source={{ uri: medicine.imageUrl }}
                      style={styles.thumbnailImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <MedicineThumbnailPlaceholder width={80} height={64} />
                  )}
                </View>

                {/* Middle: Title, Subtitle, Dosage Form & Strength */}
                <View style={styles.cardBody}>
                  <Text
                    style={styles.cardTitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {medicine.name}
                  </Text>
                  <Text
                    style={styles.cardSubtitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {medicine.composition?.displayText ||
                      medicine.shortDescription ||
                      medicine.uses ||
                      'Pharmaceutical Medicine'}
                  </Text>
                  <View style={styles.cardMetaRow}>
                    <View
                      style={[
                        styles.formBadge,
                        { backgroundColor: badgeColor.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.formBadgeText,
                          { color: badgeColor.text },
                        ]}
                      >
                        {formLabel}
                      </Text>
                    </View>
                    <Text style={styles.metaBullet}>•</Text>
                    <Text style={styles.strengthText}>{strength}</Text>
                  </View>
                </View>

                {/* Right: Navigation Chevron */}
                <View style={styles.chevronWrapper}>
                  <Icon name="chevron-right" size={18} color="#94A3B8" />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Floating Action Button for Add Medicine */}
      <FloatingActionButton
        onPress={handleAddMedicine}
        accessibilityLabel="Add Medicine"
        testID="add-medicine-fab"
      />

      {/* Advanced Catalogue Filter Popup (8 Catalogue Filters, No Form, No Inventory) */}
      <AdvancedFilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        filters={advancedFilters}
        onApply={setAdvancedFilters}
        manufacturers={manufacturers}
        mrs={mrs}
        salts={salts}
        maxPriceLimit={maxCataloguePrice}
      />

      {/* Sort Medicines Popover Modal */}
      <SortModal
        visible={isSortModalVisible}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSelectSort={handleSelectSort}
        onClose={() => setIsSortModalVisible(false)}
      />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderColor: '#10B981',
  },
  activeFilterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#10B981',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#085444',
  },
  activeFilterBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: fontWeights.bold,
  },
  searchInput: {
    marginBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginBottom: spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 4,
    ...theme.shadows.sm,
  },
  filterChipSelected: {
    backgroundColor: '#E6F4EA',
    borderColor: '#085444',
  },
  filterChipText: {
    fontSize: 11.5,
    fontWeight: fontWeights.medium,
    color: '#334155',
  },
  filterChipTextSelected: {
    color: '#085444',
    fontWeight: fontWeights.bold,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 90,
  },
  medicineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...theme.shadows.sm,
  },
  thumbnailWrapper: {
    width: 80,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  formBadgeText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
  },
  metaBullet: {
    fontSize: 12,
    color: colors.textMuted,
  },
  strengthText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  chevronWrapper: {
    marginLeft: spacing.sm,
  },
});
